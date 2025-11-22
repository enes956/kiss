# KissApp Kısayol Tanıtımı

KissApp, Windows hedefli bir Electron başlatıcısıdır. Ana odak noktası uygulamanın güncelleme ve kimlik doğrulama akışlarını güvenli bir şekilde yönetmek, ardından render tarafında güncel HTML/CSS/JS arayüzünü sunmaktır. Bu dosya, dizin yapısını, ana bileşenleri ve PowerShell üzerinden geliştirme/packaging adımlarını özetler. Kapsamlı hatalar ve düzeltmeler `codex/codex-v1.txt` altında kronolojik olarak not edilir.

## Dizin Yapısı
- `main.js`: Electron ana proses giriş noktası; yönetici yükseltmesi, güncelleme denetimi, oturum açma IPC köprüleri ve pencere oluşturma burada yapılır. Güncelleme tarafı artık `app_new.asar` üretip hash doğrulamasıyla uygulama açılışında `app.asar` üzerine atomik taşıma yapar; eski `app_new.bin` çıktıları uyumluluk için desteklenir ve pending dosyası varsa development modunda bile patch uygulanır. `asar.listPackage` ile offline doğrulama yapıldığı için bozuk paketler pending bırakılmadan reddedilir. Patch başarıyla uygulandığında ana süreç kendini yeniden başlatır, böylece yeni `app.asar` aynı oturumda aktifleşir.
- `global/`: Renderer tarafına preload edilen API köprüsü (`preload.js`), IPC kanal sabitleri (`ipcChannels.cjs`), uygulama geneli stil tanımı (`style.js`) ve başlatıcıyı yükleyen renderer giriş noktası (`renderer.js`).
- `launcher/`: HTML kabuğu (`index.html`) ve render tarafı mantığı. Header/sidebar/footer şablonları, görünüm yöneticisi ve giriş/güncelleme ekranlarına ait template/event dosyaları burada bulunur.
- `workers/`: Cloudflare Workers için tasarlanmış küçük servisler (auth, key, proxy vb.) ve ortak yardımcılar. Lokal Electron paketinin dışındaki API katmanını temsil eder.
- `build.js`: Obfuscation, electron-builder paketleme ve şifreli güncelleme çıktılarının üretildiği Node betiği.
- `build/`: Dağıtıma gömülen ikon ve lisans gibi statik varlıklar.

## Ana Proses (main.js)
- **Yönetici Kontrolü:** Windows’ta oturum gruplarını sorgulayarak yerel admin SID’ini arar; yetki yoksa `runas` kabuğu ile kendini yeniden başlatır.
- **Güncelleme Sistemi:**
  - Uzak `version.json` dosyasını AES-GCM ile çözer, dinamik `asarKey` alır ve yalnızca izin verilen hosta (`updater.bekapvc.com`) TLS doğrulamasıyla bağlanır.
  - `app.asar.enc` dosyasını indirir, doğrulanmış ZIP’ten yeni ASAR’ı çıkarır ve `app_new.asar` olarak kullanıcı verisi dizinine yazar.
  - Hash eşleşirse `update_pending.json` oluşturur; bir sonraki açılışta `applyStartupPatch` eski ASAR’ı yedekleyip yenisiyle değiştirir. ASAR doğrulaması için kullanılan `asar` modülü artık prod bağımlılığına taşındığı için paketli kurulumda eksik modül hatası oluşmaz.
  - Eksik kalan IPC köprüsü tamamlandı: UPDATE_* kanalları artık renderer’dan gelen `update:check` / `update:start` / `update:done` isteklerini dinler, durum/ilerleme ve hata mesajlarını renderer’a geri yollar. Güncel sürümde otomatik login geçişi için `update:done` ana süreç tarafından yeniden yayınlanır.
  - Güncelleme sürecinin her adımı artık loglanıyor: indirilen baytlar ve Content-Length, AES çözümünden çıkan ZIP boyutu, ZIP entry listesi, çıkarılan ASAR boyutu, hash doğrulaması ve pending flag yazımı konsola düşüyor. Patch aşaması da bulunan ASAR boyutunu ve doğrulama sonucunu raporluyor; bozuk dosya tespit edilirse otomatik olarak siliniyor.
  - `applyStartupPatch` artık `app.isPackaged === false` iken patch denemesini tamamen atlıyor; development modunda Electron’un kendi `resources/app.asar` dosyası değiştirilmediği için “Invalid package .../app_new.asar” hataları kesiliyor. Pending dosyası dev modda yalnızca bilgilendirme amaçlı loglanır.
- **Kimlik Doğrulama:** Renderer’dan gelen `auth:login` isteğini makine kimliği ile `https://auth.bekapvc.com/login` adresine iletir, token’ı yalnızca RAM’de tutar ve oturum durumunu IPC üzerinden paylaşır.
- **Pencere & IPC:** Çerçevesiz ana pencereyi preload köprüsüyle açar; pencere kontrolleri ve sürüm bilgisi gibi IPC handler’larını kaydeder.

## Renderer & Arayüz (launcher/)
- `launcher/index.html` minimalist HTML kabuğunu sağlar; `renderer.js` dinamik olarak stil dosyasını üretir ve `launcher()` fonksiyonunu çalıştırır.
- `content/viewManager.js` güncelleme ve giriş ekranları arasında geçişi yönetir; güncelleme tamamlandığında otomatik olarak login görünümüne geçer.
- `views/update/*` kullanıcıya güncelleme durumlarını, indirme ilerlemesini ve yeniden deneme/başlatma butonlarını gösterir.
- `views/login/*` brute-force kilidi, CapsLock uyarısı ve parola gizleme/gösterme gibi iyileştirmelerle giriş formunu sunar.

## Paketleme ve Güncelleme Çıktıları
- `package.json`’daki `npm run build` komutu `node build.js` betiğini çağırır. Betik; seçili dosyaları `dist/` altına kopyalar, iki aşamalı JavaScript obfuscation uygular, `node_modules`’u taşır ve `electron-builder` ile Windows NSIS kurulum paketini üretir.
- Oluşan `app.asar`, `dist/dist-build/win-unpacked/resources` altında bulunur ve `dist-update/app.asar.enc` olarak AES-GCM ile şifrelenmiş hâli yazılır.
- Aynı betik, şifreli `version.json`’u üretir ve hem `dist-update/` hem `dist/` içine bırakır. Uzak güncelleyiciye yüklenmesi gereken dosyalar: `dist-update/app.asar.enc` ve `dist-update/version.json`.

## PowerShell Üzerinden Geliştirme
1. Bağımlılıkları yükleyin: `npm install`.
2. Geliştirme sırasında renderer’ı görmek için: `npm run dev` (Electron’u direkt çalıştırır).
3. Paket üretmek için: `npm run build` ya da `node build.js`.
   - Windows’ta PowerShell kullanırken `Set-ExecutionPolicy -Scope Process Bypass` komutu, gerektiğinde `setup-secrets.ps1` gibi yardımcı betiklerin çalışmasına izin verir.
4. Üretilen kurulum dosyası `dist/dist-build` içinde `KissApp-Setup-<version>.exe` adıyla bulunur; test kurulumlarını buradan yapabilirsiniz.

## Güncelleme Akışı Özet Adımları
1. `node build.js` → `dist-update/app.asar.enc` ve `version.json` üretimi.
2. Dosyaları güncelleme sunucusuna (`updater.bekapvc.com`) yükleyin.
3. Uygulama açıldığında `main.js` sürümü kontrol eder, yeni ASAR’ı indirip doğrular ve bir sonraki açılış için `update_pending.json` oluşturur.
4. Uygulama yeniden başlatıldığında `applyStartupPatch` yeni ASAR’ı aktif eder, yedeği temizler ve süreç otomatik yeniden başlatılarak yeni sürüm aynı oturumda devreye alınır.
5. Renderer, UPDATE_* kanallarını sadece ana süreçten alır; güncelleme tamamlandığında `update:done` olayı login görünümünü otomatik tetikler.

Bu belge, kodun hızlıca anlaşılması için özet bir rehberdir; detay için ilgili dosyalara bakabilirsiniz.
