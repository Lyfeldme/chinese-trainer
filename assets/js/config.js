/**
 * Настройки проекта.
 * Цвета Hanzi Writer живут здесь и обновляются модулем HP_THEME.
 */
window.HP_CONFIG = {
  charSize: {
    xl: 180,
    lg: 160,
    md: 140,
    sm: 120,
  },

  breakpoints: {
    lg: 900,
    md: 600,
    sm: 400,
  },

  /** Настройки Hanzi Writer для анимации и общего вида */
  writer: {
    padding: 10,
    showOutline: true,
    strokeAnimationSpeed: 1.2,
    delayBetweenStrokes: 180,
    strokeColor:    '#1f2430',
    radicalColor:   '#4f7cff',
    highlightColor: '#dbe4ff',
    outlineColor:   '#e5e8ef',
    drawingColor:   '#4f7cff',
    drawingWidth: 24,
    showCharacter: true,
  },

  /** Режим «Изучение пошагово» */
  learn: {
    strokeDuration: 550,      // длительность одной черты, мс
    gapBetweenStrokes: 250,   // пауза между чертами, мс
    gapWhileAnimating: 80,    // как часто проверять, что черта закончилась
  },

  quiz: {
    showHintAfterMisses: 2,
    highlightOnComplete: true,
    leniency: 1.0,
  },

  quizMemory: {
    showHintAfterMisses: 3,
    highlightOnComplete: true,
    leniency: 1.0,
  },

  trace: {
    lineWidth: 8,
    color: '#e11d48',
    alpha: 0.9,
  },

  storageKey: 'hanzipath.progress.v1',
  animateStepDelay: 900,
  quizStepDelay: 700,
};