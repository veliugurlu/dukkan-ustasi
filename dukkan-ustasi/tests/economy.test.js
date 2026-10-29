// Birim testleri — ek paket gerekmez: `node --test tests/`
const test = require('node:test');
const assert = require('node:assert/strict');

require('../www/js/config.js');
require('../www/js/economy.js');
require('../www/js/game.js');
require('../www/js/storage.js');
const DU = globalThis.DU;
const E = DU.Economy, G = DU.Game;

function seeded(seed) { // tekrarlanabilir rastgelelik
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function memStore() {
  const m = {};
  return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; }, _m: m };
}

test('başlangıç: 1000 para, en az 5 alınabilir eşya, teklifler var', () => {
  G.rng = seeded(1);
  const s = G.newState();
  assert.equal(s.money, 1000);
  assert.ok(E.unlockedItems(1).length >= 5);
  assert.equal(s.offers.length, E.offerSlots(s));
  assert.ok(s.offers.some(o => o.price <= s.money), 'en az bir teklif alınabilir olmalı');
});

test('değer formülü sınırları ve tam sayı', () => {
  assert.equal(E.valueAt(1000, 100), 1000);
  assert.equal(E.valueAt(1000, 0), 150);
  assert.ok(Number.isInteger(E.valueAt(333, 47)));
});

test('al → tamir → sat: para ve kâr birebir doğru', () => {
  G.rng = seeded(7);
  const s = G.newState();
  s.goalIndex = DU.GOALS.length; // hedef ödülleri hesabı karıştırmasın
  const offer = s.offers[0];
  const m0 = s.money;
  const b = G.buy(s, offer.uid);
  assert.ok(b.ok);
  assert.equal(s.money, m0 - offer.price);
  const it = s.inventory[0];
  const rc = E.repairCost(s, it);
  const r = G.repair(s, it.uid);
  assert.ok(r.ok);
  assert.equal(r.cost, rc);
  assert.equal(it.condition, E.repairTarget(s));
  assert.equal(s.money, m0 - offer.price - rc);
  const price = E.sellPrice(s, it);
  const sale = G.sell(s, it.uid);
  assert.ok(sale.ok);
  assert.equal(sale.price, price);
  assert.equal(sale.profit, price - offer.price - rc);
  assert.equal(s.money, m0 + sale.profit);
  assert.equal(s.stats.totalProfit, sale.profit);
  assert.equal(s.inventory.length, 0);
});

test('tamir edilmiş eşya tekrar tamir edilemez; çift satış olmaz', () => {
  G.rng = seeded(3);
  const s = G.newState();
  const uid = s.offers[0].uid;
  G.buy(s, uid);
  assert.ok(G.repair(s, uid).ok);
  assert.equal(G.repair(s, uid).ok, false);
  assert.ok(G.sell(s, uid).ok);
  assert.equal(G.sell(s, uid).ok, false);
  assert.equal(G.buy(s, uid).ok, false, 'aynı teklif iki kez alınamaz');
});

test('yetersiz para ve dolu depo engellenir, para negatife düşmez', () => {
  G.rng = seeded(5);
  const s = G.newState();
  s.goalIndex = DU.GOALS.length;
  s.money = 5;
  assert.equal(G.buy(s, s.offers[0].uid).ok, false);
  assert.equal(s.money, 5);
  s.money = 1e6;
  for (let d = 0; d < 10 && s.inventory.length < E.capacity(s); d++) {
    s.offers.slice().forEach(o => G.buy(s, o.uid));
    G.nextDay(s);
  }
  assert.equal(s.inventory.length, E.capacity(s));
  const r = G.buy(s, s.offers[0].uid);
  assert.equal(r.ok, false);
  assert.match(r.reason, /Depo dolu/);
});

test('denge: tekliflerin bir kısmı zararlı, her gün en az bir makul teklif var', () => {
  G.rng = seeded(11);
  let neg = 0, n = 0;
  for (let i = 0; i < 300; i++) {
    const s = G.newState();
    s.offers.forEach(o => { o.inspected = true; if (E.expectedProfit(s, o) < 0) neg++; n++; });
    assert.ok(s.offers.some(o => E.expectedProfit(s, o) > 0), 'her gün en az bir kârlı teklif olmalı');
  }
  const r = neg / n;
  assert.ok(r > 0.15 && r < 0.6, 'zararlı teklif oranı makul olmalı: ' + r.toFixed(2));
});

test('seviye atlama ve XP', () => {
  const s = G.newState();
  const need = E.xpToNext(1);
  const r = G.addXp(s, need + 5);
  assert.equal(s.level, 2);
  assert.equal(s.xp, 5);
  assert.equal(r.levelUps, 1);
  assert.ok(r.unlocked.some(d => d.id === 'kamera'));
});

test('geliştirme: seviye şartı, maliyet ve etkiler', () => {
  const s = G.newState();
  s.money = 100000;
  assert.equal(G.buyUpgrade(s, 'ag').ok, false, 'Esnaf Ağı seviye 2 ister');
  const cap0 = E.capacity(s);
  const r = G.buyUpgrade(s, 'depo');
  assert.ok(r.ok);
  assert.equal(s.money, 100000 - 300);
  assert.equal(E.capacity(s), cap0 + 2);
  assert.equal(G.buyUpgrade(s, 'depo').ok, false, 'seviye 2 gerekli');
  G.buyUpgrade(s, 'vitrin');
  const it = { defId: 'radyo', condition: 80, demand: 'normal' };
  assert.equal(E.sellPrice(s, it), Math.round(E.valueAt(280, 80) * 1.05));
  G.buyUpgrade(s, 'atolye');
  assert.equal(E.repairTarget(s), 85);
});

test('kilitlenme önleme: parasız ve depo boşsa destek gelir', () => {
  const s = G.newState();
  s.money = 10;
  s.goalIndex = DU.GOALS.length;
  const r = G.nextDay(s);
  assert.equal(r.help, DU.CONFIG.neighborHelp.amount);
  assert.equal(s.money, DU.CONFIG.neighborHelp.amount, 'kira 10 parayı alır, borç silinir, destek gelir');
  assert.equal(s.debt, 0);
});

test('kira: gün sonunda ödenir, yetmezse borç olur ve satıştan kesilir', () => {
  G.rng = seeded(21);
  const s = G.newState();
  s.goalIndex = DU.GOALS.length;
  const uid = s.offers[0].uid;
  G.buy(s, uid);
  s.money = 10;
  const rent = E.rent(s);
  const r = G.nextDay(s);
  assert.equal(r.report.paid, 10);
  assert.equal(s.debt, rent - 10);
  assert.equal(s.money, 0);
  const it = s.inventory[0];
  const price = E.sellPrice(s, it);
  const sale = G.sell(s, uid);
  assert.equal(sale.debtPaid, Math.min(rent - 10, price));
  assert.equal(s.money, price - sale.debtPaid);
  assert.equal(sale.profit, price - it.buyPrice - it.repairSpent, 'kâr hesabı borçtan etkilenmez');
});

test('gizli kusur: inceleme ücretli, satın alınca ortaya çıkar, tamiri pahalılaştırır', () => {
  G.rng = seeded(4);
  const s = G.newState();
  s.goalIndex = DU.GOALS.length;
  s.money = 100000;
  const def = DU.ITEMS[1];
  const clean = G.makeOffer(s, def, { clean: true });
  const bad = Object.assign({}, clean, { uid: G.uid(s), defect: 'mekanizma' });
  s.offers = [clean, bad];
  const ic = E.inspectCost(s, bad);
  assert.ok(ic >= DU.CONFIG.inspectMin);
  const m0 = s.money;
  const ins = G.inspect(s, bad.uid);
  assert.ok(ins.ok && ins.defect && ins.defect.id === 'mekanizma');
  assert.equal(s.money, m0 - ic);
  assert.equal(G.inspect(s, bad.uid).ok, false, 'iki kez incelenmez');
  assert.ok(E.expectedProfit(s, bad) < E.expectedProfit(s, clean), 'kusurlu teklifin kârı düşük görünmeli');
  G.buy(s, clean.uid); G.buy(s, bad.uid);
  const [a, b] = s.inventory;
  assert.ok(E.repairCost(s, b) > E.repairCost(s, a));
  assert.ok(E.sellPrice(s, b) < E.sellPrice(s, a) * 0.85, 'kusurlu satış cezası');
  G.repair(s, b.uid);
  assert.equal(b.defectFixed, true);
  assert.equal(E.canRepair(s, b), false);
});

test('Uzman Gözü: seviye 1 incelemeyi ücretsiz yapar', () => {
  const s = G.newState();
  s.level = 2; s.money = 5000;
  assert.ok(G.buyUpgrade(s, 'uzman').ok);
  assert.equal(E.inspectCost(s, s.offers[0]), 0);
});

test('hedefler sırayla tamamlanır ve ödül verir', () => {
  G.rng = seeded(8);
  const s = G.newState();
  assert.equal(G.currentGoal(s).id, 'ilk_alim');
  const m0 = s.money;
  const offer = s.offers[0];
  const r = G.buy(s, offer.uid);
  assert.equal(r.goals.length, 1);
  assert.equal(r.goals[0].id, 'ilk_alim');
  assert.equal(s.money, m0 - offer.price + DU.GOALS[0].reward);
  assert.equal(G.currentGoal(s).id, 'ilk_tamir');
  const gp = G.goalProgress(s);
  assert.equal(gp.cur, 0); assert.equal(gp.target, 1);
});

test('kayıt: kaydet/yükle aynı durumu verir', () => {
  G.rng = seeded(9);
  const store = memStore();
  const s = G.newState();
  G.buy(s, s.offers[0].uid);
  DU.Storage.save(s, store);
  const l = DU.Storage.load(store);
  assert.equal(l.status, 'loaded');
  assert.equal(l.state.money, s.money);
  assert.deepEqual(l.state.inventory, s.inventory);
  assert.deepEqual(l.state.offers, s.offers);
  assert.ok(l.state.nextUid > s.inventory[0].uid);
});

test('kayıt: bozuk veri çökertmez, yedeklenir', () => {
  const store = memStore();
  store.setItem(DU.CONFIG.saveKey, '{bozuk json');
  const l = DU.Storage.load(store);
  assert.equal(l.status, 'corrupt');
  assert.equal(l.state.money, 1000);
  assert.equal(store.getItem(DU.CONFIG.saveKey + '.bozuk'), '{bozuk json');
  store.setItem(DU.CONFIG.saveKey, JSON.stringify({ money: -50 }));
  assert.equal(DU.Storage.load(store).status, 'corrupt');
});

test('kayıt: v1 kaydı v2ye taşınır', () => {
  const store = memStore();
  store.setItem(DU.CONFIG.saveKey, JSON.stringify({
    version: 1, money: 1500, level: 2, day: 4, stats: { totalProfit: 300, sold: 3 },
    inventory: [{ uid: 9, defId: 'radyo', condition: 80, demand: 'normal', buyPrice: 100, repairSpent: 40 }],
    offers: [{ uid: 10, defId: 'abajur', condition: 40, demand: 'yuksek', price: 70 }], nextUid: 11
  }));
  const l = DU.Storage.load(store);
  assert.equal(l.status, 'loaded');
  assert.equal(l.state.version, 2);
  assert.equal(l.state.inventory[0].market, 100);
  assert.equal(l.state.offers[0].inspected, true);
  assert.equal(l.state.debt, 0);
  assert.equal(l.state.goalIndex, 0);
  assert.equal(l.state.stats.totalProfit, 300);
});

test('kayıt: bilinmeyen eşyalar ayıklanır', () => {
  const store = memStore();
  store.setItem(DU.CONFIG.saveKey, JSON.stringify({
    version: 1, money: 500, inventory: [
      { uid: 3, defId: 'yok', condition: 50, demand: 'normal', buyPrice: 10, repairSpent: 0 },
      { uid: 4, defId: 'radyo', condition: 50, demand: 'normal', buyPrice: 10, repairSpent: 0 }
    ]
  }));
  const l = DU.Storage.load(store);
  assert.equal(l.status, 'loaded');
  assert.equal(l.state.inventory.length, 1);
  assert.ok(l.state.nextUid >= 5);
});
