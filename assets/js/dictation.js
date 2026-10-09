/**
 * Режим «Диктант» с поддержкой пиньинь-IME, настройкой размера,
 * опциями «Не знаю» / «Пропустить» и подсказками: пиньинь,
 * пример употребления (иероглифы + пиньинь) и количество иероглифов.
 */
window.HP_DICTATION = (function () {
  const els = {};
  let ime = null;
  let savedWords = [];
  let _lastSpeakExampleAt = 0;

  const state = {
    pool: [],
    initialLength: 0,
    resolved: 0,
    correct: 0,
    skipCounts: {},
    locked: false,
    current: null,
    pinyinVisible: false,
  };

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function speak(text) {
    if (window.HP_AUDIO && window.HP_AUDIO.speak) window.HP_AUDIO.speak(text);
  }

  function recordAnswer(word, isCorrect) {
    if (!window.HP_STORAGE || !HP_STORAGE.recordAnswer) return;
    try { HP_STORAGE.recordAnswer(word, isCorrect); } catch (e) { /* ok */ }
  }

  function updateProgress() {
    const total = state.initialLength || 1;
    const done = Math.min(state.resolved, total);
    els.progress.textContent = `${done} / ${total}`;
    els.bar.style.width = `${(done / total) * 100}%`;
  }

  function updatePinyinHint() {
    if (!els.pinyinHint) return;
    const w = state.pool[0];
    if (state.pinyinVisible && w && w.pinyin) {
      els.pinyinHint.textContent = w.pinyin;
      els.pinyinHint.hidden = false;
    } else {
      els.pinyinHint.textContent = '';
      els.pinyinHint.hidden = true;
    }
  }

  function updatePinyinToggle() {
    if (!els.pinyinToggle) return;
    els.pinyinToggle.classList.toggle('active', state.pinyinVisible);
    const icon = els.pinyinToggle.querySelector('i');
    const span = els.pinyinToggle.querySelector('span');
    if (icon) icon.className = state.pinyinVisible ? 'ri-eye-off-line' : 'ri-eye-line';
    if (span) span.textContent = state.pinyinVisible ? 'Скрыть пиньинь' : 'Пиньинь';
  }

  function hideHintPanel() {
    if (els.hintPanel) els.hintPanel.hidden = true;
  }

  function showHint() {
    if (!state.pool.length) return;
    const w = state.pool[0];
    const len = [...w.word].length;
    const wordForm = len === 1 ? 'иероглиф'
                   : (len >= 2 && len <= 4) ? 'иероглифа'
                   : 'иероглифов';

    let html = `<span class="quiz-hint__label">Подсказка</span>` +
               `<div>В слове <b>${len}</b> ${wordForm}</div>`;

    if (w.pinyin) {
      const firstLetter = String(w.pinyin)[0] || '';
      if (firstLetter) {
        html += `<div class="quiz-hint__note">Начинается со звука «${firstLetter}»</div>`;
      }
    }

    els.hintPanel.innerHTML = html;
    els.hintPanel.hidden = false;
  }

  /**
   * Озвучивает пример употребления текущего слова.
   * Если примера нет — показывает подсказку в статусе.
   */
  function speakCurrentExample() {
    const now = Date.now();
    if (now - _lastSpeakExampleAt < 500) return;
    _lastSpeakExampleAt = now;

    const w = state.current || (state.pool && state.pool[0]);
    if (!w) {
      if (els.status) {
        els.status.textContent = 'Сначала начните диктант';
        els.status.className = 'dictation__status';
      }
      return;
    }

    const examples = Array.isArray(w.examples) ? w.examples : [];
    const ex = examples.find(e => e && e.zh);

    if (!ex) {
      if (els.status) {
        els.status.textContent = 'У этого слова нет примера употребления';
        els.status.className = 'dictation__status';
      }
      return;
    }

    if (window.HP_AUDIO && window.HP_AUDIO.speak) {
      window.HP_AUDIO.speak(ex.zh);
      if (els.status) {
        els.status.textContent = 'Озвучивание примера: ' + ex.zh;
        els.status.className = 'dictation__status';
      }
    } else {
      if (els.status) {
        els.status.textContent = 'Ваш браузер не поддерживает озвучку';
        els.status.className = 'dictation__status dictation__status--err';
      }
    }
  }

  function setButtonsEnabled(enabled) {
    [els.check, els.dontKnow, els.skip].forEach(b => {
      if (b) b.disabled = !enabled;
    });
    if (els.input) els.input.disabled = !enabled;
  }

  function renderQuestion() {
    if (!state.pool.length) {
      finish();
      return;
    }

    const w = state.pool[0];
    state.current = w;
    state.locked = false;

    updateProgress();
    els.translation.textContent = w.translation;
    els.input.value = '';
    els.input.classList.remove('correct', 'wrong');
    els.status.textContent = '';
    els.status.className = 'dictation__status';
    setButtonsEnabled(true);

    updatePinyinHint();
    updatePinyinToggle();
    hideHintPanel();

    if (ime && ime.isOpen()) ime.close();

    setTimeout(() => speak(w.word), 200);
    els.input.focus();
  }

  function resolveCurrent() {
    state.pool.shift();
    state.resolved++;
    updateProgress();

    setTimeout(() => {
      if (!state.pool.length) finish();
      else renderQuestion();
    }, 300);
  }

  function check() {
    if (state.locked || !state.pool.length) return;
    const answer = els.input.value.trim();
    if (!answer) return;

    state.locked = true;
    setButtonsEnabled(false);

    const w = state.pool[0];
    const correct = w.word;
    const pinyin = w.pinyin || '';
    const isRight = answer === correct;

    recordAnswer(correct, isRight);

    if (isRight) {
      els.input.classList.add('correct');
      state.correct++;
      els.status.innerHTML = 'Верно!';
      els.status.classList.add('dictation__status--ok');
      setTimeout(() => resolveCurrent(), 800);
    } else {
      els.input.classList.add('wrong');
      els.status.innerHTML =
        `Правильно: <b>${correct}</b>` +
        (pinyin ? `<span class="dictation__status-pinyin">${pinyin}</span>` : '');
      els.status.classList.add('dictation__status--err');
      setTimeout(() => resolveCurrent(), 1800);
    }
  }

  function handleDontKnow() {
    if (state.locked || !state.pool.length) return;

    state.locked = true;
    setButtonsEnabled(false);

    const w = state.pool[0];
    const correct = w.word;
    const pinyin = w.pinyin || '';

    els.input.value = correct;
    els.input.classList.add('wrong');
    els.status.innerHTML =
      `Слово: <b>${correct}</b>` +
      (pinyin ? `<span class="dictation__status-pinyin">${pinyin}</span>` : '');
    els.status.classList.add('dictation__status--err');

    recordAnswer(correct, false);

    setTimeout(() => resolveCurrent(), 1800);
  }

  function skip() {
    if (state.locked || !state.pool.length) return;

    if (state.pool.length <= 1) {
      handleDontKnow();
      return;
    }

    const w = state.pool[0];
    const cnt = (state.skipCounts[w.word] || 0) + 1;
    state.skipCounts[w.word] = cnt;

    if (cnt >= 2) {
      handleDontKnow();
      return;
    }

    state.pool.shift();
    state.pool.push(w);

    els.status.textContent = `Отложено — вернёмся позже (осталось ${state.pool.length - 1})`;
    els.status.className = 'dictation__status';
    renderQuestion();
  }

  function togglePinyin() {
    state.pinyinVisible = !state.pinyinVisible;
    updatePinyinHint();
    updatePinyinToggle();
  }

  function finish() {
    els.bar.style.width = '100%';
    els.progress.textContent = `${state.initialLength} / ${state.initialLength}`;
    setButtonsEnabled(false);

    if (els.pinyinHint) els.pinyinHint.hidden = true;
    hideHintPanel();

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
      els.resultTitle.textContent = 'Нужно повторить';
    }
  }

  const api = {
    onExit: null,

    init(refs, onExit) {
      Object.assign(els, refs);
      api.onExit = onExit;

      els.check.addEventListener('click', check);
      els.replay.addEventListener('click', () => {
        if (state.current) speak(state.current.word);
      });
      els.close.addEventListener('click', () => api.exit());
      els.exitBtn.addEventListener('click', () => api.exit());
      els.restart.addEventListener('click', () => api.restart());

      if (els.dontKnow)       els.dontKnow.addEventListener('click', handleDontKnow);
      if (els.skip)           els.skip.addEventListener('click', skip);
      if (els.pinyinToggle)   els.pinyinToggle.addEventListener('click', togglePinyin);
      if (els.speakExampleBtn) els.speakExampleBtn.addEventListener('click', speakCurrentExample);
      if (els.hintBtn)        els.hintBtn.addEventListener('click', showHint);

      els.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          if (ime && ime.isTyping()) return;
          e.preventDefault();
          check();
        }
      });

      ime = window.HP_IME.attach({
        panel:        els.vkPanel,
        composeText:  els.vkComposeText,
        composeCaret: els.vkComposeCaret,
        candidates:   els.vkCandidates,
        keyboard:     els.vkKeyboard,
        closeBtn:     els.vkClose,
        input:        els.input,
        toggleBtn:    els.keyboard,
      });
    },

    start(words, options = {}) {
      if (!words || !words.length) return;
      savedWords = words.slice();

      const maxSize = words.length;
      let roundSize;
      if (typeof options.roundSize === 'number' && options.roundSize > 0) {
        roundSize = Math.min(options.roundSize, maxSize);
      } else {
        roundSize = Math.min(10, maxSize);
      }

      state.pool = shuffle(words).slice(0, roundSize);
      state.initialLength = state.pool.length;
      state.resolved = 0;
      state.correct = 0;
      state.skipCounts = {};
      state.locked = false;
      state.current = null;

      els.view.hidden = false;
      els.body.hidden = false;
      els.result.hidden = true;

      renderQuestion();
    },

    restart() {
      api.start(savedWords, { roundSize: state.initialLength || 10 });
    },

    exit() {
      els.view.hidden = true;
      if (ime && ime.isOpen()) ime.close();
      if (typeof api.onExit === 'function') api.onExit();
    },

    isActive() { return !els.view.hidden; },

    /* Публичный метод на случай вызова из main.js */
    speakCurrentExample,
  };

  return api;
})();