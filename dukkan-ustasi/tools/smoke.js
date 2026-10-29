// Tarayıcı duman testi: oyunu açar, incele-al-tamir-sat-gün bitir döngüsünü oynar, ekran görüntüsü alır.
// Kullanım: node tools/smoke.js [ekran-görüntüsü-klasörü]   (Playwright gerekir)
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2] || '.';

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const check = (cond, msg) => { if (!cond) errors.push(msg); };
  for (const [name, vp] of [['telefon', { width: 390, height: 844 }], ['masaustu', { width: 1366, height: 820 }]]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: name === 'telefon' ? 2 : 1, isMobile: name === 'telefon', hasTouch: name === 'telefon' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(name + ': ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(name + ' console: ' + m.text()); });
    const shot = async (n, full) => page.screenshot({ path: `${out}/${name}_${n}.png`, fullPage: !!full });
    const rewards = () => page.evaluate(() => DU.GOALS.slice(0, DU.state.goalIndex).reduce((a, g) => a + g.reward, 0));

    await page.goto('file://' + path.resolve(__dirname, '../www/index.html'));
    await page.waitForTimeout(600);
    await shot('1_rehber');
    await page.click('#tutGo');
    await page.waitForTimeout(500);
    await shot('2_pazar');

    // Önce kusursuz bir teklifi seç (ilk gün en az bir tane garanti)
    const offer = await page.evaluate(() => DU.state.offers.find(o => !o.defect));
    check(!!offer, name + ': ilk gün kusursuz teklif yok');
    const m0 = await page.evaluate(() => DU.state.money);

    // İncele (kusursuz olanı) → hedef sırası "inceleme"ye gelmeden de inceleme yapılabilir
    await page.click(`[data-act="inspect"][data-uid="${offer.uid}"]`);
    await page.waitForTimeout(900);
    const inspectCost = await page.evaluate(() => DU.state.stats.inspections === 1 ? true : false);
    check(inspectCost, name + ': inceleme sayılmadı');
    const m1 = await page.evaluate(() => DU.state.money);

    await page.click(`[data-act="buy"][data-uid="${offer.uid}"]`);
    await page.waitForTimeout(900);
    const m2 = await page.evaluate(() => DU.state.money);
    check(m1 - m2 === offer.price - 50, `${name}: alış farkı hatalı ${m1 - m2} (fiyat ${offer.price}, hedef ödülü 50)`);
    await shot('3_hedef_ilerledi');

    await page.click('#goalGo');   // hedef çubuğu Depo'ya götürmeli
    await page.waitForTimeout(400);
    const onStorage = await page.evaluate(() => document.getElementById('view-storage').classList.contains('active'));
    check(onStorage, name + ': hedef "Git" butonu Depo sekmesini açmadı');
    await shot('4_depo');

    await page.click(`[data-act="repair"][data-uid="${offer.uid}"]`);
    await page.waitForTimeout(1700);
    const it = await page.evaluate(() => DU.state.inventory[0]);
    await page.click(`[data-act="sell"][data-uid="${offer.uid}"]`);
    await page.waitForTimeout(450);
    await shot('5_satis_onay');
    const expected = await page.evaluate((it) => DU.Economy.sellPrice(DU.state, it), it);
    await page.click('#confirmSell');
    await page.waitForTimeout(2200);
    const after = await page.evaluate(() => ({ money: DU.state.money, profit: DU.state.stats.totalProfit }));
    const expProfit = expected - it.buyPrice - it.repairSpent;
    check(after.profit === expProfit, `${name}: kâr ${after.profit} != ${expProfit}`);
    const rw = await rewards();
    const inspected = m0 - m1;
    check(after.money === m0 - inspected + expProfit + rw, `${name}: para ${after.money} != ${m0 - inspected + expProfit + rw}`);

    // Kayıt: sayfayı yenile
    await page.reload();
    await page.waitForTimeout(600);
    const reloaded = await page.evaluate(() => DU.state.money);
    check(reloaded === after.money, `${name}: kayıt sonrası para ${reloaded} != ${after.money}`);

    // Gün bitir akışı
    await page.click('.tab[data-view="shop"]');
    await page.waitForTimeout(300);
    await shot('6_dukkan', name === 'telefon');
    await page.click('#nextDayBtn');
    await page.waitForTimeout(450);
    await shot('7_gun_bitir');
    const before = await page.evaluate(() => ({ m: DU.state.money, d: DU.state.day, rent: DU.Economy.rent(DU.state) }));
    await page.click('#confirmDay');
    await page.waitForTimeout(1500);
    const nd = await page.evaluate(() => ({ m: DU.state.money, d: DU.state.day }));
    check(nd.d === before.d + 1, name + ': gün ilerlemedi');

    // Kusurlu bir eşyayı habersiz al → sürpriz penceresi
    await page.evaluate(() => {
      DU.state.money = 5000;
      const o = DU.Game.makeOffer(DU.state, DU.ITEMS[3]);
      o.defect = 'elektrik'; o.inspected = false;
      DU.state.offers.unshift(o);
      DU.UI.renderAll();
    });
    await page.click('.tab[data-view="market"]');
    await page.waitForTimeout(300);
    const bad = await page.evaluate(() => DU.state.offers[0].uid);
    await page.click(`[data-act="buy"][data-uid="${bad}"]`);
    await page.waitForTimeout(800);
    const surprise = await page.evaluate(() => !document.getElementById('modalRoot').hidden && document.querySelector('.modal h3').textContent);
    check(surprise === 'Kötü sürpriz!', name + ': sürpriz penceresi çıkmadı');
    await shot('8_surpriz');
    await page.click('.modal .btn');
    await page.click('.tab[data-view="storage"]');
    await page.waitForTimeout(400);
    await shot('9_depo_kusurlu');

    await page.click('.tab[data-view="upgrades"]');
    await page.waitForTimeout(400);
    await shot('10_gelistir');

    // Dolu dükkân görünümü
    await page.evaluate(() => {
      const s = DU.state; s.inventory = []; s.level = 4; s.money = 9000; s.upgrades.depo = 2;
      DU.Game.generateOffers(s);
      for (let i = 0; i < 5; i++) { const o = s.offers[0]; if (o) DU.Game.buy(s, o.uid); }
      DU.UI.renderAll();
    });
    await page.click('.tab[data-view="shop"]');
    await page.waitForTimeout(700);
    await shot('11_dolu_dukkan');
    await ctx.close();
  }
  await browser.close();
  console.log(errors.length ? 'HATALAR:\n' + errors.join('\n') : 'Duman testi BAŞARILI');
  process.exit(errors.length ? 1 : 0);
})();
