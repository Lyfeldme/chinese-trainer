/**
 * Режим «Пропуски»: вставить пропущенное слово в предложение.
 * Одна кнопка «Подсказка» показывает сразу: чтение (пиньинь),
 * перевод пропущенного слова и правильный иероглиф.
 */
window.HP_CLOZE = (function () {
  const els = {};
  let state = {
    questions: [],
    step: 0,
    correct: 0,
    locked: false,
    hintOpen: false,
  };

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /**
   * Подбирает неправильные варианты, приоритетно — той же длины,
   * что и правильный ответ.
   */
  function pickWrongByLength(pool, correctAnswer, count) {
    const correctLen = String(correctAnswer).length;

    const all = pool
      .map(w => w.word)
      .filter(w => w && w !== correctAnswer);

    const sameLen = all.filter(w => String(w).length === correctLen);
    const closeLen = all.filter(w => {
      const l = String(w).length;
      return l !== correctLen && Math.abs(l - correctLen) <= 1;
    });
    const farLen = all.filter(w => Math.abs(String(w).length - correctLen) > 1);

    const picked = [];
    const pools = [shuffle(sameLen), shuffle(closeLen), shuffle(farLen)];

    for (const p of pools) {
      for (const v of p) {
        if (picked.length >= count) break;
        if (!picked.includes(v)) picked.push(v);
      }
      if (picked.length >= count) break;
    }

    return picked.slice(0, count);
  }

  function buildQuestions(words, count) {
    const withExamples = words.filter(w =>
      w.examples && w.examples.length && w.word
    );
    if (withExamples.length < 4) return [];

    const picked = shuffle(withExamples).slice(0, count);
    const questions = [];

    for (const w of picked) {
      const ex = w.examples[0];
      const sentence = ex.zh;
      const target = w.word;

      if (!sentence.includes(target)) continue;

      const blanked = sentence.replace(target, '___');
      const wrong = pickWrongByLength(withExamples, target, 3);

      if (wrong.length < 3) continue;

      questions.push({
        sentence: blanked,
        original: sentence,
        answer: target,
        answerTranslation: w.translation || '',
        pinyin: ex.pinyin || '',
        translation: ex.ru || '',
        options: shuffle([target, ...wrong]),
      });
    }
    return questions;
  }

  function hideHintPanel() {
    if (els.hintPanel) els.hintPanel.hidden = true;
    state.hintOpen = false;
  }

  function playFullSentence() {
    const q = state.questions[state.step];
    if (!q) return;
    if (window.HP_AUDIO && window.HP_AUDIO.speak) {
      window.HP_AUDIO.speak(q.original);
    }
  }

  /**
   * Одна кнопка — все подсказки:
   *   🔊 озвучка предложения,
   *   📖 чтение предложения (пиньинь),
   *   🌐 перевод пропущенного слова,
   *   ✅ правильный иероглиф.
   */
  function showFullHint() {
    const q = state.questions[state.step];
    if (!q) return;

    if (state.hintOpen) {
      hideHintPanel();
      return;
    }

    let py = q.pinyin || '';
    if (!py && window.pinyinPro && typeof window.pinyinPro.pinyin === 'function') {
      try {
        py = window.pinyinPro.pinyin(q.sentence, { toneType: 'symbol' });
      } catch (e) {
        console.warn('[cloze] pinyin-pro error:', e);
      }
    }

    const answer = q.answer || '';
    const answerTranslation = q.answerTranslation || '';

    let html = '';

    html +=
      `<div class="quiz-hint__section">` +
        `<div class="quiz-hint__label">` +
          `<i class="ri-volume-up-line"></i> Озвучка предложения` +
        `</div>` +
        `<button type="button" class="btn btn--secondary btn--sm" id="clozeHintSpeak">` +
          `<i class="ri-play-fill"></i><span>Проиграть фразу</span>` +
        `</button>` +
      `</div>`;

    html +=
      `<div class="quiz-hint__section">` +
        `<div class="quiz-hint__label">` +
          `<i class="ri-book-open-line"></i> Чтение` +
        `</div>` +
        `<div class="quiz-hint__value">${py || '—'}</div>` +
        `<div class="quiz-hint__note">___ — пропущенное слово</div>` +
      `</div>`;

    if (answerTranslation) {
      html +=
        `<div class="quiz-hint__section">` +
          `<div class="quiz-hint__label">` +
            `<i class="ri-translate-2"></i> Перевод пропуска` +
          `</div>` +
          `<div class="quiz-hint__value">${answerTranslation}</div>` +
          `<div class="quiz-hint__note">Что означает пропущенное слово</div>` +
        `</div>`;
    }

    if (answer) {
      html +=
        `<div class="quiz-hint__section quiz-hint__section--answer">` +
          `<div class="quiz-hint__label">` +
            `<i class="ri-check-double-line"></i> Правильный иероглиф` +
          `</div>` +
          `<div class="quiz-hint__answer">${answer}</div>` +
          `<div class="quiz-hint__note">Это ответ — выберите соответствующий вариант ниже</div>` +
        `</div>`;
    }

    els.hintPanel.innerHTML = html;
    els.hintPanel.hidden = false;
    state.hintOpen = true;

    const speakBtn = document.getElementById('clozeHintSpeak');
    if (speakBtn) speakBtn.addEventListener('click', playFullSentence);
  }

  function renderQuestion() {
    const q = state.questions[state.step];
    state.locked = false;
    state.hintOpen = false;

    els.progress.textContent = `${state.step + 1} / ${state.questions.length}`;
    els.bar.style.width = `${(state.step / state.questions.length) * 100}%`;
    els.sentence.textContent = q.sentence;
    els.translation.textContent = q.translation;

    els.options.innerHTML = '';
    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cloze__option';
      btn.innerHTML = `<span class="cloze__index">${i + 1}</span><span>${opt}</span>`;
      btn.addEventListener('click', () => handleAnswer(btn, opt));
      els.options.appendChild(btn);
    });

    els.status.textContent = '';
    els.status.className = 'cloze__status';

    if (els.tools) els.tools.hidden = false;
    hideHintPanel();
  }

  function handleAnswer(btn, value) {
    if (state.locked) return;
    state.locked = true;

    const q = state.questions[state.step];
    const isRight = value === q.answer;

    if (isRight) {
      btn.classList.add('cloze__option--correct');
      state.correct++;
      els.status.textContent = 'Верно!';
      els.status.classList.add('cloze__status--ok');
    } else {
      btn.classList.add('cloze__option--wrong');
      els.options.querySelectorAll('.cloze__option').forEach(el => {
        if (el.textContent.includes(q.answer)) el.classList.add('cloze__option--correct');
      });
      els.status.textContent = `Правильно: ${q.answer}`;
      els.status.classList.add('cloze__status--err');
    }

    els.options.querySelectorAll('.cloze__option').forEach(el => el.disabled = true);

    setTimeout(() => {
      state.step++;
      if (state.step >= state.questions.length) finish();
      else renderQuestion();
    }, isRight ? 700 : 1400);
  }

  function finish() {
    els.bar.style.width = '100%';
    els.progress.textContent = `${state.questions.length} / ${state.questions.length}`;
    els.body.hidden = true;
    els.result.hidden = false;

    const total = state.questions.length;
    const correct = state.correct;
    const percent = Math.round((correct / total) * 100);
    els.resultScore.textContent = `${correct} / ${total} (${percent}%)`;
    els.resultIcon.innerHTML = percent === 100
      ? '<i class="ri-trophy-line"></i>'
      : percent >= 70
      ? '<i class="ri-award-line"></i>'
      : '<i class="ri-book-open-line"></i>';
    els.resultTitle.textContent = percent === 100 ? 'Идеально!'
      : percent >= 70 ? 'Хороший результат'
      : 'Нужно повторить';
  }

  const api = {
    onExit: null,

    init(refs, onExit) {
      Object.assign(els, refs);
      api.onExit = onExit;

      els.close.addEventListener('click', () => api.exit());
      els.exitBtn.addEventListener('click', () => api.exit());
      els.restart.addEventListener('click', () => api.start(api._words));

      if (els.hintBtn) els.hintBtn.addEventListener('click', showFullHint);
    },

    start(words, count = 8) {
      const questions = buildQuestions(words, count);
      if (!questions.length) {
        alert('Для пропусков нужно минимум 4 слова с примерами предложений. Добавьте примеры в data.js или в свои слова.');
        return;
      }
      api._words = words;
      state.questions = questions;
      state.step = 0;
      state.correct = 0;
      state.hintOpen = false;
      els.view.hidden = false;
      els.body.hidden = false;
      els.result.hidden = true;
      renderQuestion();
    },

    exit() {
      els.view.hidden = true;
      if (typeof api.onExit === 'function') api.onExit();
    },

    isActive() { return !els.view.hidden; },
  };

  return api;
})();