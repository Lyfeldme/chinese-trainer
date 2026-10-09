/**
 * Режим «Повторение» — интервальное изучение (SRS).
 *
 * Очередь = просроченные (due) + новые слова.
 * Карточка показывает иероглиф. После «Показать ответ» — пиньинь + перевод + 4 оценки.
 * Оценки обновляют srsLevel и планируют следующее повторение.
 */
window.HP_SRS = (function () {
  const els = {};
  let savedWords = [];
  let savedOptions = {};

  const state = {
    queue: [],
    initialLength: 0,
    done: 0,
    correct: 0,
    current: null,
    revealed: false,
    locked: false,
  };

  /* ---------- утилиты ---------- */

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function formatInterval(ms) {
    const delta = ms - Date.now();
    if (delta <= 60 * 1000) return 'сейчас';

    const min = Math.round(delta / 60000);
    if (min < 60) return `${min} мин`;

    const h = Math.round(min / 60);
    if (h < 24) return `${h} ч`;

    const d = Math.round(delta / (24 * 60 * 60 * 1000));
    if (d < 30) return `${d} дн`;

    const m = Math.round(d / 30);
    if (m < 12) return `${m} мес`;

    return `${Math.round(m / 12)} г`;
  }

  function speak(text) {
    if (window.HP_AUDIO && window.HP_AUDIO.speak) window.HP_AUDIO.speak(text);
  }

  /* ---------- рендер ---------- */

  function updateProgress() {
    const total = state.initialLength || 1;
    const done = Math.min(state.done, total);
    els.progress.textContent = `${done} / ${total}`;
    els.bar.style.width = `${(done / total) * 100}%`;
  }

  function renderCard() {
    if (!state.queue.length) {
      finish();
      return;
    }

    const w = state.queue[0];
    state.current = w;
    state.revealed = false;
    state.locked = false;

    els.word.textContent = w.word;
    els.pinyin.textContent = w.pinyin || '—';
    els.translation.textContent = w.translation || '—';

    // Скрываем пиньинь и перевод до раскрытия
    els.pinyin.classList.add('srs__pinyin--hidden');
    els.translation.classList.add('srs__translation--hidden');

    // Кнопки «Показать ответ» и озвучки видны
    els.reveal.hidden = false;
    els.ratings.hidden = true;

    // Бейдж уровня
    const entry = HP_STORAGE.getWordData(w.word);
    const level = entry.srsLevel || 0;
    const info = HP_STORAGE.getSrsLevelInfo(level);
    const isNew = !entry.lastSeenAt;
    els.level.textContent = isNew ? 'Новое' : `Ур. ${level} · ${info.label}`;
    els.level.dataset.level = String(level);
    els.level.classList.toggle('srs__level--new', isNew);
    els.level.classList.toggle('srs__level--due', !isNew);

    updateProgress();
  }

  function reveal() {
    if (state.revealed || state.locked) return;
    state.revealed = true;

    els.pinyin.classList.remove('srs__pinyin--hidden');
    els.translation.classList.remove('srs__translation--hidden');

    els.reveal.hidden = true;
    els.ratings.hidden = false;

    // Обновляем предпросмотр интервалов
    const w = state.current;
    if (w && window.HP_STORAGE && HP_STORAGE.previewReview) {
      for (let r = 0; r < 4; r++) {
        const el = document.getElementById(`srsInterval${r}`);
        if (!el) continue;
        const ts = HP_STORAGE.previewReview(w.word, r);
        el.textContent = formatInterval(ts);
      }
    }
  }

  function rate(rating) {
    if (!state.revealed || state.locked) return;
    state.locked = true;

    const w = state.current;
    if (!w) return;

    try {
      HP_STORAGE.recordReview(w.word, rating);
    } catch (err) {
      console.error('recordReview error', err);
    }

    state.done++;
    if (rating >= 2) state.correct++;

    updateProgress();

    // Небольшая задержка для плавности
    setTimeout(() => {
      state.queue.shift();
      renderCard();
    }, 180);
  }

  function finish() {
    els.bar.style.width = '100%';
    els.progress.textContent = `${state.initialLength} / ${state.initialLength}`;
    els.body.hidden = true;
    els.result.hidden = false;

    const total = state.initialLength;
    const correct = state.correct;
    const percent = total ? Math.round((correct / total) * 100) : 0;

    els.resultScore.textContent = `${correct} / ${total} (${percent}%)`;

    if (percent === 100) {
      els.resultIcon.innerHTML = '<i class="ri-trophy-line"></i>';
      els.resultTitle.textContent = 'Идеально!';
    } else if (percent >= 70) {
      els.resultIcon.innerHTML = '<i class="ri-award-line"></i>';
      els.resultTitle.textContent = 'Хороший результат';
    } else {
      els.resultIcon.innerHTML = '<i class="ri-book-open-line"></i>';
      els.resultTitle.textContent = 'Продолжайте повторять';
    }

    // Обновляем бейдж due-count
    document.dispatchEvent(new CustomEvent('hanzipath:srs-updated'));
  }

  /* ---------- публичный API ---------- */

  const api = {
    onExit: null,

    init(refs, onExit) {
      Object.assign(els, refs);
      api.onExit = onExit;

      els.close.addEventListener('click', () => api.exit());
      els.backdrop.addEventListener('click', () => api.exit());
      els.exitBtn.addEventListener('click', () => api.exit());
      els.restart.addEventListener('click', () => api.restart());

      els.revealBtn.addEventListener('click', reveal);
      els.card.addEventListener('click', (e) => {
        // Клик по карточке не должен срабатывать, когда жмём на кнопку
        if (e.target.closest('.srs__actions, .srs__ratings')) return;
        if (!state.revealed) reveal();
      });

      els.audioBtn.addEventListener('click', () => {
        if (state.current) speak(state.current.word);
      });

      els.ratings.querySelectorAll('.srs__rating').forEach(btn => {
        btn.addEventListener('click', () => {
          const rating = parseInt(btn.dataset.rating, 10);
          rate(rating);
        });
      });

      document.addEventListener('keydown', (e) => {
        if (els.modal.hidden) return;
        if (!els.result.hidden) return;

        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          if (!state.revealed) reveal();
          return;
        }
        if (state.revealed) {
          if (e.key === '1') rate(0);
          if (e.key === '2') rate(1);
          if (e.key === '3') rate(2);
          if (e.key === '4') rate(3);
        }
        if (e.key === 'Escape') api.exit();
      });
    },

    /**
     * @param {Array} words — доступный пул слов
     * @param {object} [options]
     * @param {number} [options.size] — сколько карточек за сеанс (0 = все)
     */
    start(words, options = {}) {
      if (!words || !words.length) return;
      savedWords = words.slice();
      savedOptions = { ...options };

      const limit = (typeof options.size === 'number' && options.size > 0)
        ? options.size
        : 9999;

      // 1) Просроченные — в первую очередь, самые старые сверху
      const due = HP_STORAGE.getDueWords(words);

      // 2) Новые слова — добавляем, если просроченных меньше лимита
      const fresh = HP_STORAGE.getNewWords(words);

      const queue = [];
      const seen = new Set();

      due.forEach(w => {
        if (queue.length >= limit) return;
        if (seen.has(w.word)) return;
        seen.add(w.word);
        queue.push(w);
      });

      // Перемешиваем новые, чтобы не показывать всегда одни и те же
      shuffle(fresh).forEach(w => {
        if (queue.length >= limit) return;
        if (seen.has(w.word)) return;
        seen.add(w.word);
        queue.push(w);
      });

      if (!queue.length) {
        alert('На сегодня всё повторено! Возвращайтесь позже или добавьте новые слова.');
        return;
      }

      state.queue = queue;
      state.initialLength = queue.length;
      state.done = 0;
      state.correct = 0;
      state.current = null;
      state.revealed = false;
      state.locked = false;

      els.view.hidden = false;
      els.body.hidden = false;
      els.result.hidden = true;

      renderCard();
    },

    restart() {
      api.start(savedWords, savedOptions);
    },

    exit() {
      els.view.hidden = true;
      if (typeof api.onExit === 'function') api.onExit();
    },

    isActive() { return !els.view.hidden; },
  };

  return api;
})();