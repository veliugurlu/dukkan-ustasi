/* Dükkan Ustası — açılış: kaydı yükle, arayüzü başlat, otomatik kaydet. */
(function (root) {
  'use strict';
  var DU = root.DU;
  var loaded = DU.Storage.load();
  var state = loaded.state;

  function save() { DU.Storage.save(state); }

  DU.UI.init(state, save, loaded.status);
  if (loaded.status !== 'loaded') save();

  // Uygulama arka plana alınırken / kapanırken kaydet.
  root.document.addEventListener('visibilitychange', function () {
    if (root.document.visibilityState === 'hidden') save();
  });
  root.addEventListener('pagehide', save);

  // Capacitor (Android) içinde geri tuşu: önce modal/sekme, sonra uygulamadan çık.
  var Cap = root.Capacitor;
  if (Cap && Cap.Plugins && Cap.Plugins.App) {
    Cap.Plugins.App.addListener('backButton', function () {
      if (!DU.UI.handleBack()) { save(); Cap.Plugins.App.exitApp(); }
    });
  }

  // Hata ayıklama için konsoldan erişim: DU.state
  DU.state = state;
})(window);
