/* Dükkan Ustası — koddan üretilen ses efektleri (Web Audio, ses dosyası yok). */
(function (root) {
  'use strict';
  var DU = (root.DU = root.DU || {});
  var ctx = null;
  var enabled = true;

  function ac() {
    if (!ctx) {
      var A = root.AudioContext || root.webkitAudioContext;
      if (!A) return null;
      try { ctx = new A(); } catch (e) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, start, dur, type, vol, slideTo) {
    var c = ac();
    if (!c) return;
    var t = c.currentTime + start;
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }

  var SOUNDS = {
    click: function () { tone(660, 0, 0.05, 'triangle', 0.06); },
    buy: function () { tone(880, 0, 0.08, 'square', 0.05); tone(1320, 0.07, 0.12, 'square', 0.05); },
    sell: function () {
      tone(1046, 0, 0.1, 'triangle', 0.12); tone(1318, 0.08, 0.1, 'triangle', 0.12);
      tone(1568, 0.16, 0.25, 'triangle', 0.12);
    },
    repair: function () {
      for (var i = 0; i < 4; i++) tone(180 + i * 15, i * 0.22, 0.07, 'square', 0.08, 90);
      tone(1200, 0.95, 0.2, 'sine', 0.08, 1800);
    },
    level: function () {
      [523, 659, 784, 1046].forEach(function (f, i) { tone(f, i * 0.11, 0.22, 'triangle', 0.12); });
    },
    error: function () { tone(220, 0, 0.18, 'sawtooth', 0.06, 150); },
    goal: function () {
      [784, 988, 1175, 1568].forEach(function (f, i) { tone(f, i * 0.07, 0.16, 'triangle', 0.1); });
    },
    inspect: function () {
      for (var i = 0; i < 3; i++) tone(500 + i * 120, i * 0.18, 0.08, 'sine', 0.07);
    },
    day: function () { tone(392, 0, 0.15, 'sine', 0.1); tone(587, 0.12, 0.25, 'sine', 0.1); }
  };

  DU.Audio = {
    setEnabled: function (v) { enabled = !!v; },
    play: function (name) {
      if (!enabled || !SOUNDS[name]) return;
      try { SOUNDS[name](); } catch (e) { /* ses hatası oyunu durdurmaz */ }
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
