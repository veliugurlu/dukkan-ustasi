/* Dükkan Ustası — oyun durumu ve işlemler.
 * Para değiştiren her işlem buradan geçer. UI parayı asla doğrudan değiştirmez.
 * Her işlem { ok, reason?, goals?, ... } döndürür; goals = bu işlemle tamamlanan hedefler. */
(function (root) {
  'use strict';
  var DU = (root.DU = root.DU || {});
  var C = DU.CONFIG;
  var E = DU.Economy;

  var G = {
    /** Test için değiştirilebilir rastgele sayı kaynağı (0..1). */
    rng: Math.random,

    rand: function (min, max) { return min + G.rng() * (max - min); },
    randInt: function (min, max) { return Math.floor(G.rand(min, max + 1)); },

    pickWeighted: function (list, weightOf) {
      var total = 0, i;
      for (i = 0; i < list.length; i++) total += weightOf(list[i]);
      var r = G.rng() * total;
      for (i = 0; i < list.length; i++) { r -= weightOf(list[i]); if (r < 0) return list[i]; }
      return list[list.length - 1];
    },

    pickDemand: function () { return G.pickWeighted(C.demand, function (d) { return d.weight; }).id; },
    rollMarket: function () { return G.randInt(C.marketRoll.min, C.marketRoll.max); },

    emptyStats: function () {
      return { totalProfit: 0, sold: 0, bought: 0, repairs: 0, revenue: 0, bestDeal: 0,
        profitableSales: 0, inspections: 0, upgradesBought: 0, rentPaid: 0, defectsFound: 0,
        haggleTries: 0, haggleWins: 0, ordersDone: 0, perfectRepairs: 0, soldByItem: {} };
    },

    newState: function () {
      var s = {
        version: C.saveVersion,
        money: C.startMoney,
        debt: 0,
        day: 1,
        level: 1,
        xp: 0,
        upgrades: { atolye: 0, vitrin: 0, depo: 0, uzman: 0, ag: 0 },
        inventory: [],
        offers: [],
        orders: [],
        event: null,
        stats: G.emptyStats(),
        today: { profit: 0, sales: 0 },
        goalIndex: 0,
        log: [],
        settings: { sound: true },
        tutorialSeen: false,
        newsSeen: 3,
        helpUsed: false,
        nextUid: 1
      };
      G.generateOffers(s);
      // İlk gün öğretici bir sipariş: ucuz bir eşyayı tamirli getir.
      var cheap = E.unlockedItems(1).slice().sort(function (a, b) { return a.base - b.base; })[G.randInt(0, 1)];
      s.orders.push(G.makeOrder(s, cheap, { minCond: 80, days: 3 }));
      return s;
    },

    uid: function (s) { return s.nextUid++; },

    /** opts.fair: makul fiyatlı teklif (her gün en az bir tane). opts.clean: kusursuz. */
    makeOffer: function (s, def, opts) {
      opts = opts || {};
      // Makul teklif: yıpranmış (tamirle çok değerlenir) ve uygun fiyatlı.
      var cond = G.randInt(C.offerCondition.min, opts.fair ? 45 : C.offerCondition.max);
      var maxAsk = opts.fair ? Math.min(C.askFactor.max, 0.92) : C.askFactor.max;
      var askF = G.rand(C.askFactor.min, maxAsk);
      var factor = askF * (1 - E.buyDiscount(s)) * E.eventAsk(s);
      var price = Math.max(10, Math.round(E.valueAt(def.base, cond) * factor));
      var chance = C.defectChance.base + C.defectChance.perItemLevel * def.minLevel;
      var defect = !opts.clean && G.rng() < chance ? G.pickWeighted(C.defects, function () { return 1; }).id : null;
      var auto = (s.upgrades.uzman || 0) >= 2;
      return { uid: G.uid(s), defId: def.id, condition: cond, demand: G.pickDemand(), price: price,
        defect: defect, inspected: auto, haggled: false,
        askF: Math.round(askF * 100) / 100, mood: Math.round(G.rand(-0.12, 0.12) * 100) / 100 };
    },

    /* ---------------- Siparişler ---------------- */
    makeOrder: function (s, def, opts) {
      opts = opts || {};
      var minCond = opts.minCond || (G.rng() < 0.5 ? 60 : Math.min(100, E.repairTarget(s)));
      return {
        uid: G.uid(s), defId: def.id, minCond: minCond,
        mult: Math.round(G.rand(C.orders.mult.min, C.orders.mult.max) * 100) / 100,
        expires: s.day + (opts.days || G.randInt(C.orders.days.min, C.orders.days.max)),
        customer: C.customers[G.randInt(0, C.customers.length - 1)]
      };
    },

    /** Süresi geçen siparişleri sil, şansa göre yeni sipariş ekle. */
    refreshOrders: function (s) {
      var expired = s.orders.filter(function (o) { return o.expires < s.day; });
      s.orders = s.orders.filter(function (o) { return o.expires >= s.day; });
      var max = s.level >= 4 ? C.orders.maxAtLevel4 : C.orders.max;
      var added = [];
      if (s.orders.length < max && G.rng() < C.orders.chancePerDay) {
        var pool = E.unlockedItems(s.level);
        var o = G.makeOrder(s, G.pickWeighted(pool, function (d) { return 1 + d.minLevel * 0.4; }));
        s.orders.push(o);
        added.push(o);
      }
      return { expired: expired, added: added };
    },

    /** Günün tekliflerini üretir. İlk teklif her zaman ucuz ve makul fiyatlıdır (kilitlenme önleme);
     *  ilk gün kusursuzdur ki öğretici akış sorunsuz ilerlesin. */
    generateOffers: function (s) {
      var pool = E.unlockedItems(s.level);
      var cheap = pool.slice().sort(function (a, b) { return a.base - b.base; }).slice(0, 3);
      var n = E.offerSlots(s);
      var offers = [G.makeOffer(s, cheap[G.randInt(0, cheap.length - 1)], { fair: true, clean: s.day === 1 })];
      for (var i = 1; i < n; i++) {
        // Yeni açılan pahalı eşyalara biraz daha ağırlık ver.
        offers.push(G.makeOffer(s, G.pickWeighted(pool, function (d) { return 1 + d.minLevel * 0.5; })));
      }
      // Sırayı karıştır ki "iyi teklif hep en üstte" olmasın.
      for (var k = offers.length - 1; k > 0; k--) {
        var j = Math.floor(G.rng() * (k + 1)), t = offers[k]; offers[k] = offers[j]; offers[j] = t;
      }
      s.offers = offers;
      return offers;
    },

    addLog: function (s, type, text, amount) {
      s.log.unshift({ day: s.day, type: type, text: text, amount: amount });
      if (s.log.length > C.logLimit) s.log.length = C.logLimit;
    },

    findIndex: function (arr, uid) {
      for (var i = 0; i < arr.length; i++) if (arr[i].uid === uid) return i;
      return -1;
    },

    /* ---------------- Hedefler ---------------- */

    goalMetric: function (s, metric) {
      if (metric === 'money') return s.money;
      if (metric === 'level') return s.level;
      if (metric === 'daysPassed') return s.day - 1;
      if (metric.indexOf('sold_') === 0) return s.stats.soldByItem[metric.slice(5)] || 0;
      return s.stats[metric] || 0;
    },

    currentGoal: function (s) { return DU.GOALS[s.goalIndex] || null; },

    goalProgress: function (s) {
      var g = G.currentGoal(s);
      if (!g) return null;
      var cur = Math.min(g.target, Math.max(0, G.goalMetric(s, g.metric)));
      return { goal: g, cur: cur, target: g.target, index: s.goalIndex, total: DU.GOALS.length };
    },

    /** Sıradaki hedef(ler) tamamlandıysa ödülü ver ve ilerle. */
    checkGoals: function (s) {
      var done = [];
      var g = G.currentGoal(s);
      while (g && G.goalMetric(s, g.metric) >= g.target) {
        s.money += g.reward;
        G.addLog(s, 'goal', 'Hedef: ' + g.title, g.reward);
        done.push(g);
        s.goalIndex++;
        g = G.currentGoal(s);
      }
      return done;
    },

    finish: function (s, res) { res.goals = G.checkGoals(s); return res; },

    /* ---------------- İşlemler ---------------- */

    /** Teklifi satın almadan önce incele: gizli kusur var mı? */
    inspect: function (s, offerUid) {
      var idx = G.findIndex(s.offers, offerUid);
      if (idx < 0) return { ok: false, reason: 'Bu teklif artık geçerli değil.' };
      var o = s.offers[idx];
      if (o.inspected) return { ok: false, reason: 'Bu eşya zaten incelendi.' };
      var cost = E.inspectCost(s, o);
      if (s.money < cost) return { ok: false, reason: 'İnceleme için paran yetmiyor.' };
      s.money -= cost;
      o.inspected = true;
      s.stats.inspections++;
      if (cost) G.addLog(s, 'inspect', E.itemDef(o.defId).name + ' incelendi', -cost);
      return G.finish(s, { ok: true, cost: cost, offer: o, defect: E.defectDef(o.defect) });
    },

    /** Pazarlık: her teklifte bir kez. level 'az' (−%10) ya da 'cok' (−%22).
     *  Başarısızlıkta satıcı gidebilir (teklif silinir) ya da fiyatı artırabilir. */
    haggle: function (s, offerUid, level) {
      var idx = G.findIndex(s.offers, offerUid);
      if (idx < 0) return { ok: false, reason: 'Bu teklif artık geçerli değil.' };
      var o = s.offers[idx];
      var h = C.haggle[level];
      if (!h) return { ok: false, reason: 'Geçersiz pazarlık.' };
      if (o.haggled) return { ok: false, reason: 'Bu satıcıyla zaten pazarlık yaptın.' };
      var chance = E.haggleChance(s, o, level);
      var name = E.itemDef(o.defId).name;
      o.haggled = true;
      s.stats.haggleTries++;
      var before = o.price;
      if (G.rng() < chance) {
        o.price = Math.max(10, Math.round(o.price * (1 - h.discount)));
        s.stats.haggleWins++;
        G.addLog(s, 'haggle', name + ': pazarlık başarılı (' + before + ' → ' + o.price + ')', 0);
        return G.finish(s, { ok: true, result: 'win', before: before, price: o.price, chance: chance, offer: o });
      }
      if (G.rng() < h.leaveOnFail) {
        s.offers.splice(idx, 1);
        G.addLog(s, 'haggle', name + ': satıcı kızıp gitti', 0);
        return G.finish(s, { ok: true, result: 'left', before: before, chance: chance, offer: o });
      }
      if (h.raiseOnFail) o.price = Math.round(o.price * (1 + h.raiseOnFail));
      return G.finish(s, { ok: true, result: 'fail', before: before, price: o.price, chance: chance, offer: o });
    },

    /** Siparişi depodaki uygun bir eşyayla teslim et. */
    fulfillOrder: function (s, orderUid, itemUid) {
      var oi = G.findIndex(s.orders, orderUid);
      if (oi < 0) return { ok: false, reason: 'Bu sipariş artık geçerli değil.' };
      var order = s.orders[oi];
      var idx = G.findIndex(s.inventory, itemUid);
      if (idx < 0) return { ok: false, reason: 'Eşya bulunamadı.' };
      var item = s.inventory[idx];
      if (!E.orderMatches(order, item)) return { ok: false, reason: 'Bu eşya siparişin şartlarını karşılamıyor.' };
      var price = E.orderPrice(s, order, item);
      s.orders.splice(oi, 1);
      s.stats.ordersDone++;
      return G.completeSale(s, idx, price, ' (' + order.customer + ' siparişi)', { order: order });
    },

    buy: function (s, offerUid) {
      var idx = G.findIndex(s.offers, offerUid);
      if (idx < 0) return { ok: false, reason: 'Bu teklif artık geçerli değil.' };
      var offer = s.offers[idx];
      if (s.inventory.length >= E.capacity(s)) return { ok: false, reason: 'Depo dolu! Önce bir eşya sat ya da depoyu genişlet.' };
      if (s.money < offer.price) return { ok: false, reason: 'Paran yetmiyor.' };
      var def = E.itemDef(offer.defId);
      s.money -= offer.price;
      s.offers.splice(idx, 1);
      var item = {
        uid: offer.uid, defId: offer.defId, condition: offer.condition, demand: offer.demand,
        buyPrice: offer.price, repairSpent: 0, boughtDay: s.day, repaired: false,
        defect: offer.defect, defectFixed: false, market: G.rollMarket(), prevMarket: null
      };
      s.inventory.push(item);
      s.stats.bought++;
      if (item.defect) s.stats.defectsFound++;
      G.addLog(s, 'buy', def.name + ' alındı', -offer.price);
      return G.finish(s, { ok: true, item: item, cost: offer.price,
        surprise: !!(item.defect && !offer.inspected), defect: E.defectDef(item.defect) });
    },

    /** Depodaki eşyayı tamir et (kusur varsa o da giderilir).
     *  quality: tamir mini oyunu sonucu 'perfect' | 'good' | (boş) → ek durum puanı. */
    repair: function (s, itemUid, quality) {
      var idx = G.findIndex(s.inventory, itemUid);
      if (idx < 0) return { ok: false, reason: 'Eşya bulunamadı.' };
      var item = s.inventory[idx];
      if (!E.canRepair(s, item)) return { ok: false, reason: 'Bu eşya zaten en iyi durumda.' };
      var cost = E.repairCost(s, item);
      if (s.money < cost) return { ok: false, reason: 'Tamir için paran yetmiyor.' };
      var def = E.itemDef(item.defId);
      var before = item.condition;
      var fixedDefect = item.defect && !item.defectFixed ? E.defectDef(item.defect) : null;
      s.money -= cost;
      item.repairSpent += cost;
      var bonus = quality === 'perfect' ? C.repairBonus.perfect : quality === 'good' ? C.repairBonus.good : 0;
      item.condition = Math.min(100, Math.max(item.condition, E.repairTarget(s)) + bonus);
      item.defectFixed = true;
      item.repaired = true;
      s.stats.repairs++;
      if (quality === 'perfect') s.stats.perfectRepairs++;
      G.addLog(s, 'repair', def.name + ' tamir edildi', -cost);
      return G.finish(s, { ok: true, item: item, cost: cost, before: before, after: item.condition, bonus: bonus, fixedDefect: fixedDefect });
    },

    /** Depodaki eşyayı sat. Net kâr = satış − alış − tamir. Borç varsa satıştan kesilir. */
    sell: function (s, itemUid) {
      var idx = G.findIndex(s.inventory, itemUid);
      if (idx < 0) return { ok: false, reason: 'Eşya bulunamadı.' };
      return G.completeSale(s, idx, E.sellPrice(s, s.inventory[idx]), '', {});
    },

    /** Satışın ortak kısmı (normal satış ve sipariş teslimi). */
    completeSale: function (s, idx, price, note, extra) {
      var item = s.inventory[idx];
      var def = E.itemDef(item.defId);
      var profit = E.profit(price, item.buyPrice, item.repairSpent);
      var debtPaid = Math.min(s.debt, price);
      s.debt -= debtPaid;
      s.money += price - debtPaid;
      s.inventory.splice(idx, 1);
      s.stats.sold++;
      s.stats.revenue += price;
      s.stats.totalProfit += profit;
      if (profit > 0) s.stats.profitableSales++;
      if (profit > s.stats.bestDeal) s.stats.bestDeal = profit;
      s.stats.soldByItem[item.defId] = (s.stats.soldByItem[item.defId] || 0) + 1;
      s.today.profit += profit;
      s.today.sales++;
      G.addLog(s, 'sell', def.name + ' satıldı' + note + ' (kâr ' + (profit >= 0 ? '+' : '') + profit + ')', price);
      if (debtPaid) G.addLog(s, 'debt', 'Kira borcu ödendi', -debtPaid);
      var xp = E.xpForSale(profit);
      var lv = G.addXp(s, xp);
      var res = {
        ok: true, price: price, profit: profit, buyPrice: item.buyPrice, repairSpent: item.repairSpent,
        debtPaid: debtPaid, xp: xp, levelUps: lv.levelUps, unlocked: lv.unlocked, item: item
      };
      for (var k in extra) res[k] = extra[k];
      return G.finish(s, res);
    },

    /** XP ekle ve gerekirse seviye atlat. */
    addXp: function (s, amount) {
      var levelUps = 0, unlocked = [];
      if (s.level >= C.maxLevel) return { levelUps: 0, unlocked: unlocked };
      s.xp += amount;
      while (s.level < C.maxLevel && s.xp >= E.xpToNext(s.level)) {
        s.xp -= E.xpToNext(s.level);
        s.level++;
        levelUps++;
        DU.ITEMS.forEach(function (d) { if (d.minLevel === s.level) unlocked.push(d); });
        G.addLog(s, 'level', 'Dükkân seviye ' + s.level + ' oldu!', 0);
      }
      if (s.level >= C.maxLevel) s.xp = 0;
      return { levelUps: levelUps, unlocked: unlocked };
    },

    /** Geliştirme satın al. */
    buyUpgrade: function (s, upgId) {
      var def = null;
      DU.UPGRADES.forEach(function (u) { if (u.id === upgId) def = u; });
      if (!def) return { ok: false, reason: 'Geliştirme bulunamadı.' };
      var lvl = s.upgrades[upgId] || 0;
      var cost = E.upgradeCost(def, lvl);
      if (cost === null) return { ok: false, reason: 'Bu geliştirme en üst seviyede.' };
      var req = E.upgradeReqLevel(def, lvl);
      if (s.level < req) return { ok: false, reason: 'Dükkân seviyesi ' + req + ' gerekli.' };
      if (s.money < cost) return { ok: false, reason: 'Paran yetmiyor.' };
      s.money -= cost;
      s.upgrades[upgId] = lvl + 1;
      s.stats.upgradesBought++;
      if (upgId === 'uzman' && lvl + 1 >= 2) s.offers.forEach(function (o) { o.inspected = true; });
      G.addLog(s, 'upgrade', def.name + ' seviye ' + (lvl + 1), -cost);
      return G.finish(s, { ok: true, cost: cost, level: lvl + 1, def: def });
    },

    /** Gün sonu: kira ödenir, piyasa değişir, yeni teklifler gelir. */
    nextDay: function (s) {
      var report = { day: s.day, profit: s.today.profit, sales: s.today.sales };
      var rent = E.rent(s);
      var paid = Math.min(rent, s.money);
      s.money -= paid;
      s.debt += rent - paid;
      s.stats.rentPaid += paid;
      G.addLog(s, 'rent', 'Gün ' + s.day + ' kirası' + (paid < rent ? ' (eksik: borç ' + (rent - paid) + ')' : ''), -paid);

      s.day++;
      s.today = { profit: 0, sales: 0 };
      s.inventory.forEach(function (it) { it.prevMarket = it.market; it.market = G.rollMarket(); });

      // Günlük olay (teklifler üretilmeden önce seçilir; olay teklif sayısını/fiyatını etkileyebilir)
      s.event = null;
      if (DU.EVENTS && G.rng() < C.eventChance) {
        var ev = DU.EVENTS[G.randInt(0, DU.EVENTS.length - 1)];
        s.event = { id: ev.id };
        if (ev.itemSell) {
          var have = s.inventory.map(function (it) { return it.defId; });
          var pool = have.length && G.rng() < 0.5 ? have : E.unlockedItems(s.level).map(function (d) { return d.id; });
          s.event.defId = pool[G.randInt(0, pool.length - 1)];
        }
      }
      var ord = G.refreshOrders(s);

      var help = 0;
      var cheapest = Math.min.apply(null, E.unlockedItems(s.level).map(function (d) { return d.base; }));
      // Kilitlenme önleme: depo boş ve para en ucuz eşyaya bile yetmiyorsa destek gelir, borç silinir.
      if (s.inventory.length === 0 && s.money < C.neighborHelp.threshold && s.money < cheapest) {
        help = C.neighborHelp.amount;
        s.money += help;
        s.debt = 0;
        s.helpUsed = true;
        G.addLog(s, 'help', 'Esnaf komşundan destek', help);
      }
      G.generateOffers(s);
      report.rent = rent; report.paid = paid; report.debt = s.debt; report.help = help;
      report.event = s.event; report.ordersExpired = ord.expired; report.ordersAdded = ord.added;
      ord.expired.forEach(function (o) { G.addLog(s, 'order', o.customer + ' siparişi süresi doldu', 0); });
      return G.finish(s, { ok: true, day: s.day, help: help, report: report });
    }
  };

  DU.Game = G;
  if (typeof module !== 'undefined' && module.exports) module.exports = G;
})(typeof window !== 'undefined' ? window : globalThis);
