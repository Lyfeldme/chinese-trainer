/**
 * Озвучка китайских слов через Web Speech API.
 * На iOS «будим» синтезатор на первом касании экрана —
 * иначе первый вызов speak() игнорируется.
 *
 * Поддерживает опцию { queue: true }:
 *   - queue: false (по умолчанию) — отменяет текущую речь и говорит новую;
 *   - queue: true — ставит фразу в очередь, чтобы она прозвучала после текущей.
 *
 * Защита от дублирования: одна и та же фраза, отправленная дважды
 * подряд (в течение 400 мс), игнорируется. Это лечит двойное
 * срабатывание touchstart + click на мобильных и «дребезг» кнопки.
 */
window.HP_AUDIO = (function () {
  let cachedVoice = null;

  function pickChineseVoice() {
    if (cachedVoice) return cachedVoice;
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    const zh = voices.find(v => v.lang && v.lang.toLowerCase().startsWith('zh'));
    if (zh) cachedVoice = zh;
    return zh;
  }

  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoice = null;
      pickChineseVoice();
    };

    // iOS: разбудить синтезатор на первом касании/клике
    const wake = () => {
      try {
        const u = new SpeechSynthesisUtterance('');
        u.volume = 0;
        window.speechSynthesis.speak(u);
      } catch (e) { /* ok */ }
      document.removeEventListener('touchstart', wake);
      document.removeEventListener('click', wake);
    };
    document.addEventListener('touchstart', wake, { once: true, passive: true });
    document.addEventListener('click',      wake, { once: true });
  }

  return {
    isSupported() { return 'speechSynthesis' in window; },

    /**
     * @param {string} text
     * @param {{queue?: boolean}} [options]
     */
    speak(text, options = {}) {
      if (!('speechSynthesis' in window)) return false;

      const queue = Boolean(options.queue);
      const t = String(text || '').trim();
      if (!t) return false;

      // Защита от дублирования: если ту же фразу начали говорить
      // меньше 400 мс назад — игнорируем повтор.
      const now = Date.now();
      if (window.HP_AUDIO && window.HP_AUDIO._lastText === t && now - (window.HP_AUDIO._lastAt || 0) < 400) {
        return false;
      }
      if (window.HP_AUDIO) {
        window.HP_AUDIO._lastText = t;
        window.HP_AUDIO._lastAt = now;
      }

      if (!queue) {
        window.speechSynthesis.cancel();
      }

      const utter = new SpeechSynthesisUtterance(t);
      utter.lang = 'zh-CN';
      utter.rate = 0.85;
      const v = pickChineseVoice();
      if (v) utter.voice = v;

      window.speechSynthesis.speak(utter);
      return true;
    },
  };
})();