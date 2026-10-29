/* Dükkan Ustası — saf ekonomi formülleri (DOM yok, test edilebilir). */
(function (root) {
  'use strict';
  var DU = (root.DU = root.DU || {});
  var C = DU.CONFIG;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function upg(state, id) { return (state.upgrades && state.upgrades[id]) || 0; }
  function findBy(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  var E = {
    clamp: clamp,
    itemDef: function (id) { return findBy(DU.ITEMS, id); },
    demandDef: function (id) { return findBy(C.demand, id) || C.demand[1]; },
    defectDef: function (id) { return id ? findBy(C.defects, id) : null; },

    /** Belirli durumdaki eşyanın piyasa değeri (tam sayı). */
    valueAt: function (base, condition) {
      var c = clamp(condition, 0, 100) / 100;
      return Math.round(base * (C.valueFloor + (1 - C.valueFloor) * c));
    },

    repairTarget: function (state) { return Math.min(100, C.repairBaseTarget + 5 * upg(state, 'atolye')); },
    repairDiscount: function (state) { return 0.08 * upg(state, 'atolye'); },
    sellBonus: function (state) { return 0.05 * upg(state, 'vitrin'); },
    buyDiscount: function (state) { return 0.03 * upg(state, 'ag'); },
    capacity: function (state) { return C.baseCapacity + 2 * upg(state, 'depo'); },

    offerSlots: function (state) {
      var n = C.baseOfferSlots + Math.floor((state.level - 1) / 2) + upg(state, 'ag');
      var ev = E.eventDef(state);
      return Math.min(C.maxOfferSlots, n) + ((ev && ev.extraOffers) || 0);
    },

    /* ---------------- Günlük olay ---------------- */
    eventDef: function (state) { return state.event ? findBy(DU.EVENTS || [], state.event.id) : null; },
    eventSell: function (state, defId) {
      var ev = E.eventDef(state);
      if (!ev) return 1;
      var m = ev.sell || 1;
      if (ev.itemSell && state.event.defId === defId) m *= ev.itemSell;
      return m;
    },
    eventRepair: function (state) { var ev = E.eventDef(state); return (ev && ev.repair) || 1; },
    eventAsk: function (state) { var ev = E.eventDef(state); return (ev && ev.ask) || 1; },
    eventText: function (state) {
      var ev = E.eventDef(state);
      if (!ev) return '';
      var d = state.event.defId ? E.itemDef(state.event.defId) : null;
      return ev.desc.replace('{item}', d ? d.name : 'Bir eşya');
    },

    /* ---------------- Pazarlık ---------------- */
    /** Pazarlık başarı şansı (0..1). level: 'az' | 'cok'. */
    haggleChance: function (state, offer, level) {
      var H = C.haggle, h = H[level];
      if (!h) return 0;
      var over = Math.max(0, (offer.askF || 1) - 1) * H.overpriceBonus;
      var p = h.base + (offer.mood || 0) + over + H.perAgLevel * upg(state, 'ag');
      return clamp(p, H.minChance, H.maxChance);
    },

    /* ---------------- Siparişler ---------------- */
    orderMatches: function (order, item) {
      return item.defId === order.defId && item.condition >= order.minCond && !(item.defect && !item.defectFixed);
    },
    /** Siparişte ödenen fiyat: günlük piyasa ve olaydan etkilenmez, sipariş çarpanı uygulanır. */
    orderPrice: function (state, order, item) {
      var def = E.itemDef(item.defId);
      if (!def) return 0;
      return Math.round(E.valueAt(def.base, item.condition) * E.demandDef(item.demand).mult *
        (1 + E.sellBonus(state)) * order.mult);
    },

    /** Gün sonunda ödenen kira. */
    rent: function (state) { return C.rent.base + C.rent.perLevel * (state.level - 1); },

    /** Teklifi inceleme ücreti (Uzman Gözü ile ücretsiz). */
    inspectCost: function (state, offer) {
      if (upg(state, 'uzman') >= 1) return 0;
      return Math.max(C.inspectMin, Math.round(offer.price * C.inspectRate));
    },

    /** Kusur varsa tamir maliyetine eklenen pay (0 = kusur yok). */
    defectExtra: function (state, item) {
      if (!item.defect || item.defectFixed) return 0;
      var d = E.defectDef(item.defect);
      if (!d) return 0;
      return d.extra * (upg(state, 'uzman') >= 2 ? 0.7 : 1);
    },

    canRepair: function (state, item) {
      return item.condition < E.repairTarget(state) || (!!item.defect && !item.defectFixed);
    },

    /** Tamir maliyeti (tam sayı). Tamir edilemiyorsa 0. */
    repairCost: function (state, item) {
      var def = E.itemDef(item.defId);
      if (!def || !E.canRepair(state, item)) return 0;
      var target = Math.max(item.condition, E.repairTarget(state));
      var gain = E.valueAt(def.base, target) - E.valueAt(def.base, item.condition);
      // Durumu zaten yüksek ama kusurlu eşya: kusur tamiri temel değerin %10'u üzerinden hesaplanır.
      var basis = Math.max(gain, Math.round(def.base * 0.1));
      var cost = basis * C.repairCostRate * (1 - E.repairDiscount(state)) * (1 + E.defectExtra(state, item)) * E.eventRepair(state);
      return Math.max(1, Math.round(cost));
    },

    /** Bugünkü piyasa çarpanı (yüzde → oran). */
    marketMult: function (item) { return (item.market || 100) / 100; },

    /** Şu anki durumla satış fiyatı (tam sayı). */
    sellPrice: function (state, item) {
      var def = E.itemDef(item.defId);
      if (!def) return 0;
      var p = E.valueAt(def.base, item.condition) * E.demandDef(item.demand).mult *
        E.marketMult(item) * (1 + E.sellBonus(state)) * E.eventSell(state, item.defId);
      if (item.defect && !item.defectFixed) p *= C.defectSellPenalty;
      return Math.round(p);
    },

    /** Tamir edilirse (kusur da giderilirse) elde edilecek satış fiyatı. */
    sellPriceIfRepaired: function (state, item) {
      var target = Math.max(item.condition, E.repairTarget(state));
      return E.sellPrice(state, { defId: item.defId, demand: item.demand, condition: target, market: item.market, defect: null });
    },

    /** Net kâr = satış − alış − harcanan tamir. */
    profit: function (salePrice, buyPrice, repairSpent) { return salePrice - buyPrice - repairSpent; },

    /** Teklifin satın alınırsa göründüğü hâli (kusur yalnızca incelendiyse bilinir). */
    offerAsItem: function (offer) {
      return { defId: offer.defId, condition: offer.condition, demand: offer.demand, market: 100,
        defect: offer.inspected ? offer.defect : null, defectFixed: false };
    },

    /** Pazardaki teklif için tahmini kâr (tamir edip normal piyasada satarsa). */
    expectedProfit: function (state, offer) {
      var item = E.offerAsItem(offer);
      return E.sellPriceIfRepaired(state, item) - offer.price - E.repairCost(state, item);
    },

    xpToNext: function (level) { return Math.round(120 * Math.pow(level, 1.5)); },

    xpForSale: function (profit) {
      if (profit <= 0) return C.xpLossSale;
      return C.xpBase + Math.floor(profit * C.xpPerProfit);
    },

    upgradeCost: function (upgDef, currentLevel) {
      return currentLevel >= upgDef.max ? null : upgDef.costs[currentLevel];
    },
    upgradeReqLevel: function (upgDef, currentLevel) {
      return currentLevel >= upgDef.max ? null : upgDef.reqLevel[currentLevel];
    },

    unlockedItems: function (level) {
      return DU.ITEMS.filter(function (d) { return d.minLevel <= level; });
    }
  };

  DU.Economy = E;
  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof window !== 'undefined' ? window : globalThis);
