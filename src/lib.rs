//! labview: the Rust/WebAssembly core of a small NIfTI viewer for the GBM8360 labs.
//!
//! Reading uses the `nifti` crate, as qmrust does, but from bytes rather than a path, since a
//! browser hands us the file's contents. Everything is resampled in world (scanner, RAS+ mm)
//! coordinates, so images on different grids (a cropped MT image and an uncropped mask, a T1w
//! and a warped template) overlay correctly, as in FSLeyes.

use flate2::read::GzDecoder;
use nifti::{InMemNiftiObject, IntoNdArray, NiftiObject};
use serde::Serialize;
use wasm_bindgen::prelude::*;

type M4 = [[f64; 4]; 4];

/// One image: all its frames as f32, x fastest, then y, z, t.
pub struct Vol {
    pub dims: [usize; 3],
    pub nt: usize,
    pub frame: usize,
    pub data: Vec<f32>,
    pub affine: M4,
    inv: M4,
    pub info: Info,
}

#[derive(Serialize, Clone)]
pub struct Info {
    pub dims: Vec<usize>,
    pub pixdim: [f64; 3],
    pub datatype: String,
    pub xform: String,
    pub axis_codes: String,
    pub affine: Vec<Vec<f64>>,
    pub min: f32,
    pub max: f32,
    /// 0.5th and 99.5th percentiles of the non-zero voxels: a sensible default display range.
    pub robust: [f32; 2],
    /// 90th percentile of |value| over all finite voxels: the typical size of a difference image.
    pub abs_p90: f32,
    /// Integer-valued with few distinct values: a mask or a label image.
    pub is_label: bool,
    pub n_values: usize,
}

pub fn parse(bytes: &[u8]) -> Result<Vol, String> {
    // git-annex leaves small placeholder files (a path to the real data) until `git annex get`.
    if bytes.starts_with(b"/annex/objects/") || bytes.windows(14).take(64).any(|w| w == b".git/annex/obj") {
        return Err(format!(
            "this is a git-annex placeholder ({} bytes), not the image. Download the data first, \
             e.g. `git annex get sub-<site>` in the dataset folder, then open the file again.",
            bytes.len()
        ));
    }
    if bytes.len() < 348 {
        return Err(format!("only {} bytes: too small to be a NIfTI file.", bytes.len()));
    }
    let gz = bytes.len() > 2 && bytes[0] == 0x1f && bytes[1] == 0x8b;
    let obj = if gz {
        InMemNiftiObject::from_reader(GzDecoder::new(bytes))
    } else {
        InMemNiftiObject::from_reader(bytes)
    }
    .map_err(|e| {
        let s = e.to_string();
        if s.contains("UnexpectedEof") || s.contains("fill whole buffer") {
            "the file ends early: it may be incomplete (interrupted download or copy).".to_string()
        } else {
            format!("not a readable NIfTI file ({s})")
        }
    })?;
    let h = obj.header().clone();
    let ndim = (h.dim[0] as usize).clamp(1, 7);
    let shape: Vec<usize> = (1..=ndim).map(|i| (h.dim[i] as usize).max(1)).collect();
    let dims = [shape[0], *shape.get(1).unwrap_or(&1), *shape.get(2).unwrap_or(&1)];
    let nt: usize = shape.iter().skip(3).product::<usize>().max(1);

    let arr = obj
        .into_volume()
        .into_ndarray::<f32>()
        .map_err(|e| format!("could not decode the voxel data ({e})"))?;
    // Reversed axes iterate with x fastest whatever the memory layout.
    let data: Vec<f32> = arr.reversed_axes().iter().cloned().collect();
    if data.len() != dims[0] * dims[1] * dims[2] * nt {
        return Err("voxel count does not match the header dimensions".into());
    }

    let pixdim = [h.pixdim[1].abs() as f64, h.pixdim[2].abs() as f64, h.pixdim[3].abs() as f64];
    let (affine, xform) = header_affine(&h);
    let inv = invert(&affine).ok_or("the image's affine is not invertible")?;
    let mut vol = Vol {
        dims,
        nt,
        frame: 0,
        data,
        affine,
        inv,
        info: Info {
            dims: shape,
            pixdim,
            datatype: format!("{:?}", h.data_type().map_err(|e| e.to_string())?),
            xform,
            axis_codes: axis_codes(&affine),
            affine: affine.iter().map(|r| r.to_vec()).collect(),
            min: 0.0,
            max: 0.0,
            robust: [0.0, 1.0],
            abs_p90: 0.0,
            is_label: false,
            n_values: 0,
        },
    };
    vol.compute_stats();
    Ok(vol)
}

/// sform if set, else qform, else voxel sizes only (the NIfTI-1 rules).
fn header_affine(h: &nifti::NiftiHeader) -> (M4, String) {
    let p = |i: usize| if h.pixdim[i] == 0.0 { 1.0 } else { h.pixdim[i].abs() as f64 };
    if h.sform_code > 0 {
        let r = |s: [f32; 4]| [s[0] as f64, s[1] as f64, s[2] as f64, s[3] as f64];
        return ([r(h.srow_x), r(h.srow_y), r(h.srow_z), [0., 0., 0., 1.]], "sform".into());
    }
    if h.qform_code > 0 {
        let (b, c, d) = (h.quatern_b as f64, h.quatern_c as f64, h.quatern_d as f64);
        let a = (1.0 - (b * b + c * c + d * d)).max(0.0).sqrt();
        let rot = [
            [a * a + b * b - c * c - d * d, 2. * (b * c - a * d), 2. * (b * d + a * c)],
            [2. * (b * c + a * d), a * a + c * c - b * b - d * d, 2. * (c * d - a * b)],
            [2. * (b * d - a * c), 2. * (c * d + a * b), a * a + d * d - b * b - c * c],
        ];
        let qfac = if h.pixdim[0] < 0.0 { -1.0 } else { 1.0 };
        let s = [p(1), p(2), p(3) * qfac];
        let off = [h.quatern_x as f64, h.quatern_y as f64, h.quatern_z as f64];
        let mut m = [[0.0; 4]; 4];
        for i in 0..3 {
            for j in 0..3 {
                m[i][j] = rot[i][j] * s[j];
            }
            m[i][3] = off[i];
        }
        m[3][3] = 1.0;
        return (m, "qform".into());
    }
    ([[p(1), 0., 0., 0.], [0., p(2), 0., 0.], [0., 0., p(3), 0.], [0., 0., 0., 1.]], "none (voxel sizes only)".into())
}

fn invert(m: &M4) -> Option<M4> {
    let a = |i: usize, j: usize| m[i][j];
    let det = a(0, 0) * (a(1, 1) * a(2, 2) - a(1, 2) * a(2, 1)) - a(0, 1) * (a(1, 0) * a(2, 2) - a(1, 2) * a(2, 0))
        + a(0, 2) * (a(1, 0) * a(2, 1) - a(1, 1) * a(2, 0));
    if det.abs() < 1e-12 {
        return None;
    }
    let mut r = [[0.0; 4]; 4];
    r[0][0] = (a(1, 1) * a(2, 2) - a(1, 2) * a(2, 1)) / det;
    r[0][1] = (a(0, 2) * a(2, 1) - a(0, 1) * a(2, 2)) / det;
    r[0][2] = (a(0, 1) * a(1, 2) - a(0, 2) * a(1, 1)) / det;
    r[1][0] = (a(1, 2) * a(2, 0) - a(1, 0) * a(2, 2)) / det;
    r[1][1] = (a(0, 0) * a(2, 2) - a(0, 2) * a(2, 0)) / det;
    r[1][2] = (a(0, 2) * a(1, 0) - a(0, 0) * a(1, 2)) / det;
    r[2][0] = (a(1, 0) * a(2, 1) - a(1, 1) * a(2, 0)) / det;
    r[2][1] = (a(0, 1) * a(2, 0) - a(0, 0) * a(2, 1)) / det;
    r[2][2] = (a(0, 0) * a(1, 1) - a(0, 1) * a(1, 0)) / det;
    for i in 0..3 {
        r[i][3] = -(r[i][0] * m[0][3] + r[i][1] * m[1][3] + r[i][2] * m[2][3]);
    }
    r[3][3] = 1.0;
    Some(r)
}

/// The world direction each voxel axis points towards, e.g. "LAS" (nibabel's convention).
fn axis_codes(m: &M4) -> String {
    let names = [('R', 'L'), ('A', 'P'), ('S', 'I')];
    (0..3)
        .map(|j| {
            let col = [m[0][j], m[1][j], m[2][j]];
            let k = (0..3).max_by(|&x, &y| col[x].abs().total_cmp(&col[y].abs())).unwrap();
            if col[k] >= 0.0 { names[k].0 } else { names[k].1 }
        })
        .collect()
}

fn apply(m: &M4, p: [f64; 3]) -> [f64; 3] {
    let mut o = [0.0; 3];
    for (i, oi) in o.iter_mut().enumerate() {
        *oi = m[i][0] * p[0] + m[i][1] * p[1] + m[i][2] * p[2] + m[i][3];
    }
    o
}

impl Vol {
    fn frame_data(&self) -> &[f32] {
        let n = self.dims[0] * self.dims[1] * self.dims[2];
        &self.data[self.frame * n..(self.frame + 1) * n]
    }

    fn compute_stats(&mut self) {
        let d = self.frame_data();
        let step = (d.len() / 400_000).max(1);
        let mut vals: Vec<f32> = Vec::new();
        let mut all: Vec<f32> = Vec::new();
        let (mut mn, mut mx) = (f32::INFINITY, f32::NEG_INFINITY);
        let mut integer = true;
        for (i, &v) in d.iter().enumerate() {
            if !v.is_finite() {
                continue;
            }
            mn = mn.min(v);
            mx = mx.max(v);
            if i % step == 0 {
                all.push(v.abs());
                if v.fract() != 0.0 {
                    integer = false;
                }
                if v != 0.0 {
                    vals.push(v);
                }
            }
        }
        vals.sort_by(|a, b| a.total_cmp(b));
        all.sort_by(|a, b| a.total_cmp(b));
        let qa = |f: f64| if all.is_empty() { 0.0 } else { all[((all.len() - 1) as f64 * f) as usize] };
        let q = |f: f64| if vals.is_empty() { 0.0 } else { vals[((vals.len() - 1) as f64 * f) as usize] };
        let mut distinct = vals.clone();
        distinct.dedup();
        let info = &mut self.info;
        info.min = if mn.is_finite() { mn } else { 0.0 };
        info.max = if mx.is_finite() { mx } else { 0.0 };
        info.robust = [q(0.005).min(0.0f32.max(info.min)), q(0.995)];
        info.n_values = distinct.len() + 1;
        info.abs_p90 = qa(0.90);
        info.is_label = integer && distinct.len() <= 255 && info.min >= 0.0;
        if info.robust[1] <= info.robust[0] {
            info.robust = [info.min, info.max.max(info.min + 1.0)];
        }
    }

    /// Value at a world point: nearest voxel, or trilinear. NaN outside the image.
    fn sample(&self, ijk: [f64; 3], linear: bool) -> f32 {
        let [nx, ny, nz] = self.dims;
        let d = self.frame_data();
        if !linear || nx * ny * nz == 1 {
            let (i, j, k) = (ijk[0].round(), ijk[1].round(), ijk[2].round());
            if i < 0.0 || j < 0.0 || k < 0.0 || i >= nx as f64 || j >= ny as f64 || k >= nz as f64 {
                return f32::NAN;
            }
            return d[i as usize + nx * (j as usize + ny * k as usize)];
        }
        // Inside the voxel centres' hull, plus half a voxel at the edges (clamped).
        for (a, n) in ijk.iter().zip([nx, ny, nz]) {
            if *a < -0.5 || *a > n as f64 - 0.5 {
                return f32::NAN;
            }
        }
        let c = |a: f64, n: usize| -> (usize, usize, f64) {
            let a = a.clamp(0.0, (n - 1) as f64);
            let lo = a.floor() as usize;
            let hi = (lo + 1).min(n - 1);
            (lo, hi, a - lo as f64)
        };
        let (i0, i1, fx) = c(ijk[0], nx);
        let (j0, j1, fy) = c(ijk[1], ny);
        let (k0, k1, fz) = c(ijk[2], nz);
        let at = |i: usize, j: usize, k: usize| d[i + nx * (j + ny * k)] as f64;
        let lerp = |a: f64, b: f64, t: f64| a + (b - a) * t;
        let v = lerp(
            lerp(lerp(at(i0, j0, k0), at(i1, j0, k0), fx), lerp(at(i0, j1, k0), at(i1, j1, k0), fx), fy),
            lerp(lerp(at(i0, j0, k1), at(i1, j0, k1), fx), lerp(at(i0, j1, k1), at(i1, j1, k1), fx), fy),
            fz,
        );
        v as f32
    }

    /// Sample a w × h plane: pixel (c, r) centre is origin + (c + ½)·u + (r + ½)·v, in world mm.
    pub fn sample_plane(&self, origin: [f64; 3], u: [f64; 3], v: [f64; 3], w: usize, h: usize, linear: bool) -> Vec<f32> {
        let lin = |p: [f64; 3]| {
            let mut o = [0.0; 3];
            for (i, oi) in o.iter_mut().enumerate() {
                *oi = self.inv[i][0] * p[0] + self.inv[i][1] * p[1] + self.inv[i][2] * p[2];
            }
            o
        };
        let p0 = [origin[0] + 0.5 * (u[0] + v[0]), origin[1] + 0.5 * (u[1] + v[1]), origin[2] + 0.5 * (u[2] + v[2])];
        let base = apply(&self.inv, p0);
        let (du, dv) = (lin(u), lin(v));
        let mut out = Vec::with_capacity(w * h);
        for r in 0..h {
            for c in 0..w {
                let (cf, rf) = (c as f64, r as f64);
                let ijk = [
                    base[0] + cf * du[0] + rf * dv[0],
                    base[1] + cf * du[1] + rf * dv[1],
                    base[2] + cf * du[2] + rf * dv[2],
                ];
                out.push(self.sample(ijk, linear));
            }
        }
        out
    }

    pub fn voxel_at(&self, p: [f64; 3]) -> [f64; 3] {
        let ijk = apply(&self.inv, p);
        [ijk[0].round(), ijk[1].round(), ijk[2].round()]
    }

    pub fn value_at(&self, p: [f64; 3]) -> f32 {
        self.sample(apply(&self.inv, p), false)
    }

    /// World bounding box of the voxel corners: [xmin, ymin, zmin, xmax, ymax, zmax].
    pub fn bounds(&self) -> [f64; 6] {
        let mut b = [f64::INFINITY, f64::INFINITY, f64::INFINITY, f64::NEG_INFINITY, f64::NEG_INFINITY, f64::NEG_INFINITY];
        for &i in &[-0.5, self.dims[0] as f64 - 0.5] {
            for &j in &[-0.5, self.dims[1] as f64 - 0.5] {
                for &k in &[-0.5, self.dims[2] as f64 - 0.5] {
                    let p = apply(&self.affine, [i, j, k]);
                    for a in 0..3 {
                        b[a] = b[a].min(p[a]);
                        b[a + 3] = b[a + 3].max(p[a]);
                    }
                }
            }
        }
        b
    }

    /// self − other, with other sampled at self's voxel centres by nearest neighbour (no blending).
    /// NaN where other has no data.
    pub fn difference(&self, other: &Vol) -> Vol {
        let [nx, ny, nz] = self.dims;
        let mine = self.frame_data();
        let mut data = Vec::with_capacity(nx * ny * nz);
        for k in 0..nz {
            for j in 0..ny {
                for i in 0..nx {
                    let w = apply(&self.affine, [i as f64, j as f64, k as f64]);
                    let o = other.sample(apply(&other.inv, w), false);
                    data.push(mine[i + nx * (j + ny * k)] - o);
                }
            }
        }
        let mut info = self.info.clone();
        info.dims = vec![nx, ny, nz];
        info.datatype = "Float32 (computed)".into();
        let mut v = Vol { dims: self.dims, nt: 1, frame: 0, data, affine: self.affine, inv: self.inv, info };
        v.compute_stats();
        v
    }
}

// ---- WebAssembly bindings ---------------------------------------------------------------------

#[wasm_bindgen]
pub struct Volume {
    v: Vol,
}

fn v3(s: &[f64]) -> [f64; 3] {
    [s[0], s[1], s[2]]
}

#[wasm_bindgen]
impl Volume {
    #[wasm_bindgen(constructor)]
    pub fn new(bytes: &[u8]) -> Result<Volume, JsValue> {
        parse(bytes).map(|v| Volume { v }).map_err(|e| JsValue::from_str(&e))
    }

    pub fn info_json(&self) -> String {
        serde_json::to_string(&self.v.info).unwrap_or_default()
    }

    pub fn frames(&self) -> usize {
        self.v.nt
    }

    pub fn set_frame(&mut self, t: usize) {
        self.v.frame = t.min(self.v.nt - 1);
        self.v.compute_stats();
    }

    pub fn bounds(&self) -> Vec<f64> {
        self.v.bounds().to_vec()
    }

    pub fn sample_plane(&self, origin: &[f64], u: &[f64], v: &[f64], w: usize, h: usize, linear: bool) -> Vec<f32> {
        self.v.sample_plane(v3(origin), v3(u), v3(v), w, h, linear)
    }

    pub fn voxel_at(&self, x: f64, y: f64, z: f64) -> Vec<f64> {
        self.v.voxel_at([x, y, z]).to_vec()
    }

    pub fn value_at(&self, x: f64, y: f64, z: f64) -> f32 {
        self.v.value_at([x, y, z])
    }

    /// World coordinates of a voxel (for "go to voxel").
    pub fn world_of(&self, i: f64, j: f64, k: f64) -> Vec<f64> {
        apply(&self.v.affine, [i, j, k]).to_vec()
    }

    pub fn difference(&self, other: &Volume) -> Volume {
        Volume { v: self.v.difference(&other.v) }
    }
}
