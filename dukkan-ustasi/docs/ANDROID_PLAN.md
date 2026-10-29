# Android App Bundle (AAB) ve bulut derleme planı

Amaç: Bilgisayara Android Studio / Android SDK kurmadan (diskte ~10 GB yer açmadan) Google Play'e yüklenebilir bir AAB üretmek.
Tüm ağır iş GitHub Actions'ın ücretsiz Linux sunucusunda yapılır. Bilgisayarda yalnızca proje klasörü (~1 MB) durur.

## Nasıl çalışır?

```
www/ (HTML/CSS/JS)  ──►  Capacitor 8  ──►  android/ (Gradle projesi)  ──►  Gradle  ──►  .apk / .aab
   senin bilgisayarın        └──────────────── GitHub Actions (bulut) ────────────────┘
```

- **Capacitor**, `www/` klasörünü Android WebView içinde çalışan yerel bir uygulamaya sarar.
- Oyun kodu Capacitor'a bağımlı değildir; Chrome'da da aynen çalışır. Yalnızca `main.js`, Android geri tuşu için
  `window.Capacitor` varsa onu kullanır.
- Sürümler `package.json` içinde sabitlendi: `@capacitor/core|cli|android 8.6.0`, `@capacitor/app 8.1.2`.
  Capacitor 8 → Node 22, Java 21, minSdk 24, targetSdk/compileSdk 36 (Google Play'in güncel hedef API şartını karşılar).

## Dosya yapısı (Android ile ilgili kısım)

```
capacitor.config.json            appId: com.veli.dukkanustasi  ·  appName: Dükkan Ustası  ·  webDir: www
package.json / package-lock.json Capacitor sürümleri sabit; bulutta `npm ci` ile birebir aynısı kurulur
.github/workflows/android.yml    bulut derleme hattı
resources/android/res/           Android simge + açılış ekranı (tools/make-android-res.js üretir, derlemede kopyalanır)
android/                         ŞİMDİLİK YOK → bulutta her derlemede `npx cap add android` ile üretilir
                                 (Aşama B'de bir kez üretilip depoya eklenecek)
```

> **Uyarı:** `appId` (com.veli.dukkanustasi) Play'e ilk yüklemeden sonra **asla değiştirilemez**. Değiştirmek istersen şimdi söyle.

## Aşamalar

### Aşama A — Bulutta ilk derleme (hazır, ücretsiz, gizli anahtar yok)

1. github.com'da ücretsiz hesapla **yeni bir depo** aç (ör. `dukkan-ustasi`). Herkese açık depoda Actions dakikaları sınırsızdır;
   özel depoda ayda 2.000 dakika ücretsizdir (bir derleme ≈ 5–8 dk).
2. Proje klasörünün içeriğini depoya yükle (GitHub Desktop veya web arayüzündeki “Add file → Upload files”).
   `node_modules/` ve `android/` yüklenmez (`.gitignore`). **`.github` klasörünün yüklendiğinden emin ol** (gizli klasördür).
3. GitHub > **Actions** > **Android Derleme** > **Run workflow**.
4. Bitince sayfanın altındaki **Artifacts** bölümünden zip'i indir:
   - `dukkan-ustasi-debug.apk` → telefona kopyala, “bilinmeyen kaynaklara izin ver” ile kur ve dene.
   - `dukkan-ustasi-release-unsigned.aab` → AAB'nin doğru üretildiğinin kanıtı. **İmzasız olduğu için Play kabul etmez**; Aşama C'de imzalanacak.

Hat şunları yapar: `npm ci` → birim testleri → `cap add/sync android` → oyunun simgesi ve açılış ekranı kopyalanır → sürüm kodu = çalıştırma numarası,
sürüm adı = `package.json` sürümü, ekran yönü dikey → `gradlew assembleDebug bundleRelease` → çıktıları yükler.

### Aşama B — Android projesini sabitleme ve görünüm

- `android/` klasörünü bir kez üretip depoya ekle (Gradle ayarları, simge, açılış ekranı kalıcı olsun). `.gitignore`'daki `android/` satırı kaldırılır.
- Gerekirse kayıt için `@capacitor/preferences` eklenir (localStorage Android'de de kalıcıdır; bu yalnızca ek güvence).

### Aşama C — İmzalama (ilk Play yüklemesinden önce)

Google Play yalnızca **yükleme anahtarı (upload key)** ile imzalı AAB kabul eder. Plan:

1. Bir kez, bir **keystore** dosyası oluşturulur (`keytool`, Java ile gelir; bilgisayarındaki `.jdks` klasöründe Java zaten görünüyor).
2. Keystore dosyası **base64** metne çevrilip GitHub deposunda *Settings → Secrets and variables → Actions* altına
   gizli değişken olarak eklenir: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
   Bu değerleri **sen** girersin; bana veya kimseye söylemen gerekmez.
3. İş akışına, bu gizli değişkenler varsa AAB'yi imzalayan bir adım eklenir. Yoksa bugünkü gibi imzasız üretmeye devam eder.
4. **Play App Signing** açık kalır: Google, uygulamanın asıl imza anahtarını kendisi saklar; yükleme anahtarı kaybolursa Play Console'dan sıfırlatılabilir.
5. Keystore dosyasını ve parolalarını **iki ayrı yerde yedekle** (ör. USB bellek + parola yöneticisi). Asla depoya koyma (`.gitignore` zaten engelliyor).

### Aşama D — Google Play (ücretli adım, şimdilik yapılmayacak)

- Google Play Console geliştirici hesabı tek seferlik ücretlidir. Hazır olduğunda karar verirsin.
- Yeni kişisel hesaplarda üretime çıkmadan önce kapalı test şartı vardır (belirli sayıda test kullanıcısıyla belirli süre). Başvuru anında güncel şartları kontrol ederiz.
- Gerekenler: imzalı AAB, gizlilik politikası sayfası (oyun veri toplamıyor; basit bir sayfa yeterli), mağaza görselleri, içerik derecelendirme formu.

## Bilgisayarda ne gerekir?

| Aşama | Gerekli | Disk |
|---|---|---|
| Prototipi oynamak | Chrome | 0 |
| Testleri çalıştırmak (isteğe bağlı) | Node.js 22+ | ~100 MB |
| APK/AAB derlemek | Yalnızca tarayıcı + GitHub hesabı | 0 |
| İmzalama anahtarı (Aşama C) | Java (`keytool`) | zaten var gibi görünüyor |

Android Studio, Android SDK, Gradle veya emülatör **kurulmaz**. Uygulama gerçek telefonda APK ile denenir.

## Olası sorunlar

- **Actions sekmesinde iş akışı görünmüyor** → `.github/workflows/android.yml` yüklenmemiş. Web'den yüklerken klasör yapısıyla birlikte sürükle.
- **`npm ci` hatası** → `package-lock.json` yüklenmemiş.
- **Telefon APK'yı kurmuyor** → Ayarlar > Güvenlik > bilinmeyen uygulamaları yükleme iznini o dosya yöneticisine ver.
- **Gradle derlemesi SDK/lisans hatası verirse** → GitHub'ın Ubuntu sunucusunda SDK hazır gelir; hata metnini bana gönder, iş akışını güncelleriz.
