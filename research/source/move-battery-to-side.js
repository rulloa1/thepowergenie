// Moves the home battery in the powered reveal photo from the front stone pier to the side wall.
// 1) The front pier is restored from the aligned blackout photo, colour-matched to the powered lighting.
// 2) A battery is drawn on the side wall below the utility meter, then the shrub branches are laid back over it.
// Usage: node move-battery.js <powered.jpg> <blackout.jpg> <out.jpg>
const { chromium } = require("C:/Users/roryulloa/node_modules/playwright-core");
const fs = require("fs");

(async () => {
  const [poweredPath, blackoutPath, out] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: "C:/Users/roryulloa/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe" });
  const p = await b.newPage();
  p.on("console", m => console.log("page:", m.text()));
  await p.setContent("<body></body>");
  const url = f => "data:image/jpeg;base64," + fs.readFileSync(f).toString("base64");
  const dataUrl = await p.evaluate(async ({ pw, bo }) => {
    const load = async src => { const im = new Image(); im.src = src; await im.decode(); return im; };
    const [P, B] = await Promise.all([load(pw), load(bo)]);
    const W = P.naturalWidth, H = P.naturalHeight;
    if (B.naturalWidth !== W || B.naturalHeight !== H) throw new Error("size mismatch");
    const mk = im => { const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(im, 0, 0); return [c, g]; };
    const [pc, pg] = mk(P), [, bg] = mk(B);

    // --- 1. restore the front pier ---------------------------------------------------
    // Colour transfer from a clean stone sample above the battery, per channel (mean/std).
    const stats = (g, x, y, w, h) => {
      const d = g.getImageData(x, y, w, h).data, n = d.length / 4, m = [0, 0, 0], v = [0, 0, 0];
      for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) m[c] += d[i + c];
      for (let c = 0; c < 3; c++) m[c] /= n;
      for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) v[c] += (d[i + c] - m[c]) ** 2;
      return { m, s: v.map(x => Math.sqrt(x / n) || 1) };
    };
    const sample = [1446, 806, 60, 44];
    const sp = stats(pg, ...sample), sb = stats(bg, ...sample);
    console.log("stone mean powered", sp.m.map(Math.round), "blackout", sb.m.map(Math.round));
    const R = { x: 1432, y: 850, w: 92, h: 266 }, feather = 6;
    const pd = pg.getImageData(R.x, R.y, R.w, R.h), bd = bg.getImageData(R.x, R.y, R.w, R.h).data;
    for (let yy = 0; yy < R.h; yy++) for (let xx = 0; xx < R.w; xx++) {
      const i = (yy * R.w + xx) * 4;
      const edge = Math.min(xx, yy, R.w - 1 - xx, R.h - 1 - yy);
      const a = Math.min(1, edge / feather);
      for (let c = 0; c < 3; c++) {
        const v = (bd[i + c] - sb.m[c]) * (sp.s[c] / sb.s[c]) + sp.m[c];
        pd.data[i + c] = pd.data[i + c] * (1 - a) + Math.max(0, Math.min(255, v)) * a;
      }
    }
    pg.putImageData(pd, R.x, R.y);

    // --- 2. battery on the side wall -----------------------------------------------------
    const before = pg.getImageData(1900, 975, 70, 175); // kept for the branch overlay
    const poly = (pts, fill) => { pg.beginPath(); pg.moveTo(...pts[0]); for (const q of pts.slice(1)) pg.lineTo(...q); pg.closePath(); pg.fillStyle = fill; pg.fill(); };
    const top = 987, bot = 1130, x0 = 1912, edgeW = 24, faceW = 11, slope = 0.54;
    // soft contact shadow on the wall
    pg.save(); pg.filter = "blur(4px)"; poly([[x0 + 2, top + 4], [x0 + edgeW + faceW + 4, top + 10], [x0 + edgeW + faceW + 4, bot + 10], [x0 + 2, bot + 4]], "rgba(0,0,0,.45)"); pg.restore();
    // conduit up to the meter
    pg.fillStyle = "#3b3f45"; pg.fillRect(x0 + 9, 968, 4, top - 968 + 2);
    // street-facing edge (lit by the warm sky) and the main face receding along the wall
    const edge = pg.createLinearGradient(x0, top, x0 + edgeW, top);
    edge.addColorStop(0, "#8a8781"); edge.addColorStop(0.5, "#9e9991"); edge.addColorStop(1, "#928d86");
    poly([[x0, top], [x0 + edgeW, top - 1], [x0 + edgeW, bot - 1], [x0, bot]], edge);
    const face = pg.createLinearGradient(x0 + edgeW, top, x0 + edgeW + faceW, top);
    face.addColorStop(0, "#6c6a66"); face.addColorStop(1, "#5b5956");
    poly([[x0 + edgeW, top - 1], [x0 + edgeW + faceW, top - 1 + faceW * slope], [x0 + edgeW + faceW, bot - 1 + faceW * slope], [x0 + edgeW, bot - 1]], face);
    // rounded top highlight and a seam between the two stacked modules
    poly([[x0, top], [x0 + edgeW, top - 1], [x0 + edgeW, top + 2], [x0, top + 3]], "rgba(255,240,215,.35)");
    poly([[x0, 1058], [x0 + edgeW, 1057], [x0 + edgeW, 1059], [x0, 1060]], "rgba(60,60,60,.45)");
    // teal status light on each module, like the original units
    for (const y of [1022, 1094]) {
      pg.save(); pg.shadowColor = "rgba(80,230,210,.8)"; pg.shadowBlur = 6;
      poly([[x0 + 5, y], [x0 + edgeW - 5, y - 0.5], [x0 + edgeW - 5, y + 1.6], [x0 + 5, y + 2]], "rgba(110,225,210,.85)");
      pg.restore();
    }
    // --- 3. lay the bare shrub branches back over the lower part of the battery --------------
    const now = pg.getImageData(1900, 975, 70, 175), o = before.data, n = now.data;
    for (let yy = 0; yy < 175; yy++) {
      if (975 + yy < 1004) continue; // above the shrubs the wall is stone, not branches
      for (let xx = 0; xx < 70; xx++) {
        const i = (yy * 70 + xx) * 4;
        const lum = (0.2126 * o[i] + 0.7152 * o[i + 1] + 0.0722 * o[i + 2]) / 255;
        const t = Math.min(1, Math.max(0, (lum - 0.17) / 0.1));
        const a = t * t * (3 - 2 * t) * 0.6;
        for (let c = 0; c < 3; c++) n[i + c] = n[i + c] * (1 - a) + o[i + c] * a;
      }
    }
    pg.putImageData(now, 1900, 975);
    return pc.toDataURL("image/jpeg", 0.9);
  }, { pw: url(poweredPath), bo: url(blackoutPath) });
  fs.writeFileSync(out, Buffer.from(dataUrl.split(",")[1], "base64"));
  console.log("wrote", out, fs.statSync(out).size);
  await b.close();
})();
