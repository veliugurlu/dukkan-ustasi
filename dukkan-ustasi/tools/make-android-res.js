// Android simge ve açılış ekranı görsellerini www/assets/icon.svg'den üretir.
// Çıktı: resources/android/res/...  (bulut derlemesi bunları android/app/src/main/res üzerine kopyalar)
// Yalnızca simge değişince çalıştırılır. Playwright gerekir: node tools/make-android-res.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outRes = path.join(root, 'resources/android/res');
const icon = fs.readFileSync(path.join(root, 'www/assets/icon.svg'), 'utf8');
const BG = '#E0782E';
// Arka plansız simge (uyarlanabilir simgenin ön katmanı için): ilk iki <rect> arka plandır.
const glyph = icon.replace(/<rect width="512" height="512"[^>]*\/>/g, '');

const page = (body, w, h, bg) => `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;width:${w}px;height:${h}px;background:${bg};overflow:hidden}
  body{display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:system-ui,sans-serif}
  svg{display:block}
</style></head><body>${body}</body></html>`;

const svgAt = (svg, size) => svg.replace('<svg ', `<svg width="${size}" height="${size}" `);

const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const splashPort = { mdpi: [320, 480], hdpi: [480, 800], xhdpi: [720, 1280], xxhdpi: [960, 1600], xxxhdpi: [1280, 1920] };

(async () => {
  const browser = await chromium.launch();
  const p = await browser.newPage();
  async function render(file, html, w, h, transparent) {
    const dest = path.join(outRes, file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(html);
    await p.screenshot({ path: dest, omitBackground: !!transparent });
  }
  for (const [d, k] of Object.entries(densities)) {
    const s = Math.round(48 * k), f = Math.round(108 * k);
    await render(`mipmap-${d}/ic_launcher.png`, page(svgAt(icon, s), s, s, 'transparent'), s, s, true);
    await render(`mipmap-${d}/ic_launcher_round.png`,
      page(`<div style="width:${s}px;height:${s}px;border-radius:50%;background:${BG};display:flex;align-items:center;justify-content:center">${svgAt(glyph, Math.round(s * 0.92))}</div>`, s, s, 'transparent'), s, s, true);
    // Uyarlanabilir simge: güvenli alan 108dp içinde ~66dp
    await render(`mipmap-${d}/ic_launcher_foreground.png`, page(svgAt(glyph, Math.round(f * 0.7)), f, f, 'transparent'), f, f, true);
    const [pw, ph] = splashPort[d];
    const splash = (w, h) => page(`${svgAt(icon, Math.round(Math.min(w, h) * 0.36))}
      <div style="margin-top:${Math.round(Math.min(w, h) * 0.05)}px;color:#2b1d14;font-weight:900;font-size:${Math.round(Math.min(w, h) * 0.075)}px">Dükkan Ustası</div>`, w, h, '#f5ede0');
    await render(`drawable-port-${d}/splash.png`, splash(pw, ph), pw, ph);
    await render(`drawable-land-${d}/splash.png`, splash(ph, pw), ph, pw);
  }
  await render('drawable/splash.png', page(svgAt(icon, 140), 480, 320, '#f5ede0'), 480, 320);
  fs.mkdirSync(path.join(outRes, 'values'), { recursive: true });
  fs.writeFileSync(path.join(outRes, 'values/ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BG}</color>\n</resources>\n`);
  await browser.close();
  console.log('Android görselleri üretildi →', path.relative(root, outRes));
})();
