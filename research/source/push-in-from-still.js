// Renders a camera push from a still: full frame -> the side-wall battery.
// Sub-pixel canvas crops keep the motion smooth (ffmpeg zoompan rounds to whole pixels and jitters).
// Usage: node push-frames.js <still.jpg> <outDir> [seconds] [fps]
const { chromium } = require("C:/Users/roryulloa/node_modules/playwright-core");
const fs = require("fs");
const path = require("path");

(async () => {
  const [still, outDir, secs = "4", fps = "30"] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const N = Math.round(+secs * +fps);
  const b = await chromium.launch({ executablePath: "C:/Users/roryulloa/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe" });
  const p = await b.newPage();
  await p.setContent("<body></body>");
  await p.evaluate(async (src) => {
    const im = new Image(); im.src = src; await im.decode();
    window.__im = im;
    const c = document.createElement("canvas"); c.width = 1920; c.height = 1080;
    window.__g = c.getContext("2d"); window.__c = c;
  }, "data:image/jpeg;base64," + fs.readFileSync(still).toString("base64"));

  const BATTERY = [1930, 1058], ZMAX = 4.6;
  for (let start = 0; start < N; start += 10) {
    const frames = await p.evaluate(({ start, N, BATTERY, ZMAX }) => {
      const im = window.__im, g = window.__g, c = window.__c;
      const W = im.naturalWidth, H = im.naturalHeight, aspect = 1920 / 1080;
      const out = [];
      for (let i = start; i < Math.min(N, start + 10); i++) {
        const t = i / (N - 1);
        const zoom = 1 + (ZMAX - 1) * Math.pow(t, 2.4);        // dolly that accelerates toward the wall
        const pan = 1 - Math.pow(1 - t, 2.2);                  // aim at the battery early, so it stays in frame
        const ch = Math.min(H, W / aspect) / zoom, cw = ch * aspect;
        // end with the battery where the close-up clip has it (31% across, 55% down) so the dissolve lines up
        const tx = BATTERY[0] + (0.5 - 0.31) * cw, ty = BATTERY[1] + (0.5 - 0.55) * ch;
        let cx = W / 2 + (tx - W / 2) * pan, cy = H / 2 + (ty - H / 2) * pan;
        cx = Math.min(W - cw / 2, Math.max(cw / 2, cx)); cy = Math.min(H - ch / 2, Math.max(ch / 2, cy));
        g.imageSmoothingQuality = "high";
        g.drawImage(im, cx - cw / 2, cy - ch / 2, cw, ch, 0, 0, 1920, 1080);
        out.push(c.toDataURL("image/jpeg", 0.93));
      }
      return out;
    }, { start, N, BATTERY, ZMAX });
    frames.forEach((d, k) => fs.writeFileSync(path.join(outDir, `p_${String(start + k).padStart(4, "0")}.jpg`), Buffer.from(d.split(",")[1], "base64")));
  }
  console.log("frames:", N);
  await b.close();
})();
