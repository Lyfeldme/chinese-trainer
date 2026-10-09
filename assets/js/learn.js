/**
 * Режим «Изучение пошагово»: показывает иероглифы в ряд и рисует
 * их по одной черте — вручную или автоматически.
 *
 * Рисуем ПОСЛЕДОВАТЕЛЬНО: сначала полностью первый иероглиф,
 * потом второй, потом третий.
 *
 * Данные о чертах загружаются заранее через HanziWriter.loadCharacterData,
 * чтобы анимация animateStroke() срабатывала сразу.
 */
window.HP_LEARN = (function () {
  const els = {};
  let writers = [];
  let playing = false;
  let timer = null;
  let animating = false;
  let currentWord = null;
  let activeIndex = 0;
  let buildToken = 0;

  function cfg() {
    return (window.HP_CONFIG && window.HP_CONFIG.learn) || {};
  }
  function strokeDuration() { return cfg().strokeDuration || 550; }
  function gapBetweenStrokes() { return cfg().gapBetweenStrokes || 250; }
  function gapWhileAnimating() { return cfg().gapWhileAnimating || 80; }

  function stopPlayback() {
    playing = false;
    if (timer) { clearTimeout(timer); timer = null; }
    if (els.btnPlay) {
      els.btnPlay.innerHTML = '<i class="ri-play-fill"></i><span>Играть</span>';
    }
  }

  function cancelAllAnimations() {
    writers.forEach(w => {
      try { w.writer.cancelAnimation(); } catch (e) {}
    });
  }

  function updateStepLabel(w) {
    if (!w.stepEl) return;
    w.stepEl.textContent = `${w.current} / ${w.total || '—'}`;
    if (w.total && w.current >= w.total) {
      w.box.classList.add('learn__char--done');
    } else {
      w.box.classList.remove('learn__char--done');
    }
  }

  function updateActiveHighlight() {
    writers.forEach((w, i) => {
      if (i === activeIndex && w.current < w.total) {
        w.box.classList.add('learn__char--active');
      } else {
        w.box.classList.remove('learn__char--active');
      }
    });
  }

  function nextStroke() {
    if (animating) return false;
    if (!writers.length) return true;

    while (
      activeIndex < writers.length &&
      writers[activeIndex].total &&
      writers[activeIndex].current >= writers[activeIndex].total
    ) {
      activeIndex++;
    }

    if (activeIndex >= writers.length) return true;

    const w = writers[activeIndex];
    if (!w.total) { activeIndex++; return false; }

    const n = w.current;
    w.current++;
    updateStepLabel(w);
    updateActiveHighlight();

    animating = true;

    try {
      w.writer.animateStroke(n, {
        duration: strokeDuration(),
        onComplete: () => {
          animating = false;
          if (w.current >= w.total) {
            activeIndex++;
            updateActiveHighlight();
          }
        },
      });
    } catch (e) {
      console.error('animateStroke error', e);
      animating = false;
      if (w.current >= w.total) {
        activeIndex++;
        updateActiveHighlight();
      }
    }

    return false;
  }

  function playLoop() {
    if (!playing) return;
    if (animating) {
      timer = setTimeout(playLoop, gapWhileAnimating());
      return;
    }
    const allDone = nextStroke();
    if (allDone) {
      stopPlayback();
      return;
    }
    timer = setTimeout(playLoop, gapBetweenStrokes());
  }

  function startPlayback() {
    if (playing) return;
    if (writers.length && writers.every(w => w.total && w.current >= w.total)) {
      resetAll();
    }
    playing = true;
    els.btnPlay.innerHTML = '<i class="ri-pause-line"></i><span>Пауза</span>';
    playLoop();
  }

  function togglePlayback() {
    if (playing) stopPlayback();
    else startPlayback();
  }

  function resetAll() {
    stopPlayback();
    cancelAllAnimations();
    animating = false;
    activeIndex = 0;

    writers.forEach(w => {
      try { w.writer.hideCharacter(); } catch (e) {}
      w.current = 0;
      updateStepLabel(w);
    });
    updateActiveHighlight();
  }

  function handleNext() {
    stopPlayback();
    if (animating) return;
    nextStroke();
  }

  function handleAudio() {
    if (!currentWord) return;
    if (window.HP_AUDIO && window.HP_AUDIO.speak) {
      window.HP_AUDIO.speak(currentWord.word);
    }
  }

  function buildFor(word) {
    const token = ++buildToken;
    currentWord = word;
    els.chars.innerHTML = '';
    writers = [];
    animating = false;
    activeIndex = 0;
    stopPlayback();

    const chars = [...word.word];
    const syllables = String(word.pinyin || '').trim().split(/\s+/);
    const size = window.innerWidth < 600 ? 110 : 150;

    Promise.all(chars.map(c => HanziWriter.loadCharacterData(c)))
      .then(dataArr => {
        if (token !== buildToken) return;

        chars.forEach((char, i) => {
          const data = dataArr[i];
          const totalStrokes = (data && data.strokes) ? data.strokes.length : 0;

          const box = document.createElement('div');
          box.className = 'learn__char';

          const target = document.createElement('div');
          target.className = 'learn__char-canvas';
          target.id = 'learn-char-' + i;
          box.appendChild(target);

          const meta = document.createElement('div');
          meta.className = 'learn__char-meta';
          meta.innerHTML = `
            <div class="learn__char-pinyin">${syllables[i] || ''}</div>
            <div class="learn__char-step">0 / ${totalStrokes || '—'}</div>
          `;
          box.appendChild(meta);
          els.chars.appendChild(box);

          const writer = HanziWriter.create(target, char, {
            width: size,
            height: size,
            padding: 8,
            showOutline: true,
            showCharacter: false,
            strokeColor:    (window.HP_CONFIG?.writer?.strokeColor)    || '#1f2430',
            radicalColor:   (window.HP_CONFIG?.writer?.radicalColor)   || '#4f7cff',
            highlightColor: (window.HP_CONFIG?.writer?.highlightColor) || '#dbe4ff',
            outlineColor:   (window.HP_CONFIG?.writer?.outlineColor)   || '#e5e8ef',
            charDataLoader: (c, onComplete) => onComplete(data),
          });

          writers.push({
            writer,
            char,
            box,
            stepEl: meta.querySelector('.learn__char-step'),
            current: 0,
            total: totalStrokes,
          });
        });

        writers.forEach(w => {
          try { w.writer.hideCharacter(); } catch (e) {}
          updateStepLabel(w);
        });
        updateActiveHighlight();
      })
      .catch(err => {
        if (token !== buildToken) return;
        console.error('Ошибка загрузки данных для иероглифов:', err);
        els.chars.innerHTML =
          '<div style="padding:20px;color:#ef4444;text-align:center;width:100%;">' +
          'Не удалось загрузить данные о чертах. Проверьте подключение к интернету.' +
          '</div>';
      });
  }

  const api = {
    onExit: null,

    init(refs, onExit) {
      Object.assign(els, refs);
      api.onExit = onExit;

      els.close.addEventListener('click', () => api.exit());
      els.backdrop.addEventListener('click', () => api.exit());
      els.btnPlay.addEventListener('click', togglePlayback);
      els.btnNext.addEventListener('click', handleNext);
      els.btnReset.addEventListener('click', resetAll);
      if (els.btnAudio) els.btnAudio.addEventListener('click', handleAudio);

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !els.modal.hidden) api.exit();
      });
    },

    open(word) {
      els.modal.hidden = false;
      els.pinyin.textContent = word.pinyin || '—';
      els.translation.textContent = word.translation || '—';
      buildFor(word);
    },

    exit() {
      stopPlayback();
      cancelAllAnimations();
      animating = false;
      buildToken++;
      els.modal.hidden = true;
      if (typeof api.onExit === 'function') api.onExit();
    },

    isActive() { return !els.modal.hidden; },
  };

  return api;
})();