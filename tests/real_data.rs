//! Checks against the Lab 4 instructor run (skipped when those files aren't there).
use labview::parse;
use std::path::PathBuf;

fn work(f: &str) -> Option<Vec<u8>> {
    let p = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../my_attempt/work").join(f);
    std::fs::read(p).ok()
}

#[test]
fn t1w_header_and_affine() {
    let Some(b) = work("sub-poly_T1w.nii.gz") else { return };
    let v = parse(&b).unwrap();
    assert_eq!(v.dims, [192, 260, 320]);
    assert_eq!(v.info.pixdim, [1.0, 1.0, 1.0]);
    println!("T1w affine {:?} codes {} xform {}", v.affine, v.info.axis_codes, v.info.xform);
}

#[test]
fn mt_crop_and_mask_overlay_in_world_space() {
    // The cropped GRE-T1w and the uncropped cord segmentation are on different grids: the same
    // world point must land on the same anatomy in both.
    let (Some(gc), Some(seg)) = (work("sub-poly_flip-2_mt-off_MTS_RPI_crop.nii.gz"), work("sub-poly_flip-2_mt-off_MTS_RPI_seg.nii.gz")) else { return };
    let gc = parse(&gc).unwrap();
    let seg = parse(&seg).unwrap();
    assert_eq!(gc.dims, [41, 43, 18]);
    let crop_seg = parse(&work("noreg/gre_seg_crop.nii.gz").unwrap()).unwrap();
    // Every voxel centre of the cropped grid: the uncropped mask, sampled in world space, must
    // match the mask that was cropped onto that grid by SCT.
    let mut mismatches = 0;
    let mut n = 0;
    for k in 0..18 {
        for j in 0..43 {
            for i in 0..41 {
                let w = labview_world(&gc, [i as f64, j as f64, k as f64]);
                let a = seg.value_at(w);
                let b = crop_seg.data[i + 41 * (j + 43 * k)];
                n += 1;
                if (a > 0.5) != (b > 0.5) {
                    mismatches += 1;
                }
            }
        }
    }
    println!("mask mismatches {mismatches}/{n}");
    assert_eq!(mismatches, 0);
}

fn labview_world(v: &labview::Vol, ijk: [f64; 3]) -> [f64; 3] {
    let m = v.affine;
    [0, 1, 2].map(|i| m[i][0] * ijk[0] + m[i][1] * ijk[1] + m[i][2] * ijk[2] + m[i][3])
}

#[test]
fn clear_errors_for_placeholders_and_truncated_files() {
    let ptr = b"/annex/objects/SHA256E-s2101125--c07a5070d63235c.nii.gz\n";
    let e = parse(ptr).err().unwrap();
    assert!(e.contains("git-annex placeholder"), "{e}");
    let Some(b) = work("mtr.nii.gz") else { return };
    let e = parse(&b[..b.len() / 2]).err().unwrap();
    assert!(e.contains("ends early"), "{e}");
}

#[test]
fn label_and_stats() {
    let Some(b) = work("label_axT1w/template/PAM50_levels.nii.gz") else { return };
    let v = parse(&b).unwrap();
    println!("levels: min {} max {} label {} n {}", v.info.min, v.info.max, v.info.is_label, v.info.n_values);
    assert!(v.info.is_label);
    let m = parse(&work("mtr.nii.gz").unwrap()).unwrap();
    println!("mtr robust {:?} label {}", m.info.robust, m.info.is_label);
    assert!(!m.info.is_label);
}

#[test]
fn difference_matches_direct_subtraction_on_same_grid() {
    let (Some(a), Some(b)) = (work("noreg/mtr_noreg.nii.gz"), work("mtr.nii.gz")) else { return };
    let (a, b) = (parse(&a).unwrap(), parse(&b).unwrap());
    let d = a.difference(&b);
    let max_err = d.data.iter().zip(a.data.iter().zip(b.data.iter()))
        .map(|(dv, (x, y))| ((x - y) - dv).abs())
        .fold(0.0f32, f32::max);
    assert!(max_err < 1e-3, "max err {max_err}");
}
