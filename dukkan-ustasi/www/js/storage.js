/* Dükkan Ustası — localStorage kayıt sistemi.
 * - Sürüm numarası ve migrasyon (v1 → v2)
 * - Bozuk kayıtta çökmez: ham veriyi yedekler, yeni oyun başlatır
 * - Kayıt yazılamazsa (gizli sekme, kota) oyun çalışmaya devam eder */
(function (root) {
  'use strict';
  var DU = (root.DU = root.DU || {});
  var C = DU.CONFIG;

  function getStore(store) {
    if (store) return store;
    try { return root.localStorage || null; } catch (e) { return null; }
  }
  function isInt(v) { return typeof v === 'number' && isFinite(v) && Math.floor(v) === v; }
  function intOr(v, d) { return isInt(v) ? v : d; }
  function known(list, id) { return list.some(function (d) { return d.id === id; }); }
  function okDefect(id) { return id === null || id === undefined || known(C.defects, id); }

  /** Kaydı doğrular ve eksik alanları tamamlar. Geçersizse null döner. */
  function sanitize(raw) {
    if (!raw || typeof raw !== 'object') return null;
    if (!isInt(raw.money) || raw.money < 0) return null;
    var s = DU.Game.newState();
    s.money = raw.money;
    s.debt = Math.max(0, intOr(raw.debt, 0));
    s.day = isInt(raw.day) && raw.day > 0 ? raw.day : 1;
    s.level = isInt(raw.level) ? Math.max(1, Math.min(C.maxLevel, raw.level)) : 1;
    s.xp = Math.max(0, intOr(raw.xp, 0));
    DU.UPGRADES.forEach(function (u) {
      var v = raw.upgrades && raw.upgrades[u.id];
      s.upgrades[u.id] = isInt(v) ? Math.max(0, Math.min(u.max, v)) : 0;
    });
    var maxUid = 0;
    function okBase(it) {
      return it && isInt(it.uid) && known(DU.ITEMS, it.defId) && isInt(it.condition) &&
        it.condition >= 0 && it.condition <= 100 && known(C.demand, it.demand) && okDefect(it.defect);
    }
    s.inventory = (Array.isArray(raw.inventory) ? raw.inventory : []).filter(function (it) {
      return okBase(it) && isInt(it.buyPrice) && isInt(it.repairSpent);
    }).map(function (it) {
      maxUid = Math.max(maxUid, it.uid);
      return {
        uid: it.uid, defId: it.defId, condition: it.condition, demand: it.demand,
        buyPrice: it.buyPrice, repairSpent: it.repairSpent,
        boughtDay: intOr(it.boughtDay, s.day), repaired: !!it.repaired,
        defect: it.defect || null, defectFixed: !!it.defectFixed,
        market: isInt(it.market) ? Math.max(50, Math.min(150, it.market)) : 100,
        prevMarket: isInt(it.prevMarket) ? it.prevMarket : null
      };
    });
    var offers = (Array.isArray(raw.offers) ? raw.offers : []).filter(function (o) {
      return okBase(o) && isInt(o.price) && o.price > 0;
    }).map(function (o) {
      maxUid = Math.max(maxUid, o.uid);
      return { uid: o.uid, defId: o.defId, condition: o.condition, demand: o.demand, price: o.price,
        defect: o.defect || null, inspected: !!o.inspected };
    });
    var st = raw.stats || {};
    Object.keys(s.stats).forEach(function (k) {
      if (k === 'soldByItem') return;
      s.stats[k] = intOr(st[k], 0);
    });
    if (st.soldByItem && typeof st.soldByItem === 'object') {
      DU.ITEMS.forEach(function (d) { if (isInt(st.soldByItem[d.id])) s.stats.soldByItem[d.id] = st.soldByItem[d.id]; });
    }
    s.today = { profit: intOr(raw.today && raw.today.profit, 0), sales: intOr(raw.today && raw.today.sales, 0) };
    s.goalIndex = Math.max(0, Math.min(DU.GOALS.length, intOr(raw.goalIndex, 0)));
    s.log = Array.isArray(raw.log) ? raw.log.slice(0, C.logLimit).filter(function (l) {
      return l && typeof l.text === 'string';
    }) : [];
    s.settings = { sound: !(raw.settings && raw.settings.sound === false) };
    s.tutorialSeen = !!raw.tutorialSeen;
    s.helpUsed = !!raw.helpUsed;
    s.nextUid = Math.max(intOr(raw.nextUid, 1), maxUid + 1);
    if (offers.length) s.offers = offers;
    else DU.Game.generateOffers(s);
    return s;
  }

  /** Eski kayıt sürümlerini günceller. */
  function migrate(raw) {
    if (!raw || typeof raw !== 'object') return raw;
    var v = isInt(raw.version) ? raw.version : 1;
    if (v < 2) {
      // v2: gizli kusur, günlük piyasa, kira/borç, hedefler. Eski teklifler "incelenmiş ve temiz" sayılır.
      (raw.offers || []).forEach(function (o) { if (o) { o.defect = null; o.inspected = true; } });
      (raw.inventory || []).forEach(function (it) { if (it) { it.defect = null; it.market = 100; } });
      raw.debt = 0;
      raw.goalIndex = 0;
      v = 2;
    }
    raw.version = v;
    return raw;
  }

  var Storage = {
    sanitize: sanitize,
    migrate: migrate,

    /** { state, status: 'new' | 'loaded' | 'corrupt' } döndürür. */
    load: function (store) {
      var st = getStore(store);
      var text = null;
      try { text = st ? st.getItem(C.saveKey) : null; } catch (e) { text = null; }
      if (!text) return { state: DU.Game.newState(), status: 'new' };
      try {
        var raw = migrate(JSON.parse(text));
        if (raw && raw.version > C.saveVersion) throw new Error('Gelecek sürüm kaydı');
        var s = sanitize(raw);
        if (!s) throw new Error('Geçersiz kayıt');
        return { state: s, status: 'loaded' };
      } catch (e) {
        try { st.setItem(C.saveKey + '.bozuk', text); } catch (e2) { /* yoksay */ }
        return { state: DU.Game.newState(), status: 'corrupt' };
      }
    },

    save: function (state, store) {
      var st = getStore(store);
      if (!st) return false;
      try {
        state.version = C.saveVersion;
        state.savedAt = Date.now();
        st.setItem(C.saveKey, JSON.stringify(state));
        return true;
      } catch (e) { return false; }
    },

    reset: function (store) {
      var st = getStore(store);
      try { if (st) st.removeItem(C.saveKey); } catch (e) { /* yoksay */ }
    }
  };

  DU.Storage = Storage;
  if (typeof module !== 'undefined' && module.exports) module.exports = Storage;
})(typeof window !== 'undefined' ? window : globalThis);
