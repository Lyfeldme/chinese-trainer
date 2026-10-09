/**
 * Режим «Проверка»: викторина с 4 вариантами ответа.
 * Типы: w2t, t2w, w2p, p2w.
 *
 * Кнопки подсказок ВСЕГДА активны и ВСЕГДА показывают полезное:
 *   🔊 Послушать — если вопрос из иероглифов, озвучивает вопрос;
 *                  иначе озвучивает правильный ответ.
 *   📖 Чтение    — показывает пиньинь; если пиньинь уже в вопросе
 *                  или в ответе — раскрывает правильный вариант.
 *   🌐 Перевод   — показывает перевод; если перевод уже в вопросе
 *                  или в ответе — раскрывает правильный вариант.
 *   💡 Подсказка — количество иероглифов, первая буква и т.п.
 *
 * Дистракторы подбираются приоритетно той же длины, что и правильный
 * ответ — чтобы нельзя было угадать по форме.
 */
window.HP_MCQ = (function () {
  const DEFAULT_ROUND_SIZE = 10;
  const OPTIONS_COUNT = 4;

  const els = {};
  let onExitCb = null;

  const TYPES = [
    { id: 'w2t', from: 'word',        to: 'translation', hint: 'Что означает?' },
    { id: 't2w', from: 'translation', to: 'word',        hint: 'Какой иероглиф?' },
    { id: 'w2p', from: 'word',        to: 'pinyin',      hint: 'Как читается?' },
    { id: 'p2w', from: 'pinyin',      to: 'word',        hint: 'Какой иероглиф?' },
  ];

  const state = {
    questions: [],
    step: 0,
    correctCount: 0,
    locked: false,
    words: [],
    roundSize: DEFAULT_ROUND_SIZE,
  };

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickRandom(arr, n, excludeValues = []) {
    const pool = arr.filter(x => !excludeValues.includes(x));
    return shuffle(pool).slice(0, n);
  }

  /**
   * Подбирает неправильные варианты, приоритетно — той же длины,
   * что и правильный ответ. Если «своей длины» не хватает — добирает
   * близкими (±1 символ), затем любыми.
   */
  function pickWrongAnswersByLength(usable, field, correctAnswer, count) {
    const correctLen = String(correctAnswer).length;

    const all = usable
      .map(w => w[field])
      .filter(v => v && v !== correctAnswer);

    const sameLen  = all.filter(v => String(v).length === correctLen);
    const closeLen = all.filter(v => {
      const l = String(v).length;
      return l !== correctLen && Math.abs(l - correctLen) <= 1;
    });
    const farLen = all.filter(v => Math.abs(String(v).length - correctLen) > 1);

    const picked = [];
    const pools = [shuffle(sameLen), shuffle(closeLen), shuffle(farLen)];

    for (const pool of pools) {
      for (const v of pool) {
        if (picked.length >= count) break;
        if (!picked.includes(v)) picked.push(v);
      }
      if (picked.length >= count) break;
    }

    return picked.slice(0, count);
  }

  function isHanzi(text) {
    return /[\u4e00-\u9fff]/.test(String(text || ''));
  }

  function buildQuestions(words, roundSize) {
    const usable = words.filter(w =>
      w.word && w.translation && w.pinyin &&
      w.word.trim() && w.translation.trim() && w.pinyin.trim()
    );

    if (usable.length < OPTIONS_COUNT) {
      throw new Error('Нужно минимум 4 слова с пиньинем, чтобы запустить проверку');
    }

    const limit = (typeof roundSize === 'number' && roundSize > 0)
      ? Math.min(roundSize, usable.length)
      : usable.length;

    const selected = shuffle(usable).slice(0, limit);
    const questions = [];

    for (const correct of selected) {
      const type = TYPES[Math.floor(Math.random() * TYPES.length)];
      const correctAnswer = correct[type.to];

      const wrongAnswers = pickWrongAnswersByLength(
        usable,
        type.to,
        correctAnswer,
        OPTIONS_COUNT - 1
      );

      if (wrongAnswers.length < OPTIONS_COUNT - 1) continue;

      const options = shuffle([correctAnswer, ...wrongAnswers]);

      questions.push({
        hint: type.hint,
        question: correct[type.from],
        correctAnswer,
        options,
        sourceWord: correct.word,
        sourceData: correct,
        questionType: type.id,
        answerType: type.to,
      });
    }

    return questions;
  }

  function renderQuestion() {
    const q = state.questions[state.step];
    if (!q) return;

    state.locked = false;

    els.progress.textContent = `${state.step + 1} / ${state.questions.length}`;
    els.barFill.style.width = `${(state.step / state.questions.length) * 100}%`;

    els.hint.textContent = q.hint;
    els.question.textContent = q.question;
    els.question.classList.toggle('mcq__question--long', q.question.length > 6);

    els.options.innerHTML = '';
    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mcq__option';
      btn.dataset.value = opt;
      btn.dataset.correct = (opt === q.correctAnswer) ? '1' : '0';
      btn.innerHTML = `<span class="mcq__option-index">${i + 1}</span><span class="mcq__option-text">${opt}</span>`;
      btn.addEventListener('click', () => handleAnswer(btn, opt));
      els.options.appendChild(btn);
    });

    els.status.textContent = '';
    els.status.className = 'mcq__status';

    setupTools();
  }

  function setupTools() {
    if (!els.tools) return;
    els.tools.hidden = false;
    hideHintPanel();

    if (els.audioBtn)       els.audioBtn.disabled = false;
    if (els.pinyinBtn)      els.pinyinBtn.disabled = false;
    if (els.translationBtn) els.translationBtn.disabled = false;
    if (els.hintBtn)        els.hintBtn.disabled = false;
  }

  function hideHintPanel() {
    if (els.hintPanel) els.hintPanel.hidden = true;
  }

  function getPinyinForText(text) {
    if (!text) return null;
    if (window.pinyinPro && typeof window.pinyinPro.pinyin === 'function') {
      try {
        return window.pinyinPro.pinyin(text, { toneType: 'symbol' });
      } catch (e) {
        console.warn('[mcq] pinyin-pro error:', e);
      }
    }
    return null;
  }

  function playAudio() {
    const q = state.questions[state.step];
    if (!q) return;

    const textToSpeak = isHanzi(q.question)
      ? q.question
      : q.correctAnswer;

    if (!isHanzi(textToSpeak)) return;

    if (window.HP_AUDIO && window.HP_AUDIO.speak) {
      window.HP_AUDIO.speak(textToSpeak);
    }
  }

  function showPinyin() {
    const q = state.questions[state.step];
    if (!q) return;

    const questionIsPinyin = q.questionType === 'p2w';
    const answerIsPinyin   = q.answerType === 'pinyin';

    if (questionIsPinyin) {
      const answer = String(q.correctAnswer || '');
      els.hintPanel.innerHTML =
        `<span class="quiz-hint__label">Чтение — подсказка</span>` +
        `<div>Пиньинь <b>${q.question}</b> соответствует иероглифу:</div>` +
        `<div class="quiz-hint__value">${answer}</div>` +
        `<div class="quiz-hint__note">Нажмите на вариант ответа, который совпадает</div>`;
      els.hintPanel.hidden = false;
      return;
    }

    if (answerIsPinyin) {
      const answer = String(q.correctAnswer || '');
      els.hintPanel.innerHTML =
        `<span class="quiz-hint__label">Чтение — подсказка</span>` +
        `<div>Правильный пиньинь:</div>` +
        `<div class="quiz-hint__value">${answer}</div>` +
        `<div class="quiz-hint__note">Нажмите на вариант ответа, который совпадает</div>`;
      els.hintPanel.hidden = false;
      return;
    }

    if (isHanzi(q.question)) {
      let py = getPinyinForText(q.question);
      if (!py && q.sourceData && q.sourceData.pinyin) {
        py = q.sourceData.pinyin;
      }
      els.hintPanel.innerHTML =
        `<span class="quiz-hint__label">Чтение вопроса</span>` +
        `<div class="quiz-hint__value">${py || '—'}</div>` +
        `<div class="quiz-hint__note">Прочитайте вслух и вспомните значение</div>`;
      els.hintPanel.hidden = false;
      return;
    }

    let py = null;
    if (q.sourceData && q.sourceData.pinyin) {
      py = q.sourceData.pinyin;
    } else {
      py = getPinyinForText(q.correctAnswer);
    }
    els.hintPanel.innerHTML =
      `<span class="quiz-hint__label">Чтение ответа</span>` +
      `<div class="quiz-hint__value">${py || '—'}</div>` +
      `<div class="quiz-hint__note">Правильный иероглиф читается так</div>`;
    els.hintPanel.hidden = false;
  }

  function showTranslation() {
    const q = state.questions[state.step];
    if (!q) return;

    const questionIsTranslation = q.questionType === 't2w';
    const answerIsTranslation   = q.answerType === 'translation';
    const sourceTranslation     = q.sourceData ? q.sourceData.translation : '';

    if (questionIsTranslation) {
      const pinyin = q.sourceData ? q.sourceData.pinyin : '';
      els.hintPanel.innerHTML =
        `<span class="quiz-hint__label">Перевод — подсказка</span>` +
        `<div>Перевод уже в вопросе:</div>` +
        `<div class="quiz-hint__value">${q.question}</div>` +
        (pinyin
          ? `<div class="quiz-hint__note">Искомый иероглиф читается: <b>${pinyin}</b></div>`
          : '') +
        `<div class="quiz-hint__note">Выберите вариант, который переводится так</div>`;
      els.hintPanel.hidden = false;
      return;
    }

    if (answerIsTranslation) {
      els.hintPanel.innerHTML =
        `<span class="quiz-hint__label">Перевод — подсказка</span>` +
        `<div>Правильный перевод:</div>` +
        `<div class="quiz-hint__value">${q.correctAnswer}</div>` +
        `<div class="quiz-hint__note">Нажмите на вариант ответа, который совпадает</div>`;
      els.hintPanel.hidden = false;
      return;
    }

    if (sourceTranslation) {
      els.hintPanel.innerHTML =
        `<span class="quiz-hint__label">Перевод</span>` +
        `<div class="quiz-hint__value">${sourceTranslation}</div>` +
        `<div class="quiz-hint__note">Значение искомого слова</div>`;
    } else {
      els.hintPanel.innerHTML =
        `<span class="quiz-hint__label">Перевод</span>` +
        `<div>Для этого слова перевод не указан.</div>`;
    }
    els.hintPanel.hidden = false;
  }

  function showHint() {
    const q = state.questions[state.step];
    if (!q) return;

    const answer = String(q.correctAnswer || '');
    const answerIsHanzi = isHanzi(answer);
    const answerIsPinyin = q.answerType === 'pinyin';
    const answerIsTranslation = q.answerType === 'translation';

    let html = `<span class="quiz-hint__label">Подсказка</span>`;

    if (answerIsHanzi) {
      const len = [...answer].length;
      const wordForm = len === 1 ? 'иероглиф'
                     : (len >= 2 && len <= 4) ? 'иероглифа'
                     : 'иероглифов';
      html += `<div>В правильном ответе <b>${len}</b> ${wordForm}</div>`;
      if (q.sourceData && q.sourceData.pinyin) {
        const firstLetter = String(q.sourceData.pinyin)[0] || '';
        if (firstLetter) {
          html += `<div class="quiz-hint__note">Начинается со звука «${firstLetter}»</div>`;
        }
      }
    } else if (answerIsPinyin) {
      html += `<div>Правильный ответ — <b>пиньинь</b>: как читается слово</div>`;
      if (q.sourceData && q.sourceData.pinyin) {
        const sylCount = String(q.sourceData.pinyin).trim().split(/\s+/).length;
        html += `<div class="quiz-hint__note">Слогов: <b>${sylCount}</b></div>`;
      }
    } else if (answerIsTranslation) {
      html += `<div>Правильный ответ — <b>перевод</b> на русский язык</div>`;
      if (answer) {
        html += `<div class="quiz-hint__note">Первая буква: «${answer[0].toLowerCase()}»</div>`;
      }
    } else {
      html += `<div>Внимательно прочитайте вопрос и варианты ответа</div>`;
    }

    els.hintPanel.innerHTML = html;
    els.hintPanel.hidden = false;
  }

  function handleAnswer(btn, value) {
    if (state.locked) return;
    state.locked = true;

    const q = state.questions[state.step];
    const isCorrect = value === q.correctAnswer;

    try {
      window.HP_STORAGE.recordAnswer(q.sourceWord, isCorrect);
    } catch (err) {
      console.error('Не удалось сохранить ответ:', err);
    }

    if (isCorrect) {
      btn.classList.add('mcq__option--correct');
      state.correctCount++;
      els.status.textContent = 'Верно!';
      els.status.className = 'mcq__status mcq__status--correct';
    } else {
      btn.classList.add('mcq__option--wrong');
      els.options.querySelectorAll('.mcq__option').forEach(el => {
        if (el.dataset.correct === '1') el.classList.add('mcq__option--correct');
      });
      els.status.textContent = `Правильный ответ: ${q.correctAnswer}`;
      els.status.className = 'mcq__status mcq__status--wrong';
    }

    els.options.querySelectorAll('.mcq__option').forEach(el => {
      el.disabled = true;
    });

    setTimeout(() => {
      state.step++;
      if (state.step >= state.questions.length) {
        finish();
      } else {
        renderQuestion();
      }
    }, isCorrect ? 700 : 1400);
  }

  function finish() {
    els.barFill.style.width = '100%';
    els.progress.textContent = `${state.questions.length} / ${state.questions.length}`;

    if (typeof api.onFinishCallback === 'function') {
      try {
        api.onFinishCallback({
          total: state.questions.length,
          correct: state.correctCount,
        });
      } catch (e) { /* ok */ }
    }

    els.mcqBody.hidden = true;
    els.result.hidden = false;

    const total = state.questions.length;
    const correct = state.correctCount;
    const percent = Math.round((correct / total) * 100);

    els.resultScore.textContent = `${correct} / ${total} (${percent}%)`;

    if (percent === 100) {
      els.resultIcon.innerHTML = '<i class="ri-trophy-line"></i>';
      els.resultTitle.textContent = 'Идеально!';
      els.resultMessage.textContent = 'Все ответы верные. Так держать!';
    } else if (percent >= 70) {
      els.resultIcon.innerHTML = '<i class="ri-award-line"></i>';
      els.resultTitle.textContent = 'Хороший результат';
      els.resultMessage.textContent = 'Уже близко к идеалу. Ещё разок — и будет отлично.';
    } else if (percent >= 40) {
      els.resultIcon.innerHTML = '<i class="ri-thumb-up-line"></i>';
      els.resultTitle.textContent = 'Неплохо для начала';
      els.resultMessage.textContent = 'Повторите слова и попробуйте снова.';
    } else {
      els.resultIcon.innerHTML = '<i class="ri-book-open-line"></i>';
      els.resultTitle.textContent = 'Нужно повторить';
      els.resultMessage.textContent = 'Откройте «По памяти» или «Обводить» для закрепления.';
    }
  }

  const api = {
    onFinishCallback: null,

    init(refs, onExit) {
      els.view        = refs.view;
      els.wordView    = refs.wordView;
      els.listSection = refs.listSection;
      els.progress    = refs.progress;
      els.barFill     = refs.barFill;
      els.hint        = refs.hint;
      els.question    = refs.question;
      els.options     = refs.options;
      els.status      = refs.status;
      els.mcqBody     = refs.mcqBody;
      els.result      = refs.result;
      els.resultIcon  = refs.resultIcon;
      els.resultTitle = refs.resultTitle;
      els.resultScore = refs.resultScore;
      els.resultMessage = refs.resultMessage;
      els.closeBtn    = refs.closeBtn;
      els.exitBtn     = refs.exitBtn;
      els.restartBtn  = refs.restartBtn;

      els.tools          = refs.tools;
      els.audioBtn       = refs.audioBtn;
      els.pinyinBtn      = refs.pinyinBtn;
      els.translationBtn = refs.translationBtn;
      els.hintBtn        = refs.hintBtn;
      els.hintPanel      = refs.hintPanel;

      onExitCb = onExit;

      els.closeBtn.addEventListener('click', () => api.exit());
      els.exitBtn.addEventListener('click', () => api.exit());
      els.restartBtn.addEventListener('click', () => api.restart());

      if (els.audioBtn)       els.audioBtn.addEventListener('click', playAudio);
      if (els.pinyinBtn)      els.pinyinBtn.addEventListener('click', showPinyin);
      if (els.translationBtn) els.translationBtn.addEventListener('click', showTranslation);
      if (els.hintBtn)        els.hintBtn.addEventListener('click', showHint);
    },

    start(words, options = {}) {
      if (!words || words.length < OPTIONS_COUNT) {
        throw new Error('Нужно минимум 4 слова для проверки');
      }

      const roundSize = (typeof options.roundSize === 'number' && options.roundSize > 0)
        ? options.roundSize
        : words.length;

      state.words = words.slice();
      state.roundSize = roundSize;
      state.step = 0;
      state.correctCount = 0;

      const questions = buildQuestions(words, roundSize);
      if (!questions.length) {
        throw new Error('Не удалось построить вопросы — проверьте данные слов');
      }
      state.questions = questions;

      els.wordView.hidden = true;
      els.listSection.hidden = true;
      els.view.hidden = false;

      els.mcqBody.hidden = false;
      els.result.hidden = true;

      renderQuestion();
    },

    restart() {
      api.start(state.words, { roundSize: state.roundSize });
    },

    exit() {
      els.view.hidden = true;
      els.wordView.hidden = false;
      els.listSection.hidden = false;

      if (typeof onExitCb === 'function') onExitCb();
    },

    isActive() {
      return !els.view.hidden;
    },
  };

  return api;
})();