// Denge simülasyonu: iki bot (dikkatli / dikkatsiz) oyunu N gün oynar.
// Kullanım: node tools/balance.js [gün=40] [deneme=200]
require('../www/js/config.js');
require('../www/js/economy.js');
require('../www/js/game.js');
const DU = globalThis.DU, E = DU.Economy, G = DU.Game;

function smartDay(s) {
  // İyi oyuncu: inceler, yalnızca kârlı teklifleri alır, tamir eder, piyasa kötüyse bir gün bekler.
  const sellReady = () => s.inventory.slice().forEach(it => {
    if (E.canRepair(s, it)) { if (s.money < E.repairCost(s, it) && s.day - it.boughtDay >= 1) G.sell(s, it.uid); return; }
    if (s.orders.some(o => o.defId === it.defId)) return; // siparişi var, beklet
    if (it.market >= 93 || s.day - it.boughtDay >= 2) G.sell(s, it.uid);
  });
  sellReady();
  const order = ['depo', 'atolye', 'vitrin', 'uzman', 'ag'];
  for (const id of order) {
    const u = DU.UPGRADES.find(x => x.id === id), lvl = s.upgrades[id] || 0;
    const c = E.upgradeCost(u, lvl);
    if (c !== null && s.level >= E.upgradeReqLevel(u, lvl) && s.money > c * 1.5 + 500) { G.buyUpgrade(s, id); break; }
  }
  s.offers.slice().forEach(o => { if (!o.inspected && E.expectedProfit(s, o) > E.inspectCost(s, o) * 2) G.inspect(s, o.uid); });
  // Şişkin fiyatlı tekliflerde pazarlık dene
  s.offers.slice().forEach(o => { if ((o.askF || 1) > 1.1 && !o.haggled) G.haggle(s, o.uid, 'az'); });
  s.offers.slice().sort((a, b) => E.expectedProfit(s, b) - E.expectedProfit(s, a)).forEach(o => {
    const exp = E.expectedProfit(s, o);
    if (exp > o.price * 0.12 && s.money - o.price - E.repairCost(s, E.offerAsItem(o)) >= 0) G.buy(s, o.uid);
  });
  s.inventory.forEach(it => { if (E.canRepair(s, it)) G.repair(s, it.uid, G.rng() < 0.4 ? 'perfect' : 'good'); });
  // Siparişleri teslim et
  s.orders.slice().forEach(o => { const it = s.inventory.find(i => E.orderMatches(o, i)); if (it) G.fulfillOrder(s, o.uid, it.uid); });
  sellReady();
  G.nextDay(s);
}

function naiveDay(s) {
  // Her şeyi alır, incelemez, hemen tamir edip satar
  s.offers.slice().forEach(o => G.buy(s, o.uid));
  s.inventory.slice().forEach(it => { G.repair(s, it.uid); G.sell(s, it.uid); });
  G.nextDay(s);
}

function run(dayFn, days, trials) {
  const res = { profit: [], money: [], level: [], goals: [], debtDays: 0, lvl2: [], lvl3: [], lvl5: [], loss: 0, sales: 0 };
  for (let t = 0; t < trials; t++) {
    const s = G.newState();
    let l2 = null, l3 = null, l5 = null;
    for (let d = 0; d < days; d++) {
      const before = s.stats.sold, bp = s.stats.profitableSales;
      dayFn(s);
      res.sales += s.stats.sold - before;
      res.loss += (s.stats.sold - before) - (s.stats.profitableSales - bp);
      if (s.debt > 0) res.debtDays++;
      if (!l2 && s.level >= 2) l2 = s.day;
      if (!l3 && s.level >= 3) l3 = s.day;
      if (!l5 && s.level >= 5) l5 = s.day;
    }
    res.profit.push(s.stats.totalProfit); res.money.push(s.money); res.level.push(s.level); res.goals.push(s.goalIndex);
    res.lvl2.push(l2 || 999); res.lvl3.push(l3 || 999); res.lvl5.push(l5 || 999);
  }
  const med = a => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
  return {
    'medyan toplam kâr': med(res.profit), 'medyan kasa': med(res.money), 'medyan seviye': med(res.level), 'medyan hedef': med(res.goals),
    'sv2 günü': med(res.lvl2), 'sv3 günü': med(res.lvl3), 'sv5 günü': med(res.lvl5),
    'zararlı satış %': Math.round(100 * res.loss / Math.max(1, res.sales)),
    'borçlu gün %': Math.round(100 * res.debtDays / (days * trials))
  };
}

const days = +process.argv[2] || 40, trials = +process.argv[3] || 200;
console.log('Dikkatli oyuncu:', run(smartDay, days, trials));
console.log('Dikkatsiz oyuncu:', run(naiveDay, days, trials));
