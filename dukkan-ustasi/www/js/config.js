/* Dükkan Ustası — oyun verisi ve denge ayarları.
 * Tüm sayılar burada; kod değiştirmeden denge ayarı yapılabilir.
 * Para her zaman tam sayıdır. */
(function (root) {
  'use strict';
  var DU = (root.DU = root.DU || {});

  DU.CONFIG = {
    saveKey: 'dukkanUstasi.save.v1',
    saveVersion: 2,
    startMoney: 1000,
    maxLevel: 10,

    // Eşya değeri: temelDeğer × (taban + (1 − taban) × durum/100)
    valueFloor: 0.15,

    // Pazardaki eşyaların durum aralığı (%)
    offerCondition: { min: 15, max: 70 },
    // Satıcının istediği fiyat = mevcutDeğer × U(min, max) × (1 − Esnaf Ağı indirimi). Bazı satıcılar fazla ister!
    askFactor: { min: 0.85, max: 1.35 },

    // Tamir maliyeti = (tamir sonrası değer − şimdiki değer) × oran × (1 − atölye indirimi) × (1 + kusur payı)
    repairCostRate: 0.55,
    repairBaseTarget: 80, // tamir sonrası ulaşılan durum (%)

    // Talep: eşyanın kalıcı özelliği, satış fiyatını etkiler
    demand: [
      { id: 'dusuk', label: 'Düşük', mult: 0.85, weight: 25 },
      { id: 'normal', label: 'Normal', mult: 1.0, weight: 50 },
      { id: 'yuksek', label: 'Yüksek', mult: 1.15, weight: 25 }
    ],

    // Günlük piyasa: depodaki her eşyanın alıcı fiyatı her gün değişir (yüzde)
    marketRoll: { min: 85, max: 112 },

    // Gizli kusur: satın alınca ortaya çıkar. "İncele" ile önceden görülebilir.
    defectChance: { base: 0.28, perItemLevel: 0.03 },
    defects: [
      { id: 'mekanizma', name: 'Mekanizma arızası', extra: 0.9 },
      { id: 'elektrik', name: 'Elektrik arızası', extra: 0.7 },
      { id: 'kirik', name: 'Kırık iç parça', extra: 0.6 },
      { id: 'pas', name: 'Paslanmış aksam', extra: 0.5 }
    ],
    defectSellPenalty: 0.8,      // kusuru giderilmemiş eşya satış çarpanı
    inspectRate: 0.12,           // inceleme ücreti = istenen fiyat × oran
    inspectMin: 10,

    // Günlük kira: gün bitince ödenir. Ödenemeyen kısım borç olur, satışlardan kesilir.
    rent: { base: 30, perLevel: 20 },

    baseCapacity: 4,
    baseOfferSlots: 3,
    maxOfferSlots: 8,

    // XP: kârlı satış başına 6 + kâr/4 (zararlı satış XP vermez)
    xpBase: 6,
    xpPerProfit: 1 / 4,
    xpLossSale: 0,

    // Para + depo boşsa yeni günde verilen destek
    neighborHelp: { threshold: 120, amount: 200 },

    logLimit: 30
  };

  // En az 5 eşya ilk seviyeden itibaren alınabilir.
  DU.ITEMS = [
    { id: 'abajur', name: 'Pirinç Abajur', base: 200, minLevel: 1, desc: 'Sıcak ışıklı, eski bir masa lambası.' },
    { id: 'radyo', name: 'Lambalı Radyo', base: 280, minLevel: 1, desc: 'Ahşap kasalı, 60’lardan kalma radyo.' },
    { id: 'telefon', name: 'Çevirmeli Telefon', base: 340, minLevel: 1, desc: 'Kırmızı, çevirmeli ev telefonu.' },
    { id: 'daktilo', name: 'Daktilo', base: 480, minLevel: 1, desc: 'Tuşları biraz paslı bir yazı makinesi.' },
    { id: 'bisiklet', name: 'Klasik Bisiklet', base: 650, minLevel: 1, desc: 'Sepetli, çelik kadro şehir bisikleti.' },
    { id: 'kamera', name: 'Analog Fotoğraf Makinesi', base: 900, minLevel: 2, desc: 'Koleksiyoncuların sevdiği film makinesi.' },
    { id: 'pikap', name: 'Pikap', base: 1150, minLevel: 2, desc: 'Ahşap gövdeli plak çalar.' },
    { id: 'gitar', name: 'Akustik Gitar', base: 1400, minLevel: 3, desc: 'Teli kopmuş ama gövdesi sağlam.' },
    { id: 'saat', name: 'Antika Duvar Saati', base: 2100, minLevel: 4, desc: 'Sarkaçlı, ceviz kasalı duvar saati.' },
    { id: 'gramofon', name: 'Gramofon', base: 3200, minLevel: 5, desc: 'Pirinç borulu, kurmalı gramofon.' }
  ];

  // Geliştirmeler. Seviye n'ye almak için dükkân seviyesi >= reqLevel[n-1] olmalı.
  DU.UPGRADES = [
    {
      id: 'atolye', name: 'Atölye Tezgâhı', icon: 'tool', max: 4,
      costs: [400, 900, 1800, 3500], reqLevel: [1, 2, 3, 5],
      desc: 'Tamir ucuzlar ve eşyalar daha iyi durumda çıkar.',
      effect: function (l) { return 'Tamir −%' + (8 * l) + ', tamir sonrası %' + Math.min(100, 80 + 5 * l); }
    },
    {
      id: 'vitrin', name: 'Vitrin', icon: 'star', max: 5,
      costs: [350, 700, 1300, 2400, 4200], reqLevel: [1, 2, 3, 4, 6],
      desc: 'Şık vitrin, müşterilerin daha fazla ödemesini sağlar.',
      effect: function (l) { return 'Satış fiyatı +%' + (5 * l); }
    },
    {
      id: 'depo', name: 'Depo Rafları', icon: 'box', max: 5,
      costs: [300, 550, 1000, 1800, 3200], reqLevel: [1, 2, 3, 4, 5],
      desc: 'Daha fazla eşya stoklayabilirsin.',
      effect: function (l) { return 'Kapasite ' + (4 + 2 * l) + ' eşya'; }
    },
    {
      id: 'uzman', name: 'Uzman Gözü', icon: 'eye', max: 2,
      costs: [450, 1400], reqLevel: [2, 4],
      desc: 'Gizli kusurları satın almadan önce fark edersin.',
      effect: function (l) { return l === 1 ? 'İnceleme ücretsiz' : 'Tüm teklifler otomatik incelenir, kusur tamiri −%30'; }
    },
    {
      id: 'ag', name: 'Esnaf Ağı', icon: 'people', max: 4,
      costs: [500, 1000, 2000, 4000], reqLevel: [2, 3, 4, 6],
      desc: 'Daha çok satıcı tanırsın, daha uygun fiyat alırsın.',
      effect: function (l) { return '+' + l + ' teklif, alış −%' + (3 * l); }
    }
  ];

  /* Hedef zinciri: oyuncuya her an "şimdi ne yapmalıyım?" sorusunun cevabını verir.
   * metric: DU.Game.goalMetric içinde hesaplanır. tab: "Git" butonunun açacağı sekme. */
  DU.GOALS = [
    { id: 'ilk_alim', title: 'Pazardan ilk eşyanı satın al', metric: 'bought', target: 1, reward: 50, tab: 'market',
      hint: 'Pazar’da “Tahmini kâr”ı yüksek bir eşya seç ve satın al.' },
    { id: 'ilk_tamir', title: 'Bir eşyayı tamir et', metric: 'repairs', target: 1, reward: 40, tab: 'storage',
      hint: 'Depo’da “Tamir” butonuna bas. Tamirli eşya çok daha pahalıya satılır.' },
    { id: 'ilk_satis', title: 'Bir eşyayı kârla sat', metric: 'profitableSales', target: 1, reward: 60, tab: 'storage',
      hint: 'Depo’da “Sat”a bas. Satmadan önce net kârını kontrol et.' },
    { id: 'inceleme', title: 'Bir teklifi satın almadan önce incele', metric: 'inspections', target: 1, reward: 40, tab: 'market',
      hint: 'Bazı eşyalarda gizli kusur olur ve tamiri pahalılaşır. “İncele” ile önceden öğren.' },
    { id: 'gun_bitir', title: 'Günü bitir ve kirayı öde', metric: 'daysPassed', target: 1, reward: 50, tab: 'shop',
      hint: 'Dükkân’da “Günü Bitir”e bas. Yeni gün yeni teklifler getirir ama her gün kira ödersin.' },
    { id: 'kar_400', title: 'Toplam 400 kâr et', metric: 'totalProfit', target: 400, reward: 100, tab: 'market',
      hint: 'Ucuza al, tamir et, piyasa iyiyken sat. Kusurlu eşyalardan kaçın.' },
    { id: 'ilk_gelistirme', title: 'İlk geliştirmeni satın al', metric: 'upgradesBought', target: 1, reward: 75, tab: 'upgrades',
      hint: 'Depo Rafları daha çok eşya, Atölye daha ucuz tamir demek.' },
    { id: 'seviye2', title: 'Dükkânı seviye 2’ye çıkar', metric: 'level', target: 2, reward: 150, tab: 'storage',
      hint: 'Yalnızca kârlı satışlar XP verir; kâr büyüdükçe XP artar.' },
    { id: 'buyuk_satis', title: 'Tek satışta 200+ kâr et', metric: 'bestDeal', target: 200, reward: 150, tab: 'market',
      hint: 'Seviye 2’de açılan Fotoğraf Makinesi ve Pikap daha çok kazandırır.' },
    { id: 'kasa_3000', title: 'Kasada 3.000 para biriktir', metric: 'money', target: 3000, reward: 200, tab: 'market',
      hint: 'Kirayı unutma: günleri boşa geçirmeden alım-satım yap.' },
    { id: 'seviye3', title: 'Dükkânı seviye 3’e çıkar', metric: 'level', target: 3, reward: 250, tab: 'storage',
      hint: 'Seviye 3’te Akustik Gitar açılır.' },
    { id: 'kar_5000', title: 'Toplam 5.000 kâr et', metric: 'totalProfit', target: 5000, reward: 400, tab: 'market',
      hint: 'Geliştirmeler kârını katlar: Vitrin satışları, Esnaf Ağı alışları iyileştirir.' },
    { id: 'seviye5', title: 'Dükkânı seviye 5’e çıkar', metric: 'level', target: 5, reward: 600, tab: 'storage',
      hint: 'Seviye 5’te en değerli eşya, Gramofon açılır.' },
    { id: 'gramofon', title: 'Bir Gramofon sat', metric: 'sold_gramofon', target: 1, reward: 800, tab: 'market',
      hint: 'Gramofon pahalı ama kârı da büyük. Satın almadan önce incelemeyi unutma.' },
    { id: 'kar_25000', title: 'Toplam 25.000 kâr et', metric: 'totalProfit', target: 25000, reward: 1500, tab: 'market',
      hint: 'Tüm geliştirmeleri tamamlamaya çalış.' },
    { id: 'usta', title: 'Seviye 10: Usta Dükkân ol', metric: 'level', target: 10, reward: 3000, tab: 'storage',
      hint: 'Son hedef! Şehrin en ünlü ikinci el dükkânı ol.' }
  ];

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG: DU.CONFIG, ITEMS: DU.ITEMS, UPGRADES: DU.UPGRADES, GOALS: DU.GOALS };
  }
})(typeof window !== 'undefined' ? window : globalThis);
