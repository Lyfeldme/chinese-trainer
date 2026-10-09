/**
 * Панель статистики: прогресс, серия, слабые слова, гистограмма SRS,
 * управление пользовательскими разделами, экспорт/импорт прогресса, сброс.
 */
window.HP_STATS = (function () {
  const els = {};
  let onPracticeWeak = null;
  let onPracticeDue  = null;
  let onResetStats   = null;

  const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

  function cache() {
    els.modal       = document.getElementById('statsModal');
    els.backdrop    = document.getElementById('statsBackdrop');
    els.closeBtn    = document.getElementById('statsClose');

    els.learnedVal  = document.getElementById('statLearned');
    els.totalVal    = document.getElementById('statTotal');
    els.streakVal   = document.getElementById('statStreak');
    els.bestVal     = document.getElementById('statBest');
    els.weekGrid    = document.getElementById('statWeek');
    els.weakList    = document.getElementById('statWeakList');
    els.weakBtn     = document.getElementById('statWeakPractice');
    els.dueBtn      = document.getElementById('statDuePractice');
    els.dueCount    = document.getElementById('statDueCount');
    els.resetBtn    = document.getElementById('statReset');

    els.srsChart        = document.getElementById('srsChart');
    els.srsChartLegend  = document.getElementById('srsChartLegend');

    els.progressExportBtn   = document.getElementById('progressExportBtn');
    els.progressImportBtn   = document.getElementById('progressImportBtn');
    els.progressImportInput = document.getElementById('progressImportInput');

    els.sectionsList  = document.getElementById('statSections');
    els.sectionsClear = document.getElementById('statSectionsClearAll');
  }

  function renderWeek() {
    const days = window.HP_STORAGE.getRecentActivity(7);
    els.weekGrid.innerHTML = '';
    days.forEach(d => {
      const cell = document.createElement('div');
      cell.className = 'stat-week__day' + (d.active ? ' stat-week__day--active' : '');
      cell.innerHTML = `
        <span class="stat-week__weekday">${WEEKDAYS[d.weekday]}</span>
        <span class="stat-week__dot"></span>
      `;
      cell.title = d.date + (d.active ? ' ✓' : '');
      els.weekGrid.appendChild(cell);
    });
  }

  function renderWeakList() {
    const all = getCurrentWordsAll();
    const weak = window.HP_STORAGE.getWeakWords(all, 2).slice(0, 10);

    els.weakList.innerHTML = '';
    els.weakBtn.disabled = weak.length === 0;

    if (!weak.length) {
      els.weakList.innerHTML =
        '<div class="stat-empty">Пока нет слабых слов. Так держать!</div>';
      return;
    }

    weak.forEach(w => {
      const item = document.createElement('div');
      item.className = 'stat-weak__item';

      const data = window.HP_STORAGE.getWordData(w.word);
      item.innerHTML = `
        <div class="stat-weak__word">${w.word}</div>
        <div class="stat-weak__text">${w.pinyin || ''}</div>
        <div class="stat-weak__translation">${w.translation}</div>
        <div class="stat-weak__counts">
          <span class="stat-weak__ok"><i class="ri-check-line"></i> ${data.correctCount}</span>
          <span class="stat-weak__bad"><i class="ri-close-line"></i> ${data.wrongCount}</span>
        </div>
      `;
      els.weakList.appendChild(item);
    });
  }

  function renderSrsChart() {
    if (!els.srsChart) return;
    const all = getCurrentWordsAll();
    const levels = window.HP_STORAGE.getSrsLevelDistribution(all);

    const labels = [
      'Новое', '10 мин', '1 день', '3 дня', '7 дней',
      '16 дней', '35 дней', '90 дней', '180 дней',
    ];

    const total = levels.reduce((a, b) => a + b, 0);
    const maxVal = Math.max(1, ...levels);

    els.srsChart.innerHTML = '';

    if (total === 0) {
      els.srsChart.innerHTML =
        '<div class="stat-empty">Пока нет слов в повторении.</div>';
      if (els.srsChartLegend) els.srsChartLegend.innerHTML = '';
      return;
    }

    levels.forEach((count, i) => {
      const bar = document.createElement('div');
      bar.className = 'srs-chart__bar';
      bar.title = `${labels[i]}: ${count} сл.`;

      const fill = document.createElement('div');
      fill.className = 'srs-chart__fill';
      fill.style.height = `${(count / maxVal) * 100}%`;
      if (count === 0) fill.style.height = '2px';

      const num = document.createElement('div');
      num.className = 'srs-chart__num';
      num.textContent = count || '';

      bar.appendChild(num);
      bar.appendChild(fill);
      els.srsChart.appendChild(bar);
    });

    if (els.srsChartLegend) {
      els.srsChartLegend.innerHTML = levels
        .map((count, i) => {
          if (count === 0) return '';
          return `<span class="srs-chart-legend__item">
            <span class="srs-chart-legend__dot srs-chart-legend__dot--${i}"></span>
            ${labels[i]}: <b>${count}</b>
          </span>`;
        })
        .join('');
    }
  }

  function renderSections() {
    if (!els.sectionsList) return;
    const sections = window.HP_STORAGE.getUserSections();
    els.sectionsList.innerHTML = '';

    if (!sections.length) {
      els.sectionsList.innerHTML =
        '<div class="stat-empty">Пока нет своих разделов. Загрузите JSON через «Мои слова» → «Импорт».</div>';
      if (els.sectionsClear) els.sectionsClear.disabled = true;
      return;
    }

    if (els.sectionsClear) els.sectionsClear.disabled = false;

    sections.forEach(s => {
      const item = document.createElement('div');
      item.className = 'stat-section-item';
      item.innerHTML = `
        <div class="stat-section-item__info">
          <div class="stat-section-item__title">${s.label}</div>
          <div class="stat-section-item__meta">${s.words.length} слов</div>
        </div>
        <button type="button" class="stat-section-item__del" data-id="${s.id}" title="Удалить раздел">
          <i class="ri-delete-bin-line"></i>
        </button>
      `;
      els.sectionsList.appendChild(item);
    });

    els.sectionsList.querySelectorAll('.stat-section-item__del').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const section = sections.find(x => x.id === id);
        if (!section) return;
        if (!confirm(`Удалить раздел «${section.label}» (${section.words.length} слов)?`)) return;

        try {
          window.HP_STORAGE.deleteUserSection(id);
          if (window.HP_WORDS_BY_LEVEL[id]) delete window.HP_WORDS_BY_LEVEL[id];
          renderSections();
          refreshHeader();
          document.dispatchEvent(new CustomEvent('hanzipath:sections-changed'));
        } catch (err) {
          alert(err.message);
        }
      });
    });
  }

  function handleClearAllSections() {
    const sections = window.HP_STORAGE.getUserSections();
    if (!sections.length) return;

    const totalWords = sections.reduce((a, s) => a + s.words.length, 0);
    const ok = confirm(
      `Удалить все свои разделы?\n\n` +
      `Будет удалено ${sections.length} раздел(ов) и ${totalWords} слов.\n` +
      `Это действие нельзя отменить.`
    );
    if (!ok) return;

    sections.forEach(s => {
      if (window.HP_WORDS_BY_LEVEL[s.id]) delete window.HP_WORDS_BY_LEVEL[s.id];
    });
    window.HP_STORAGE.clearUserSections();
    renderSections();
    refreshHeader();
    document.dispatchEvent(new CustomEvent('hanzipath:sections-changed'));
  }

  function getCurrentWordsAll() {
    const byLevel = window.HP_WORDS_BY_LEVEL || {};
    const all = [];
    Object.keys(byLevel).forEach(lvl => {
      (byLevel[lvl] || []).forEach(w => all.push(w));
    });
    (window.HP_STORAGE.getCustomWords() || []).forEach(w => all.push(w));
    return all;
  }

  function refreshHeader() {
    const all = getCurrentWordsAll();
    const learned = window.HP_STORAGE.learnedCount();
    const total = all.length;
    const streak = window.HP_STORAGE.getStreak();
    const due = window.HP_STORAGE.getDueWords(all);

    els.learnedVal.textContent = learned;
    els.totalVal.textContent = total;
    els.streakVal.textContent = streak.current;
    els.bestVal.textContent = streak.best;
    els.dueCount.textContent = due.length;

    els.dueBtn.disabled = due.length === 0;
  }

  function refresh() {
    refreshHeader();
    renderWeek();
    renderWeakList();
    renderSrsChart();
    renderSections();
  }

  function handleExportProgress() {
    try {
      const json = window.HP_STORAGE.exportProgress();
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'hanzipath-progress-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (window.HP_UI) window.HP_UI.setStatus('Файл прогресса скачан', 'success');
    } catch (err) {
      console.error('exportProgress error:', err);
      alert('Не удалось экспортировать: ' + err.message);
    }
  }

  function handleImportProgress(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result);

      const replace = confirm(
        'Заменить текущий прогресс?\n\n' +
        'OK — полностью заменить (текущие данные будут удалены).\n' +
        'Отмена — объединить с текущим (рекомендуется).'
      );

      try {
        const result = window.HP_STORAGE.importProgress(raw, { replace });
        refresh();

        if (window.HP_UI) {
          window.HP_UI.setStatus(
            `Импорт прогресса готов: добавлено ${result.added}, обновлено ${result.updated}`,
            'success'
          );
        }
        document.dispatchEvent(new CustomEvent('hanzipath:srs-updated'));
        if (typeof onResetStats === 'function') onResetStats();
      } catch (err) {
        alert('Ошибка импорта: ' + err.message);
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  return {
    init(handlers = {}) {
      cache();
      onPracticeWeak = handlers.onPracticeWeak || null;
      onPracticeDue  = handlers.onPracticeDue  || null;
      onResetStats   = handlers.onResetStats   || null;

      els.closeBtn.addEventListener('click', () => this.close());
      els.backdrop.addEventListener('click', () => this.close());

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !els.modal.hidden) this.close();
      });

      els.weakBtn.addEventListener('click', () => {
        const all = getCurrentWordsAll();
        const weak = window.HP_STORAGE.getWeakWords(all, 2);
        if (!weak.length) return;
        this.close();
        if (typeof onPracticeWeak === 'function') onPracticeWeak(weak);
      });

      els.dueBtn.addEventListener('click', () => {
        const all = getCurrentWordsAll();
        const due = window.HP_STORAGE.getDueWords(all);
        if (!due.length) return;
        this.close();
        if (typeof onPracticeDue === 'function') onPracticeDue(due);
      });

      if (els.resetBtn) {
        els.resetBtn.addEventListener('click', () => {
          const ok = confirm(
            'Сбросить всю статистику?\n\n' +
            'Будут удалены:\n' +
            '• прогресс по словам\n' +
            '• SRS-интервалы\n' +
            '• серия дней и активность\n' +
            '• счётчики правильных / неправильных ответов\n\n' +
            'Свои добавленные слова и разделы останутся на месте.'
          );
          if (!ok) return;

          try {
            window.HP_STORAGE.resetStats();
          } catch (err) {
            console.error(err);
            alert('Не удалось сбросить: ' + err.message);
            return;
          }

          refresh();
          if (typeof onResetStats === 'function') onResetStats();
        });
      }

      if (els.progressExportBtn) {
        els.progressExportBtn.addEventListener('click', handleExportProgress);
      }
      if (els.progressImportBtn && els.progressImportInput) {
        els.progressImportBtn.addEventListener('click', () => {
          els.progressImportInput.click();
        });
        els.progressImportInput.addEventListener('change', () => {
          const file = els.progressImportInput.files && els.progressImportInput.files[0];
          handleImportProgress(file);
          els.progressImportInput.value = '';
        });
      }

      if (els.sectionsClear) {
        els.sectionsClear.addEventListener('click', handleClearAllSections);
      }
    },

    open() {
      refresh();
      els.modal.hidden = false;
    },

    close() {
      els.modal.hidden = true;
    },

    refresh,
  };
})();