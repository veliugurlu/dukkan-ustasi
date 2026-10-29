# Google Play — hesap ve mağaza sayfası hazırlığı

## 1. Hesap açarken (senin yapacakların)

- play.google.com/console → **Kişisel hesap** (Personal) seç. Şirket/D-U-N-S gerekmez.
- Tek seferlik kayıt ücretini öde, kimlik doğrulamasını tamamla (birkaç gün sürebilir).
- **Bir Android cihaz doğrulaması** istenebilir (Play Console uygulamasıyla). Elinde Android yoksa bir yakınının telefonunu kullanabilirsin.
- Hesap açıldıktan sonra yeni kişisel hesaplarda kural: **en az 12 test kullanıcısı, 14 gün kesintisiz kapalı test**,
  sonra üretime erişim başvurusu. 12 kişiyi şimdiden bul (Android telefonu ve Gmail adresi olan).

Şifreleri, anahtar dosyalarını kimseyle (benimle de) paylaşma.

## 2. Uygulama bilgileri (kopyala-yapıştır)

| Alan | Değer |
|---|---|
| Uygulama adı | Dükkan Ustası |
| Paket adı | com.veli.dukkanustasi |
| Varsayılan dil | Türkçe (tr-TR) |
| Uygulama / oyun | Oyun |
| Kategori | Simülasyon |
| Ücretsiz / ücretli | Ücretsiz |
| Reklam içeriyor mu? | Hayır |
| Gizlilik politikası URL | https://veliugurlu.github.io/dukkan-ustasi/gizlilik.html |

### Kısa açıklama (en fazla 80 karakter)

> Eskiyi ucuza al, tamir et, kârla sat. Dükkânını şehrin en iyisi yap!

### Tam açıklama

> **Dükkan Ustası**'nda küçük bir ikinci el dükkânın sahibisin. Pazardaki satıcılardan eski radyolar, daktilolar,
> pikaplar ve gramofonlar alıyor, atölyende tamir ediyor ve kârla satıyorsun.
>
> Ama dikkat! Her satıcı dürüst değil:
> • Bazı satıcılar fazla ister — **pazarlık** et, ama satıcıyı kızdırma.
> • Bazı eşyalarda **gizli kusur** vardır — almadan önce incele.
> • Piyasa her gün değişir; doğru günü bekle ama kirayı unutma.
>
> Özellikler:
> • 10 farklı eşya: abajurdan antika gramofona
> • Usta Dokunuşu: zamanlamayla tamir et, eşyayı daha değerli çıkar
> • Müşteri siparişleri: istenen eşyayı zamanında bul, fazlasını kazan
> • Günlük olaylar: bit pazarı, koleksiyoncu fuarı, turist kafilesi, sağanak yağmur…
> • 20 ödüllü hedef ve 10 dükkân seviyesi
> • 5 geliştirme: Atölye, Vitrin, Depo, Uzman Gözü, Esnaf Ağı
> • İnternet gerekmez, reklam yok, veri toplanmaz
>
> Ucuza al, iyi tamir et, akıllıca sat: gerçek bir **Dükkan Ustası** ol!

## 3. Formlar (Play Console → Uygulama içeriği)

- **Veri güvenliği:** "Uygulama kullanıcı verisi toplamıyor veya paylaşmıyor" → Hayır / Hayır.
- **İçerik derecelendirme (IARC):** Kategori: Oyun. Şiddet, cinsellik, kumar, kullanıcı etkileşimi, konum paylaşımı: hepsi **Hayır**.
  (Oyun içi para gerçek para değildir ve satın alınamaz.)
- **Hedef kitle:** 13 yaş ve üstü öneriliyor (çocuklara yönelik program kurallarına girmemek için).
- **Reklamlar:** Hayır. **Uygulama erişimi:** Tüm işlevler kısıtlamasız.
- **Haber uygulaması / sağlık / finans:** Hayır.

## 4. Görseller (sırası gelince ben üreteceğim)

- Uygulama simgesi 512×512 PNG → `www/assets/icon-512.png`
- Öne çıkan görsel 1024×500
- En az 2 telefon ekran görüntüsü (dikey, 1080×1920 gibi)

## 5. Teknik adımlar (ben hazırlayacağım)

1. **İmzalama:** Bilgisayarında `keytool` ile yükleme anahtarı oluşturma talimatı; anahtar GitHub Secrets'a senin elinle girilir.
2. İş akışına imzalı AAB üretme adımı.
3. Play Console → **Kapalı test** kanalına ilk AAB yüklemesi, 12 test kullanıcısının e-postaları.
