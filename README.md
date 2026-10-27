# qMRLab NIfTI Viewer

**Live: https://qmrlab.org/viewer**

A NIfTI viewer that runs in any modern browser (Windows, macOS, Linux), for students who can't
install FSLeyes or ITK-SNAP. It's one self-contained file, `dist/labview.html` (0.3 MB): open it by
double-clicking, then open or drop `.nii` / `.nii.gz` files. Files are read in the browser and
never uploaded.

The core is Rust compiled to WebAssembly (`src/lib.rs`). It reads NIfTI with the `nifti` crate,
like qmrust, and resamples every layer in world (scanner) coordinates. Images on different
grids therefore overlay correctly: a cropped MT image with an uncropped mask, or a T1w with a
warped template. The interface is plain HTML/JS (`web/`).

## What it does (what Lab 4 needs)

- Axial, sagittal, coronal or all three; radiological or neurological left–right
- Planes along the world (scanner) axes, or along the first image's own slices ("Image slices"),
  so an oblique acquisition can be seen slice by slice as acquired; overlays stay aligned either way
- Light or dark interface, following the system setting (image panels stay black)
- Side by side (one plane): up to three images in their own panels, same slice, cursor and zoom (Ex 1C:
  MT on / MT off). "Same for all" gives every image the same display range so intensities compare
- Any number of layers: colour maps (gray, hot, viridis, magma, inferno, plasma, cividis, turbo, jet,
  bone, copper, cool; diverging blue-white-red, coolwarm, purple-white-orange), masks as solid
  colours (filled or outline), label images (one colour per value: vertebral levels), opacity,
  display range, "transparent below min". Voxels are always shown as they are (nearest neighbour), never
  smoothed for display
- Colour bar for the selected layer, orientation letters, slice position
- Cursor: world coordinates, and voxel indices and value in every layer
- Header: dimensions, voxel size, data type, axis directions, sform/qform, affine (Ex 1C)
- Difference A − B: each voxel of A minus the B voxel at the same position (nearest neighbour; Ex 3B)
- 4D files: choose the volume
- "Save screenshot" writes a PNG of the views shown

## Build

```bash
./build.sh            # needs Rust (wasm32-unknown-unknown target) and wasm-pack
cargo test --release  # header, world-space overlay, labels and difference checks on the Lab 4 data
```

`build.sh` inlines the wasm (base64), the glue code, `web/app.js` and `web/style.css` into
`dist/labview.html`.

## Testing hooks

Served over http, `labview.html?load=a.nii.gz,b.nii.gz&layout=ax&setup={...}` loads files by URL and
applies display settings (see `applySetup` in `web/app.js`). A TA could use this to prepare a link
with a fixed display for a screenshot.
