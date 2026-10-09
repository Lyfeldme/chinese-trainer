/**
 * Обёртка над Hanzi Writer: создание холстов и анимация порядка черт.
 */
window.HP_WRITER = (function () {
  const CFG = window.HP_CONFIG;

  /**
   * Подбирает размер холста под ширину экрана.
   *  > 900 px → 180 px
   *  600–900  → 160 px
   *  400–600  → 140 px
   *  < 400    → 120 px
   */
  function pickSize() {
    const w = window.innerWidth;
    if (w >= CFG.breakpoints.lg) return CFG.charSize.xl;
    if (w >= CFG.breakpoints.md) return CFG.charSize.lg;
    if (w >= CFG.breakpoints.sm) return CFG.charSize.md;
    return CFG.charSize.sm;
  }

  return {
    pickSize,

    /**
     * Создать writers для слова.
     * @param {HTMLElement} container
     * @param {string} word
     * @returns {Array<{writer, box, char}>}
     */
    create(container, word) {
      if (typeof HanziWriter === 'undefined') {
        throw new Error('Hanzi Writer не загружен. Проверьте подключение к интернету и CDN.');
      }

      container.innerHTML = '';
      const size = pickSize();
      const result = [];

      [...word].forEach((char, i) => {
        const box = document.createElement('div');
        box.className = 'char-box';
        box.dataset.index = i;

        const target = document.createElement('div');
        target.id = 'char-' + i;
        target.className = 'char-box__target';
        box.appendChild(target);
        container.appendChild(box);

        const writer = HanziWriter.create(target, char, {
          width: size,
          height: size,
          ...CFG.writer,
        });

        result.push({ writer, box, char });
      });

      return result;
    },

    clearStates(writers) {
      writers.forEach(w => w.box.classList.remove('active', 'done'));
    },

    /** Проиграть анимацию порядка черт по очереди. */
    animateAll(writers, onDone) {
      writers.forEach(w => w.box.classList.remove('active', 'done'));
      writers.forEach((w, i) => {
        setTimeout(() => {
          w.box.classList.add('active');
          w.writer.animateCharacter({
            onComplete: () => {
              w.box.classList.remove('active');
              if (i === writers.length - 1 && typeof onDone === 'function') onDone();
            },
          });
        }, i * CFG.animateStepDelay);
      });
    },

    /**
     * Пересчитать размер холстов при resize окна (например, поворот телефона).
     * Пересоздаёт writers для текущего слова.
     */
    rebuild(container, word) {
      return this.create(container, word);
    },
  };
})();