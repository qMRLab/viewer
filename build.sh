#!/bin/bash
# Build the viewer into one self-contained file, dist/labview.html (the wasm is inlined as base64).
set -euo pipefail
cd "$(dirname "$0")"
wasm-pack build --release --target web --out-dir pkg --no-typescript
mkdir -p dist
python3 - <<'EOF'
import base64, re
html = open("web/index.html").read()
glue = open("pkg/labview.js").read()
wasm = base64.b64encode(open("pkg/labview_bg.wasm", "rb").read()).decode()
app = open("web/app.js").read()
css = open("web/style.css").read()
for key, val in [("/*STYLE*/", css), ("/*GLUE*/", glue), ("/*WASM_B64*/", wasm), ("/*APP*/", app)]:
    assert html.count(key) == 1, key
    html = html.replace(key, val)
open("dist/labview.html", "w").write(html)
print(f"dist/labview.html: {len(html) / 1e6:.2f} MB")
EOF
