# Dükkan Ustası — HTML5 prototip (v0.2.0)

İkinci el eşya dükkânı oyunu: pazardan ucuza al, tamir et, kârla sat, dükkânını büyüt.
Saf HTML5 + CSS + JavaScript. Oyunun kendisi **hiçbir kütüphane kullanmaz**.

## Hemen oyna

`www/index.html` dosyasına çift tıkla → Chrome'da açılır. Kurulum gerekmez.

İsteğe bağlı (Node.js 22+ varsa): `npm start` → http://localhost:8080

Telefonda denemek için: Chrome > Geliştirici araçları (F12) > cihaz simgesi (Ctrl+Shift+M) > bir telefon seç.

## Oyunda neler var

| Özellik | Nerede |
|---|---|
| 1.000 başlangıç parası | `www/js/config.js` → `startMoney` |
| 10 eşya (5'i ilk seviyeden alınabilir) | `config.js` → `ITEMS` |
| Satın alma, tamir, satış | `www/js/game.js` → `buy`, `repair`, `sell` |
| Fiyat ve kâr formülleri | `www/js/economy.js` |
| Hedef zinciri (16 hedef, ödüllü) + üstte sürekli hedef çubuğu | `config.js` → `GOALS`, `game.js` → `checkGoals` |
| Gizli kusur, inceleme, günlük piyasa, kira/borç | `config.js`, `game.js` → `inspect`, `nextDay` |
| Dükkân seviyesi (XP) + 5 geliştirme | `config.js` → `UPGRADES`, `game.js` → `addXp`, `buyUpgrade` |
| localStorage kaydı, bozuk kayıt koruması | `www/js/storage.js` |
| Eşya çizimleri (satır içi SVG) | `www/js/art.js` |
| Ses efektleri (koddan üretilir, dosya yok) | `www/js/audio.js` |
| Arayüz, animasyonlar | `www/js/ui.js`, `www/css/style.css` |

### Ekonomi (tüm para tam sayıdır)

```
değer(durum)      = temelDeğer × (0,15 + 0,85 × durum/100)
istenen fiyat     = değer(şimdiki durum) × U(0,85–1,35) × (1 − Esnaf Ağı indirimi)   ← bazı satıcılar fazla ister
tamir maliyeti    = (değer(tamir sonrası) − değer(şimdi)) × 0,55 × (1 − Atölye indirimi) × (1 + kusur payı)
satış fiyatı      = değer(şimdiki durum) × talep (0,85/1,00/1,15) × günlük piyasa (%85–112) × (1 + Vitrin) × (kusurluysa 0,8)
NET KÂR           = satış fiyatı − alış fiyatı − tamire harcanan
günlük kira       = 30 + 20 × (seviye − 1); ödenemezse borç olur, sonraki satışlardan kesilir
```

- **Gizli kusur:** tekliflerin ~%30'unda. Satın alınca ortaya çıkar, tamiri %50–90 pahalılaştırır. *İncele* (fiyatın %12'si) ile önceden görülür.
- **Hedefler:** 16 hedeflik zincir; her biri ne yapılacağını söyler, *Git ›* doğru sekmeyi açar, ödül verir.
- **Denge:** `node tools/balance.js` iki botu 40 gün oynatır. Dikkatli oyuncu dikkatsizin ~2,5–3 katı kâr eder; dikkatsiz oyuncunun satışlarının ~%33'ü zararlıdır.

Geliştirmeler: **Atölye** (tamir ucuzlar, tamir sonrası durum %80 → %100), **Vitrin** (+%5 satış/seviye),
**Depo** (+2 kapasite/seviye), **Uzman Gözü** (ücretsiz/otomatik inceleme), **Esnaf Ağı** (+1 teklif, −%3 alış/seviye). Her geliştirme seviyesi belirli bir dükkân seviyesi ister.

## Klasör yapısı

```
dukkan-ustasi/
├── www/                      ← oyunun tamamı (Capacitor bunu Android'e paketler)
│   ├── index.html
│   ├── css/style.css
│   ├── js/  config · economy · game · storage · art · audio · ui · main
│   └── assets/icon.svg
├── tests/economy.test.js     ← 17 birim testi (ek paket yok)
├── tools/serve.js            ← bağımlılıksız yerel sunucu
├── tools/smoke.js            ← tarayıcı duman testi (Playwright, isteğe bağlı)
├── tools/balance.js          ← denge simülasyonu (bağımlılıksız)
├── resources/                ← 1024×1024 simge + Android simge/açılış ekranı görselleri
├── tools/make-android-res.js ← Android görsellerini icon.svg'den üretir
├── capacitor.config.json     ← Android paket ayarları (com.veli.dukkanustasi)
├── package.json / package-lock.json
└── docs/ANDROID_PLAN.md      ← AAB ve bulut derleme planı
```

GitHub deposunda bu klasör `dukkan-ustasi/` alt klasöründedir. Derleme dosyaları deponun kökündedir:
`.github/workflows/android.yml` (APK + AAB) ve `.github/workflows/pages.yml` (iPhone için web yayını).

## iPhone'da oynamak

Oyun her güncellemede GitHub Pages'e yayınlanır: `https://veliugurlu.github.io/dukkan-ustasi/`.
Safari ile aç → Paylaş → **Ana Ekrana Ekle**. Tam ekran açılır, kayıt telefonda kalır.

## Test

```
npm test        # birim testleri: kâr hesabı, kayıt, seviye, geliştirme, kilitlenme önleme
```

`node_modules` gerekmez; testler yalnızca Node.js'in kendi test aracını kullanır.

## Android

Bkz. [docs/ANDROID_PLAN.md](docs/ANDROID_PLAN.md). Bilgisayara Android Studio / SDK kurmak gerekmez; derleme GitHub Actions'ta yapılır.
