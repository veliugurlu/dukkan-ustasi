/* Dükkan Ustası — eşya ve simge çizimleri (satır içi SVG, dış dosya yok). */
(function (root) {
  'use strict';
  var DU = (root.DU = root.DU || {});

  var SHADOW = '<ellipse cx="60" cy="108" rx="40" ry="6" fill="#000" opacity=".18"/>';
  function svg(inner) {
    return '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + SHADOW + inner + '</svg>';
  }

  var ITEMS = {
    abajur:
      '<path d="M38 22h44l14 36H24z" fill="#f2b84b"/><path d="M38 22h44l3 8H35z" fill="#ffd27a"/>' +
      '<path d="M24 58h72" stroke="#c98a1f" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M60 22h22l14 36H70z" fill="#000" opacity=".08"/>' +
      '<rect x="57" y="58" width="6" height="36" rx="2" fill="#b98a3e"/><rect x="58" y="58" width="2" height="36" fill="#e8c27a"/>' +
      '<ellipse cx="60" cy="100" rx="24" ry="7" fill="#9a6e2c"/><ellipse cx="60" cy="98" rx="24" ry="6" fill="#c9974a"/>' +
      '<ellipse cx="54" cy="96.5" rx="10" ry="2" fill="#f0c987" opacity=".7"/>',
    radyo:
      '<rect x="14" y="34" width="92" height="66" rx="12" fill="#8a5a2f"/><rect x="14" y="34" width="92" height="10" rx="8" fill="#a36d3b"/>' +
      '<rect x="22" y="48" width="50" height="44" rx="6" fill="#e8d6b0"/>' +
      '<g stroke="#b59a6d" stroke-width="3">' +
      '<line x1="28" y1="56" x2="66" y2="56"/><line x1="28" y1="64" x2="66" y2="64"/><line x1="28" y1="72" x2="66" y2="72"/><line x1="28" y1="80" x2="66" y2="80"/></g>' +
      '<rect x="78" y="48" width="20" height="14" rx="3" fill="#f7e9b5"/><line x1="86" y1="49" x2="86" y2="61" stroke="#d0452f" stroke-width="2"/>' +
      '<circle cx="83" cy="76" r="6" fill="#3b2a1a"/><circle cx="83" cy="76" r="2" fill="#c9a36a"/>' +
      '<circle cx="95" cy="76" r="4" fill="#3b2a1a"/>' +
      '<line x1="88" y1="34" x2="102" y2="10" stroke="#555" stroke-width="2.5" stroke-linecap="round"/><circle cx="102" cy="10" r="2.5" fill="#777"/>',
    telefon:
      '<path d="M24 98c0-28 10-48 36-48s36 20 36 48z" fill="#c8372d"/>' +
      '<path d="M24 98c0-28 10-48 36-48 8 0 14 2 19 6-30-2-42 18-44 42z" fill="#e0574b" opacity=".6"/>' +
      '<rect x="18" y="96" width="84" height="6" rx="3" fill="#8f2219"/>' +
      '<circle cx="60" cy="76" r="17" fill="#f3efe6"/><circle cx="60" cy="76" r="6" fill="#c8372d"/>' +
      '<g fill="#c9c2b2"><circle cx="60" cy="63" r="3"/><circle cx="70" cy="67" r="3"/><circle cx="73" cy="77" r="3"/><circle cx="68" cy="86" r="3"/><circle cx="52" cy="86" r="3"/><circle cx="47" cy="77" r="3"/><circle cx="50" cy="67" r="3"/></g>' +
      '<path d="M18 42c0-8 6-12 14-12h56c8 0 14 4 14 12v4c0 3-3 5-6 5H86c-3 0-5-2-5-5v-2H39v2c0 3-2 5-5 5H24c-3 0-6-2-6-5z" fill="#a82a21"/>',
    daktilo:
      '<rect x="34" y="14" width="52" height="34" fill="#fbfaf5"/><g stroke="#cfc8b4" stroke-width="2"><line x1="40" y1="22" x2="78" y2="22"/><line x1="40" y1="29" x2="74" y2="29"/><line x1="40" y1="36" x2="70" y2="36"/></g>' +
      '<rect x="18" y="40" width="84" height="12" rx="6" fill="#2b2b2b"/><circle cx="18" cy="46" r="7" fill="#444"/><circle cx="102" cy="46" r="7" fill="#444"/>' +
      '<path d="M16 100l8-46h72l8 46z" fill="#2f6150"/><path d="M24 54h72l2 10H22z" fill="#3c7a65"/>' +
      '<g fill="#efe9d8">' +
      '<circle cx="32" cy="72" r="4"/><circle cx="43" cy="72" r="4"/><circle cx="54" cy="72" r="4"/><circle cx="65" cy="72" r="4"/><circle cx="76" cy="72" r="4"/><circle cx="87" cy="72" r="4"/>' +
      '<circle cx="37" cy="83" r="4"/><circle cx="48" cy="83" r="4"/><circle cx="59" cy="83" r="4"/><circle cx="70" cy="83" r="4"/><circle cx="81" cy="83" r="4"/></g>' +
      '<rect x="40" y="91" width="40" height="5" rx="2.5" fill="#efe9d8"/>',
    bisiklet:
      '<circle cx="30" cy="80" r="20" fill="none" stroke="#2d2d2d" stroke-width="5"/><circle cx="90" cy="80" r="20" fill="none" stroke="#2d2d2d" stroke-width="5"/>' +
      '<circle cx="30" cy="80" r="3" fill="#888"/><circle cx="90" cy="80" r="3" fill="#888"/>' +
      '<g stroke="#1f8a8a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none">' +
      '<path d="M30 80l20-30h32L90 80"/><path d="M50 50l12 30 20-30"/><path d="M30 80h32"/></g>' +
      '<path d="M82 50l-4-14h10" stroke="#2d2d2d" stroke-width="4" stroke-linecap="round" fill="none"/>' +
      '<path d="M44 42h16" stroke="#5a3a22" stroke-width="6" stroke-linecap="round"/><line x1="50" y1="44" x2="50" y2="50" stroke="#777" stroke-width="3"/>' +
      '<rect x="88" y="34" width="18" height="12" rx="2" fill="#c9974a"/><g stroke="#9a6e2c" stroke-width="1.5"><line x1="92" y1="34" x2="92" y2="46"/><line x1="97" y1="34" x2="97" y2="46"/><line x1="102" y1="34" x2="102" y2="46"/></g>',
    kamera:
      '<rect x="16" y="40" width="88" height="56" rx="8" fill="#2a2a2a"/><rect x="16" y="40" width="88" height="14" rx="6" fill="#c9ccd1"/>' +
      '<rect x="44" y="30" width="32" height="14" rx="3" fill="#2a2a2a"/><rect x="50" y="34" width="20" height="6" rx="2" fill="#7fb4d9"/>' +
      '<rect x="22" y="32" width="12" height="8" rx="2" fill="#c9ccd1"/><circle cx="92" cy="36" r="4" fill="#d0452f"/>' +
      '<circle cx="60" cy="74" r="20" fill="#c9ccd1"/><circle cx="60" cy="74" r="15" fill="#1a1a1a"/><circle cx="60" cy="74" r="9" fill="#2f4f6f"/>' +
      '<circle cx="55" cy="69" r="3.5" fill="#fff" opacity=".7"/>' +
      '<g fill="#3a3a3a"><rect x="20" y="58" width="12" height="34" rx="2"/><rect x="88" y="58" width="12" height="34" rx="2"/></g>',
    pikap:
      '<rect x="10" y="62" width="100" height="36" rx="6" fill="#7a4a24"/><rect x="10" y="62" width="100" height="8" rx="4" fill="#97602f"/>' +
      '<ellipse cx="52" cy="62" rx="38" ry="12" fill="#151515"/><ellipse cx="52" cy="62" rx="30" ry="9" fill="none" stroke="#333" stroke-width="1"/>' +
      '<ellipse cx="52" cy="62" rx="22" ry="6.5" fill="none" stroke="#333" stroke-width="1"/><ellipse cx="52" cy="62" rx="9" ry="3" fill="#d0452f"/>' +
      '<path d="M98 48v10l-22 6" stroke="#c9ccd1" stroke-width="3.5" fill="none" stroke-linecap="round"/><circle cx="98" cy="48" r="5" fill="#9aa0a8"/>' +
      '<circle cx="24" cy="86" r="4" fill="#e7c88f"/><circle cx="38" cy="86" r="4" fill="#e7c88f"/><rect x="74" y="82" width="26" height="6" rx="3" fill="#e7c88f"/>',
    gitar:
      '<g transform="rotate(-28 60 60)">' +
      '<rect x="55" y="4" width="10" height="56" rx="2" fill="#5a3a22"/><rect x="52" y="0" width="16" height="12" rx="3" fill="#3b2614"/>' +
      '<g stroke="#c9b48a" stroke-width="1.2"><line x1="57" y1="14" x2="57" y2="50"/><line x1="60" y1="14" x2="60" y2="50"/><line x1="63" y1="14" x2="63" y2="50"/></g>' +
      '<path d="M60 48c-14 0-20 8-18 18-10 4-14 12-12 22 3 14 16 20 30 20s27-6 30-20c2-10-2-18-12-22 2-10-4-18-18-18z" fill="#d98b3a"/>' +
      '<path d="M60 48c-14 0-20 8-18 18-10 4-14 12-12 22 2 8 7 13 14 16-6-10-6-28 16-56z" fill="#f0a95a" opacity=".6"/>' +
      '<circle cx="60" cy="72" r="8" fill="#3b2614"/><rect x="50" y="92" width="20" height="4" rx="2" fill="#3b2614"/></g>',
    saat:
      '<path d="M36 18l24-12 24 12v84H36z" fill="#6b3f1f"/><path d="M36 18l24-12 24 12v6H36z" fill="#8a552b"/>' +
      '<circle cx="60" cy="38" r="17" fill="#f5ecd6" stroke="#c9974a" stroke-width="3"/>' +
      '<g stroke="#3b2614" stroke-width="2" stroke-linecap="round"><line x1="60" y1="38" x2="60" y2="27"/><line x1="60" y1="38" x2="68" y2="42"/></g>' +
      '<g fill="#3b2614"><circle cx="60" cy="24" r="1.4"/><circle cx="74" cy="38" r="1.4"/><circle cx="60" cy="52" r="1.4"/><circle cx="46" cy="38" r="1.4"/></g>' +
      '<rect x="44" y="60" width="32" height="38" rx="3" fill="#2f1c0d"/><rect x="44" y="60" width="32" height="38" rx="3" fill="#9fc6e0" opacity=".15"/>' +
      '<line x1="60" y1="60" x2="60" y2="86" stroke="#c9974a" stroke-width="2"/><circle cx="60" cy="88" r="6" fill="#e2b04a"/>',
    gramofon:
      '<rect x="22" y="74" width="60" height="26" rx="4" fill="#6b3f1f"/><rect x="22" y="74" width="60" height="6" rx="3" fill="#8a552b"/>' +
      '<ellipse cx="52" cy="74" rx="26" ry="6" fill="#151515"/><ellipse cx="52" cy="74" rx="6" ry="1.6" fill="#d0452f"/>' +
      '<path d="M70 74V58" stroke="#b98a3e" stroke-width="4"/>' +
      '<path d="M70 60c4-10 10-18 20-30 6-8 12-16 18-18-2 10 0 30 4 40-16-2-30 0-42 8z" fill="#e2b04a"/>' +
      '<path d="M108 12c-2 10 0 30 4 40-4 0-8-1-12-1 0-14 2-28 8-39z" fill="#b8862c"/>' +
      '<circle cx="86" cy="88" r="4" fill="#e7c88f"/><path d="M82 82h10" stroke="#3b2614" stroke-width="3" stroke-linecap="round"/>'
  };

  var ICONS = {
    coin: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#f4b73f"/><circle cx="12" cy="12" r="7.2" fill="#ffd56b" stroke="#d99a1e" stroke-width="1.2"/><path d="M12 8v8M9.5 10h4a1.5 1.5 0 010 3h-3a1.5 1.5 0 000 3h4" stroke="#b9780f" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>',
    shop: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9l1.5-5h15L21 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M3 9h18v2a3 3 0 01-6 0 3 3 0 01-6 0 3 3 0 01-6 0z" fill="currentColor" opacity=".25" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M5 13v7h14v-7M10 20v-5h4v5" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    market: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.4 11h11L21 7H6.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="19" r="1.8" fill="currentColor"/><circle cx="17" cy="19" r="1.8" fill="currentColor"/></svg>',
    box: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7l9-4 9 4-9 4z" fill="currentColor" opacity=".25" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M3 7v10l9 4 9-4V7M12 11v10" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 7h-4v6H9v-6H5z" fill="currentColor" opacity=".25" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M6 20h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 110 7 3.5 3.5 0 010-7z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7 7 0 01-2 1.2L14.8 21h-4l-.3-2.4a7 7 0 01-2-1.2l-1.9.7-2-3.4 1.6-1.2a7 7 0 010-2.6L4.6 9.7l2-3.4 1.9.7a7 7 0 012-1.2L10.8 3h4l.3 2.4a7 7 0 012 1.2l1.9-.7 2 3.4-1.6 1.2a7 7 0 010 2.6z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    tool: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 4a5 5 0 00-4.8 6.4L3.5 16.6a2 2 0 002.9 2.9l6.2-6.2A5 5 0 0019 8.5l-3 3-3-1-1-3z" fill="currentColor" opacity=".25" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" fill="currentColor" opacity=".25" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    people: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17" cy="9" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M15 14.5c3 0 6 2 6 5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor" opacity=".3" stroke="currentColor" stroke-width="2"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></g></svg>',
    wrench: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 4a5 5 0 00-4.8 6.4L3.5 16.6a2 2 0 002.9 2.9l6.2-6.2A5 5 0 0019 8.5l-3 3-3-1-1-3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    tag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12V4h8l10 10-8 8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="7.5" cy="8.5" r="1.6" fill="currentColor"/></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 11V8a4 4 0 018 0v3" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    handshake: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 11l4-4 4 2 3-2 4 1 5 4-3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 13l4 4c.6.6 1.6.6 2.2 0l.3-.3M9 12l3.5 3.5c.6.6 1.6.6 2.2 0M12 10l3.5 3.5c.6.6 1.6.6 2.2 0L19 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" fill="currentColor" opacity=".25" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M15 15l5.5 5.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" fill="currentColor" opacity=".25" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    target: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    warn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l10 18H2z" fill="currentColor" opacity=".25" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 10v5M12 18v.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>'
  };

  DU.Art = {
    item: function (id) { return svg(ITEMS[id] || ITEMS.radyo); },
    icon: function (name) { return ICONS[name] || ''; },
    has: function (id) { return !!ITEMS[id]; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
