/**
 * Конструктор прописей.
 *
 * Рендерит иероглифы из данных hanzi-writer-data (CDN) — готовые
 * SVG-пути, по одному на черту. HanziWriter для рендера не нужен.
 *
 * «Первые N черт» = strokes.slice(0, N).
 * Y-flip обязателен: данные используют Y-вверх, SVG — Y-вниз.
 * Каждый path рисуется и fill, и stroke — для надёжности.
 *
 * Дополнительно:
 *   colorMode — подсвечивать последнюю добавленную черту акцентным цветом
 *   ghostMode — лишние ячейки в конце показывать бледным контуром для обводки
 *   cells === 'auto' — число ячеек подстраивается под количество черт
 *     (cells = totalStrokes + 2: эталон + каждая черта + пустая)
 *   Оба режима colorMode и ghostMode работают ТОЛЬКО в режиме steps.
 */
window.HP_WORKSHEETS = (function () {
  const els = {};
  const SETTINGS_KEY = 'hanzipath.worksheets.v1';
  const strokesCache = {};
  const CDN = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0';

  // Цвета для подсветки последней добавленной черты
  const ACCENT_COLORS = [
    '#6E55E6', // фиолет
    '#F2B544', // золото
    '#25A67B', // зелёный
    '#E75891', // розовый
    '#2B8CE5', // синий
  ];

  const state = {
    settings: {
      count: 10,
      cells: 8,           // число | 'auto'
      grid: 'tian',
      cellSize: 80,
      showPinyin: true,
      showTranslation: true,
      mode: 'steps',
      colorMode: false,
      ghostMode: true,
      source: 'level',
    },
  };

  /* ============================================================
     Настройки
     ============================================================ */
  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (typeof s.count === 'number') state.settings.count = s.count;
      if (typeof s.cells === 'number' || s.cells === 'auto') state.settings.cells = s.cells;
      if (s.grid) state.settings.grid = s.grid;
      if (typeof s.cellSize === 'number') state.settings.cellSize = s.cellSize;
      if (typeof s.showPinyin === 'boolean') state.settings.showPinyin = s.showPinyin;
      if (typeof s.showTranslation === 'boolean') state.settings.showTranslation = s.showTranslation;
      if (s.mode === 'normal' || s.mode === 'steps') state.settings.mode = s.mode;
      if (typeof s.colorMode === 'boolean') state.settings.colorMode = s.colorMode;
      if (typeof s.ghostMode === 'boolean') state.settings.ghostMode = s.ghostMode;
      if (s.source) state.settings.source = s.source;
    } catch (e) { /* ok */ }
  }
  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings)); }
    catch (e) { /* ok */ }
  }

  /* ============================================================
     Сетка ячейки — строка SVG
     ============================================================ */
  function buildGridSvgString(type) {
    const parts = [];
    parts.push('<rect x="1" y="1" width="98" height="98" fill="none" stroke="#333" stroke-width="1.6"/>');

    if (type === 'tian' || type === 'mi') {
      parts.push('<line x1="50" y1="0" x2="50" y2="100" stroke="#bbb" stroke-width="0.7" stroke-dasharray="3 3"/>');
      parts.push('<line x1="0" y1="50" x2="100" y2="50" stroke="#bbb" stroke-width="0.7" stroke-dasharray="3 3"/>');
    }
    if (type === 'mi') {
      parts.push('<line x1="0" y1="0" x2="100" y2="100" stroke="#ccc" stroke-width="0.7" stroke-dasharray="3 3"/>');
      parts.push('<line x1="100" y1="0" x2="0" y2="100" stroke="#ccc" stroke-width="0.7" stroke-dasharray="3 3"/>');
    }
    if (type === 'jiu') {
      [33.333, 66.666].forEach(p => {
        parts.push(`<line x1="${p}" y1="0" x2="${p}" y2="100" stroke="#ccc" stroke-width="0.6" stroke-dasharray="2 3"/>`);
        parts.push(`<line x1="0" y1="${p}" x2="100" y2="${p}" stroke="#ccc" stroke-width="0.6" stroke-dasharray="2 3"/>`);
      });
    }

    return `<svg class="ws-cell__grid" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">${parts.join('')}</svg>`;
  }

  /* ============================================================
     Загрузка черт с CDN
     ============================================================ */
  async function fetchStrokes(char) {
    if (char in strokesCache) return strokesCache[char];
    try {
      const url = `${CDN}/${encodeURIComponent(char)}.json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const strokes = (data && Array.isArray(data.strokes) && data.strokes.length)
        ? data.strokes
        : null;
      strokesCache[char] = strokes;
      if (!strokes) {
        console.warn('[worksheets] нет черт для', char);
      } else {
        console.log('[worksheets] загружено для', char, '— черт:', strokes.length);
      }
      return strokes;
    } catch (e) {
      console.error('[worksheets] fetchStrokes error для', char, e);
      strokesCache[char] = null;
      return null;
    }
  }

  /* ============================================================
     Хелпер: собрать paths одного цвета
     ============================================================ */
  function buildPaths(strokes, count, color, opts) {
    opts = opts || {};
    const opacity = opts.opacity != null ? opts.opacity : 1;
    const strokeW = opts.strokeWidth != null ? opts.strokeWidth : 2;
    const attrOpacity = opacity < 1 ? ` opacity="${opacity}"` : '';
    const attrStroke = strokeW > 0
      ? ` stroke="${color}" stroke-width="${strokeW}" stroke-linejoin="round" stroke-linecap="round"`
      : '';

    let html = '';
    for (let i = 0; i < count; i++) {
      html += `<path d="${strokes[i]}" fill="${color}"${attrStroke}${attrOpacity}/>`;
    }
    return html;
  }

  /* ============================================================
     SVG иероглифа из массива черт
     ============================================================
     mode: 'full'    — все черты чёрным
           'outline' — все черты светло-серым
           'steps'   — первые N черт чёрным; последняя добавленная — акцентным (если colorMode)
           'ghost'   — бледный контур всего иероглифа (для обводки)
           'empty'   — пусто
  */
  function renderChar(strokes, mode, upTo) {
    if (!strokes || !strokes.length) return '';
    if (mode === 'empty') return '';

    const useColor = state.settings.colorMode;
    const accent = ACCENT_COLORS[0];

    let pathsHtml = '';

    if (mode === 'full') {
      pathsHtml = buildPaths(strokes, strokes.length, '#111111');
    }
    else if (mode === 'outline') {
      pathsHtml = buildPaths(strokes, strokes.length, '#c8c8c8');
    }
    else if (mode === 'ghost') {
      pathsHtml = buildPaths(strokes, strokes.length, '#111111', {
        opacity: 0.15,
        strokeWidth: 1,
      });
    }
    else if (mode === 'steps') {
      const n = Math.max(1, Math.min(upTo || 1, strokes.length));

      if (useColor && n > 1) {
        pathsHtml += buildPaths(strokes, n - 1, '#111111');
        pathsHtml += buildPaths([strokes[n - 1]], 1, accent, { strokeWidth: 2.5 });
      } else {
        pathsHtml = buildPaths(strokes, n, '#111111');
      }
    }
    else {
      return '';
    }

    return (
      `<svg viewBox="0 0 1024 1024" ` +
      `preserveAspectRatio="xMidYMid meet" ` +
      `xmlns="http://www.w3.org/2000/svg" ` +
      `width="100%" height="100%">` +
      `<g transform="translate(0,900) scale(1,-1)">${pathsHtml}</g>` +
      `</svg>`
    );
  }

  /* ============================================================
     Раскладка черт по ячейкам
     ============================================================
     normal: [full, outline, empty, empty, ...]

     steps:
       Если черт >= (cells - 2):
         [full, 1, 2, ..., N, empty]
       Если черт < (cells - 2):
         [full, 1, 2, ..., N, ghost, ghost, ..., empty]

     При cells === 'auto' вызывающий код передаёт totalCells = totalStrokes + 2,
     поэтому ghostCount = 0 — каждый иероглиф получает ровно столько ячеек,
     сколько нужно.
  */
  function buildCellModes(totalStrokes, totalCells, displayMode) {
    const modes = [];

    if (displayMode !== 'steps' || !totalStrokes || totalCells < 3) {
      for (let k = 0; k < totalCells; k++) {
        if (k === 0) modes.push({ mode: 'full' });
        else if (k === 1 && totalCells >= 3) modes.push({ mode: 'outline' });
        else modes.push({ mode: 'empty' });
      }
      return modes;
    }

    modes.push({ mode: 'full' });
    const middle = totalCells - 2;

    const stepsToShow = Math.min(middle, totalStrokes);
    const ghostCount = middle - stepsToShow;

    for (let i = 1; i <= stepsToShow; i++) {
      let upTo;
      if (stepsToShow === middle) {
        upTo = Math.min(i, totalStrokes);
      } else {
        if (i === 1) upTo = 1;
        else if (i === stepsToShow) upTo = totalStrokes;
        else upTo = Math.max(1, Math.floor(totalStrokes * i / stepsToShow));
      }
      modes.push({ mode: 'steps', upTo: upTo });
    }

    for (let i = 0; i < ghostCount; i++) {
      if (state.settings.ghostMode) {
        modes.push({ mode: 'ghost' });
      } else {
        modes.push({ mode: 'steps', upTo: totalStrokes });
      }
    }

    modes.push({ mode: 'empty' });
    return modes;
  }

  /* ============================================================
     Построение листа
     ============================================================ */
  async function buildSheet(words) {
    const s = state.settings;

    const uniqueChars = new Set();
    words.forEach(w => [...w.word].forEach(c => uniqueChars.add(c)));

    const strokesMap = {};
    await Promise.all([...uniqueChars].map(async c => {
      strokesMap[c] = await fetchStrokes(c);
    }));

    const today = new Date();
    const dateStr = today.toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric',
    });

    const lines = [];
    lines.push('<div class="ws-sheet__head">');
    lines.push('<div class="ws-sheet__title">Прописи · китайские иероглифы</div>');
    lines.push(`<div class="ws-sheet__date">${dateStr}</div>`);
    lines.push('</div>');

    const gridSvg = buildGridSvgString(s.grid);

    for (const w of words) {
      const chars = [...w.word];
      const syllables = String(w.pinyin || '').trim().split(/\s+/);

      lines.push('<div class="ws-row">');

      if (s.showPinyin && w.pinyin) {
        lines.push(`<div class="ws-row__pinyin-line">${w.pinyin}</div>`);
      }
      if (s.showTranslation && w.translation) {
        lines.push(`<div class="ws-row__translation-line">${w.translation}</div>`);
      }

      for (let ci = 0; ci < chars.length; ci++) {
        const char = chars[ci];
        const sylLabel = syllables[ci] || '';
        const strokes = strokesMap[char];
        const totalStrokes = strokes ? strokes.length : 0;

        // Количество ячеек для этого иероглифа.
        // Если cells === 'auto' — подстраиваемся под число черт.
        const totalCells = (s.cells === 'auto')
          ? Math.max(3, totalStrokes + 2)   // эталон + N черт + пустая
          : s.cells;

        lines.push('<div class="ws-chars">');
        lines.push(`<div class="ws-chars__syllable">${sylLabel}</div>`);
        lines.push('<div class="ws-cells">');

        const cellModes = buildCellModes(totalStrokes, totalCells, s.mode);

        cellModes.forEach(cfg => {
          const svgChar = renderChar(strokes, cfg.mode, cfg.upTo);

          let cornerLabel = '';
          if (cfg.mode === 'steps' && cfg.upTo) {
            cornerLabel = `<span class="ws-cell__corner">${cfg.upTo}</span>`;
          }

          lines.push(
            `<div class="ws-cell" style="width:${s.cellSize}px;height:${s.cellSize}px">` +
              gridSvg +
              (svgChar ? `<div class="ws-cell__char">${svgChar}</div>` : '') +
              cornerLabel +
            '</div>'
          );
        });

        lines.push('</div>');
        lines.push('</div>');
      }

      lines.push('</div>');
    }

    return lines.join('');
  }

  /* ============================================================
     UI
     ============================================================ */
  function openSetup() {
    if (!els.setupModal) return;
    els.setupModal.hidden = false;
    updateSetupUI();
  }
  function closeSetup() {
    if (els.setupModal) els.setupModal.hidden = true;
  }

  function updateSetupUI() {
    const s = state.settings;
    const stepsActive = s.mode === 'steps';

    toggleActive(els.countBtns, s.count);
    toggleActive(els.cellsBtns, s.cells);
    toggleActive(els.gridBtns, s.grid);
    toggleActive(els.sizeBtns, s.cellSize);
    toggleActive(els.sourceBtns, s.source);
    toggleActive(els.modeBtns, s.mode);

    if (els.labelPinyin)      els.labelPinyin.classList.toggle('active', s.showPinyin);
    if (els.labelTranslation) els.labelTranslation.classList.toggle('active', s.showTranslation);

    // colorMode и ghostMode работают только в steps-режиме.
    if (els.labelColorMode) {
      els.labelColorMode.classList.toggle('active', stepsActive && s.colorMode);
      els.labelColorMode.classList.toggle('setup__option--muted', !stepsActive);
      els.labelColorMode.disabled = !stepsActive;
    }
    if (els.labelGhostMode) {
      els.labelGhostMode.classList.toggle('active', stepsActive && s.ghostMode);
      els.labelGhostMode.classList.toggle('setup__option--muted', !stepsActive);
      els.labelGhostMode.disabled = !stepsActive;
    }

    const gridNames = { tian: '田字格', mi: '米字格', jiu: '九宫格', none: 'без сетки' };
    const modeNames = { normal: 'обычный', steps: 'пошаговое написание' };
    const srcNames  = { level: 'текущий уровень', current: 'изучаю сейчас', custom: 'мои слова' };
    const cellsLabel = (s.cells === 'auto') ? 'по чертам' : `${s.cells} ячеек`;

    if (els.hint) {
      els.hint.textContent =
        `Источник: ${srcNames[s.source] || s.source} · ${s.count} слов · ` +
        `${cellsLabel} · ${gridNames[s.grid] || s.grid} · ` +
        `${modeNames[s.mode] || s.mode}` +
        (stepsActive && s.colorMode ? ' · цветные черты' : '') +
        (stepsActive && s.ghostMode ? ' · обводка в конце' : '');
    }
  }

  function toggleActive(btns, value) {
    if (!btns || !btns.length) return;
    btns.forEach(b => {
      const v = b.dataset.value;
      // Сравниваем как строки: работает и для чисел, и для 'auto'
      const active = String(v) === String(value);
      b.classList.toggle('active', active);
    });
  }

  /* ============================================================
     Генерация
     ============================================================ */
  async function generate(candidateSource) {
    const s = state.settings;
    saveSettings();

    if (typeof candidateSource !== 'function') {
      alert('Внутренняя ошибка: список слов недоступен');
      return;
    }

    let pool = [];
    try {
      pool = candidateSource(s.source);
    } catch (err) {
      console.error('[worksheets] getCandidates error:', err);
      alert('Ошибка получения слов: ' + err.message);
      return;
    }

    if (!pool || !pool.length) {
      alert(
        s.source === 'current'
          ? 'В «Изучаю сейчас» пока нет слов. Отметьте их звёздочкой в словарике.'
          : s.source === 'custom'
          ? 'В «Моих словах» пока пусто. Добавьте слова через «Добавить слово».'
          : 'Нет слов в этом источнике'
      );
      return;
    }

    const shuffled = pool.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const chosen = shuffled.slice(0, Math.min(s.count, shuffled.length));

    closeSetup();
    if (!els.sheetModal) return;
    els.sheetModal.hidden = false;

    els.sheet.innerHTML =
      '<div class="ws-loading"><i class="ri-loader-4-line"></i><span>Готовим прописи…</span></div>';

    try {
      const html = await buildSheet(chosen);
      els.sheet.innerHTML = html;
    } catch (err) {
      console.error('[worksheets] buildSheet error:', err);
      els.sheet.innerHTML =
        '<div class="ws-error">Не удалось построить прописи: ' +
        (err.message || 'неизвестная ошибка') + '</div>';
    }
  }

  /* ============================================================
     Печать
     ============================================================ */
  function printSheet() {
    const html = els.sheet.innerHTML;
    if (!html) return;

    const css = `
      @page { size: A4; margin: 12mm 10mm; }
      * { box-sizing: border-box; }
      body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; background: #fff; }
      .ws-sheet__head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
      .ws-sheet__title { font-size: 14px; font-weight: 700; }
      .ws-sheet__date { font-size: 11px; color: #666; }
      .ws-row { margin-bottom: 16px; page-break-inside: avoid; }
      .ws-row__pinyin-line { font-size: 13px; color: #4f7cff; font-weight: 600; margin-bottom: 2px; }
      .ws-row__translation-line { font-size: 12px; color: #666; margin-bottom: 4px; font-style: italic; }
      .ws-chars { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
      .ws-chars__syllable { font-size: 12px; color: #666; width: 48px; flex-shrink: 0; text-align: right; }
      .ws-cells { display: flex; }
      .ws-cell { position: relative; background: #fff; }
      .ws-cell__grid { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
      .ws-cell__char { position: absolute; inset: 0; padding: 1px; box-sizing: border-box; }
      .ws-cell__char svg { width: 100%; height: 100%; display: block; }
      .ws-cell__corner { position: absolute; top: 1px; right: 3px; font-size: 9px; color: #999; font-weight: 600; }
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`);
    doc.close();

    const go = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) { console.error('print error', e); }
      setTimeout(() => iframe.remove(), 800);
    };
    if (doc.readyState === 'complete') setTimeout(go, 250);
    else iframe.onload = () => setTimeout(go, 250);
  }

  /* ============================================================
     Публичный API
     ============================================================ */
  const api = {
    init(refs, getCandidates) {
      Object.assign(els, refs);
      loadSettings();

      if (!els.setupModal || !els.start) {
        console.error('[worksheets] не найдены ключевые элементы (setupModal или start)');
        return;
      }
      if (!els.sheetModal || !els.sheet) {
        console.error('[worksheets] не найдены элементы листа (sheetModal или sheet)');
        return;
      }

      els.close.addEventListener('click', closeSetup);
      if (els.backdrop) els.backdrop.addEventListener('click', closeSetup);
      if (els.cancel)   els.cancel.addEventListener('click', closeSetup);

      els.start.addEventListener('click', () => generate(getCandidates));

      (els.countBtns || []).forEach(btn => {
        btn.addEventListener('click', () => {
          state.settings.count = parseInt(btn.dataset.value, 10);
          updateSetupUI();
        });
      });

      (els.cellsBtns || []).forEach(btn => {
        btn.addEventListener('click', () => {
          const raw = btn.dataset.value;
          state.settings.cells = (raw === 'auto') ? 'auto' : parseInt(raw, 10);
          updateSetupUI();
        });
      });

      (els.gridBtns || []).forEach(btn => {
        btn.addEventListener('click', () => {
          state.settings.grid = btn.dataset.value;
          updateSetupUI();
        });
      });
      (els.sizeBtns || []).forEach(btn => {
        btn.addEventListener('click', () => {
          state.settings.cellSize = parseInt(btn.dataset.value, 10);
          updateSetupUI();
        });
      });
      (els.sourceBtns || []).forEach(btn => {
        btn.addEventListener('click', () => {
          state.settings.source = btn.dataset.value;
          updateSetupUI();
        });
      });
      (els.modeBtns || []).forEach(btn => {
        btn.addEventListener('click', () => {
          state.settings.mode = btn.dataset.value;
          updateSetupUI();
        });
      });

      if (els.labelPinyin) {
        els.labelPinyin.addEventListener('click', () => {
          state.settings.showPinyin = !state.settings.showPinyin;
          updateSetupUI();
        });
      }
      if (els.labelTranslation) {
        els.labelTranslation.addEventListener('click', () => {
          state.settings.showTranslation = !state.settings.showTranslation;
          updateSetupUI();
        });
      }
      if (els.labelColorMode) {
        els.labelColorMode.addEventListener('click', () => {
          if (state.settings.mode !== 'steps') return;
          state.settings.colorMode = !state.settings.colorMode;
          updateSetupUI();
        });
      }
      if (els.labelGhostMode) {
        els.labelGhostMode.addEventListener('click', () => {
          if (state.settings.mode !== 'steps') return;
          state.settings.ghostMode = !state.settings.ghostMode;
          updateSetupUI();
        });
      }

      if (els.sheetBack) {
        els.sheetBack.addEventListener('click', () => {
          els.sheetModal.hidden = true;
          openSetup();
        });
      }
      if (els.sheetBackdrop) {
        els.sheetBackdrop.addEventListener('click', () => {
          els.sheetModal.hidden = true;
        });
      }
      if (els.sheetPrint) {
        els.sheetPrint.addEventListener('click', printSheet);
      }

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          if (els.setupModal && !els.setupModal.hidden) closeSetup();
          else if (els.sheetModal && !els.sheetModal.hidden) els.sheetModal.hidden = true;
        }
      });
    },

    open() { openSetup(); },

    isActive() {
      const s1 = els.setupModal && !els.setupModal.hidden;
      const s2 = els.sheetModal && !els.sheetModal.hidden;
      return Boolean(s1 || s2);
    },
  };

  return api;
})();