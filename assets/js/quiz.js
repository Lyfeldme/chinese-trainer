/**
 * Режим «Писать»: строгая проверка каждой черты.
 * Поддерживает два варианта:
 *   - обычный (контур виден)
 *   - «по памяти» (контур скрыт)
 * Опции передаются вторым аргументом в run().
 */
window.HP_QUIZ = (function () {
  const CFG = window.HP_CONFIG;
  let currentQuiz = null;

  /** Короткая вибрация, если поддерживается (Android, некоторые браузеры). */
  function vibrateOnError() {
    try {
      if (navigator.vibrate) navigator.vibrate(60);
    } catch (e) { /* ok, не критично */ }
  }

  function startStep(step) {
    if (!currentQuiz) return;

    const { writers, callbacks, options } = currentQuiz;

    if (step >= writers.length) {
      const total = currentQuiz.totalMistakes;
      currentQuiz = null;
      callbacks.onFinish(total);
      return;
    }

    currentQuiz.step = step;
    const { writer, box } = writers[step];

    writers.forEach(w => w.box.classList.remove('active'));
    box.classList.add('active');

    writer.quiz({
      ...options,
      onMistake: (data) => {
        vibrateOnError();
        const totalStrokes = data.strokeNum + 1 + data.strokesRemaining;
        callbacks.onStatus(
          `Ошибка на черте ${data.strokeNum + 1} из ${totalStrokes}. Попробуйте ещё раз`,
          'error'
        );
      },
      onCorrectStroke: (data) => {
        const totalStrokes = data.strokeNum + 1 + data.strokesRemaining;
        if (data.strokesRemaining === 0) {
          callbacks.onStatus('Последняя черта верна! Завершаем…', 'success');
        } else {
          callbacks.onStatus(
            `Верно! Черта ${data.strokeNum + 1} из ${totalStrokes}`,
            'success'
          );
        }
      },
      onComplete: (summary) => {
        if (!currentQuiz) return;

        const mistakes = summary.totalMistakes || 0;
        currentQuiz.totalMistakes += mistakes;

        if (mistakes === 0) {
          callbacks.onStatus('Идеально, без ошибок! 🌟', 'success');
        } else {
          callbacks.onStatus(`Иероглиф готов. Ошибок: ${mistakes}`, '');
        }

        box.classList.remove('active');
        box.classList.add('done');

        setTimeout(() => startStep(step + 1), CFG.quizStepDelay);
      },
    });
  }

  return {
    run(writers, callbacks, options = {}) {
      writers.forEach(w => w.box.classList.remove('active', 'done'));

      const merged = { ...CFG.quiz, ...options };
      currentQuiz = {
        writers,
        step: 0,
        totalMistakes: 0,
        callbacks,
        options: merged,
      };
      startStep(0);
    },

    resetCurrent() {
      if (!currentQuiz) return;

      const { writers, step, options } = currentQuiz;
      const { box, char } = writers[step];

      const target = box.querySelector('[id^="char-"]');
      if (target) {
        target.innerHTML = '';

        const size = window.HP_WRITER.pickSize();
        const writerOptions = { width: size, height: size, ...CFG.writer };
        const newWriter = HanziWriter.create(target, char, writerOptions);

        if (options.hideOutline) newWriter.hideOutline();

        writers[step].writer = newWriter;
      }

      box.classList.remove('done');
      box.classList.add('active');

      startStep(step);
    },

    isActive() { return currentQuiz !== null; },

    stop() { currentQuiz = null; },
  };
})();