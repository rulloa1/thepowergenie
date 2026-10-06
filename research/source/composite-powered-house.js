// Builds the "powered" reveal image from the blackout photo, plus a matching web copy of the original.
// Coordinates below are in 1920-wide space and scaled to the source resolution at runtime.
// Usage: node composite.js <src.jpg> <outDir> [outWidth]
const { chromium } = require("C:/Users/roryulloa/node_modules/playwright-core");
const fs = require("fs");
const path = require("path");

(async () => {
  const [src, outDir, outW = "2400"] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: "C:/Users/roryulloa/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe" });
  const p = await b.newPage();
  p.on("console", m => console.log("page:", m.text()));
  await p.setContent("<body></body>");
  const data = "data:image/jpeg;base64," + fs.readFileSync(src).toString("base64");
  const out = await p.evaluate(async ({ data, outW }) => {
    const im = new Image(); im.src = data; await im.decode();
    const W = im.naturalWidth, H = im.naturalHeight, S = W / 1920;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    g.drawImage(im, 0, 0);
    const P = (x, y) => [x * S, y * S];

    function drawPanel(q) {
      const pts = q.map(([x, y]) => P(x, y));
      const poly = (ps) => { g.beginPath(); g.moveTo(...ps[0]); for (const pt of ps.slice(1)) g.lineTo(...pt); g.closePath(); };
      // frame
      poly(pts); g.fillStyle = "#15181d"; g.fill();
      g.lineWidth = 1.1 * S; g.strokeStyle = "rgba(150,165,185,.3)"; g.stroke();
      // glass: inset the quad slightly toward its centre
      const cx = pts.reduce((s, p) => s + p[0], 0) / 4, cy = pts.reduce((s, p) => s + p[1], 0) / 4;
      const inner = pts.map(([x, y]) => [cx + (x - cx) * 0.9, cy + (y - cy) * 0.86]);
      const grd = g.createLinearGradient(inner[3][0], inner[3][1], inner[1][0], inner[1][1]);
      grd.addColorStop(0, "#080f1c"); grd.addColorStop(0.55, "#10213c"); grd.addColorStop(1, "#1d375c");
      poly(inner); g.fillStyle = grd; g.fill();
      // cell grid lines
      g.strokeStyle = "rgba(120,150,195,.22)"; g.lineWidth = 0.6 * S;
      const lerp = (a, bb, t) => [a[0] + (bb[0] - a[0]) * t, a[1] + (bb[1] - a[1]) * t];
      for (const t of [0.25, 0.5, 0.75]) { const a = lerp(inner[0], inner[1], t), bb = lerp(inner[3], inner[2], t); g.beginPath(); g.moveTo(...a); g.lineTo(...bb); g.stroke(); }
      { const a = lerp(inner[0], inner[3], 0.5), bb = lerp(inner[1], inner[2], 0.5); g.beginPath(); g.moveTo(...a); g.lineTo(...bb); g.stroke(); }
      // sky reflection streak
      const hl = g.createLinearGradient(inner[0][0], inner[0][1], inner[2][0], inner[2][1]);
      hl.addColorStop(0, "rgba(160,190,230,0)"); hl.addColorStop(0.45, "rgba(160,190,230,.16)"); hl.addColorStop(0.6, "rgba(160,190,230,0)");
      poly(inner); g.fillStyle = hl; g.fill();
    }

    // --- 1. Solar panels -------------------------------------------------------
    // Rows run parallel to the eave and step up the roof along the rafter direction. Each row is
    // trimmed to sit between the plane's two sloped edges with a margin, so hip roofs get the
    // stepped, pyramid-shaped array installers actually use.
    const norm = ([x, y]) => { const l = Math.hypot(x, y); return [x / l, y / l]; };
    const add = (a, bb, k = 1) => [a[0] + bb[0] * k, a[1] + bb[1] * k];
    // parameter s where the line A + s*e crosses the line through p1, p2
    const cross = (A, e, [p1, p2]) => {
      const fx = p2[0] - p1[0], fy = p2[1] - p1[1];
      const den = e[0] * fy - e[1] * fx;
      return ((p1[0] - A[0]) * fy - (p1[1] - A[1]) * fx) / den;
    };
    function layoutPlane(pl) {
      const e = norm([pl.eave[1][0] - pl.eave[0][0], pl.eave[1][1] - pl.eave[0][1]]), d = norm(pl.rafter);
      const quads = [];
      for (let r = 0; r < pl.rows; r++) {
        const base = add(pl.eave[0], d, pl.inset + r * (pl.h + pl.gap));
        const top = add(base, d, pl.h);
        const left = Math.max(cross(base, e, pl.leftEdge), cross(top, e, pl.leftEdge)) + pl.margin;
        const right = Math.min(cross(base, e, pl.rightEdge), cross(top, e, pl.rightEdge)) - pl.margin;
        const n = Math.floor((right - left + pl.gap) / (pl.w + pl.gap));
        if (n < 1) break;
        const start = left + (right - left - (n * pl.w + (n - 1) * pl.gap)) / 2; // centre the row
        for (let i = 0; i < n; i++) {
          const s = start + i * (pl.w + pl.gap);
          const q = [add(base, e, s), add(base, e, s + pl.w), add(top, e, s + pl.w), add(top, e, s)];
          if (pl.avoid && pl.avoid(q)) continue;
          quads.push(q);
        }
      }
      return quads;
    }
    const nearBox = (q, [x0, y0, x1, y1]) => q.some(([x, y]) => x > x0 && x < x1 && y > y0 && y < y1) ||
      (() => { const xs = q.map(p => p[0]), ys = q.map(p => p[1]); return Math.min(...xs) < x1 && Math.max(...xs) > x0 && Math.min(...ys) < y1 && Math.max(...ys) > y0; })();
    const mainPlane = {
      eave: [[1127, 304], [1341, 281]], rafter: [-0.35, -1],
      leftEdge: [[1127, 304], [989, 177]], rightEdge: [[1341, 281], [1151, 148]],
      rows: 5, inset: 9, h: 23, w: 35, gap: 2.5, margin: 8,
      // skip the plumbing vent and anything right of it on those rows, so no panel sits stranded
      avoid: q => nearBox(q, [1203, 228, 1220, 264]) || (Math.min(...q.map(p => p[0])) > 1200 && Math.max(...q.map(p => p[1])) > 228),
    };
    const leftPlane = {
      eave: [[510, 383], [781, 339]], rafter: [-0.2, -1],
      leftEdge: [[510, 383], [811, 211]], rightEdge: [[776, 330], [890, 190]],
      rows: 2, inset: 9, h: 22, w: 33, gap: 2.5, margin: 9,
      avoid: q => nearBox(q, [754, 268, 780, 334]), // valley flashing
    };
    const panels = [...layoutPlane(mainPlane), ...layoutPlane(leftPlane)];
    panels.forEach(drawPanel);
    console.log("panels drawn: " + panels.length);

    // --- 2. Warm window light (frames stay dark) -----------------------------------
    const windows = [
      { x: 633, y: 391, w: 108, h: 101, k: 1.0 },  // upper left
      { x: 880, y: 346, w: 126, h: 117, k: 1.05 }, // upper centre
      { x: 1172, y: 341, w: 79, h: 92, k: 0.9 },   // upper right
      { x: 1384, y: 420, w: 13, h: 74, k: 0.75 },  // side wall, upper
      { x: 874, y: 564, w: 135, h: 142, k: 1.1 },  // ground floor
      { x: 1150, y: 560, w: 100, h: 190, k: 0.55 }, // front door glass (dim)
    ];
    const smooth = (a, bb, x) => { const t = Math.min(1, Math.max(0, (x - a) / (bb - a))); return t * t * (3 - 2 * t); };
    for (const wdw of windows) {
      const [X, Y] = P(wdw.x, wdw.y), Wd = Math.round(wdw.w * S), Ht = Math.round(wdw.h * S);
      const img = g.getImageData(Math.round(X), Math.round(Y), Wd, Ht), d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i] / 255, gg = d[i + 1] / 255, bl = d[i + 2] / 255;
        const lum = 0.2126 * r + 0.7152 * gg + 0.0722 * bl;
        const px = (i / 4) % Wd, py = Math.floor(i / 4 / Wd);
        const vy = py / Ht, vx = px / Wd;
        // brighter toward the top centre like a ceiling light, a little texture from the original glass
        const falloff = 0.78 + 0.32 * (1 - vy) - 0.18 * Math.abs(vx - 0.5);
        const glass = smooth(0.09, 0.2, lum) * wdw.k;
        const tex = 0.75 + 0.6 * lum;
        const wr = 255 * Math.min(1, 1.0 * falloff * tex), wg = 255 * Math.min(1, 0.80 * falloff * tex), wb = 255 * Math.min(1, 0.52 * falloff * tex);
        d[i] = d[i] + (wr - d[i]) * glass; d[i + 1] = d[i + 1] + (wg - d[i + 1]) * glass; d[i + 2] = d[i + 2] + (wb - d[i + 2]) * glass;
      }
      g.putImageData(img, Math.round(X), Math.round(Y));
    }

    // --- 3. Glow and spill (screen blend) ---------------------------------------
    g.globalCompositeOperation = "screen";
    const glow = (x, y, r, color, a, sx = 1, sy = 1) => {
      g.save(); g.translate(...P(x, y)); g.scale(sx, sy);
      const grd = g.createRadialGradient(0, 0, 0, 0, 0, r * S);
      grd.addColorStop(0, color.replace("A", a)); grd.addColorStop(1, color.replace("A", 0));
      g.fillStyle = grd; g.beginPath(); g.arc(0, 0, r * S, 0, Math.PI * 2); g.fill(); g.restore();
    };
    const warm = "rgba(255,190,110,A)", hot = "rgba(255,226,170,A)";
    for (const wdw of windows.slice(0, 5)) glow(wdw.x + wdw.w / 2, wdw.y + wdw.h / 2, Math.max(wdw.w, wdw.h) * 0.95, warm, 0.22 * wdw.k);
    // porch downlight under the canopy, lantern by the door
    glow(1190, 524, 9, hot, 0.95); glow(1190, 560, 190, warm, 0.42, 1, 1.25);
    glow(1137, 612, 6, hot, 0.9); glow(1137, 612, 70, warm, 0.35);
    // garage sconces
    glow(548, 624, 6, hot, 0.9); glow(548, 640, 80, warm, 0.3);
    glow(812, 624, 6, hot, 0.85); glow(812, 640, 70, warm, 0.26);
    // light falling on the stone around the ground window and on the steps
    glow(940, 740, 150, warm, 0.18, 1.2, 0.8); glow(1190, 790, 160, warm, 0.2, 1.1, 0.7);
    // wet walkway reflections: tall soft streaks under the lit openings
    for (const [x, a] of [[940, 0.2], [1195, 0.24], [690, 0.1]]) glow(x, 930, 120, warm, a, 0.55, 1.4);
    g.globalCompositeOperation = "source-over";

    // --- 4. Export both images at the same size so the reveal lines up exactly ---------
    const ow = +outW, oh = Math.round(H * ow / W);
    const exp = (source) => { const o = document.createElement("canvas"); o.width = ow; o.height = oh; const og = o.getContext("2d"); og.imageSmoothingQuality = "high"; og.drawImage(source, 0, 0, ow, oh); return o.toDataURL("image/webp", 0.84); };
    return { powered: exp(c), blackout: exp(im), size: [ow, oh] };
  }, { data, outW });
  for (const k of ["powered", "blackout"]) {
    const f = path.join(outDir, `house-${k}.webp`);
    fs.writeFileSync(f, Buffer.from(out[k].split(",")[1], "base64"));
    console.log("wrote", f, fs.statSync(f).size, "bytes", out.size.join("x"));
  }
  await b.close();
})();
