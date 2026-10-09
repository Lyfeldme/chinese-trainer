/**
 * Управление темой: светлая / тёмная.
 * - Синхронизирует data-theme, theme-color, цвета Hanzi Writer.
 * - Сохраняет выбор в localStorage.
 * - На первом запуске берёт системную тему.
 */
window.HP_THEME = (function () {
  const KEY = 'hanzipath.theme.v1';

  /* Палитры для Hanzi Writer (светлая / тёмная) */
  const PALETTES = {
    light: {
      strokeColor:    '#1f2430',
      radicalColor:   '#4f7cff',
      highlightColor: '#dbe4ff',
      outlineColor:   '#e5e8ef',
      drawingColor:   '#4f7cff',
      traceColor:     '#e11d48',
    },
    dark: {
      strokeColor:    '#e8eaef',
      radicalColor:   '#7a9cff',
      highlightColor: '#2d3650',
      outlineColor:   '#3a4155',
      drawingColor:   '#7a9cff',
      traceColor:     '#f472b6',
    },
  };

  /* Цвет статус-бара браузера (Android Chrome) — по теме и режиму */
  const META_COLORS = {
    light: {
      idle:       '#f5f7fb',
      animate:    '#eef1f8',
      quiz:       '#e6ecff',
      quizMemory: '#f3e8ff',
      trace:      '#ffe6ec',
    },
    dark: {
      idle:       '#0f1117',
      animate:    '#131720',
      quiz:       '#151b2e',
      quizMemory: '#1c1630',
      trace:      '#2a1620',
    },
  };

  let currentTheme = 'light';
  let currentMode  = 'idle';

  /* ---------- localStorage ---------- */
  function readStored() {
    try { return localStorage.getItem(KEY); } catch { return null; }
  }
  function writeStored(v) {
    try { localStorage.setItem(KEY, v); } catch {}
  }

  /* ---------- Обновление <meta name="theme-color"> ---------- */
  function updateMeta() {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    const palette = META_COLORS[currentTheme] || META_COLORS.light;
    meta.setAttribute('content', palette[currentMode] || palette.idle);
  }

  /* ---------- Обновление цветов Hanzi Writer в HP_CONFIG ---------- */
  function updateWriterColors(theme) {
    const c = PALETTES[theme] || PALETTES.light;
    Object.assign(window.HP_CONFIG.writer, {
      strokeColor:    c.strokeColor,
      radicalColor:   c.radicalColor,
      highlightColor: c.highlightColor,
      outlineColor:   c.outlineColor,
      drawingColor:   c.drawingColor,
    });
    window.HP_CONFIG.trace.color = c.traceColor;
  }

  /* ---------- Применить тему ---------- */
  function apply(theme) {
    currentTheme = (theme === 'dark') ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateMeta();
    updateWriterColors(currentTheme);
  }

  /* ---------- Публичный API ---------- */
  return {
    /** Инициализация: читает localStorage или системную тему */
    init() {
      const stored = readStored();
      if (stored === 'light' || stored === 'dark') {
        apply(stored);
        return;
      }
      const prefersDark =
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      apply(prefersDark ? 'dark' : 'light');
    },

    /** Текущая тема: 'light' | 'dark' */
    get() { return currentTheme; },

    /** Текущая палитра Hanzi Writer */
    getColors() { return PALETTES[currentTheme] || PALETTES.light; },

    /** Установить тему и сохранить */
    set(theme) {
      // Плавный переход
      document.documentElement.classList.add('theme-transition');
      apply(theme);
      writeStored(currentTheme);
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transition');
      }, 320);
      return currentTheme;
    },

    /** Переключить тему */
    toggle() {
      return this.set(currentTheme === 'dark' ? 'light' : 'dark');
    },

    /** Установить режим (для meta theme-color) */
    setMode(mode) {
      currentMode = mode || 'idle';
      updateMeta();
    },
  };
})();