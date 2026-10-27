// labview interface. Runs after the wasm glue (Volume, initSync) in the same module.

// ---- colour maps ---------------------------------------------------------------------------
const ANCHORS = {
  gray: [[0, 0, 0], [255, 255, 255]],
  hot: [[0, 0, 0], [230, 0, 0], [255, 210, 0], [255, 255, 255]],
  viridis: [[68, 1, 84], [71, 44, 122], [59, 82, 139], [44, 114, 142], [33, 145, 140],
            [40, 174, 128], [94, 201, 98], [173, 220, 48], [253, 231, 37]],
  // matplotlib colour maps, sampled at 17 points
  magma: [[0, 0, 4], [10, 8, 34], [29, 17, 71], [54, 16, 107], [81, 18, 124], [106, 28, 129],
          [131, 38, 129], [156, 46, 127], [183, 55, 121], [208, 65, 111], [231, 82, 99], [245, 107, 92],
          [252, 137, 97], [254, 167, 114], [254, 196, 136], [253, 226, 163], [252, 253, 191]],
  inferno: [[0, 0, 4], [11, 7, 36], [33, 12, 74], [61, 9, 101], [87, 16, 110], [113, 25, 110],
            [138, 34, 106], [163, 44, 97], [188, 55, 84], [210, 70, 68], [228, 90, 49], [241, 115, 29],
            [249, 142, 9], [252, 172, 17], [249, 203, 53], [242, 234, 105], [252, 255, 164]],
  plasma: [[13, 8, 135], [49, 5, 151], [76, 2, 161], [102, 0, 167], [126, 3, 168], [149, 17, 161],
           [170, 35, 149], [188, 53, 135], [204, 71, 120], [218, 90, 106], [230, 108, 92], [240, 128, 78],
           [248, 149, 64], [253, 172, 51], [253, 197, 39], [248, 223, 37], [240, 249, 33]],
  cividis: [[0, 34, 78], [0, 46, 106], [26, 56, 111], [50, 67, 109], [67, 78, 108], [83, 90, 109],
            [97, 101, 111], [111, 112, 115], [125, 124, 120], [140, 136, 120], [155, 148, 118], [171, 160, 114],
            [188, 174, 108], [205, 187, 99], [222, 201, 88], [240, 216, 70], [254, 232, 56]],
  turbo: [[48, 18, 59], [64, 64, 162], [70, 107, 227], [66, 148, 255], [40, 188, 235], [24, 221, 194],
          [50, 242, 152], [109, 254, 98], [164, 252, 60], [205, 236, 52], [238, 207, 58], [253, 172, 52],
          [251, 126, 33], [235, 80, 14], [208, 47, 5], [169, 22, 1], [122, 4, 3]],
  jet: [[0, 0, 128], [0, 0, 200], [0, 0, 255], [0, 64, 255], [0, 128, 255], [0, 192, 255],
        [22, 255, 225], [73, 255, 173], [125, 255, 122], [177, 255, 70], [228, 255, 19], [255, 208, 0],
        [255, 148, 0], [255, 89, 0], [255, 30, 0], [196, 0, 0], [128, 0, 0]],
  bone: [[0, 0, 0], [14, 14, 19], [28, 28, 39], [42, 42, 58], [56, 56, 78], [70, 70, 97],
         [84, 85, 116], [98, 104, 130], [112, 123, 144], [126, 143, 158], [140, 162, 172], [154, 181, 186],
         [169, 200, 200], [191, 214, 214], [213, 228, 228], [234, 242, 242], [255, 255, 255]],
  copper: [[0, 0, 0], [20, 12, 8], [40, 25, 16], [59, 37, 24], [79, 50, 32], [99, 62, 40],
           [119, 75, 48], [138, 87, 56], [158, 100, 64], [178, 112, 72], [198, 125, 80], [217, 137, 88],
           [237, 150, 96], [255, 162, 103], [255, 175, 111], [255, 187, 119], [255, 199, 127]],
  cool: [[0, 255, 255], [16, 239, 255], [32, 223, 255], [48, 207, 255], [64, 191, 255], [80, 175, 255],
         [96, 159, 255], [112, 143, 255], [128, 127, 255], [144, 111, 255], [160, 95, 255], [176, 79, 255],
         [192, 63, 255], [208, 47, 255], [224, 31, 255], [240, 15, 255], [255, 0, 255]],
  "blue-white-red": [[5, 48, 97], [33, 102, 172], [67, 147, 195], [146, 197, 222], [247, 247, 247],
                     [244, 165, 130], [214, 96, 77], [178, 24, 43], [103, 0, 31]],
  coolwarm: [[59, 76, 192], [78, 104, 216], [98, 130, 234], [119, 154, 247], [141, 176, 254], [163, 194, 254],
             [185, 208, 249], [204, 217, 237], [221, 220, 220], [236, 211, 197], [245, 196, 172], [247, 176, 147],
             [244, 152, 122], [235, 125, 98], [221, 95, 75], [202, 59, 55], [180, 4, 38]],
  "purple-white-orange": [[45, 0, 75], [69, 24, 113], [95, 58, 145], [123, 106, 168], [153, 144, 191], [183, 177, 213],
                          [207, 207, 229], [228, 229, 240], [247, 247, 246], [252, 232, 205], [254, 213, 159], [253, 188, 107],
                          [238, 155, 57], [217, 123, 18], [189, 97, 9], [158, 76, 7], [127, 59, 8]],
};
const SOLID = { red: [255, 40, 40], green: [40, 220, 60], blue: [60, 120, 255], yellow: [255, 230, 0],
                cyan: [0, 230, 230], magenta: [255, 0, 255], white: [255, 255, 255] };
const PALETTE = [[230, 25, 75], [60, 180, 75], [255, 225, 25], [0, 130, 200], [245, 130, 48],
                 [145, 30, 180], [70, 240, 240], [240, 50, 230], [210, 245, 60], [250, 190, 212],
                 [0, 128, 128], [220, 190, 255], [170, 110, 40], [255, 250, 200], [128, 0, 0]];
const CMAPS = [...Object.keys(ANCHORS), ...Object.keys(SOLID).map(s => "mask: " + s), "labels"];

function makeLut(anchors) {
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = (i / 255) * (anchors.length - 1), k = Math.min(Math.floor(t), anchors.length - 2), f = t - k;
    for (let c = 0; c < 3; c++) lut[3 * i + c] = anchors[k][c] + (anchors[k + 1][c] - anchors[k][c]) * f;
  }
  return lut;
}
const LUTS = Object.fromEntries(Object.entries(ANCHORS).map(([k, a]) => [k, makeLut(a)]));

// ---- state ---------------------------------------------------------------------------------
const state = {
  layers: [], selected: -1, cursor: [0, 0, 0], layout: "ortho", radiological: true,
  crosshair: true, colorbar: true, letters: true, sideBySide: false, nextId: 1,
};
const PLANES = {
  // h/v: world axis shown horizontally / vertically; hs: +1 if screen-right is +world (RAS+).
  ax: { h: 0, v: 1, n: 2, name: "Axial", letters: ["R", "L", "A", "P"] },
  cor: { h: 0, v: 2, n: 1, name: "Coronal", letters: ["R", "L", "S", "I"] },
  sag: { h: 1, v: 2, n: 0, name: "Sagittal", letters: ["P", "A", "S", "I"] },
};
const views = {};      // the three planes
const panels = [];     // side by side: one image per panel, all on the same plane, slice, zoom and pan
const linked = { zoom: 1, pan: [0, 0] };
const $ = s => document.querySelector(s);

// ---- loading -------------------------------------------------------------------------------
function status(msg, err) {
  const el = $("#status");
  el.textContent = msg || "";
  el.className = err ? "err" : "";
}

async function addFile(name, bytes) {
  status(`Loading ${name}…`);
  await new Promise(r => setTimeout(r, 20));
  let vol;
  try { vol = new Volume(bytes); } catch (e) { status(`${name}: ${e}`, true); return; }
  addLayer(name.replace(/\.nii(\.gz)?$/i, "").replace(/\.gz$/i, ""), vol);
  status("");
}

// An image given the automatic overlay look (hot, see-through) goes back to gray in side by side.
function toPanelStyle(L) {
  if (L.overlayStyle) Object.assign(L, { cmap: "gray", clipBelow: false, alpha: 1, overlayStyle: false });
}

function addLayer(name, vol, opts = {}) {
  const info = JSON.parse(vol.info_json());
  const first = state.layers.length === 0;
  const L = { id: state.nextId++, name, vol, info, visible: true, alpha: 1, outline: false, linear: false,
              clipBelow: false, frame: 0, min: info.robust[0], max: info.robust[1], cmap: "gray" };
  if (!first) {
    if (info.is_label && info.n_values <= 2) {
      const used = new Set(state.layers.map(l => l.cmap));
      L.cmap = "mask: " + (["red", "green", "blue", "yellow", "cyan", "magenta"].find(c => !used.has("mask: " + c)) || "red");
      L.min = 0.5; L.max = 1; L.alpha = 0.6;
    } else if (info.is_label) {
      L.cmap = "labels"; L.alpha = 0.6;
    } else {
      L.cmap = "hot"; L.clipBelow = true; L.alpha = 0.8; L.overlayStyle = true;
      if (state.sideBySide) toPanelStyle(L);
    }
  } else {
    const b = vol.bounds();
    state.cursor = [(b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2];
    allViews().forEach(v => { v.zoom = 1; v.pan = [0, 0]; });
  }
  Object.assign(L, opts);
  state.layers.push(L);
  state.selected = state.layers.length - 1;
  refreshPanel();
  render();
}

// ---- geometry ------------------------------------------------------------------------------
function base() { return state.layers[0]; }

function voxelStep(axis) {
  const a = base().info.affine;
  return Math.max(Math.abs(a[axis][0]), Math.abs(a[axis][1]), Math.abs(a[axis][2])) || 1;
}

function viewGeometry(view) {
  const P = PLANES[view.plane], b = base().vol.bounds();
  const W = view.canvas.width, H = view.canvas.height;
  const hs = P.h === 0 && state.radiological ? -1 : 1; // radiological: screen-right is subject-left (−x)
  const hspan = b[P.h + 3] - b[P.h], vspan = b[P.v + 3] - b[P.v];
  const scale = Math.max(hspan / W, vspan / H) / view.zoom; // mm per pixel
  const ch = (b[P.h] + b[P.h + 3]) / 2 + view.pan[0], cv = (b[P.v] + b[P.v + 3]) / 2 + view.pan[1];
  const origin = [0, 0, 0], u = [0, 0, 0], v = [0, 0, 0];
  origin[P.n] = state.cursor[P.n];
  origin[P.h] = ch - hs * (W / 2) * scale;
  origin[P.v] = cv + (H / 2) * scale;
  u[P.h] = hs * scale;
  v[P.v] = -scale;
  return { P, W, H, hs, scale, ch, cv, origin, u, v };
}

function pixelToWorld(view, x, y) {
  const g = viewGeometry(view), p = [...state.cursor];
  p[g.P.h] = g.origin[g.P.h] + (x + 0.5) * g.u[g.P.h];
  p[g.P.v] = g.origin[g.P.v] + (y + 0.5) * g.v[g.P.v];
  return p;
}

function worldToPixel(g, p) {
  return [(p[g.P.h] - g.origin[g.P.h]) / g.u[g.P.h] - 0.5, (p[g.P.v] - g.origin[g.P.v]) / g.v[g.P.v] - 0.5];
}

// ---- rendering -----------------------------------------------------------------------------
let pending = false;
function render() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; drawAll(); });
}

function allViews() { return [...Object.values(views), ...panels]; }
function shownViews() { return allViews().filter(v => v.wrap.style.display !== "none"); }

function drawAll() {
  const sbs = state.sideBySide && state.layout !== "ortho";
  const imgs = sbs ? state.layers.filter(L => L.visible).slice(0, panels.length) : [];
  for (const [key, view] of Object.entries(views)) {
    const show = !sbs && (state.layout === "ortho" || state.layout === key);
    view.wrap.style.display = show ? "" : "none";
  }
  panels.forEach((p, i) => {
    p.plane = state.layout;
    p.layer = imgs[i] || null;
    p.wrap.style.display = sbs && (p.layer || i === 0) ? "" : "none";
  });
  for (const view of shownViews()) {
    resizeCanvas(view);
    drawView(view);
  }
  updateCursorInfo();
}

function resizeCanvas(view) {
  const r = view.wrap.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  const W = Math.max(50, Math.round(r.width * dpr)), H = Math.max(50, Math.round(r.height * dpr));
  if (view.canvas.width !== W || view.canvas.height !== H) { view.canvas.width = W; view.canvas.height = H; }
}

function drawView(view) {
  const ctx = view.canvas.getContext("2d");
  const W = view.canvas.width, H = view.canvas.height;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  if (!state.layers.length) return;
  const g = viewGeometry(view);
  const img = ctx.createImageData(W, H), out = img.data;
  for (let i = 3; i < out.length; i += 4) out[i] = 255;
  for (const L of view.layer ? [view.layer] : state.layers) {
    const alpha = view.layer ? 1 : L.alpha; // a panel shows its image alone, fully opaque
    if (!L.visible || alpha <= 0) continue;
    const vals = L.vol.sample_plane(g.origin, g.u, g.v, W, H, false); // raw voxels, never smoothed
    paintLayer(L, vals, W, H, out, alpha);
  }
  ctx.putImageData(img, 0, 0);
  const dpr = window.devicePixelRatio || 1;
  if (state.crosshair) {
    const [cx, cy] = worldToPixel(g, state.cursor);
    ctx.strokeStyle = "rgba(0,255,0,0.7)";
    ctx.lineWidth = dpr;
    ctx.beginPath();
    ctx.moveTo(cx + 0.5, 0); ctx.lineTo(cx + 0.5, H);
    ctx.moveTo(0, cy + 0.5); ctx.lineTo(W, cy + 0.5);
    ctx.stroke();
  }
  if (state.letters) drawLetters(ctx, g, W, H, dpr, view.layer);
  // side by side: a colour bar in each panel; otherwise one, on the right-most view shown
  const shown = shownViews();
  if (state.colorbar && view.layer) drawColorbar(ctx, W, H, dpr, view.layer, true);
  else if (state.colorbar && view === shown[shown.length - 1]) drawColorbar(ctx, W, H, dpr, state.layers[state.selected], false);
}

function paintLayer(L, vals, W, H, out, a) {
  const n = W * H;
  const solid = L.cmap.startsWith("mask: ") ? SOLID[L.cmap.slice(6)] : null;
  const labels = L.cmap === "labels";
  const lut = LUTS[L.cmap];
  const span = L.max - L.min || 1;
  const inside = solid
    ? (v => v > L.min)
    : labels ? (v => Math.round(v) !== 0) : (v => !(L.clipBelow && v < L.min));
  for (let i = 0; i < n; i++) {
    const v = vals[i];
    if (Number.isNaN(v) || !inside(v)) continue;
    if (L.outline) {
      // keep only the edge: some 4-neighbour is outside (or a different label)
      const x = i % W, key = labels ? Math.round(v) : 1;
      const same = j => j >= 0 && j < n && !Number.isNaN(vals[j]) && inside(vals[j]) &&
                        (!labels || Math.round(vals[j]) === key);
      if (same(i - 1) && x > 0 && same(i + 1) && x < W - 1 && same(i - W) && same(i + W)) continue;
    }
    let r, gg, b;
    if (solid) [r, gg, b] = solid;
    else if (labels) [r, gg, b] = PALETTE[(Math.round(v) - 1 + PALETTE.length * 100) % PALETTE.length];
    else {
      const k = Math.max(0, Math.min(255, Math.round(((v - L.min) / span) * 255))) * 3;
      r = lut[k]; gg = lut[k + 1]; b = lut[k + 2];
    }
    const o = 4 * i;
    out[o] = out[o] * (1 - a) + r * a;
    out[o + 1] = out[o + 1] * (1 - a) + gg * a;
    out[o + 2] = out[o + 2] * (1 - a) + b * a;
  }
}

function label(ctx, text, x, y, dpr, align = "left", base = "top", size = 13) {
  ctx.font = `${size * dpr}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = base;
  ctx.lineWidth = 3 * dpr;
  ctx.strokeStyle = "rgba(0,0,0,0.8)";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = "#fff";
  ctx.fillText(text, x, y);
}

function drawLetters(ctx, g, W, H, dpr, only) {
  let [l, r, t, b] = g.P.letters;
  if (g.P.h === 0 && !state.radiological) [l, r] = [r, l];
  const m = 6 * dpr;
  label(ctx, l, m, H / 2, dpr, "left", "middle", 15);
  label(ctx, r, W - m, H / 2, dpr, "right", "middle", 15);
  label(ctx, t, W / 2, m, dpr, "center", "top", 15);
  label(ctx, b, W / 2, H - m, dpr, "center", "bottom", 15);
  const B = only || base();
  const vox = B.vol.voxel_at(...state.cursor);
  const axisName = ["x", "y", "z"][g.P.n];
  label(ctx, `${g.P.name}  ${axisName} = ${state.cursor[g.P.n].toFixed(1)} mm`, m, m, dpr, "left", "top", 11);
  label(ctx, `${B.name} voxel [${vox.join(", ")}]`, m, m + 15 * dpr, dpr, "left", "top", 11);
}

function drawColorbar(ctx, W, H, dpr, L, withGray) {
  if (!L || !L.visible || !LUTS[L.cmap] || (L.cmap === "gray" && !withGray)) return;
  const lut = LUTS[L.cmap];
  const bw = 14 * dpr, bh = Math.min(H * 0.6, 260 * dpr), x = W - bw - 50 * dpr, y = (H - bh) / 2;
  for (let i = 0; i < bh; i++) {
    const k = Math.round((1 - i / bh) * 255) * 3;
    ctx.fillStyle = `rgb(${lut[k]},${lut[k + 1]},${lut[k + 2]})`;
    ctx.fillRect(x, y + i, bw, 1.5);
  }
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = dpr;
  ctx.strokeRect(x, y, bw, bh);
  const fmt = v => (Math.abs(v) >= 100 || Number.isInteger(v) ? v.toFixed(0) : v.toPrecision(3));
  label(ctx, fmt(L.max), x + bw + 4 * dpr, y, dpr, "left", "middle", 12);
  label(ctx, fmt((L.min + L.max) / 2), x + bw + 4 * dpr, y + bh / 2, dpr, "left", "middle", 12);
  label(ctx, fmt(L.min), x + bw + 4 * dpr, y + bh, dpr, "left", "middle", 12);
  ctx.save();
  ctx.translate(x - 6 * dpr, y + bh / 2);
  ctx.rotate(-Math.PI / 2);
  label(ctx, L.name, 0, 0, dpr, "center", "bottom", 11);
  ctx.restore();
}

// ---- cursor and info ------------------------------------------------------------------------
function fmtVal(v) {
  if (Number.isNaN(v)) return "—";
  return Number.isInteger(v) ? String(v) : Math.abs(v) >= 1000 || Math.abs(v) < 0.01 ? v.toExponential(3) : v.toFixed(3);
}

function updateCursorInfo() {
  const el = $("#cursor");
  if (!state.layers.length) { el.innerHTML = ""; return; }
  const c = state.cursor;
  let html = `<div class="mm">x ${c[0].toFixed(1)}, y ${c[1].toFixed(1)}, z ${c[2].toFixed(1)} mm</div><table>`;
  for (const L of state.layers) {
    const v = L.vol.voxel_at(...c), val = L.vol.value_at(...c);
    html += `<tr><td>${esc(L.name)}</td><td>[${v.join(", ")}]</td><td class="val">${fmtVal(val)}</td></tr>`;
  }
  el.innerHTML = html + "</table>";
}

function esc(s) { return String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch])); }

// ---- layer panel ----------------------------------------------------------------------------
function refreshPanel() {
  const list = $("#layers");
  list.innerHTML = "";
  state.layers.forEach((L, idx) => {
    const row = document.createElement("div");
    row.className = "layer" + (idx === state.selected ? " sel" : "");
    row.innerHTML = `
      <input type="checkbox" ${L.visible ? "checked" : ""} title="Show / hide">
      <span class="name" title="${esc(L.name)}">${esc(L.name)}</span>
      <button data-a="up" title="Move up (drawn later)">▲</button>
      <button data-a="down" title="Move down">▼</button>
      <button data-a="del" title="Remove">✕</button>`;
    row.querySelector("input").onchange = e => { L.visible = e.target.checked; render(); };
    row.onclick = e => {
      if (e.target.tagName === "INPUT") return;
      const a = e.target.dataset && e.target.dataset.a;
      if (a === "up" && idx < state.layers.length - 1) { swap(idx, idx + 1); return; }
      if (a === "down" && idx > 0) { swap(idx, idx - 1); return; }
      if (a === "del") { state.layers.splice(idx, 1); state.selected = Math.min(state.selected, state.layers.length - 1); refreshPanel(); render(); return; }
      state.selected = idx; refreshPanel(); render();
    };
    list.prepend(row); // top of the list is drawn on top
  });
  refreshLayerControls();
  refreshTools();
}

function swap(i, j) {
  [state.layers[i], state.layers[j]] = [state.layers[j], state.layers[i]];
  state.selected = j;
  refreshPanel(); render();
}

function refreshLayerControls() {
  const box = $("#layerctl"), L = state.layers[state.selected];
  if (!L) { box.innerHTML = '<p class="hint">Open NIfTI files (.nii or .nii.gz) with the button above, or drop them anywhere on this page. The first file sets the field of view.</p>'; return; }
  const i = L.info;
  box.innerHTML = `
    <h3>${esc(L.name)}</h3>
    <label>Colour map <select id="cm">${CMAPS.map(c => `<option ${c === L.cmap ? "selected" : ""}>${c}</option>`).join("")}</select></label>
    <div class="range">
      <label>${L.cmap.startsWith("mask") ? "Threshold" : "Min"} <input id="mn" type="number" step="any" value="${+L.min.toPrecision(5)}"></label>
      <label ${L.cmap.startsWith("mask") ? 'style="display:none"' : ""}>Max <input id="mx" type="number" step="any" value="${+L.max.toPrecision(5)}"></label>
      <button id="auto" title="Reset to the 0.5–99.5 % range">Auto</button>
      <button id="sym" title="Symmetric range around 0 (for differences)">± sym</button>
      <button id="same" title="Give the other images (not masks or labels) this same min and max, so their intensities can be compared">Same for all</button>
    </div>
    <label>Opacity <input id="op" type="range" min="0" max="1" step="0.05" value="${L.alpha}"></label>
    <div class="checks">
      <label><input id="ol" type="checkbox" ${L.outline ? "checked" : ""}> Outline only</label>
      <label><input id="cb" type="checkbox" ${L.clipBelow ? "checked" : ""}> Transparent below min</label>
    </div>
    ${L.vol.frames() > 1 ? `<label>Volume <input id="fr" type="number" min="0" max="${L.vol.frames() - 1}" value="${L.frame}"> of ${L.vol.frames()}</label>` : ""}
    <details><summary>Header</summary><table class="hdr">
      <tr><td>Dimensions</td><td>${i.dims.join(" × ")}</td></tr>
      <tr><td>Voxel size</td><td>${i.pixdim.map(p => +p.toFixed(4)).join(" × ")} mm</td></tr>
      <tr><td>Data type</td><td>${esc(i.datatype)}</td></tr>
      <tr><td>Voxel axes point to</td><td>${i.axis_codes}</td></tr>
      <tr><td>Transform</td><td>${esc(i.xform)}</td></tr>
      <tr><td>Min / max</td><td>${fmtVal(i.min)} / ${fmtVal(i.max)}</td></tr>
      <tr><td>Affine</td><td class="aff">${i.affine.slice(0, 3).map(r => r.map(x => x.toFixed(3)).join("  ")).join("<br>")}</td></tr>
    </table></details>`;
  const upd = () => { refreshLayerControls(); render(); };
  $("#cm").onchange = e => {
    L.cmap = e.target.value;
    L.overlayStyle = false;
    if (L.cmap.startsWith("mask")) { L.min = 0.5; }
    upd();
  };
  $("#mn").onchange = e => { L.min = parseFloat(e.target.value); render(); };
  $("#mx").onchange = e => { L.max = parseFloat(e.target.value); render(); };
  $("#auto").onclick = () => { L.min = L.info.robust[0]; L.max = L.info.robust[1]; upd(); };
  $("#sym").onclick = () => { const m = Math.max(Math.abs(L.min), Math.abs(L.max)); L.min = -m; L.max = m; upd(); };
  $("#same").onclick = () => {
    for (const o of state.layers) if (!o.cmap.startsWith("mask") && o.cmap !== "labels") { o.min = L.min; o.max = L.max; }
    upd();
  };
  $("#op").oninput = e => { L.alpha = parseFloat(e.target.value); render(); };
  $("#ol").onchange = e => { L.outline = e.target.checked; render(); };
  $("#cb").onchange = e => { L.clipBelow = e.target.checked; render(); };
  const fr = $("#fr");
  if (fr) fr.onchange = e => {
    L.frame = Math.max(0, Math.min(L.vol.frames() - 1, parseInt(e.target.value) || 0));
    L.vol.set_frame(L.frame); L.info = JSON.parse(L.vol.info_json()); upd();
  };
}

function refreshTools() {
  const opts = state.layers.map((L, i) => `<option value="${i}">${esc(L.name)}</option>`).join("");
  $("#diffA").innerHTML = opts;
  $("#diffB").innerHTML = opts;
  if (state.layers.length > 1) $("#diffB").value = String(state.layers.length - 2);
}

function makeDifference() {
  const A = state.layers[+$("#diffA").value], B = state.layers[+$("#diffB").value];
  if (!A || !B || A === B) { status("Pick two different images.", true); return; }
  const d = A.vol.difference(B.vol);
  const info = JSON.parse(d.info_json());
  const m = +info.abs_p90.toPrecision(2) || 1;
  addLayer(`${A.name} − ${B.name}`, d, { cmap: "blue-white-red", min: -m, max: m, clipBelow: false, alpha: 1, linear: false });
}

// ---- screenshots --------------------------------------------------------------------------
function screenshot() {
  const shown = shownViews();
  if (!shown.length || !state.layers.length) return;
  const gap = 4 * (window.devicePixelRatio || 1);
  const W = shown.reduce((s, v) => s + v.canvas.width, 0) + gap * (shown.length - 1);
  const H = Math.max(...shown.map(v => v.canvas.height));
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);
  let x = 0;
  for (const v of shown) { ctx.drawImage(v.canvas, x, 0); x += v.canvas.width + gap; }
  const name = `${state.layers[state.layers.length - 1].name}_${state.layout}.png`.replace(/[^\w.+-]+/g, "_");
  c.toBlob(b => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  status(`Saved ${name}`);
}

// ---- interaction --------------------------------------------------------------------------
let activeView = null;
function setupView(plane, panel) {
  const wrap = document.createElement("div");
  wrap.className = "view";
  const canvas = document.createElement("canvas");
  wrap.appendChild(canvas);
  $("#views").appendChild(wrap);
  const view = { plane, wrap, canvas, zoom: 1, pan: [0, 0], layer: null };
  if (panel) {
    // panels share zoom and pan, so zooming or panning one moves them all
    Object.defineProperty(view, "zoom", { get: () => linked.zoom, set: z => { linked.zoom = z; } });
    Object.defineProperty(view, "pan", { get: () => linked.pan, set: p => { linked.pan = p; } });
    panels.push(view);
  } else views[plane] = view;
  const dpr = () => window.devicePixelRatio || 1;
  const pos = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * dpr(), (e.clientY - r.top) * dpr()]; };
  let drag = null;
  canvas.addEventListener("mouseenter", () => { activeView = view; });
  canvas.addEventListener("contextmenu", e => e.preventDefault());
  canvas.addEventListener("mousedown", e => {
    if (!state.layers.length) return;
    const [x, y] = pos(e);
    if (e.button === 2 || e.shiftKey) { drag = { pan: true, x, y, p0: [...view.pan] }; return; }
    drag = { pan: false };
    state.cursor = pixelToWorld(view, x, y);
    render();
  });
  window.addEventListener("mousemove", e => {
    if (!drag) return;
    const [x, y] = pos(e);
    if (drag.pan) {
      const g = viewGeometry(view);
      view.pan = [drag.p0[0] - g.hs * (x - drag.x) * g.scale, drag.p0[1] + (y - drag.y) * g.scale];
    } else state.cursor = pixelToWorld(view, x, y);
    render();
  });
  window.addEventListener("mouseup", () => { drag = null; });
  canvas.addEventListener("wheel", e => {
    if (!state.layers.length) return;
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      view.zoom = Math.max(0.5, Math.min(40, view.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
    } else moveSlice(view, e.deltaY < 0 ? 1 : -1);
    render();
  }, { passive: false });
  canvas.addEventListener("dblclick", () => { view.zoom = 1; view.pan = [0, 0]; render(); });
}

function moveSlice(view, dir) {
  const n = PLANES[view.plane].n;
  state.cursor[n] += dir * voxelStep(n);
}

window.addEventListener("keydown", e => {
  if (!state.layers.length || ["INPUT", "SELECT"].includes(document.activeElement.tagName)) return;
  const v = activeView && activeView.wrap.style.display !== "none" ? activeView : shownViews()[0];
  if (e.key === "ArrowUp" || e.key === "PageUp") moveSlice(v, 1);
  else if (e.key === "ArrowDown" || e.key === "PageDown") moveSlice(v, -1);
  else if (e.key === "+" || e.key === "=") v.zoom = Math.min(40, v.zoom * 1.25);
  else if (e.key === "-") v.zoom = Math.max(0.5, v.zoom / 1.25);
  else return;
  e.preventDefault();
  render();
});

async function openFiles(files) {
  for (const f of files) await addFile(f.name, new Uint8Array(await f.arrayBuffer()));
}

function init() {
  initSync({ module: WASM_BYTES });
  ["ax", "cor", "sag"].forEach(p => setupView(p, false));
  for (let i = 0; i < 3; i++) setupView("ax", true);
  $("#open").onclick = () => $("#file").click();
  $("#file").onchange = e => { openFiles([...e.target.files]); e.target.value = ""; };
  document.addEventListener("dragover", e => { e.preventDefault(); document.body.classList.add("drop"); });
  document.addEventListener("dragleave", e => { if (!e.relatedTarget) document.body.classList.remove("drop"); });
  document.addEventListener("drop", e => {
    e.preventDefault(); document.body.classList.remove("drop");
    openFiles([...e.dataTransfer.files]);
  });
  $("#layout").onchange = e => { state.layout = e.target.value; render(); };
  $("#sbs").onchange = e => {
    state.sideBySide = e.target.checked;
    if (state.sideBySide) { state.layers.forEach(toPanelStyle); refreshLayerControls(); }
    if (state.sideBySide && state.layout === "ortho") { state.layout = "ax"; $("#layout").value = "ax"; }
    render();
  };
  $("#radio").onchange = e => { state.radiological = e.target.value === "radiological"; render(); };
  $("#xhair").onchange = e => { state.crosshair = e.target.checked; render(); };
  $("#cbar").onchange = e => { state.colorbar = e.target.checked; render(); };
  $("#lett").onchange = e => { state.letters = e.target.checked; render(); };
  $("#shot").onclick = screenshot;
  $("#diff").onclick = makeDifference;
  window.addEventListener("resize", render);
  refreshPanel();
  render();
  // ?load=a.nii.gz,b.nii.gz loads files by URL when the page is served over http(s).
  const q = new URLSearchParams(location.search);
  if (q.get("layout")) { state.layout = q.get("layout"); $("#layout").value = state.layout; }
  if (q.get("sbs")) { state.sideBySide = true; $("#sbs").checked = true; }
  if (q.get("same")) setTimeout(() => $("#same") && $("#same").click(), 3000); // testing only
  if (q.get("load")) (async () => {
    for (const u of q.get("load").split(",")) {
      try {
        const r = await fetch(u);
        if (!r.ok) throw new Error(r.status);
        await addFile(u.split("/").pop(), new Uint8Array(await r.arrayBuffer()));
      } catch (e) { status(`Could not load ${u}: ${e.message}`, true); }
    }
    if (q.get("setup")) applySetup(JSON.parse(q.get("setup")));
  })();
}

// For testing and for TA-prepared links: {"cursor":[x,y,z],"zoom":3,"layers":{"1":{"cmap":"...",...}}}
function applySetup(s) {
  if (s.cursor) state.cursor = s.cursor;
  if (s.zoom) allViews().forEach(v => { v.zoom = s.zoom; });
  if (s.pan) allViews().forEach(v => { v.pan = s.pan; });
  for (const [i, o] of Object.entries(s.layers || {})) Object.assign(state.layers[+i] || {}, o);
  if (s.selected !== undefined) state.selected = s.selected;
  if (s.diff) { $("#diffA").value = s.diff[0]; $("#diffB").value = s.diff[1]; makeDifference(); }
  refreshPanel();
  render();
}

init();
