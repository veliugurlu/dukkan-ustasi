/* Dükkan Ustası — arayüz: çizim, olaylar, animasyonlar.
 * UI yalnızca DU.Game işlemlerini çağırır; parayı doğrudan değiştirmez. */
(function (root) {
  'use strict';
  var DU = (root.DU = root.DU || {});
  var E = DU.Economy, G = DU.Game, Art = DU.Art, Snd = DU.Audio;
  var doc = root.document;

  var S = null;            // oyun durumu
  var persist = null;      // kaydetme fonksiyonu
  var busy = false;        // çift tıklama / çift işlem kilidi
  var seen = {};           // ilk kez çizilen kartlara giriş animasyonu
  var shownMoney = 0;
  var moneyAnim = null;

  function $(id) { return doc.getElementById(id); }
  function fmt(n) { return Math.round(n).toLocaleString('tr-TR'); }
  function signed(n) { return (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n)); }
  function coin() { return '<span class="coin-mini">' + Art.icon('coin') + '</span>'; }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function condColor(c) { return 'hsl(' + Math.round(c * 1.2) + ', 62%, 45%)'; }
  function condLabel(c) {
    if (c >= 90) return 'Kusursuz'; if (c >= 75) return 'Çok iyi'; if (c >= 55) return 'İyi';
    if (c >= 35) return 'Yıpranmış'; return 'Kötü';
  }

  function artHtml(defId, cond) {
    var c = cond / 100;
    var f = 'saturate(' + (0.35 + 0.65 * c).toFixed(2) + ') sepia(' + ((1 - c) * 0.55).toFixed(2) + ') brightness(' + (0.86 + 0.14 * c).toFixed(2) + ')';
    return '<div class="art" style="filter:' + f + '">' + Art.item(defId) + '</div>' +
      '<div class="dust" style="opacity:' + Math.max(0, (0.75 - c) * 1.3).toFixed(2) + '"></div>';
  }

  function condBar(cond) {
    return '<div class="cond"><div class="cond-top"><span>Durum: ' + condLabel(cond) + '</span><span>%' + cond + '</span></div>' +
      '<div class="bar"><i style="width:' + cond + '%;background:' + condColor(cond) + '"></i></div></div>';
  }

  function demandChip(id) {
    var d = E.demandDef(id);
    return '<span class="chip chip-' + d.id + '" title="Satış fiyatını etkiler">Talep: ' + d.label + '</span>';
  }

  function defectChip(defectId, known) {
    if (!known) return '<span class="chip chip-unknown" title="Satın alınca ya da incelenince ortaya çıkar">' + Art.icon('search') + 'Kusur: ?</span>';
    var d = E.defectDef(defectId);
    if (!d) return '<span class="chip chip-clean">' + Art.icon('check') + 'Temiz</span>';
    return '<span class="chip chip-defect" title="Tamir maliyetini artırır">' + Art.icon('warn') + esc(d.name) + '</span>';
  }

  function marketText(it) {
    var m = it.market || 100;
    var arrow = it.prevMarket ? (m > it.prevMarket ? ' ▲' : m < it.prevMarket ? ' ▼' : '') : '';
    var cls = m >= 103 ? 'pos' : m <= 94 ? 'neg' : '';
    return '<b class="' + cls + '">%' + m + arrow + '</b>';
  }

  function fillIcons(scope) {
    var els = (scope || doc).querySelectorAll('[data-icon]');
    for (var i = 0; i < els.length; i++) {
      if (!els[i].firstChild) els[i].innerHTML = Art.icon(els[i].getAttribute('data-icon'));
    }
  }

  function save() { if (persist) persist(); }

  /* ---------------- Efektler ---------------- */
  function rectOf(el) {
    if (!el || !el.getBoundingClientRect) return { x: root.innerWidth / 2, y: root.innerHeight / 2 };
    var r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  function floatNum(el, amount, text) {
    var p = rectOf(el);
    var d = doc.createElement('div');
    d.className = 'float-num ' + (amount >= 0 ? 'pos' : 'neg');
    d.style.left = p.x + 'px'; d.style.top = (p.y - 10) + 'px';
    d.textContent = text || signed(amount);
    $('fxLayer').appendChild(d);
    setTimeout(function () { d.remove(); }, 1200);
  }
  function flyCoins(fromEl, count) {
    var a = rectOf(fromEl), b = rectOf($('money'));
    for (var i = 0; i < count; i++) {
      (function (i) {
        var c = doc.createElement('div');
        c.className = 'fly-coin';
        c.innerHTML = Art.icon('coin');
        c.style.left = (a.x - 11 + (Math.random() * 40 - 20)) + 'px';
        c.style.top = (a.y - 11 + (Math.random() * 30 - 15)) + 'px';
        $('fxLayer').appendChild(c);
        setTimeout(function () {
          c.style.transform = 'translate(' + (b.x - a.x) + 'px,' + (b.y - a.y) + 'px) scale(.6)';
          c.style.opacity = '0.2';
        }, 30 + i * 60);
        setTimeout(function () { c.remove(); }, 900 + i * 60);
      })(i);
    }
  }
  function confetti(count) {
    var colors = ['#f4b73f', '#e0782e', '#2c9a62', '#2f6f9f', '#cf4430', '#ffd56b'];
    var cx = root.innerWidth / 2, cy = root.innerHeight / 3;
    for (var i = 0; i < (count || 40); i++) {
      var c = doc.createElement('div');
      c.className = 'confetti';
      c.style.left = cx + 'px'; c.style.top = cy + 'px';
      c.style.background = colors[i % colors.length];
      c.style.setProperty('--dx', (Math.random() * 360 - 180) + 'px');
      c.style.setProperty('--dy', (Math.random() * 380 + 60) + 'px');
      c.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      c.style.animationDelay = (Math.random() * 0.15) + 's';
      $('fxLayer').appendChild(c);
      setTimeout((function (el) { return function () { el.remove(); }; })(c), 1700);
    }
  }
  function toast(text, kind) {
    var t = doc.createElement('div');
    t.className = 'toast ' + (kind || '');
    t.textContent = text;
    $('toasts').appendChild(t);
    setTimeout(function () { t.remove(); }, 2800);
    var all = $('toasts').children;
    if (all.length > 3) all[0].remove();
  }
  function fail(reason, el) {
    Snd.play('error');
    toast(reason, 'err');
    var m = $('money');
    m.classList.remove('down'); void m.offsetWidth; m.classList.add('down');
    if (el) { el.classList.remove('down'); }
  }

  /* ---------------- Para sayacı ---------------- */
  function renderMoney(animate) {
    var target = S.money;
    var el = $('moneyValue');
    if (moneyAnim) cancelAnimationFrame(moneyAnim);
    if (!animate || !root.requestAnimationFrame) { shownMoney = target; el.textContent = fmt(target); }
    else {
      var from = shownMoney, t0 = null, dur = 550;
      var step = function (ts) {
        if (!t0) t0 = ts;
        var k = Math.min(1, (ts - t0) / dur);
        k = 1 - Math.pow(1 - k, 3);
        shownMoney = Math.round(from + (target - from) * k);
        el.textContent = fmt(shownMoney);
        if (k < 1) moneyAnim = requestAnimationFrame(step);
      };
      moneyAnim = requestAnimationFrame(step);
      var m = $('money');
      m.classList.remove('bump', 'down'); void m.offsetWidth;
      m.classList.add(target >= from ? 'bump' : 'down');
    }
    $('registerScreen').textContent = fmt(target);
  }

  /* ---------------- Üst çubuk ---------------- */
  function renderHeader() {
    $('dayLabel').textContent = 'Gün ' + S.day;
    $('levelNum').textContent = S.level;
    var need = E.xpToNext(S.level);
    $('xpFill').style.width = (S.level >= DU.CONFIG.maxLevel ? 100 : Math.min(100, S.xp / need * 100)) + '%';
    var b = $('storageBadge');
    b.textContent = S.inventory.length;
    b.classList.toggle('show', S.inventory.length > 0);
    var dl = $('debtLabel');
    dl.hidden = !S.debt;
    dl.textContent = S.debt ? 'Borç ' + fmt(S.debt) : '';
    renderGoalBar();
  }

  /* ---------------- Hedef çubuğu ---------------- */
  var lastGoalIndex = -1;
  function renderGoalBar() {
    var gp = G.goalProgress(S);
    var bar = $('goalBar');
    var tabs = doc.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('pulse');
    if (!gp) {
      bar.innerHTML = '<div class="goal-ico">' + Art.icon('star') + '</div><div class="goal-text"><small>TÜM HEDEFLER TAMAM</small><b>Usta oldun! Serbest oyun: rekor kârını kır.</b></div>';
      return;
    }
    var g = gp.goal;
    var pct = Math.round(gp.cur / gp.target * 100);
    var showNum = gp.target > 1;
    bar.innerHTML =
      '<div class="goal-ico">' + Art.icon('target') + '</div>' +
      '<div class="goal-text' + (gp.target > 1 ? ' has-num' : '') + '"><small>HEDEF ' + (gp.index + 1) + '/' + gp.total + ' · Ödül +' + fmt(g.reward) + '</small>' +
      '<b>' + esc(g.title) + '</b>' +
      '<div class="goal-prog"><i style="width:' + pct + '%"></i></div>' +
      (showNum ? '<span class="goal-num">' + fmt(gp.cur) + ' / ' + fmt(gp.target) + '</span>' : '') + '</div>' +
      '<button class="btn btn-small btn-gold" id="goalGo">Git ›</button>';
    if (lastGoalIndex !== gp.index) {
      bar.classList.remove('fresh'); void bar.offsetWidth; bar.classList.add('fresh');
      lastGoalIndex = gp.index;
    }
    var active = doc.querySelector('.tab.active');
    if (!active || active.getAttribute('data-view') !== g.tab) {
      var t = doc.querySelector('.tab[data-view="' + g.tab + '"]');
      if (t) t.classList.add('pulse');
    }
  }

  function renderGoalList() {
    var html = '';
    var from = Math.max(0, S.goalIndex - 2), to = Math.min(DU.GOALS.length, S.goalIndex + 3);
    for (var i = from; i < to; i++) {
      var g = DU.GOALS[i];
      var st = i < S.goalIndex ? 'done' : i === S.goalIndex ? 'current' : 'next';
      html += '<li class="' + st + '"><span class="gl-ico">' + (st === 'done' ? Art.icon('check') : (i + 1)) + '</span>' +
        '<div><b>' + esc(g.title) + '</b>' + (st === 'current' ? '<small>' + esc(g.hint) + '</small>' : '') + '</div>' +
        '<em>+' + fmt(g.reward) + '</em></li>';
    }
    if (S.goalIndex >= DU.GOALS.length) html += '<li class="done"><span class="gl-ico">' + Art.icon('star') + '</span><div><b>Tüm hedefler tamamlandı!</b></div><em></em></li>';
    $('goalList').innerHTML = html;
    $('goalCount').textContent = Math.min(S.goalIndex, DU.GOALS.length) + '/' + DU.GOALS.length;
  }

  /* ---------------- Dükkân ---------------- */
  function renderShop() {
    var scene = $('scene');
    scene.className = 'scene';
    for (var l = 2; l <= S.level; l++) scene.classList.add('lvl-' + l);
    $('signStars').textContent = new Array(Math.min(5, Math.ceil(S.level / 2)) + 1).join('★');

    var cap = E.capacity(S);
    var perRow = Math.ceil(cap / 2);
    var html = '';
    for (var r = 0; r < 2; r++) {
      html += '<div class="shelf">';
      for (var i = r * perRow; i < Math.min(cap, (r + 1) * perRow); i++) {
        var it = S.inventory[i];
        if (it) html += '<div class="shelf-item" title="' + esc(E.itemDef(it.defId).name) + '">' + artHtml(it.defId, it.condition) + '</div>';
        else html += '<div class="shelf-item empty"></div>';
      }
      html += '</div>';
    }
    $('shelves').innerHTML = html;

    var st = S.stats;
    $('stats').innerHTML =
      stat('Bugünkü Kâr', '<span class="' + (S.today.profit >= 0 ? 'pos' : 'neg') + '">' + signed(S.today.profit) + '</span>') +
      stat('Toplam Kâr', '<span class="' + (st.totalProfit >= 0 ? 'pos' : 'neg') + '">' + signed(st.totalProfit) + '</span>') +
      stat('Depo', S.inventory.length + ' / ' + cap) +
      stat('Günlük Kira', '<span class="neg">−' + fmt(E.rent(S)) + '</span>');
    renderGoalList();

    var logHtml = S.log.length ? '' : '<li><em>Henüz işlem yok. Pazardan ilk eşyanı al!</em></li>';
    S.log.forEach(function (lg) {
      var cls = lg.amount > 0 ? 'pos' : lg.amount < 0 ? 'neg' : '';
      logHtml += '<li><span>Gün ' + lg.day + '</span><em>' + esc(lg.text) + '</em><b class="' + cls + '">' + (lg.amount ? signed(lg.amount) : '') + '</b></li>';
    });
    $('log').innerHTML = logHtml;
  }
  function stat(label, value) { return '<div class="stat"><small>' + label + '</small><strong>' + value + '</strong></div>'; }

  /* ---------------- Pazar ---------------- */
  function renderMarket() {
    var full = S.inventory.length >= E.capacity(S);
    if (!S.offers.length) {
      $('offers').innerHTML = '<div class="empty-msg"><strong>Bugünlük teklif kalmadı.</strong>Depodaki eşyalarını tamir edip sat, sonra “Günü Bitir”e bas.</div>';
      return;
    }
    $('offers').innerHTML = S.offers.map(function (o) {
      var def = E.itemDef(o.defId);
      var item = E.offerAsItem(o);
      var rc = E.repairCost(S, item);
      var sale = E.sellPriceIfRepaired(S, item);
      var exp = E.expectedProfit(S, o);
      var ic = E.inspectCost(S, o);
      var hint = full ? 'Depo dolu.' : S.money < o.price ? 'Paran yetmiyor (' + fmt(o.price - S.money) + ' eksik).' : '';
      var isNew = !seen['o' + o.uid]; seen['o' + o.uid] = 1;
      var risky = !o.inspected;
      return '<article class="card' + (isNew ? ' new' : '') + (o.inspected && o.defect ? ' bad' : '') + '" data-uid="' + o.uid + '">' +
        '<div class="card-art">' + artHtml(o.defId, o.condition) + '</div>' +
        '<div class="card-body">' +
        '<div class="card-title"><h4>' + esc(def.name) + '</h4>' + demandChip(o.demand) + '</div>' +
        '<div class="chips">' + defectChip(o.defect, o.inspected) + '</div>' +
        condBar(o.condition) +
        '<div class="price-lines">' +
        '<span>İstenen fiyat</span><b>' + fmt(o.price) + '</b>' +
        '<span>Tamir maliyeti' + (risky ? '*' : '') + '</span><b>' + (rc ? fmt(rc) : '—') + '</b>' +
        '<span>Tamirden sonra satış</span><b>~' + fmt(sale) + '</b>' +
        '<span class="total">Tahmini kâr' + (risky ? '*' : '') + '</span><b class="total ' + (exp >= 0 ? 'pos' : 'neg') + '">' + signed(exp) + '</b>' +
        '</div>' +
        (risky ? '<p class="note">* Gizli kusur varsa tamir pahalılaşır.</p>' : '') +
        '<div class="card-actions">' +
        (risky ? '<button class="btn btn-secondary" data-act="inspect" data-uid="' + o.uid + '"' + (S.money < ic ? ' disabled' : '') + '><span data-icon="search"></span>İncele' + (ic ? ' · ' + fmt(ic) : ' (ücretsiz)') + '</button>' : '') +
        '<button class="btn btn-primary" data-act="buy" data-uid="' + o.uid + '"' + (hint ? ' disabled' : '') + '>Satın Al · ' + coin() + fmt(o.price) + '</button></div>' +
        (hint ? '<p class="hint">' + hint + '</p>' : '') +
        '</div></article>';
    }).join('');
    fillIcons($('offers'));
  }

  /* ---------------- Depo ---------------- */
  function renderStorage(sparkleUid) {
    var cap = E.capacity(S);
    $('capacityText').textContent = S.inventory.length + ' / ' + cap + ' eşya · Tamir sonrası durum %' + E.repairTarget(S) + ' · Piyasa her gün değişir';
    if (!S.inventory.length) {
      $('inventory').innerHTML = '<div class="empty-msg"><strong>Depon boş.</strong>Pazardan eşya alıp burada tamir edip satabilirsin.</div>';
      return;
    }
    $('inventory').innerHTML = S.inventory.map(function (it) {
      var def = E.itemDef(it.defId);
      var canRep = E.canRepair(S, it);
      var rc = E.repairCost(S, it);
      var price = E.sellPrice(S, it);
      var profitNow = E.profit(price, it.buyPrice, it.repairSpent);
      var afterRep = E.sellPriceIfRepaired(S, it);
      var profitRep = E.profit(afterRep, it.buyPrice, it.repairSpent + rc);
      var isNew = !seen['i' + it.uid]; seen['i' + it.uid] = 1;
      var cls = 'card' + (isNew ? ' new' : '') + (sparkleUid === it.uid ? ' sparkle' : '');
      var chips = (it.repaired ? '<span class="chip chip-repaired">Tamirli</span>' : '') +
        (it.defect && !it.defectFixed ? defectChip(it.defect, true) : '');
      return '<article class="' + cls + '" data-uid="' + it.uid + '">' +
        '<div class="card-art">' + artHtml(it.defId, it.condition) + '</div>' +
        '<div class="card-body">' +
        '<div class="card-title"><h4>' + esc(def.name) + '</h4>' + demandChip(it.demand) + '</div>' +
        (chips ? '<div class="chips">' + chips + '</div>' : '') +
        condBar(it.condition) +
        '<div class="price-lines">' +
        '<span>Alış fiyatı</span><b>' + fmt(it.buyPrice) + '</b>' +
        '<span>Tamire harcanan</span><b>' + fmt(it.repairSpent) + '</b>' +
        '<span title="Alıcıların bugünkü fiyat seviyesi">Bugünkü piyasa</span>' + marketText(it) +
        '<span>Şimdi satış fiyatı</span><b>' + fmt(price) + '</b>' +
        '<span class="total">Şimdi satarsan kâr</span><b class="total ' + (profitNow >= 0 ? 'pos' : 'neg') + '">' + signed(profitNow) + '</b>' +
        (canRep ? '<span>Tamir edip satarsan</span><b class="' + (profitRep >= 0 ? 'pos' : 'neg') + '">' + signed(profitRep) + '</b>' : '') +
        '</div>' +
        '<div class="card-actions">' +
        (canRep ? '<button class="btn btn-blue" data-act="repair" data-uid="' + it.uid + '"' + (S.money < rc ? ' disabled' : '') + '><span data-icon="wrench"></span>Tamir · ' + fmt(rc) + '</button>' : '') +
        '<button class="btn btn-green" data-act="sell" data-uid="' + it.uid + '"><span data-icon="tag"></span>Sat · ' + fmt(price) + '</button>' +
        '</div>' +
        (canRep && S.money < rc ? '<p class="hint">Tamir için ' + fmt(rc - S.money) + ' para eksik.</p>' : '') +
        (!canRep && (it.market || 100) <= 94 ? '<p class="note">Piyasa bugün düşük. Yarın daha iyi olabilir, ama her gün kira ödersin.</p>' : '') +
        '</div></article>';
    }).join('');
    fillIcons($('inventory'));
  }

  /* ---------------- Geliştir ---------------- */
  function renderUpgrades(flashId) {
    var maxed = S.level >= DU.CONFIG.maxLevel;
    var need = E.xpToNext(S.level);
    var next = DU.ITEMS.filter(function (d) { return d.minLevel === S.level + 1; });
    $('levelCard').innerHTML =
      '<div class="level-badge">' + S.level + '</div><div>' +
      '<h2>' + (maxed ? 'Usta Dükkân!' : 'Dükkân Seviyesi ' + S.level) + '</h2>' +
      '<div class="bar"><i style="width:' + (maxed ? 100 : Math.min(100, S.xp / need * 100)) + '%"></i></div>' +
      '<small>' + (maxed ? 'En yüksek seviyeye ulaştın.' : 'XP ' + fmt(S.xp) + ' / ' + fmt(need) + ' · Her satış XP kazandırır, kârlı satış daha çok.') + '</small>' +
      (!maxed ? '<div class="unlock-list"><span class="chip">Sonraki seviye: +teklif şansı</span>' +
        next.map(function (d) { return '<span class="chip">Yeni eşya: ' + esc(d.name) + '</span>'; }).join('') + '</div>' : '') +
      '</div>';

    $('upgrades').innerHTML = DU.UPGRADES.map(function (u) {
      var lvl = S.upgrades[u.id] || 0;
      var cost = E.upgradeCost(u, lvl);
      var req = E.upgradeReqLevel(u, lvl);
      var pips = '';
      for (var i = 0; i < u.max; i++) pips += '<i class="' + (i < lvl ? 'on' : '') + '"></i>';
      var btn;
      if (cost === null) btn = '<button class="btn btn-secondary" disabled>En üst seviye</button>';
      else if (S.level < req) btn = '<button class="btn btn-secondary" disabled><span data-icon="lock"></span>Dükkân seviyesi ' + req + ' gerekli</button>';
      else btn = '<button class="btn btn-primary" data-act="upgrade" data-id="' + u.id + '"' + (S.money < cost ? ' disabled' : '') + '>Geliştir · ' + coin() + fmt(cost) + '</button>';
      var isNew = !seen['u' + u.id]; seen['u' + u.id] = 1;
      return '<div class="upg' + (isNew ? ' new' : '') + (flashId === u.id ? ' flash' : '') + '">' +
        '<div class="upg-head"><div class="upg-icon">' + Art.icon(u.icon) + '</div><div>' +
        '<h4>' + esc(u.name) + ' <small class="muted">Sv. ' + lvl + '/' + u.max + '</small></h4>' +
        '<div class="pips">' + pips + '</div></div></div>' +
        '<p>' + esc(u.desc) + '</p>' +
        '<div class="upg-effect">Şu an: ' + (lvl ? u.effect(lvl) : 'Etkisiz') +
        (cost !== null ? '<br>Sonraki: <b>' + u.effect(lvl + 1) + '</b>' : '') + '</div>' +
        btn + '</div>';
    }).join('');
    fillIcons($('upgrades'));
  }

  function renderAll(opts) {
    opts = opts || {};
    renderMoney(!!opts.animateMoney);
    renderHeader();
    renderShop();
    renderMarket();
    renderStorage(opts.sparkle);
    renderUpgrades(opts.flash);
  }

  /* ---------------- Sekmeler ---------------- */
  function showView(name) {
    var tabs = doc.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle('active', tabs[i].getAttribute('data-view') === name);
    var views = doc.querySelectorAll('.view');
    for (var j = 0; j < views.length; j++) views[j].classList.toggle('active', views[j].id === 'view-' + name);
    root.scrollTo && root.scrollTo(0, 0);
    if (S) renderGoalBar();
  }

  /* ---------------- Modal ---------------- */
  function openModal(html, onBind) {
    var r = $('modalRoot');
    r.innerHTML = '<div class="modal" role="dialog" aria-modal="true"><button class="close" data-close aria-label="Kapat">' + Art.icon('close') + '</button>' + html + '</div>';
    r.hidden = false;
    r.onclick = function (e) {
      if (e.target === r || e.target.closest('[data-close]')) closeModal();
    };
    if (onBind) onBind(r);
  }
  function closeModal() { var r = $('modalRoot'); r.hidden = true; r.innerHTML = ''; }

  function cardEl(container, uid) { return $(container).querySelector('.card[data-uid="' + uid + '"]'); }

  /* ---------------- İşlemler ---------------- */

  /** İşlemle tamamlanan hedefleri kutla. delay: diğer animasyonlardan sonra göstermek için. */
  function handleGoals(res, delay) {
    if (!res.goals || !res.goals.length) return;
    setTimeout(function () {
      res.goals.forEach(function (g, i) {
        setTimeout(function () {
          Snd.play('goal');
          toast('Hedef tamamlandı: ' + g.title + ' · +' + fmt(g.reward), 'gold');
          floatNum($('goalBar'), g.reward, '+' + fmt(g.reward));
          flyCoins($('goalBar'), 4);
        }, i * 700);
      });
      confetti(18);
      renderAll({ animateMoney: true });
    }, delay || 0);
  }

  function doInspect(uid, btn) {
    if (busy) return;
    var res = G.inspect(S, uid);
    if (!res.ok) return fail(res.reason);
    save();
    if (res.cost) floatNum(btn, -res.cost);
    var card = cardEl('offers', uid);
    if (card) { card.classList.add('scanning'); }
    busy = true;
    Snd.play('inspect');
    setTimeout(function () {
      busy = false;
      if (res.defect) { Snd.play('error'); toast('Dikkat! ' + res.defect.name + ' bulundu. Tamir pahalı olacak.', 'err'); }
      else { Snd.play('click'); toast('İnceleme temiz çıktı. Gizli kusur yok.', 'ok'); }
      renderAll({ animateMoney: !!res.cost });
      handleGoals(res, 300);
    }, 700);
  }

  function doBuy(uid, btn) {
    if (busy) return;
    var res = G.buy(S, uid);
    if (!res.ok) return fail(res.reason);
    busy = true;
    save();
    Snd.play('buy');
    floatNum(btn, -res.cost);
    var card = cardEl('offers', uid);
    if (card) card.classList.add('leaving');
    renderMoney(true);
    setTimeout(function () {
      busy = false;
      renderAll();
      if (res.surprise) showSurprise(res);
      else toast(E.itemDef(res.item.defId).name + ' depoya eklendi. Depo’da tamir edebilirsin.', 'ok');
      handleGoals(res, res.surprise ? 0 : 300);
    }, 330);
  }

  function showSurprise(res) {
    Snd.play('error');
    var it = res.item;
    openModal(
      '<div class="modal-hero shake-in">' + Art.item(it.defId) + '</div>' +
      '<h3 class="center">Kötü sürpriz!</h3>' +
      '<p class="center"><b>' + esc(E.itemDef(it.defId).name) + '</b> eve gelince açıldı: <b class="neg">' + esc(res.defect.name) + '</b>.</p>' +
      '<div class="breakdown">' +
      '<span>Tamir maliyeti</span><b class="neg">' + fmt(E.repairCost(S, it)) + '</b>' +
      '<span>Kusurlu hâliyle satış</span><b>' + fmt(E.sellPrice(S, it)) + '</b>' +
      '<span class="sum">Tamir edip satarsan kâr</span><b class="sum">' + signed(E.profit(E.sellPriceIfRepaired(S, it), it.buyPrice, E.repairCost(S, it))) + '</b>' +
      '</div>' +
      '<p style="margin-top:10px">İpucu: Satın almadan önce <b>İncele</b> butonunu kullan ya da <b>Uzman Gözü</b> geliştirmesini al.</p>' +
      '<div class="modal-actions single"><button class="btn btn-primary" data-close>Anladım</button></div>'
    );
  }

  function doRepair(uid, btn) {
    if (busy) return;
    var res = G.repair(S, uid);
    if (!res.ok) return fail(res.reason);
    busy = true;
    save();
    Snd.play('repair');
    floatNum(btn, -res.cost);
    renderMoney(true);
    var card = cardEl('inventory', uid);
    if (card) {
      card.classList.add('repairing');
      var btns = card.querySelectorAll('button');
      for (var i = 0; i < btns.length; i++) btns[i].disabled = true;
    }
    setTimeout(function () {
      busy = false;
      renderAll({ sparkle: uid });
      toast('Tamir tamam! Durum %' + res.before + ' → %' + res.after + (res.fixedDefect ? ' · ' + res.fixedDefect.name + ' giderildi' : ''), 'ok');
      handleGoals(res, 400);
    }, 1100);
  }

  function askSell(uid) {
    if (busy) return;
    var idx = G.findIndex(S.inventory, uid);
    if (idx < 0) return;
    var it = S.inventory[idx];
    var def = E.itemDef(it.defId);
    var price = E.sellPrice(S, it);
    var profit = E.profit(price, it.buyPrice, it.repairSpent);
    var warn = E.canRepair(S, it)
      ? '<p style="margin-top:6px">İpucu: Tamir edip satarsan <b class="pos">' + fmt(E.sellPriceIfRepaired(S, it)) + '</b> alırsın.</p>' : '';
    openModal(
      '<div class="modal-hero">' + Art.item(it.defId) + '</div>' +
      '<h3 class="center">' + esc(def.name) + ' satılsın mı?</h3>' +
      '<p class="center">Müşteri ödemeye hazır. Kâr hesabın aşağıda.</p>' +
      '<div class="breakdown">' +
      '<span>Satış fiyatı</span><b class="pos">+' + fmt(price) + '</b>' +
      '<span>Alış fiyatı</span><b class="neg">−' + fmt(it.buyPrice) + '</b>' +
      '<span>Tamir maliyeti</span><b class="neg">−' + fmt(it.repairSpent) + '</b>' +
      '<span class="sum">Net kâr</span><b class="sum ' + (profit >= 0 ? 'pos' : 'neg') + '">' + signed(profit) + '</b>' +
      '</div>' +
      (S.debt ? '<p style="margin-top:10px">Kira borcun var: satıştan <b class="neg">' + fmt(Math.min(S.debt, price)) + '</b> kesilecek.</p>' : '') +
      '<p style="margin-top:10px">Bugünkü piyasa: ' + marketText(it) + (profit > 0 ? ' · Kazanç: <b>+' + E.xpForSale(profit) + ' XP</b>' : ' · Zararlı satış XP vermez.') + '</p>' + warn +
      '<div class="modal-actions"><button class="btn btn-secondary" data-close>Vazgeç</button>' +
      '<button class="btn btn-green" id="confirmSell">Sat · ' + fmt(price) + '</button></div>',
      function (r) { r.querySelector('#confirmSell').onclick = function () { closeModal(); doSell(uid); }; }
    );
  }

  function doSell(uid) {
    if (busy) return;
    var card = cardEl('inventory', uid);
    var res = G.sell(S, uid);
    if (!res.ok) return fail(res.reason);
    busy = true;
    save();
    Snd.play('sell');
    var reg = doc.querySelector('.register');
    reg.classList.remove('ring'); void reg.offsetWidth; reg.classList.add('ring');
    if (card) { floatNum(card, res.profit, 'Kâr ' + signed(res.profit)); flyCoins(card, 6); card.classList.add('leaving'); }
    else flyCoins($('money'), 3);
    toast(E.itemDef(res.item.defId).name + ' satıldı: ' + fmt(res.price) + ' (net ' + signed(res.profit) + ') · +' + res.xp + ' XP', res.profit >= 0 ? 'ok' : 'err');
    setTimeout(function () {
      renderMoney(true);
    }, 500);
    setTimeout(function () {
      busy = false;
      renderAll();
      renderMoney(false);
      if (res.debtPaid) toast('Satıştan ' + fmt(res.debtPaid) + ' kira borcu kesildi.', 'err');
      if (res.levelUps > 0) showLevelUp(res.unlocked);
      handleGoals(res, res.levelUps > 0 ? 200 : 100);
    }, 900);
  }

  function showLevelUp(unlocked) {
    Snd.play('level');
    confetti();
    openModal(
      '<div class="center"><p style="margin:0">Tebrikler!</p><div class="big-level">Seviye ' + S.level + '</div>' +
      '<h3>Dükkânın büyüyor</h3>' +
      '<p>Pazarda daha fazla teklif görebilir ve yeni geliştirmeler açabilirsin.</p>' +
      (unlocked.length ? '<div class="breakdown" style="grid-template-columns:auto 1fr;align-items:center">' +
        unlocked.map(function (d) { return '<div style="width:56px;height:56px">' + Art.item(d.id) + '</div><b style="text-align:left">Yeni eşya: ' + esc(d.name) + '</b>'; }).join('') + '</div>' : '') +
      '<div class="modal-actions single"><button class="btn btn-primary" data-close>Harika!</button></div></div>'
    );
  }

  function doUpgrade(id, btn) {
    if (busy) return;
    var res = G.buyUpgrade(S, id);
    if (!res.ok) return fail(res.reason);
    save();
    Snd.play('level');
    floatNum(btn, -res.cost);
    toast(res.def.name + ' seviye ' + res.level + ' oldu!', 'gold');
    renderAll({ animateMoney: true, flash: id });
    handleGoals(res, 500);
  }

  function askNextDay() {
    if (busy) return;
    var rent = E.rent(S);
    var unsold = S.inventory.filter(function (it) { return !E.canRepair(S, it); }).length;
    var affordable = S.offers.filter(function (o) { return o.price <= S.money; }).length;
    var warns = '';
    if (affordable && S.inventory.length < E.capacity(S)) warns += '<li>Pazarda alabileceğin <b>' + affordable + '</b> teklif var; yarın kaybolacaklar.</li>';
    if (unsold) warns += '<li>Depoda satışa hazır <b>' + unsold + '</b> eşya var. Yarın piyasa fiyatları değişecek (iyi ya da kötü).</li>';
    if (S.money < rent) warns += '<li class="neg">Kasada kira için yeterli para yok: <b>' + fmt(rent - S.money) + '</b> borç yazılacak ve sonraki satışlarından kesilecek.</li>';
    openModal(
      '<h3>Gün ' + S.day + ' bitsin mi?</h3>' +
      '<div class="breakdown">' +
      '<span>Bugünkü satış</span><b>' + S.today.sales + ' eşya</b>' +
      '<span>Bugünkü kâr</span><b class="' + (S.today.profit >= 0 ? 'pos' : 'neg') + '">' + signed(S.today.profit) + '</b>' +
      '<span>Kira</span><b class="neg">−' + fmt(rent) + '</b>' +
      '<span class="sum">Günün sonucu</span><b class="sum ' + (S.today.profit - rent >= 0 ? 'pos' : 'neg') + '">' + signed(S.today.profit - rent) + '</b>' +
      '</div>' +
      (warns ? '<ul class="warn-list">' + warns + '</ul>' : '') +
      '<p style="margin-top:10px">Yarın: yeni teklifler gelir, depodaki eşyaların piyasa fiyatı değişir.</p>' +
      '<div class="modal-actions"><button class="btn btn-secondary" data-close>Devam et</button>' +
      '<button class="btn btn-primary" id="confirmDay"><span data-icon="moon"></span>Günü Bitir</button></div>',
      function (r) {
        fillIcons(r);
        r.querySelector('#confirmDay').onclick = function () { closeModal(); doNextDay(); };
      }
    );
  }

  function doNextDay() {
    if (busy) return;
    var res = G.nextDay(S);
    save();
    Snd.play('day');
    var rp = res.report;
    toast('Gün ' + res.day + ' başladı. Kira −' + fmt(rp.paid) + (rp.debt ? ' · Borç ' + fmt(rp.debt) : '') + ' · ' + S.offers.length + ' yeni teklif', rp.debt ? 'err' : 'gold');
    if (res.help) toast('Esnaf komşun sana ' + fmt(res.help) + ' para destek verdi ve borcunu sildi.', 'ok');
    var dim = $('dayFade');
    dim.classList.remove('go'); void dim.offsetWidth; dim.classList.add('go');
    renderAll({ animateMoney: true });
    handleGoals(res, 600);
  }

  /* ---------------- Ayarlar ve rehber ---------------- */
  function showTutorial() {
    openModal(
      '<div class="modal-hero burst">' + '<img src="assets/icon.svg" alt="" style="width:100%;height:100%">' + '</div>' +
      '<h3 class="center">Dükkan Ustası’na hoş geldin!</h3>' +
      '<p class="center">Kasanda <b>' + fmt(DU.CONFIG.startMoney) + '</b> para var. Ucuza al, tamir et, kârla sat; dükkânını şehrin en iyisi yap.</p>' +
      '<ol class="tut-steps">' +
      '<li><b class="n">1</b><span>Üstteki <b>HEDEF</b> çubuğu sana her an ne yapacağını söyler. <b>Git ›</b> ile doğru sekmeye geçersin.</span></li>' +
      '<li><b class="n">2</b><span><b>Pazar</b>’da her teklif kârlı değildir. Bazı satıcılar fazla ister, bazı eşyalarda <b>gizli kusur</b> olur. Şüphelenirsen <b>İncele</b>.</span></li>' +
      '<li><b class="n">3</b><span><b>Depo</b>’da tamir et ve sat: <b>Satış − Alış − Tamir = Net kâr</b>. Piyasa her gün değişir.</span></li>' +
      '<li><b class="n">4</b><span><b>Günü Bitir</b> dediğinde kira ödersin. Günleri boşa harcama!</span></li>' +
      '</ol>' +
      '<div class="modal-actions single"><button class="btn btn-primary" id="tutGo">Başla: Pazara Git</button></div>',
      function (r) {
        r.querySelector('#tutGo').onclick = function () { closeModal(); showView('market'); };
      }
    );
    if (!S.tutorialSeen) { S.tutorialSeen = true; save(); }
  }

  function showSettings() {
    var on = S.settings.sound;
    openModal(
      '<h3>Ayarlar</h3>' +
      '<div class="setting-row"><span>Ses efektleri</span><button class="switch' + (on ? ' on' : '') + '" id="sndSwitch" aria-label="Ses aç/kapat"></button></div>' +
      '<div class="setting-row"><span>Nasıl oynanır?</span><button class="btn btn-small btn-secondary" id="tutBtn">Göster</button></div>' +
      '<div class="setting-row"><span>Oyunu sıfırla</span><button class="btn btn-small btn-danger" id="resetBtn">Sıfırla</button></div>' +
      '<p style="margin-top:12px;font-size:.8rem">İlerlemen bu cihazda otomatik kaydedilir. Sürüm 0.2.0 (prototip)</p>',
      function (r) {
        r.querySelector('#sndSwitch').onclick = function () {
          S.settings.sound = !S.settings.sound;
          Snd.setEnabled(S.settings.sound);
          this.classList.toggle('on', S.settings.sound);
          save();
          Snd.play('click');
        };
        r.querySelector('#tutBtn').onclick = function () { showTutorial(); };
        r.querySelector('#resetBtn').onclick = function () { confirmReset(); };
      }
    );
  }

  function confirmReset() {
    openModal(
      '<h3>Emin misin?</h3><p>Tüm paran, eşyaların ve geliştirmelerin silinecek. Bu işlem geri alınamaz.</p>' +
      '<div class="modal-actions"><button class="btn btn-secondary" data-close>Vazgeç</button><button class="btn btn-danger" id="reallyReset">Evet, sıfırla</button></div>',
      function (r) {
        r.querySelector('#reallyReset').onclick = function () {
          DU.Storage.reset();
          var fresh = G.newState();
          Object.keys(S).forEach(function (k) { delete S[k]; });
          Object.keys(fresh).forEach(function (k) { S[k] = fresh[k]; });
          seen = {};
          save();
          closeModal();
          renderAll();
          showView('shop');
          toast('Yeni oyun başladı. Kasanda ' + fmt(S.money) + ' para var.', 'gold');
        };
      }
    );
  }

  /* ---------------- Olay bağlama ---------------- */
  function bind() {
    $('tabs').addEventListener('click', function (e) {
      var t = e.target.closest('.tab');
      if (!t) return;
      Snd.play('click');
      showView(t.getAttribute('data-view'));
    });
    $('goMarketBtn').onclick = function () { Snd.play('click'); showView('market'); };
    $('nextDayBtn').onclick = function () { Snd.play('click'); askNextDay(); };
    $('nextDayBtn2').onclick = function () { Snd.play('click'); askNextDay(); };
    $('goalBar').addEventListener('click', function () {
      var gp = G.goalProgress(S);
      if (!gp) return;
      Snd.play('click');
      showView(gp.goal.tab);
      toast(gp.goal.hint);
    });
    $('settingsBtn').onclick = function () { Snd.play('click'); showSettings(); };
    $('levelChip').onclick = function () { Snd.play('click'); showView('upgrades'); };

    doc.querySelector('.views').addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      var act = b.getAttribute('data-act');
      var uid = parseInt(b.getAttribute('data-uid'), 10);
      if (act === 'buy') doBuy(uid, b);
      else if (act === 'inspect') doInspect(uid, b);
      else if (act === 'repair') doRepair(uid, b);
      else if (act === 'sell') askSell(uid);
      else if (act === 'upgrade') doUpgrade(b.getAttribute('data-id'), b);
    });

    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('modalRoot').hidden) closeModal();
    });
  }

  DU.UI = {
    init: function (state, saveFn, loadStatus) {
      S = state;
      persist = saveFn;
      Snd.setEnabled(S.settings.sound);
      fillIcons(doc);
      bind();
      renderAll();
      if (loadStatus === 'corrupt') toast('Kayıt dosyası okunamadı, yeni oyun başlatıldı.', 'err');
      else if (loadStatus === 'loaded') toast('Hoş geldin! Kaldığın yerden devam ediyorsun.', 'ok');
      if (!S.tutorialSeen) showTutorial();
    },
    // Android geri tuşu için: açık modal varsa kapatır, true döner.
    handleBack: function () {
      if (!$('modalRoot').hidden) { closeModal(); return true; }
      if (!doc.getElementById('view-shop').classList.contains('active')) { showView('shop'); return true; }
      return false;
    },
    showView: showView,
    renderAll: renderAll
  };
})(typeof window !== 'undefined' ? window : globalThis);
