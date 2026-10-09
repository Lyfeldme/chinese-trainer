/**
 * Обёртка над pinyin-pro.
 *
 * Сохраняет прежний интерфейс HP_PINYIN, чтобы main.js
 * и остальные модули работали без изменений:
 *   HP_PINYIN.convert('dian4 ying3')     → 'diàn yǐng'
 *   HP_PINYIN.hasToneNumbers('dian4')    → true
 *
 * Если pinyin-pro по какой-то причине не загрузился
 * (нет интернета, CDN заблокирован), используется
 * встроенный резервный конвертер — точно такой же,
 * какой был в старой версии pinyin.js.
 */
window.HP_PINYIN = (function () {

  /* ============================================================
     Проверяем, доступен ли pinyin-pro
     ============================================================ */
  const hasPinyinPro = typeof window.pinyinPro !== 'undefined'
                    && typeof window.pinyinPro.convert === 'function';

  /* ============================================================
     Резервная реализация (на случай, если CDN недоступен)
     ============================================================ */
  const FALLBACK_MARKS = {
    a:  ['a', 'ā', 'á', 'ǎ', 'à'],
    e:  ['e', 'ē', 'é', 'ě', 'è'],
    i:  ['i', 'ī', 'í', 'ǐ', 'ì'],
    o:  ['o', 'ō', 'ó', 'ǒ', 'ò'],
    u:  ['u', 'ū', 'ú', 'ǔ', 'ù'],
    'ü':['ü', 'ǖ', 'ǘ', 'ǚ', 'ǜ'],
  };

  function fallbackConvertSyllable(syl) {
    const cap = /^[A-Z]/.test(syl);
    let s = syl.toLowerCase();
    const m = s.match(/^([a-zü]+)([1-5])?$/);
    if (!m) return syl;

    let letters = m[1].replace(/v/g, 'ü');
    const tone = m[2] ? parseInt(m[2], 10) : 5;

    if (tone === 5) {
      return cap ? letters[0].toUpperCase() + letters.slice(1) : letters;
    }

    let target = -1;
    if (letters.includes('a'))      target = letters.indexOf('a');
    else if (letters.includes('o')) target = letters.indexOf('o');
    else if (letters.includes('e')) target = letters.indexOf('e');
    else if (letters.includes('iu')) target = letters.indexOf('u', letters.indexOf('iu'));
    else if (letters.includes('ui')) target = letters.indexOf('i', letters.indexOf('ui'));
    else if (letters.includes('i')) target = letters.indexOf('i');
    else if (letters.includes('u')) target = letters.indexOf('u');
    else if (letters.includes('ü')) target = letters.indexOf('ü');

    if (target < 0) return syl;

    const ch = letters[target];
    const marked = FALLBACK_MARKS[ch] && FALLBACK_MARKS[ch][tone]
      ? FALLBACK_MARKS[ch][tone]
      : ch;
    const result = letters.slice(0, target) + marked + letters.slice(target + 1);
    return cap ? result[0].toUpperCase() + result.slice(1) : result;
  }

  function fallbackConvert(text) {
    if (!text) return text;
    return String(text)
      .trim()
      .split(/\s+/)
      .map(fallbackConvertSyllable)
      .join(' ');
  }

  /* ============================================================
     Основная реализация через pinyin-pro
     ============================================================ */
  function convertWithPinyinPro(text) {
    if (!text) return text;
    try {
      // format: 'numToSymbol' — превращает dian4 → diàn
      // separator: ' ' — сохраняет пробелы между слогами
      return window.pinyinPro.convert(String(text), {
        format: 'numToSymbol',
        separator: ' ',
      });
    } catch (err) {
      console.warn('[pinyin.js] pinyin-pro convert error, using fallback:', err);
      return fallbackConvert(text);
    }
  }

  /* ============================================================
     Публичный API — как в старой версии
     ============================================================ */
  return {
    /**
     * Сконвертировать строку: 'dian4 ying3' → 'diàn yǐng'
     * Поддерживает v → ü, заглавные буквы, нейтральный тон (5 или без цифры).
     */
    convert(text) {
      if (!text) return text;
      if (hasPinyinPro) return convertWithPinyinPro(text);
      return fallbackConvert(text);
    },

    /**
     * Есть ли в строке цифры тона?
     * 'dian4' → true, 'diàn' → false, 'dian' → false
     */
    hasToneNumbers(text) {
      return /\b[a-zü]+\d\b/i.test(String(text || ''));
    },

    /**
     * Показывает, какая реализация используется.
     * Полезно для отладки: в консоли HP_PINYIN.mode
     */
    get mode() {
      return hasPinyinPro ? 'pinyin-pro' : 'fallback';
    },
  };
})();