/**
 * Точка входа.
 */
(function () {
  const {
    HP_WORDS_BY_LEVEL, HP_STORAGE, HP_AUDIO, HP_THEME, HP_PINYIN,
    HP_WRITER, HP_QUIZ, HP_TRACE, HP_MCQ, HP_STATS, HP_UI, HP_CONFIG,
    HP_SENTENCES, HP_DICTATION, HP_CLOZE, HP_IME, HP_LEARN,
  } = window;

  const HP_SRS        = window.HP_SRS || null;
  const HP_WORKSHEETS = window.HP_WORKSHEETS || null;

  const state = {
    level: 'hsk1',
    allWords: [],
    words: [],
    currentIndex: 0,
    writers: [],
    mode: 'idle',
    lastSize: null,
    searchQuery: '',
    mcqSize: 10,
    mcqOptionsCount: 4,
    mcqSource: 'level',
    dictationSize: 10,
    dictationSource: 'level',
    writeSize: 5,
    writeSource: 'level',
    writeSession: null,
    memorySize: 5,
    memorySource: 'level',
    memorySession: null,
    srsSize: 20,
    srsSource: 'level',
  };

  /* ============================================================
     Пользовательские разделы
     ============================================================ */
  function injectUserSections() {
    const sections = HP_STORAGE.getUserSections();
    sections.forEach(s => {
      if (!s || !s.id || !Array.isArray(s.words)) return;
      HP_WORDS_BY_LEVEL[s.id] = s.words.map(w => ({ ...w }));
    });
  }

  function removeSectionFromRuntime(id) {
    if (HP_WORDS_BY_LEVEL[id]) delete HP_WORDS_BY_LEVEL[id];
  }

  function handleDeleteUserSection(id) {
    if (!HP_STORAGE.isUserSection(id)) {
      HP_UI.setStatus('Этот раздел защищён от удаления', 'error');
      return;
    }
    const section = HP_STORAGE.getUserSections().find(s => s.id === id);
    if (!section) return;

    const ok = confirm(
      `Удалить раздел «${section.label}»?\n\n` +
      `Будет удалено ${section.words.length} слов.\n` +
      `Это действие нельзя отменить.\n\n` +
      `Прогресс и SRS-интервалы этих слов тоже удалятся.`
    );
    if (!ok) return;

    try {
      HP_STORAGE.deleteUserSection(id);
      removeSectionFromRuntime(id);

      HP_UI.setStatus(`Раздел «${section.label}» удалён`, 'success');

      if (state.level === id) {
        state.level = 'hsk1';
        state.currentIndex = 0;
      }
      renderEverything();
    } catch (err) {
      HP_UI.setStatus(err.message, 'error');
    }
  }

  document.addEventListener('hanzipath:sections-changed', () => {
    // Если активный раздел был удалён другим способом — откатываемся
    if (HP_STORAGE.isUserSection(state.level) && !HP_WORDS_BY_LEVEL[state.level]) {
      state.level = 'hsk1';
      state.currentIndex = 0;
    }
    renderEverything();
  });

  /* ============================================================
     Хелперы для опциональных модулей
     ============================================================ */
  function srsIsActive() {
    return HP_SRS && typeof HP_SRS.isActive === 'function' ? HP_SRS.isActive() : false;
  }
  function wsIsActive() {
    return HP_WORKSHEETS && typeof HP_WORKSHEETS.isActive === 'function' ? HP_WORKSHEETS.isActive() : false;
  }
  function srsOpen() {
    if (!HP_SRS) {
      HP_UI.setStatus('Модуль «Повторение» не подключён', 'error');
      return;
    }
    openSrsSetup();
  }
  function wsOpen() {
    if (!HP_WORKSHEETS || typeof HP_WORKSHEETS.open !== 'function') {
      HP_UI.setStatus('Модуль «Прописи» не подключён', 'error');
      return;
    }
    try {
      HP_WORKSHEETS.open();
    } catch (err) {
      console.error('HP_WORKSHEETS.open error:', err);
      HP_UI.setStatus('Не удалось открыть прописи: ' + err.message, 'error');
    }
  }

  /* ============================================================
     Тема
     ============================================================ */
  function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if (!icon) return;
    icon.className = theme === 'dark' ? 'ri-sun-line' : 'ri-moon-line';
  }
  function handleThemeToggle() {
    const newTheme = HP_THEME.toggle();
    updateThemeIcon(newTheme);
    if (!HP_MCQ.isActive() && !HP_DICTATION.isActive() && !state.writeSession && !state.memorySession && !srsIsActive()) {
      rebuildWritersForTheme();
    }
  }
  function rebuildWritersForTheme() {
    if (!state.words.length) return;
    const w = state.words[state.currentIndex];
    if (!w) return;
    stopActiveMode();
    const els = HP_UI.els();
    try {
      state.writers = HP_WRITER.create(els.chars, w.word);
      showOutlineAll();
    } catch (err) { console.error(err); }
  }

  /* ============================================================
     Вкладки и уровни
     ============================================================ */
  const LEVELS_ORDER = ['hsk1', 'hsk2', 'hsk3', 'hsk4', 'hsk5', 'hsk6'];
  const LEVELS_LABEL = {
    hsk1: 'HSK 1', hsk2: 'HSK 2', hsk3: 'HSK 3',
    hsk4: 'HSK 4', hsk5: 'HSK 5', hsk6: 'HSK 6',
  };

  function getLevels() {
    const base = LEVELS_ORDER
      .filter(id => Array.isArray(HP_WORDS_BY_LEVEL[id]))
      .map(id => ({ id, label: LEVELS_LABEL[id] || id.toUpperCase() }));

    const userSections = HP_STORAGE.getUserSections().map(s => ({
      id: s.id,
      label: '📁 ' + s.label,
      count: (s.words || []).length,
      isUser: true,
    }));

    const starredCount = HP_STORAGE.starredCount();
    const customCount = HP_STORAGE.getCustomWords().length;
    const allWords = getAllWordsEverywhere();
    const weakCount = HP_STORAGE.getWeakWords(allWords, 2).length;
    const dueCount  = HP_STORAGE.getDueWords(allWords).length;

    return [
      ...base.map(lvl => ({ ...lvl, count: (HP_WORDS_BY_LEVEL[lvl.id] || []).length })),
      ...userSections,
      { id: 'starred', label: '⭐ Изучаю сейчас', count: starredCount },
      { id: 'weak',    label: '⚠ Слабые',        count: weakCount },
      { id: 'due',     label: '⏰ Просроченные', count: dueCount },
      { id: 'custom',  label: 'Мои слова',       count: customCount },
    ];
  }

  function sortStarredFirst(words) {
    const starred = [];
    const others = [];
    words.forEach(w => {
      if (HP_STORAGE.isStarred(w.word)) starred.push(w);
      else others.push(w);
    });
    return [...starred, ...others];
  }

  function getWordsForLevel(level) {
    if (level === 'starred') {
      const starred = HP_STORAGE.getStarredWords();
      if (!starred.length) return [];
      const all = getAllWordsEverywhere();
      const byWord = new Map(all.map(w => [w.word, w]));
      return starred.map(sw => byWord.get(sw)).filter(Boolean);
    }
    if (level === 'weak') {
      return HP_STORAGE.getWeakWords(getAllWordsEverywhere(), 2);
    }
    if (level === 'due') {
      return HP_STORAGE.getDueWords(getAllWordsEverywhere());
    }
    if (level === 'custom') {
      return sortStarredFirst(HP_STORAGE.getCustomWords().map(w => ({ ...w })));
    }
    return sortStarredFirst((HP_WORDS_BY_LEVEL[level] || []).map(w => ({ ...w })));
  }

  function getTotalWordCount() {
    let total = 0;
    LEVELS_ORDER.forEach(id => {
      total += (HP_WORDS_BY_LEVEL[id] || []).length;
    });
    HP_STORAGE.getUserSections().forEach(s => {
      total += (s.words || []).length;
    });
    total += HP_STORAGE.getCustomWords().length;
    return total;
  }

  function getAllWordsEverywhere() {
    const all = [];
    Object.keys(HP_WORDS_BY_LEVEL).forEach(lvl => {
      (HP_WORDS_BY_LEVEL[lvl] || []).forEach(w => all.push(w));
    });
    HP_STORAGE.getCustomWords().forEach(w => all.push(w));
    return all;
  }

  /* ============================================================
     Поиск
     ============================================================ */
  function matchesQuery(w, q) {
    if (!q) return true;
    const s = q.toLowerCase();
    return (w.word || '').toLowerCase().includes(s)
        || (w.pinyin || '').toLowerCase().includes(s)
        || (w.translation || '').toLowerCase().includes(s);
  }

  function getEmptyText() {
    const q = state.searchQuery.trim();
    if (q) return `Ничего не найдено по запросу «${q}»`;
    if (state.level === 'custom')
      return 'Пока нет своих слов. Нажмите «Добавить слово», или «Справка» — там показано, как загрузить JSON-файл.';
    if (state.level === 'starred')
      return 'Пока нет отмеченных слов. Нажмите ⭐ на карточке слова, чтобы добавить в «Изучаю сейчас».';
    if (state.level === 'weak')
      return 'Слабых слов пока нет. Так держать!';
    if (state.level === 'due')
      return 'Нет слов, которые пора повторить. Заходите позже.';
    if (HP_STORAGE.isUserSection(state.level)) {
      return 'В этом разделе пока нет слов. Импортируйте JSON в «Мои слова» → «Импорт».';
    }
    return 'Список пуст.';
  }

  function showEmptyState() {
    stopActiveMode();
    const els = HP_UI.els();
    els.chars.innerHTML = '';
    state.writers = [];
    els.pinyin.textContent = '—';
    els.translation.textContent = '—';
    HP_UI.renderWordList([], 0, () => {}, {
      editable: state.level === 'custom',
      emptyText: getEmptyText(),
    });
    HP_UI.setStatus(state.searchQuery.trim() ? getEmptyText() : 'Список пуст');
  }

  function applySearch() {
    if (state.writeSession || state.memorySession || srsIsActive()) return;

    const q = state.searchQuery.trim();
    const prevWord = state.words[state.currentIndex]?.word;
    state.words = q
      ? state.allWords.filter(w => matchesQuery(w, q))
      : state.allWords.slice();

    let newIndex = -1;
    if (prevWord) newIndex = state.words.findIndex(w => w.word === prevWord);
    state.currentIndex = newIndex >= 0 ? newIndex : 0;

    if (state.words.length) {
      selectWord(state.currentIndex);
    } else {
      showEmptyState();
    }
  }

  function handleSearchInput(e) {
    state.searchQuery = e.target.value;
    HP_UI.els().searchClear.hidden = !state.searchQuery;
    applySearch();
  }
  function handleSearchClear() {
    state.searchQuery = '';
    HP_UI.els().searchInput.value = '';
    HP_UI.els().searchClear.hidden = true;
    applySearch();
    HP_UI.els().searchInput.focus();
  }
  function resetSearch() {
    state.searchQuery = '';
    HP_UI.els().searchInput.value = '';
    HP_UI.els().searchClear.hidden = true;
  }

  /* ============================================================
     Переключение вкладок
     ============================================================ */
  function onTabSelect(newLevel) {
    if (newLevel === state.level) return;
    state.level = newLevel;
    state.currentIndex = 0;
    state.searchQuery = '';
    HP_UI.els().searchInput.value = '';
    HP_UI.els().searchClear.hidden = true;
    renderEverything();
  }

  /* ============================================================
     Отрисовка
     ============================================================ */
  function renderEverything({ resetSelection = true } = {}) {
    if (state.writeSession) cancelWriteSession({ silent: true });
    if (state.memorySession) cancelMemorySession({ silent: true });

    state.allWords = getWordsForLevel(state.level);

    HP_UI.renderTabs(getLevels(), state.level, onTabSelect);

    const titles = {
      hsk1: 'Словарик · HSK 1', hsk2: 'Словарик · HSK 2', hsk3: 'Словарик · HSK 3',
      hsk4: 'Словарик · HSK 4', hsk5: 'Словарик · HSK 5', hsk6: 'Словарик · HSK 6',
      starred: '⭐ Изучаю сейчас',
      weak: '⚠ Слабые слова',
      due: '⏰ Просроченные',
      custom: 'Мои слова',
    };
    if (HP_STORAGE.isUserSection(state.level)) {
      const sec = HP_STORAGE.getUserSections().find(s => s.id === state.level);
      HP_UI.setListTitle(sec ? '📁 ' + sec.label : 'Раздел');
    } else {
      HP_UI.setListTitle(titles[state.level] || 'Словарик');
    }

    const actions = [];
    if (state.level === 'custom') {
      actions.push({
        label: '<i class="ri-question-line"></i><span>Справка</span>',
        className: 'btn--secondary', onClick: openImportHelp,
      });
      actions.push({
        label: '<i class="ri-file-text-line"></i><span>Шаблон</span>',
        className: 'btn--secondary', onClick: handleDownloadTemplate,
      });
      actions.push({
        label: '<i class="ri-download-line"></i><span>Импорт</span>',
        className: 'btn--secondary', onClick: handleImport,
      });
      actions.push({
        label: '<i class="ri-upload-line"></i><span>Экспорт</span>',
        className: 'btn--secondary', onClick: handleExport,
      });
    }
    if (state.level !== 'starred' && state.level !== 'weak' && state.level !== 'due') {
      actions.push({
        label: '<i class="ri-add-line"></i><span>Добавить слово</span>',
        className: 'btn--primary', onClick: () => openAddModal(),
      });
    }

    // Кнопка удаления для пользовательских разделов
    if (HP_STORAGE.isUserSection(state.level)) {
      actions.push({
        label: '<i class="ri-delete-bin-line"></i><span>Удалить раздел</span>',
        className: 'btn--danger',
        onClick: () => handleDeleteUserSection(state.level),
      });
    }

    HP_UI.renderListActions(actions);

    if (resetSelection) state.currentIndex = 0;

    applySearch();
    HP_UI.updateProgress(getTotalWordCount());
    updateSrsBadge();
  }

  function renderCurrentWordList() {
    HP_UI.renderWordList(state.words, state.currentIndex, selectWord, {
      editable: state.level === 'custom',
      onToggleStar: handleToggleStar,
    });
  }

  /* ============================================================
     Выбор слова
     ============================================================ */
  function selectWord(index) {
    stopActiveMode();
    state.currentIndex = index;
    const w = state.words[index];
    if (!w) return;

    const els = HP_UI.els();
    els.pinyin.textContent = w.pinyin || '—';
    els.translation.textContent = w.translation;

    try {
      state.writers = HP_WRITER.create(els.chars, w.word);
      state.lastSize = HP_WRITER.pickSize();
    } catch (err) {
      console.error(err);
      HP_UI.setStatus(err.message, 'error');
      return;
    }
    showOutlineAll();
    HP_UI.setStatus('Выберите режим. F — добавить/убрать из «Изучаю сейчас»');
    renderCurrentWordList();
    HP_THEME.setMode('idle');
  }

  /* ============================================================
     Звёздочки
     ============================================================ */
  function handleToggleStar(wordItem) {
    const nowOn = HP_STORAGE.toggleStar(wordItem.word);

    const savedWord = wordItem.word;
    const savedIndex = state.currentIndex;

    state.allWords = getWordsForLevel(state.level);

    HP_UI.renderTabs(getLevels(), state.level, onTabSelect);

    const q = state.searchQuery.trim();
    state.words = q
      ? state.allWords.filter(w => matchesQuery(w, q))
      : state.allWords.slice();

    let newIndex = state.words.findIndex(w => w.word === savedWord);
    if (newIndex < 0) {
      newIndex = Math.min(savedIndex, state.words.length - 1);
      if (newIndex < 0) newIndex = 0;
    }
    state.currentIndex = newIndex;

    if (state.words.length) {
      selectWord(state.currentIndex);
    } else {
      showEmptyState();
    }

    HP_UI.setStatus(
      nowOn
        ? `«${wordItem.word}» добавлено в «Изучаю сейчас» (всего: ${HP_STORAGE.starredCount()})`
        : `«${wordItem.word}» убрано из «Изучаю сейчас» (осталось: ${HP_STORAGE.starredCount()})`,
      'success'
    );
  }

  function toggleStarCurrent() {
    const w = state.words[state.currentIndex];
    if (!w) return;
    handleToggleStar(w);
  }

  /* ============================================================
     Контур
     ============================================================ */
  function showOutlineAll() { state.writers.forEach(w => w.writer.showOutline()); }
  function hideOutlineAll() { state.writers.forEach(w => w.writer.hideOutline()); }

  function stopActiveMode() {
    if (state.mode === 'quiz' || state.mode === 'quizMemory') HP_QUIZ.stop();
    if (state.mode === 'trace') HP_TRACE.stop();
    HP_UI.clearExtraButtons();
    state.mode = 'idle';
    HP_THEME.setMode('idle');
    if (state.writeSession) cancelWriteSession({ silent: true });
    if (state.memorySession) cancelMemorySession({ silent: true });
  }

  /* ============================================================
     Озвучка
     ============================================================ */
  let _lastSpeakAt = 0;

  function speakCurrentWord() {
    const now = Date.now();
    if (now - _lastSpeakAt < 500) return;
    _lastSpeakAt = now;

    const w = state.words[state.currentIndex];
    if (!w) return;

    if (!HP_AUDIO.isSupported()) {
      HP_UI.setStatus('Ваш браузер не поддерживает озвучку', 'error');
      return;
    }

    HP_AUDIO.speak(w.word);
    HP_UI.setStatus('Озвучивание: ' + (w.pinyin || w.word));
  }

  function handleAudio() { speakCurrentWord(); }

  /* ============================================================
     Обводка
     ============================================================ */
  function handleTrace() {
    if (!state.writers.length) return;
    stopActiveMode();
    state.mode = 'trace';
    HP_THEME.setMode('trace');
    showOutlineAll();
    HP_WRITER.clearStates(state.writers);
    HP_TRACE.start(state.writers);
    HP_UI.setStatus('Обводите иероглиф мышкой или пальцем');

    HP_UI.showExtraButtons([
      {
        label: '<i class="ri-volume-up-line"></i><span>Озвучить</span>',
        className: 'btn--secondary',
        onClick: () => speakCurrentWord(),
      },
      {
        label: '<i class="ri-eraser-line"></i><span>Очистить</span>',
        className: 'btn--secondary',
        onClick: () => { HP_TRACE.clear(); HP_UI.setStatus('Холст очищен'); },
      },
    ]);
  }

  /* ============================================================
     Навигация
     ============================================================ */
  function handleNext() {
    if (state.writeSession) cancelWriteSession({ silent: true });
    if (state.memorySession) cancelMemorySession({ silent: true });

    if (!state.words.length) {
      state.words = state.allWords.slice();
      state.currentIndex = 0;
    }
    if (!state.words.length) return;

    const len = state.words.length;
    selectWord((state.currentIndex + 1) % len);
  }

  function handlePrev() {
    if (state.writeSession) cancelWriteSession({ silent: true });
    if (state.memorySession) cancelMemorySession({ silent: true });

    if (!state.words.length) {
      state.words = state.allWords.slice();
      state.currentIndex = 0;
    }
    if (!state.words.length) return;

    const len = state.words.length;
    selectWord((state.currentIndex - 1 + len) % len);
  }

  /* ============================================================
     Кандидаты
     ============================================================ */
  function getCandidates(source) {
    switch (source) {
      case 'current': {
        const starred = HP_STORAGE.getStarredWords();
        if (!starred.length) return [];
        const all = getAllWordsEverywhere();
        const byWord = new Map(all.map(w => [w.word, w]));
        return starred.map(sw => byWord.get(sw)).filter(Boolean);
      }
      case 'weak':
        return HP_STORAGE.getWeakWords(state.allWords, 2);
      case 'due':
        return HP_STORAGE.getDueWords(state.allWords);
      case 'custom':
        return HP_STORAGE.getCustomWords().map(w => ({ ...w }));
      case 'level':
      default:
        return state.allWords.slice();
    }
  }

  /* ============================================================
     «Писать»
     ============================================================ */
  const elsWriteSetup = { modal: null, sizeBtns: [], sourceBtns: [], hint: null, startBtn: null };

  function cacheWriteSetup() {
    elsWriteSetup.modal      = document.getElementById('writeSetupModal');
    elsWriteSetup.hint       = document.getElementById('writeSetupHint');
    elsWriteSetup.startBtn   = document.getElementById('writeSetupStart');
    elsWriteSetup.sizeBtns   = Array.from(document.querySelectorAll('#writeSetupSize button'));
    elsWriteSetup.sourceBtns = Array.from(document.querySelectorAll('#writeSetupSource button'));

    if (!elsWriteSetup.modal) return;

    elsWriteSetup.sizeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        state.writeSize = parseInt(btn.dataset.value, 10);
        updateWriteSetupUI();
      });
    });
    elsWriteSetup.sourceBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        state.writeSource = btn.dataset.value;
        updateWriteSetupUI();
      });
    });

    document.getElementById('writeSetupClose').addEventListener('click', closeWriteSetup);
    document.getElementById('writeSetupCancel').addEventListener('click', closeWriteSetup);
    document.getElementById('writeSetupBackdrop').addEventListener('click', closeWriteSetup);
    elsWriteSetup.startBtn.addEventListener('click', startWriteFromSetup);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !elsWriteSetup.modal.hidden) closeWriteSetup();
    });
  }

  function openWriteSetup() {
    const saved = HP_STORAGE.getWriteSettings();
    state.writeSize = saved.size;
    state.writeSource = saved.source;
    elsWriteSetup.modal.hidden = false;
    updateWriteSetupUI();
  }
  function closeWriteSetup() { elsWriteSetup.modal.hidden = true; }

  function updateWriteSetupUI() {
    elsWriteSetup.sizeBtns.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.value, 10) === state.writeSize);
    });
    elsWriteSetup.sourceBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === state.writeSource);
    });

    const candidates = getCandidates(state.writeSource);
    const size = state.writeSize === 0 ? candidates.length : state.writeSize;
    const actualSize = Math.min(size, candidates.length);

    if (state.writeSource === 'current' && candidates.length === 0) {
      elsWriteSetup.hint.innerHTML = `Отмечено <i class="ri-star-line"></i> 0. Отметьте слова звёздочкой на карточках.`;
      elsWriteSetup.hint.classList.add('setup__hint--error');
      elsWriteSetup.startBtn.disabled = true;
      return;
    }
    if (candidates.length === 0) {
      elsWriteSetup.hint.textContent = 'Нет подходящих слов для этого источника';
      elsWriteSetup.hint.classList.add('setup__hint--error');
      elsWriteSetup.startBtn.disabled = true;
    } else {
      elsWriteSetup.hint.textContent = `Будет задано слов: ${actualSize} (из ${candidates.length} доступных)`;
      elsWriteSetup.hint.classList.remove('setup__hint--error');
      elsWriteSetup.startBtn.disabled = false;
    }
  }

  function startWriteFromSetup() {
    const candidates = getCandidates(state.writeSource);
    if (!candidates.length) return;

    HP_STORAGE.saveWriteSettings({ size: state.writeSize, source: state.writeSource });
    closeWriteSetup();
    stopActiveMode();

    const shuffled = candidates.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const maxSize = candidates.length;
    const size = state.writeSize === 0 ? maxSize : Math.min(state.writeSize, maxSize);
    const sessionWords = shuffled.slice(0, size);

    state.writeSession = {
      words: sessionWords,
      originalWords: state.words.slice(),
      originalIndex: state.currentIndex,
      index: 0,
      totalMistakes: 0,
      results: [],
    };

    state.words = sessionWords;
    state.currentIndex = 0;
    renderCurrentWordList();
    runWriteSessionStep();
  }

  function runWriteSessionStep() {
    const session = state.writeSession;
    if (!session) return;

    if (session.index >= session.words.length) {
      finishWriteSession();
      return;
    }

    const w = session.words[session.index];
    state.currentIndex = session.index;
    state.mode = 'quiz';
    HP_THEME.setMode('quiz');

    const els = HP_UI.els();
    els.pinyin.textContent = w.pinyin || '—';
    els.translation.textContent = w.translation;

    try {
      state.writers = HP_WRITER.create(els.chars, w.word);
    } catch (err) {
      console.error(err);
      HP_UI.setStatus('Ошибка: ' + err.message, 'error');
      return;
    }
    showOutlineAll();
    renderCurrentWordList();

    HP_UI.setStatus(
      `Писать: ${session.index + 1} / ${session.words.length} — ведите мышкой по иероглифу`
    );

    HP_UI.showExtraButtons([
      {
        label: '<i class="ri-volume-up-line"></i><span>Озвучить</span>',
        className: 'btn--secondary',
        onClick: () => speakCurrentWord(),
      },
      {
        label: '<i class="ri-close-line"></i><span>Отменить сессию</span>',
        className: 'btn--secondary',
        onClick: () => cancelWriteSession(),
      },
    ]);

    HP_QUIZ.run(state.writers, {
      onStatus: HP_UI.setStatus,
      onFinish: (mistakes) => {
        if (!state.writeSession) return;
        const cur = state.writeSession.words[state.writeSession.index];
        HP_STORAGE.markLearned(cur.word, mistakes);
        state.writeSession.totalMistakes += mistakes;
        state.writeSession.results.push({ word: cur.word, mistakes });
        state.writeSession.index++;
        HP_UI.updateProgress(getTotalWordCount());
        renderCurrentWordList();

        setTimeout(() => {
          if (state.writeSession) runWriteSessionStep();
        }, 500);
      },
    });
  }

  function finishWriteSession() {
    const session = state.writeSession;
    if (!session) return;

    const total = session.words.length;
    const perfect = session.results.filter(r => r.mistakes === 0).length;

    HP_UI.setStatus(
      `🎉 Сессия «Писать» завершена: ${perfect} / ${total} слов без ошибок · всего ошибок: ${session.totalMistakes}`,
      'success'
    );
    HP_UI.clearExtraButtons();

    state.writeSession = null;
    state.mode = 'idle';
    HP_THEME.setMode('idle');
    renderCurrentWordList();
  }

  function cancelWriteSession({ silent = false } = {}) {
    const session = state.writeSession;
    if (!session) return;
    HP_QUIZ.stop();

    state.words = session.originalWords;
    state.currentIndex = session.originalIndex;
    state.writeSession = null;
    state.mode = 'idle';
    HP_THEME.setMode('idle');
    HP_UI.clearExtraButtons();

    if (!silent) {
      HP_UI.setStatus('Сессия отменена');
      selectWord(state.currentIndex);
    }
  }

  /* ============================================================
     «По памяти»
     ============================================================ */
  const elsMemorySetup = { modal: null, sizeBtns: [], sourceBtns: [], hint: null, startBtn: null };

  function cacheMemorySetup() {
    elsMemorySetup.modal      = document.getElementById('memorySetupModal');
    elsMemorySetup.hint       = document.getElementById('memorySetupHint');
    elsMemorySetup.startBtn   = document.getElementById('memorySetupStart');
    elsMemorySetup.sizeBtns   = Array.from(document.querySelectorAll('#memorySetupSize button'));
    elsMemorySetup.sourceBtns = Array.from(document.querySelectorAll('#memorySetupSource button'));

    if (!elsMemorySetup.modal) return;

    elsMemorySetup.sizeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        state.memorySize = parseInt(btn.dataset.value, 10);
        updateMemorySetupUI();
      });
    });
    elsMemorySetup.sourceBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        state.memorySource = btn.dataset.value;
        updateMemorySetupUI();
      });
    });

    document.getElementById('memorySetupClose').addEventListener('click', closeMemorySetup);
    document.getElementById('memorySetupCancel').addEventListener('click', closeMemorySetup);
    document.getElementById('memorySetupBackdrop').addEventListener('click', closeMemorySetup);
    elsMemorySetup.startBtn.addEventListener('click', startMemoryFromSetup);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !elsMemorySetup.modal.hidden) closeMemorySetup();
    });
  }

  function openMemorySetup() {
    if (typeof state.memorySize !== 'number') state.memorySize = 5;
    if (!state.memorySource) state.memorySource = 'level';
    elsMemorySetup.modal.hidden = false;
    updateMemorySetupUI();
  }
  function closeMemorySetup() { elsMemorySetup.modal.hidden = true; }

  function updateMemorySetupUI() {
    elsMemorySetup.sizeBtns.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.value, 10) === state.memorySize);
    });
    elsMemorySetup.sourceBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === state.memorySource);
    });

    const candidates = getCandidates(state.memorySource);
    const size = state.memorySize === 0 ? candidates.length : state.memorySize;
    const actualSize = Math.min(size, candidates.length);

    if (state.memorySource === 'current' && candidates.length === 0) {
      elsMemorySetup.hint.innerHTML = `Отмечено <i class="ri-star-line"></i> 0. Отметьте слова звёздочкой на карточках.`;
      elsMemorySetup.hint.classList.add('setup__hint--error');
      elsMemorySetup.startBtn.disabled = true;
      return;
    }
    if (candidates.length === 0) {
      elsMemorySetup.hint.textContent = 'Нет подходящих слов для этого источника';
      elsMemorySetup.hint.classList.add('setup__hint--error');
      elsMemorySetup.startBtn.disabled = true;
    } else {
      elsMemorySetup.hint.textContent = `Будет задано слов: ${actualSize} (из ${candidates.length} доступных)`;
      elsMemorySetup.hint.classList.remove('setup__hint--error');
      elsMemorySetup.startBtn.disabled = false;
    }
  }

  function startMemoryFromSetup() {
    const candidates = getCandidates(state.memorySource);
    if (!candidates.length) return;

    closeMemorySetup();
    stopActiveMode();

    const shuffled = candidates.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const maxSize = candidates.length;
    const size = state.memorySize === 0 ? maxSize : Math.min(state.memorySize, maxSize);
    const sessionWords = shuffled.slice(0, size);

    state.memorySession = {
      words: sessionWords,
      originalWords: state.words.slice(),
      originalIndex: state.currentIndex,
      index: 0,
      totalMistakes: 0,
      results: [],
      outlineVisible: false,
    };

    state.words = sessionWords;
    state.currentIndex = 0;
    renderCurrentWordList();
    runMemorySessionStep();
  }

  function runMemorySessionStep() {
    const session = state.memorySession;
    if (!session) return;

    if (session.index >= session.words.length) {
      finishMemorySession();
      return;
    }

    const w = session.words[session.index];
    state.currentIndex = session.index;
    state.mode = 'quizMemory';
    HP_THEME.setMode('quizMemory');

    const els = HP_UI.els();
    els.pinyin.textContent = w.pinyin || '—';
    els.translation.textContent = w.translation;

    try {
      state.writers = HP_WRITER.create(els.chars, w.word);
    } catch (err) {
      console.error(err);
      HP_UI.setStatus('Ошибка: ' + err.message, 'error');
      return;
    }

    hideOutlineAll();
    session.outlineVisible = false;
    renderCurrentWordList();

    HP_UI.setStatus(
      `По памяти: ${session.index + 1} / ${session.words.length} — напишите иероглиф без контура`
    );

    function buildExtraButtons() {
      HP_UI.showExtraButtons([
        { label: '<i class="ri-volume-up-line"></i><span>Озвучить</span>', className: 'btn--secondary',
          onClick: () => speakCurrentWord() },
        { label: '<i class="ri-refresh-line"></i><span>Сбросить иероглиф</span>', className: 'btn--secondary',
          onClick: () => { HP_QUIZ.resetCurrent(); session.outlineVisible = false; buildExtraButtons(); HP_UI.setStatus('Иероглиф сброшен. Начните заново'); } },
        { label: session.outlineVisible ? '<i class="ri-eye-off-line"></i><span>Скрыть контур</span>' : '<i class="ri-lightbulb-line"></i><span>Показать контур</span>',
          className: 'btn--secondary',
          onClick: () => { session.outlineVisible = !session.outlineVisible; if (session.outlineVisible) { showOutlineAll(); HP_UI.setStatus('Контур показан — используйте как подсказку'); } else { hideOutlineAll(); HP_UI.setStatus('Контур снова скрыт'); } buildExtraButtons(); } },
        { label: '<i class="ri-close-line"></i><span>Отменить сессию</span>', className: 'btn--secondary',
          onClick: () => cancelMemorySession() },
      ]);
    }
    buildExtraButtons();

    HP_QUIZ.run(state.writers, {
      onStatus: HP_UI.setStatus,
      onFinish: (mistakes) => {
        if (!state.memorySession) return;
        const cur = state.memorySession.words[state.memorySession.index];
        HP_STORAGE.markLearned(cur.word, mistakes);
        state.memorySession.totalMistakes += mistakes;
        state.memorySession.results.push({ word: cur.word, mistakes });
        state.memorySession.index++;
        HP_UI.updateProgress(getTotalWordCount());
        renderCurrentWordList();
        setTimeout(() => { if (state.memorySession) runMemorySessionStep(); }, 500);
      },
    }, { ...HP_CONFIG.quizMemory, hideOutline: true });
  }

  function finishMemorySession() {
    const session = state.memorySession;
    if (!session) return;

    const total = session.words.length;
    const perfect = session.results.filter(r => r.mistakes === 0).length;

    HP_UI.setStatus(
      `🧠 Сессия «По памяти» завершена: ${perfect} / ${total} слов без ошибок · всего ошибок: ${session.totalMistakes}`,
      'success'
    );
    HP_UI.clearExtraButtons();

    state.memorySession = null;
    state.mode = 'idle';
    HP_THEME.setMode('idle');
    renderCurrentWordList();
  }

  function cancelMemorySession({ silent = false } = {}) {
    const session = state.memorySession;
    if (!session) return;
    HP_QUIZ.stop();

    state.words = session.originalWords;
    state.currentIndex = session.originalIndex;
    state.memorySession = null;
    state.mode = 'idle';
    HP_THEME.setMode('idle');
    HP_UI.clearExtraButtons();

    if (!silent) {
      HP_UI.setStatus('Сессия «По памяти» отменена');
      selectWord(state.currentIndex);
    }
  }

  /* ============================================================
     «Повторение» (SRS)
     ============================================================ */
  const elsSrsSetup = { modal: null, sizeBtns: [], sourceBtns: [], hint: null, startBtn: null };

  function cacheSrsSetup() {
    if (!HP_SRS) return;

    elsSrsSetup.modal      = document.getElementById('srsSetupModal');
    elsSrsSetup.hint       = document.getElementById('srsSetupHint');
    elsSrsSetup.startBtn   = document.getElementById('srsSetupStart');
    elsSrsSetup.sizeBtns   = Array.from(document.querySelectorAll('#srsSetupSize button'));
    elsSrsSetup.sourceBtns = Array.from(document.querySelectorAll('#srsSetupSource button'));

    if (!elsSrsSetup.modal) return;

    elsSrsSetup.sizeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        state.srsSize = parseInt(btn.dataset.value, 10);
        updateSrsSetupUI();
      });
    });
    elsSrsSetup.sourceBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        state.srsSource = btn.dataset.value;
        updateSrsSetupUI();
      });
    });

    document.getElementById('srsSetupClose').addEventListener('click', closeSrsSetup);
    document.getElementById('srsSetupCancel').addEventListener('click', closeSrsSetup);
    document.getElementById('srsSetupBackdrop').addEventListener('click', closeSrsSetup);
    elsSrsSetup.startBtn.addEventListener('click', startSrsFromSetup);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !elsSrsSetup.modal.hidden) closeSrsSetup();
    });
  }

  function openSrsSetup() {
    if (!HP_SRS) return;
    const saved = HP_STORAGE.getSrsSettings ? HP_STORAGE.getSrsSettings() : { size: 20, source: 'level' };
    state.srsSize = saved.size;
    state.srsSource = saved.source;
    elsSrsSetup.modal.hidden = false;
    updateSrsSetupUI();
  }
  function closeSrsSetup() { if (elsSrsSetup.modal) elsSrsSetup.modal.hidden = true; }

  function updateSrsSetupUI() {
    if (!HP_SRS) return;
    elsSrsSetup.sizeBtns.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.value, 10) === state.srsSize);
    });
    elsSrsSetup.sourceBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === state.srsSource);
    });

    const candidates = getCandidates(state.srsSource);
    const size = state.srsSize === 0 ? candidates.length : state.srsSize;
    const actualSize = Math.min(size, candidates.length);

    const stats = HP_STORAGE.getSrsStats ? HP_STORAGE.getSrsStats(candidates) : { due: 0, fresh: 0 };

    if (candidates.length === 0) {
      elsSrsSetup.hint.textContent = 'Нет слов в этом источнике';
      elsSrsSetup.hint.classList.add('setup__hint--error');
      elsSrsSetup.startBtn.disabled = true;
      return;
    }

    const due = HP_STORAGE.getDueWords(candidates).length;
    const fresh = HP_STORAGE.getNewWords ? HP_STORAGE.getNewWords(candidates).length : 0;
    const queueSize = Math.min(actualSize, due + fresh);

    if (queueSize === 0) {
      elsSrsSetup.hint.innerHTML =
        `Просроченных: ${stats.due} · Новых: ${stats.fresh}. Все остальные повторятся позже.`;
      elsSrsSetup.hint.classList.remove('setup__hint--error');
      elsSrsSetup.startBtn.disabled = true;
      return;
    }

    elsSrsSetup.hint.innerHTML =
      `К повторению: <b>${due}</b> просроч. · <b>${fresh}</b> новых · будет карточек: <b>${queueSize}</b>`;
    elsSrsSetup.hint.classList.remove('setup__hint--error');
    elsSrsSetup.startBtn.disabled = false;
  }

  function startSrsFromSetup() {
    if (!HP_SRS) return;
    const candidates = getCandidates(state.srsSource);
    if (!candidates.length) return;
    if (HP_STORAGE.saveSrsSettings) HP_STORAGE.saveSrsSettings({ size: state.srsSize, source: state.srsSource });
    closeSrsSetup();
    stopActiveMode();
    try {
      document.getElementById('srsModal').hidden = false;
      HP_SRS.start(candidates, { size: state.srsSize });
    } catch (err) {
      console.error(err);
      HP_UI.setStatus(err.message, 'error');
    }
  }

  function cacheSrsModal() {
    if (!HP_SRS) return;
    const modal = document.getElementById('srsModal');
    if (!modal) return;
    try {
      HP_SRS.init({
        modal, backdrop: document.getElementById('srsBackdrop'),
        view: document.getElementById('srsView'),
        body: document.getElementById('srsBody'),
        close: document.getElementById('srsClose'),
        progress: document.getElementById('srsProgress'),
        bar: document.getElementById('srsBar'),
        card: document.getElementById('srsCard'),
        word: document.getElementById('srsWord'),
        pinyin: document.getElementById('srsPinyin'),
        translation: document.getElementById('srsTranslation'),
        level: document.getElementById('srsLevel'),
        reveal: document.getElementById('srsReveal'),
        revealBtn: document.getElementById('srsRevealBtn'),
        audioBtn: document.getElementById('srsAudioBtn'),
        ratings: document.getElementById('srsRatings'),
        result: document.getElementById('srsResult'),
        resultIcon: document.getElementById('srsResultIcon'),
        resultTitle: document.getElementById('srsResultTitle'),
        resultScore: document.getElementById('srsResultScore'),
        exitBtn: document.getElementById('srsExit'),
        restart: document.getElementById('srsRestart'),
      }, () => { modal.hidden = true; });
    } catch (err) {
      console.error('HP_SRS.init error:', err);
    }
  }

  function updateSrsBadge() {
    const badge = document.getElementById('srsBadge');
    if (!badge) return;
    const all = getAllWordsEverywhere();
    const due = HP_STORAGE.getDueWords(all).length;
    if (due > 0) {
      badge.textContent = due > 99 ? '99+' : String(due);
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  }

  document.addEventListener('hanzipath:srs-updated', () => {
    updateSrsBadge();
    renderCurrentWordList();
    HP_UI.updateProgress(getTotalWordCount());
  });

  /* ============================================================
     ПРОПИСИ
     ============================================================ */
  function cacheWorksheets() {
    if (!HP_WORKSHEETS) return;
    try {
      HP_WORKSHEETS.init({
        setupModal:    document.getElementById('wsSetupModal'),
        setupBackdrop: document.getElementById('wsSetupBackdrop'),
        close:         document.getElementById('wsSetupClose'),
        cancel:        document.getElementById('wsSetupCancel'),
        start:         document.getElementById('wsSetupStart'),
        hint:          document.getElementById('wsSetupHint'),
        countBtns:     Array.from(document.querySelectorAll('#wsSetupCount button')),
        cellsBtns:     Array.from(document.querySelectorAll('#wsSetupCells button')),
        gridBtns:      Array.from(document.querySelectorAll('#wsSetupGrid button')),
        sizeBtns:      Array.from(document.querySelectorAll('#wsSetupSize button')),
        sourceBtns:    Array.from(document.querySelectorAll('#wsSetupSource button')),
        modeBtns:      Array.from(document.querySelectorAll('#wsSetupMode button')),
        labelPinyin:      document.querySelector('#wsSetupLabels button[data-value="pinyin"]'),
        labelTranslation: document.querySelector('#wsSetupLabels button[data-value="translation"]'),
        labelColorMode:   document.querySelector('#wsSetupExtra button[data-value="color"]'),
        labelGhostMode:   document.querySelector('#wsSetupExtra button[data-value="ghost"]'),
        sheetModal:    document.getElementById('wsSheetModal'),
        sheetBackdrop: document.getElementById('wsSheetBackdrop'),
        sheetBack:     document.getElementById('wsSheetBack'),
        sheetPrint:    document.getElementById('wsSheetPrint'),
        sheet:         document.getElementById('wsSheet'),
      }, getCandidates);
    } catch (err) {
      console.error('HP_WORKSHEETS.init error:', err);
    }
  }

  /* ============================================================
     MCQ
     ============================================================ */
  const elsSetup = { modal: null, sizeBtns: [], sourceBtns: [], optCountBtns: [], hint: null, startBtn: null };

  function cacheSetup() {
    elsSetup.modal        = document.getElementById('mcqSetupModal');
    elsSetup.hint         = document.getElementById('setupHint');
    elsSetup.startBtn     = document.getElementById('setupStart');
    elsSetup.sizeBtns     = Array.from(document.querySelectorAll('#setupSize button'));
    elsSetup.sourceBtns   = Array.from(document.querySelectorAll('#setupSource button'));
    elsSetup.optCountBtns = Array.from(document.querySelectorAll('#setupOptionsCount button'));

    if (!elsSetup.modal) return;

    elsSetup.sizeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        state.mcqSize = parseInt(btn.dataset.value, 10);
        updateSetupUI();
      });
    });
    elsSetup.sourceBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        state.mcqSource = btn.dataset.value;
        updateSetupUI();
      });
    });
    elsSetup.optCountBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        state.mcqOptionsCount = parseInt(btn.dataset.value, 10);
        updateSetupUI();
      });
    });

    document.getElementById('mcqSetupClose').addEventListener('click', closeMcqSetup);
    document.getElementById('setupCancel').addEventListener('click', closeMcqSetup);
    document.getElementById('mcqSetupBackdrop').addEventListener('click', closeMcqSetup);
    elsSetup.startBtn.addEventListener('click', startMcqFromSetup);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !elsSetup.modal.hidden) closeMcqSetup();
    });
  }

  function openMcqSetup() {
    const saved = HP_STORAGE.getMcqSettings();
    state.mcqSize = saved.size;
    state.mcqOptionsCount = saved.optionsCount || 4;
    state.mcqSource = saved.source;
    elsSetup.modal.hidden = false;
    updateSetupUI();
  }
  function closeMcqSetup() { elsSetup.modal.hidden = true; }

  function updateSetupUI() {
    elsSetup.sizeBtns.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.value, 10) === state.mcqSize);
    });
    elsSetup.sourceBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === state.mcqSource);
    });
    elsSetup.optCountBtns.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.value, 10) === state.mcqOptionsCount);
    });

    const candidates = getCandidates(state.mcqSource);
    const size = state.mcqSize === 0 ? candidates.length : state.mcqSize;
    const actualSize = Math.min(size, candidates.length);
    const minWords = Math.max(4, state.mcqOptionsCount);

    if (state.mcqSource === 'current' && candidates.length < minWords) {
      const rest = minWords - candidates.length;
      elsSetup.hint.innerHTML = `Отмечено <i class="ri-star-line"></i> ${candidates.length}. Нужно ещё ${rest} — отметьте звёздочкой на карточках.`;
      elsSetup.hint.classList.add('setup__hint--error');
      elsSetup.startBtn.disabled = true;
      return;
    }
    if (candidates.length === 0) {
      elsSetup.hint.textContent = 'Нет подходящих слов для этого источника';
      elsSetup.hint.classList.add('setup__hint--error');
      elsSetup.startBtn.disabled = true;
    } else if (candidates.length < minWords) {
      elsSetup.hint.textContent = `Доступно всего ${candidates.length} — нужно минимум ${minWords}`;
      elsSetup.hint.classList.add('setup__hint--error');
      elsSetup.startBtn.disabled = true;
    } else {
      elsSetup.hint.textContent =
        `Будет задано вопросов: ${actualSize} (из ${candidates.length} доступных), по ${state.mcqOptionsCount} вариантов`;
      elsSetup.hint.classList.remove('setup__hint--error');
      elsSetup.startBtn.disabled = false;
    }
  }

  function startMcqFromSetup() {
    const candidates = getCandidates(state.mcqSource);
    const minWords = Math.max(4, state.mcqOptionsCount);
    if (candidates.length < minWords) return;

    HP_STORAGE.saveMcqSettings({
      size: state.mcqSize,
      source: state.mcqSource,
      optionsCount: state.mcqOptionsCount,
    });
    closeMcqSetup();
    stopActiveMode();
    try {
      HP_MCQ.start(candidates, {
        roundSize: state.mcqSize,
        optionsCount: state.mcqOptionsCount,
      });
    } catch (err) {
      console.error(err);
      HP_UI.setStatus(err.message, 'error');
    }
  }

  function practiceWords(wordList) {
    if (!wordList || wordList.length < 4) {
      HP_UI.setStatus('Нужно минимум 4 слова для тренировки', 'error');
      return;
    }
    stopActiveMode();
    try {
      HP_MCQ.start(wordList, { roundSize: wordList.length });
    } catch (err) {
      console.error(err);
      HP_UI.setStatus(err.message, 'error');
    }
  }

  /* ============================================================
     Диктант
     ============================================================ */
  const elsDictSetup = { modal: null, sizeBtns: [], sourceBtns: [], hint: null, startBtn: null };

  function cacheDictationSetup() {
    elsDictSetup.modal      = document.getElementById('dictationSetupModal');
    elsDictSetup.hint       = document.getElementById('dictationSetupHint');
    elsDictSetup.startBtn   = document.getElementById('dictationSetupStart');
    elsDictSetup.sizeBtns   = Array.from(document.querySelectorAll('#dictationSetupSize button'));
    elsDictSetup.sourceBtns = Array.from(document.querySelectorAll('#dictationSetupSource button'));

    if (!elsDictSetup.modal) return;

    elsDictSetup.sizeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        state.dictationSize = parseInt(btn.dataset.value, 10);
        updateDictationSetupUI();
      });
    });
    elsDictSetup.sourceBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        state.dictationSource = btn.dataset.value;
        updateDictationSetupUI();
      });
    });

    document.getElementById('dictationSetupClose').addEventListener('click', closeDictationSetup);
    document.getElementById('dictationSetupCancel').addEventListener('click', closeDictationSetup);
    document.getElementById('dictationSetupBackdrop').addEventListener('click', closeDictationSetup);
    elsDictSetup.startBtn.addEventListener('click', startDictationFromSetup);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !elsDictSetup.modal.hidden) closeDictationSetup();
    });
  }

  function openDictationSetup() {
    const saved = HP_STORAGE.getDictationSettings();
    state.dictationSize = saved.size;
    state.dictationSource = saved.source;
    elsDictSetup.modal.hidden = false;
    updateDictationSetupUI();
  }
  function closeDictationSetup() { elsDictSetup.modal.hidden = true; }

  function updateDictationSetupUI() {
    elsDictSetup.sizeBtns.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.value, 10) === state.dictationSize);
    });
    elsDictSetup.sourceBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === state.dictationSource);
    });

    const candidates = getCandidates(state.dictationSource);
    const size = state.dictationSize === 0 ? candidates.length : state.dictationSize;
    const actualSize = Math.min(size, candidates.length);

    if (state.dictationSource === 'current' && candidates.length === 0) {
      elsDictSetup.hint.innerHTML = `Отмечено <i class="ri-star-line"></i> 0. Отметьте слова звёздочкой на карточках.`;
      elsDictSetup.hint.classList.add('setup__hint--error');
      elsDictSetup.startBtn.disabled = true;
      return;
    }
    if (candidates.length === 0) {
      elsDictSetup.hint.textContent = 'Нет подходящих слов для этого источника';
      elsDictSetup.hint.classList.add('setup__hint--error');
      elsDictSetup.startBtn.disabled = true;
    } else if (candidates.length < 4) {
      elsDictSetup.hint.textContent = `Доступно всего ${candidates.length} — нужно минимум 4`;
      elsDictSetup.hint.classList.add('setup__hint--error');
      elsDictSetup.startBtn.disabled = true;
    } else {
      elsDictSetup.hint.textContent = `Будет задано слов: ${actualSize} (из ${candidates.length} доступных)`;
      elsDictSetup.hint.classList.remove('setup__hint--error');
      elsDictSetup.startBtn.disabled = false;
    }
  }

  function startDictationFromSetup() {
    const candidates = getCandidates(state.dictationSource);
    if (candidates.length < 4) return;
    HP_STORAGE.saveDictationSettings({ size: state.dictationSize, source: state.dictationSource });
    closeDictationSetup();
    stopActiveMode();
    try {
      document.getElementById('dictationModal').hidden = false;
      HP_DICTATION.start(candidates, { roundSize: state.dictationSize });
    } catch (err) {
      console.error(err);
      HP_UI.setStatus(err.message, 'error');
    }
  }

  /* ============================================================
     Предложения
     ============================================================ */
  const SENT_EXAMPLES = [
    '我是学生。', '我不是老师。', '你是中国人吗？', '我喝茶。',
    '他看电影。', '我很好。', '她很高兴！', '我没有书。', '我不喝茶。',
  ];

  const elsSent = { modal: null, input: null, example: null, rules: null, clear: null, check: null,
    result: null, resultIcon: null, resultStatus: null, resultRule: null, resultExplain: null,
    resultRuleLink: null, resultExamples: null, speak: null, keyboard: null,
    vkPanel: null, vkComposeText: null, vkComposeCaret: null,
    vkCandidates: null, vkKeyboard: null, vkClose: null };

  const elsRules = { modal: null, backdrop: null, close: null, list: null, count: null };

  let sentIme = null;

  function hideSentenceResult() {
    elsSent.result.hidden = true;
    elsSent.result.classList.remove('sent__result--ok', 'sent__result--err', 'sent__result--warning', 'sent__result--partial');
  }

  function renderRulesList(highlightId) {
    const list = elsRules.list;
    list.innerHTML = '';
    const rules = HP_SENTENCES.getRules();

    rules.forEach(r => {
      const card = document.createElement('div');
      card.className = 'rule-card';
      if (highlightId && r.id === highlightId) card.classList.add('rule-card--highlight');
      card.dataset.ruleId = r.id;

      const exHtml = (r.examples || []).map(ex => `
        <div class="rule-example ${ex.ok ? 'rule-example--ok' : 'rule-example--err'}">
          <i class="${ex.ok ? 'ri-check-line' : 'ri-close-line'} rule-example__sign"></i>
          <span class="rule-example__text">${ex.text}</span>
          ${ex.note ? `<span class="rule-example__note">${ex.note}</span>` : ''}
        </div>
      `).join('');

      card.innerHTML = `
        <div class="rule-card__head">
          <div class="rule-card__num">${r.n}</div>
          <div class="rule-card__title">${r.title}</div>
        </div>
        <div class="rule-card__summary">${r.summary}</div>
        <div class="rule-card__structure">${r.structure}</div>
        <div class="rule-card__explain">${r.explain}</div>
        <div class="rule-card__examples">${exHtml}</div>
      `;
      list.appendChild(card);
    });

    if (elsRules.count) elsRules.count.textContent = rules.length;
  }

  function openRulesModal(highlightId) {
    renderRulesList(highlightId);
    elsRules.modal.hidden = false;
    if (highlightId) {
      setTimeout(() => {
        const card = elsRules.list.querySelector(`[data-rule-id="${highlightId}"]`);
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
  }
  function closeRulesModal() { elsRules.modal.hidden = true; }

  function cacheRulesModal() {
    elsRules.modal    = document.getElementById('rulesModal');
    elsRules.backdrop = document.getElementById('rulesBackdrop');
    elsRules.close    = document.getElementById('rulesClose');
    elsRules.list     = document.getElementById('rulesList');
    elsRules.count    = document.getElementById('rulesCount');

    if (!elsRules.modal) return;

    elsRules.close.addEventListener('click', closeRulesModal);
    elsRules.backdrop.addEventListener('click', closeRulesModal);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !elsRules.modal.hidden) closeRulesModal();
    });
  }

  function cacheSentenceModal() {
    elsSent.modal          = document.getElementById('sentenceModal');
    elsSent.input          = document.getElementById('sentInput');
    elsSent.example        = document.getElementById('sentExample');
    elsSent.rules          = document.getElementById('sentRules');
    elsSent.clear          = document.getElementById('sentClear');
    elsSent.check          = document.getElementById('sentCheck');
    elsSent.result         = document.getElementById('sentResult');
    elsSent.resultIcon     = document.getElementById('sentResultIcon');
    elsSent.resultStatus   = document.getElementById('sentResultStatus');
    elsSent.resultRule     = document.getElementById('sentResultRule');
    elsSent.resultExplain  = document.getElementById('sentResultExplain');
    elsSent.resultRuleLink = document.getElementById('sentResultRuleLink');
    elsSent.resultExamples = document.getElementById('sentResultExamples');
    elsSent.speak          = document.getElementById('sentSpeak');
    elsSent.keyboard       = document.getElementById('sentKeyboard');
    elsSent.vkPanel        = document.getElementById('vkPanel');
    elsSent.vkComposeText  = document.getElementById('vkComposeText');
    elsSent.vkComposeCaret = document.getElementById('vkComposeCaret');
    elsSent.vkCandidates   = document.getElementById('vkCandidates');
    elsSent.vkKeyboard     = document.getElementById('vkKeyboard');
    elsSent.vkClose        = document.getElementById('vkClose');

    if (!elsSent.modal) return;

    document.getElementById('sentenceClose').addEventListener('click', closeSentenceModal);
    document.getElementById('sentenceBackdrop').addEventListener('click', closeSentenceModal);

    elsSent.example.addEventListener('click', () => {
      const ex = SENT_EXAMPLES[Math.floor(Math.random() * SENT_EXAMPLES.length)];
      elsSent.input.value = ex;
      elsSent.input.focus();
      hideSentenceResult();
    });
    elsSent.rules.addEventListener('click', () => openRulesModal(null));
    elsSent.clear.addEventListener('click', () => {
      elsSent.input.value = '';
      elsSent.input.focus();
      hideSentenceResult();
    });
    elsSent.check.addEventListener('click', checkSentence);
    elsSent.speak.addEventListener('click', () => {
      const text = elsSent.input.value.trim();
      if (text && HP_AUDIO.isSupported()) HP_AUDIO.speak(text.replace(/[。！？.!?]/g, ''));
    });

    elsSent.resultRuleLink.addEventListener('click', () => {
      const id = elsSent.resultRuleLink.dataset.ruleId;
      if (id) openRulesModal(id);
    });

    sentIme = HP_IME.attach({
      panel:        elsSent.vkPanel,
      composeText:  elsSent.vkComposeText,
      composeCaret: elsSent.vkComposeCaret,
      candidates:   elsSent.vkCandidates,
      keyboard:     elsSent.vkKeyboard,
      closeBtn:     elsSent.vkClose,
      input:        elsSent.input,
      toggleBtn:    elsSent.keyboard,
    });

    elsSent.input.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        checkSentence();
        return;
      }
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        if (sentIme && sentIme.isTyping()) return;
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !elsSent.modal.hidden) {
        if (sentIme && sentIme.isOpen()) sentIme.close();
        else closeSentenceModal();
      }
    });
  }

  function openSentenceModal() {
    elsSent.modal.hidden = false;
    setTimeout(() => elsSent.input.focus(), 60);
  }
  function closeSentenceModal() {
    elsSent.modal.hidden = true;
    if (sentIme && sentIme.isOpen()) sentIme.close();
  }

  function checkSentence() {
    const text = elsSent.input.value.trim();
    const result = HP_SENTENCES.checkText(text);

    elsSent.result.hidden = false;
    elsSent.result.classList.remove('sent__result--ok', 'sent__result--err', 'sent__result--warning', 'sent__result--partial');

    if (!result.ok) {
      elsSent.result.classList.add('sent__result--err');
      elsSent.resultIcon.className = 'ri-close-circle-fill';
      elsSent.resultStatus.textContent = result.hint || 'Ошибка';
    } else if (result.warning) {
      elsSent.result.classList.add('sent__result--warning');
      elsSent.resultIcon.className = 'ri-alert-line';
      elsSent.resultStatus.textContent = '⚠ ' + (result.hint || 'Возможное замечание');
    } else if (result.partial) {
      elsSent.result.classList.add('sent__result--partial');
      elsSent.resultIcon.className = 'ri-information-line';
      elsSent.resultStatus.textContent = 'ℹ ' + (result.hint || 'Базовый разбор');
    } else {
      elsSent.result.classList.add('sent__result--ok');
      elsSent.resultIcon.className = 'ri-checkbox-circle-fill';
      elsSent.resultStatus.textContent = result.hint || 'Верно!';
    }

    elsSent.resultRule.textContent = result.rule || '';
    if (elsSent.resultExplain) elsSent.resultExplain.textContent = result.explain || '';

    if (elsSent.resultRuleLink) {
      if (!result.ok && result.ruleId) {
        elsSent.resultRuleLink.hidden = false;
        elsSent.resultRuleLink.dataset.ruleId = result.ruleId;
      } else if (result.warning) {
        elsSent.resultRuleLink.hidden = false;
        elsSent.resultRuleLink.dataset.ruleId = result.warning;
      } else {
        elsSent.resultRuleLink.hidden = true;
        elsSent.resultRuleLink.dataset.ruleId = '';
      }
    }

    elsSent.resultExamples.innerHTML = '';
    (result.examples || []).forEach(ex => {
      const li = document.createElement('div');
      li.className = 'sent__example';
      li.textContent = ex;
      elsSent.resultExamples.appendChild(li);
    });

    elsSent.speak.style.display = (result.ok && !result.partial && !result.warning) ? '' : 'none';
  }

  /* ============================================================
     Пропуски и Диктант модалки
     ============================================================ */
  function cacheClozeModal() {
    const clozeView = document.getElementById('clozeView');
    if (!clozeView) return;
    try {
      HP_CLOZE.init({
        view: clozeView,
        body: document.getElementById('clozeBody'),
        progress: document.getElementById('clozeProgress'),
        bar: document.getElementById('clozeBar'),
        sentence: document.getElementById('clozeSentence'),
        translation: document.getElementById('clozeTranslation'),
        options: document.getElementById('clozeOptions'),
        status: document.getElementById('clozeStatus'),
        close: document.getElementById('clozeClose'),
        result: document.getElementById('clozeResult'),
        resultIcon: document.getElementById('clozeResultIcon'),
        resultTitle: document.getElementById('clozeResultTitle'),
        resultScore: document.getElementById('clozeResultScore'),
        exitBtn: document.getElementById('clozeExit'),
        restart: document.getElementById('clozeRestart'),
        tools: document.getElementById('clozeTools'),
        hintBtn: document.getElementById('clozeHintBtn'),
        hintPanel: document.getElementById('clozeHintPanel'),
      }, () => { document.getElementById('clozeModal').hidden = true; });
    } catch (err) { console.error('HP_CLOZE.init error:', err); }

    document.getElementById('clozeBackdrop').addEventListener('click', () => {
      document.getElementById('clozeModal').hidden = true;
      HP_CLOZE.exit();
    });

    document.getElementById('btn-cloze').addEventListener('click', () => {
      document.getElementById('clozeModal').hidden = false;
      const words = state.searchQuery.trim() ? state.words : state.allWords;
      HP_CLOZE.start(words);
    });
  }

  function cacheDictationModal() {
    const dictView = document.getElementById('dictationView');
    if (!dictView) return;
    try {
      HP_DICTATION.init({
        view: dictView,
        body: document.getElementById('dictationBody'),
        progress: document.getElementById('dictationProgress'),
        bar: document.getElementById('dictationBar'),
        translation: document.getElementById('dictationTranslation'),
        input: document.getElementById('dictationInput'),
        check: document.getElementById('dictationCheck'),
        replay: document.getElementById('dictationReplay'),
        status: document.getElementById('dictationStatus'),
        close: document.getElementById('dictationClose'),
        result: document.getElementById('dictationResult'),
        resultIcon: document.getElementById('dictationResultIcon'),
        resultTitle: document.getElementById('dictationResultTitle'),
        resultScore: document.getElementById('dictationResultScore'),
        exitBtn: document.getElementById('dictationExit'),
        restart: document.getElementById('dictationRestart'),
        keyboard: document.getElementById('dictationKeyboard'),
        vkPanel: document.getElementById('dictationVkPanel'),
        vkComposeText: document.getElementById('dictationVkComposeText'),
        vkComposeCaret: document.getElementById('dictationVkComposeCaret'),
        vkCandidates: document.getElementById('dictationVkCandidates'),
        vkKeyboard: document.getElementById('dictationVkKeyboard'),
        vkClose: document.getElementById('dictationVkClose'),
        dontKnow: document.getElementById('dictationDontKnow'),
        skip: document.getElementById('dictationSkip'),
        pinyinHint: document.getElementById('dictationPinyinHint'),
        pinyinToggle: document.getElementById('dictationPinyinToggle'),
        translationBtn: document.getElementById('dictationTranslate'),
        speakExampleBtn: document.getElementById('dictationSpeakExample'),
        hintBtn: document.getElementById('dictationHint'),
        hintPanel: document.getElementById('dictationHintPanel'),
      }, () => { document.getElementById('dictationModal').hidden = true; });
    } catch (err) { console.error('HP_DICTATION.init error:', err); }

    document.getElementById('dictationBackdrop').addEventListener('click', () => {
      document.getElementById('dictationModal').hidden = true;
      HP_DICTATION.exit();
    });
  }

  function cacheLearnModal() {
    const lm = document.getElementById('learnModal');
    if (!lm) return;
    try {
      HP_LEARN.init({
        modal: lm,
        backdrop: document.getElementById('learnBackdrop'),
        close: document.getElementById('learnClose'),
        chars: document.getElementById('learnChars'),
        pinyin: document.getElementById('learnPinyin'),
        translation: document.getElementById('learnTranslation'),
        btnPlay: document.getElementById('learnPlay'),
        btnNext: document.getElementById('learnNext'),
        btnReset: document.getElementById('learnReset'),
        btnAudio: document.getElementById('learnAudio'),
      }, () => {});
    } catch (err) { console.error('HP_LEARN.init error:', err); }
  }

  /* ============================================================
     Пользовательские слова
     ============================================================ */
  function openAddModal() {
    HP_UI.openModal({
      title: 'Добавить слово',
      onSubmit: ({ word, pinyin, translation, examples }) => {
        if (HP_STORAGE.customWordExists(word)) throw new Error('Такое слово уже есть в «Моих словах»');
        const pinyinConverted = pinyin && HP_PINYIN.hasToneNumbers(pinyin) ? HP_PINYIN.convert(pinyin) : pinyin;
        HP_STORAGE.saveCustomWord({
          word,
          pinyin: pinyinConverted,
          translation,
          examples: examples || [],
        });
        HP_UI.setStatus(`Слово «${word}» добавлено`, 'success');
        if (state.level !== 'custom') state.level = 'custom';
        resetSearch();
        const list = HP_STORAGE.getCustomWords();
        const newIndex = list.findIndex(w => w.word === word);
        state.currentIndex = newIndex >= 0 ? newIndex : 0;
        renderEverything({ resetSelection: false });
      },
    });
  }

  function handleEdit(wordItem) {
    const firstEx = (wordItem.examples && wordItem.examples[0]) || {};
    HP_UI.openModal({
      title: 'Редактировать слово',
      word: wordItem.word,
      pinyin: wordItem.pinyin,
      translation: wordItem.translation,
      exampleZh: firstEx.zh || '',
      examplePinyin: firstEx.pinyin || '',
      exampleRu: firstEx.ru || '',
      onSubmit: ({ word, pinyin, translation, examples }) => {
        const pinyinConverted = pinyin && HP_PINYIN.hasToneNumbers(pinyin) ? HP_PINYIN.convert(pinyin) : pinyin;
        HP_STORAGE.saveCustomWord({
          id: wordItem.id,
          word,
          pinyin: pinyinConverted,
          translation,
          examples: examples || wordItem.examples || [],
        });
        HP_UI.setStatus(`Слово «${word}» обновлено`, 'success');
        renderEverything({ resetSelection: false });
      },
    });
  }

  function handleDelete(wordItem) {
    if (!confirm(`Удалить слово «${wordItem.word}»?`)) return;
    HP_STORAGE.deleteCustomWord(wordItem.id);
    HP_UI.setStatus(`Слово «${wordItem.word}» удалено`, 'success');
    const list = HP_STORAGE.getCustomWords();
    if (state.currentIndex >= list.length) state.currentIndex = Math.max(0, list.length - 1);
    renderEverything({ resetSelection: false });
  }

  function handleExport() {
    const json = HP_STORAGE.exportCustomWords();
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hanzipath-words-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    HP_UI.setStatus('Файл со словами скачан', 'success');
  }

  /**
   * Импорт JSON. Поддерживает:
   *   1) Массив слов           → новый пользовательский раздел «Импорт <дата>»
   *   2) { section, words }    → новый пользовательский раздел с заданным именем
   */
  function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const raw = String(reader.result);
        let parsed;
        try { parsed = JSON.parse(raw); }
        catch (err) {
          HP_UI.setStatus('Ошибка импорта: ' + err.message, 'error');
          return;
        }

        // Вариант 1: { section, words: [...] }
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.words)) {
          const label = String(parsed.section || 'Импорт ' + new Date().toLocaleDateString()).slice(0, 60);
          try {
            const saved = HP_STORAGE.saveUserSection({ label, words: parsed.words });
            HP_WORDS_BY_LEVEL[saved.id] = saved.words.map(w => ({ ...w }));
            state.level = saved.id;
            state.currentIndex = 0;
            resetSearch();
            HP_UI.setStatus(`Раздел «${label}» добавлен (${saved.words.length} слов)`, 'success');
            renderEverything();
          } catch (err) {
            HP_UI.setStatus('Ошибка: ' + err.message, 'error');
          }
          return;
        }

        // Вариант 2: массив — в раздел «Импорт <дата>»
        if (Array.isArray(parsed)) {
          const label = 'Импорт ' + new Date().toLocaleDateString();
          try {
            const saved = HP_STORAGE.saveUserSection({ label, words: parsed });
            HP_WORDS_BY_LEVEL[saved.id] = saved.words.map(w => ({ ...w }));
            state.level = saved.id;
            state.currentIndex = 0;
            resetSearch();
            HP_UI.setStatus(`Раздел «${label}» добавлен (${saved.words.length} слов)`, 'success');
            renderEverything();
          } catch (err) {
            HP_UI.setStatus('Ошибка: ' + err.message, 'error');
          }
          return;
        }

        HP_UI.setStatus('Неизвестный формат JSON — ожидался массив или { section, words }', 'error');
      };
      reader.readAsText(file, 'utf-8');
    });
    input.click();
  }

  function handleDownloadTemplate() {
    const template = [
      {
        _readme: 'HanziPath — шаблон для импорта своих слов',
        _instructions: [
          '1) Отредактируйте примеры ниже или добавьте свои слова.',
          '2) Сохраните файл в кодировке UTF-8.',
          '3) В приложении: раздел «Мои слова» → кнопка «Импорт» → выберите этот файл.',
          'Обязательные поля: word, translation.',
          'Опциональные: pinyin (с тонами), examples (массив предложений).',
          'Записи с _readme, _comment, _schema — будут проигнорированы при импорте.',
        ],
        _schema: {
          word: 'китайские иероглифы (обязательно)',
          pinyin: 'пиньинь с тонами, например: bāo zi (опционально)',
          translation: 'перевод на русский (обязательно)',
          examples: [
            {
              zh: 'предложение на китайском',
              pinyin: 'его пиньинь',
              ru: 'перевод на русский',
            },
          ],
        },
      },
      {
        _comment: 'Пример 1: минимальное слово — только иероглиф и перевод',
        word: '水饺',
        pinyin: 'shuǐ jiǎo',
        translation: 'пельмени (варёные)',
      },
      {
        _comment: 'Пример 2: слово без примеров-предложений',
        word: '豆浆',
        pinyin: 'dòu jiāng',
        translation: 'соевое молоко',
      },
      {
        _comment: 'Пример 3: слово с двумя примерами в разных контекстах',
        word: '包子',
        pinyin: 'bāo zi',
        translation: 'баоцзы (паровые пирожки)',
        examples: [
          {
            zh: '我早上吃包子。',
            pinyin: 'wǒ zǎo shang chī bāo zi',
            ru: 'утром я ем баоцзы',
          },
          {
            zh: '这家店的包子很好吃。',
            pinyin: 'zhè jiā diàn de bāo zi hěn hǎo chī',
            ru: 'баоцзы в этом ресторане очень вкусные',
          },
        ],
      },
      {
        _comment: 'Пример 4: глагол с примерами',
        word: '拿',
        pinyin: 'ná',
        translation: 'брать (руками)',
        examples: [
          {
            zh: '请把书拿来。',
            pinyin: 'qǐng bǎ shū ná lái',
            ru: 'принесите, пожалуйста, книгу',
          },
          {
            zh: '他手里拿着手机。',
            pinyin: 'tā shǒu lǐ ná zhe shǒu jī',
            ru: 'он держит в руках телефон',
          },
        ],
      },
    ];

    const json = JSON.stringify(template, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hanzipath-template.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    HP_UI.setStatus('Шаблон скачан. Отредактируйте его и загрузите через «Импорт»', 'success');
  }

  const elsImportHelp = { modal: null, backdrop: null, close: null, close2: null, download: null };

  function cacheImportHelp() {
    elsImportHelp.modal    = document.getElementById('importHelpModal');
    elsImportHelp.backdrop = document.getElementById('importHelpBackdrop');
    elsImportHelp.close    = document.getElementById('importHelpClose');
    elsImportHelp.close2   = document.getElementById('importHelpClose2');
    elsImportHelp.download = document.getElementById('importHelpDownload');

    if (!elsImportHelp.modal) return;

    elsImportHelp.close.addEventListener('click', closeImportHelp);
    elsImportHelp.close2.addEventListener('click', closeImportHelp);
    elsImportHelp.backdrop.addEventListener('click', closeImportHelp);
    elsImportHelp.download.addEventListener('click', handleDownloadTemplate);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !elsImportHelp.modal.hidden) closeImportHelp();
    });
  }

  function openImportHelp() {
    if (elsImportHelp.modal) elsImportHelp.modal.hidden = false;
  }
  function closeImportHelp() {
    if (elsImportHelp.modal) elsImportHelp.modal.hidden = true;
  }

  /* ============================================================
     Resize
     ============================================================ */
  let resizeTimer = null;
  function handleResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (HP_MCQ.isActive() || HP_DICTATION.isActive() || HP_CLOZE.isActive() || srsIsActive() || wsIsActive()) return;
      if (state.writeSession || state.memorySession) return;
      if (!state.writers.length) return;
      const newSize = HP_WRITER.pickSize();
      if (newSize === state.lastSize) return;
      const els = HP_UI.els();
      const word = state.words[state.currentIndex]?.word;
      if (!word) return;
      stopActiveMode();
      try {
        state.writers = HP_WRITER.create(els.chars, word);
        state.lastSize = newSize;
        showOutlineAll();
        HP_UI.setStatus('Размер адаптирован под экран');
      } catch (err) { console.error(err); }
    }, 250);
  }
  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleResize);

  /* ============================================================
     Инициализация
     ============================================================ */
  function init() {
    HP_THEME.init();
    updateThemeIcon(HP_THEME.get());

    HP_UI.init();
    HP_UI.setListHandlers({ onEdit: handleEdit, onDelete: handleDelete });

    HP_MCQ.init({
      view: document.getElementById('mcqView'),
      wordView: document.getElementById('wordView'),
      listSection: document.getElementById('listSection'),
      progress: document.getElementById('mcqProgress'),
      barFill: document.getElementById('mcqBarFill'),
      hint: document.getElementById('mcqHint'),
      question: document.getElementById('mcqQuestion'),
      options: document.getElementById('mcqOptions'),
      status: document.getElementById('mcqStatus'),
      mcqBody: document.querySelector('.mcq'),
      result: document.getElementById('mcqResult'),
      resultIcon: document.getElementById('mcqResultIcon'),
      resultTitle: document.getElementById('mcqResultTitle'),
      resultScore: document.getElementById('mcqResultScore'),
      resultMessage: document.getElementById('mcqResultMessage'),
      closeBtn: document.getElementById('mcqClose'),
      exitBtn: document.getElementById('mcqExit'),
      restartBtn: document.getElementById('mcqRestart'),
      tools: document.getElementById('mcqTools'),
      audioBtn: document.getElementById('mcqAudio'),
      pinyinBtn: document.getElementById('mcqPinyin'),
      translationBtn: document.getElementById('mcqTranslation'),
      hintBtn: document.getElementById('mcqHint2'),
      hintPanel: document.getElementById('mcqHintPanel'),
    }, () => {
      if (state.words.length) {
        const els = HP_UI.els();
        const w = state.words[state.currentIndex];
        if (w) {
          try {
            state.writers = HP_WRITER.create(els.chars, w.word);
            showOutlineAll();
          } catch (err) { console.error(err); }
        }
      }
    });

    HP_MCQ.onFinishCallback = () => {
      HP_UI.updateProgress(getTotalWordCount());
      renderCurrentWordList();
      updateSrsBadge();
    };

    HP_STATS.init({
      onPracticeWeak: (words) => practiceWords(words),
      onPracticeDue:  (words) => practiceWords(words),
      onResetStats: () => {
        HP_UI.updateProgress(getTotalWordCount());
        renderCurrentWordList();
        updateSrsBadge();
        HP_UI.setStatus('Статистика сброшена', 'success');
      },
    });

    const safe = (fn, name) => {
      try { fn(); }
      catch (err) { console.error(`Ошибка инициализации «${name}»:`, err); }
    };

    safe(cacheSetup,              'mcq');
    safe(cacheDictationSetup,     'dictation-setup');
    safe(cacheWriteSetup,         'write-setup');
    safe(cacheMemorySetup,        'memory-setup');
    safe(cacheSrsSetup,           'srs-setup');
    safe(cacheSrsModal,           'srs-modal');
    safe(cacheRulesModal,         'rules');
    safe(cacheSentenceModal,      'sentences');
    safe(cacheClozeModal,         'cloze');
    safe(cacheDictationModal,     'dictation');
    safe(cacheLearnModal,         'learn');
    safe(cacheWorksheets,         'worksheets');
    safe(cacheImportHelp,         'import-help');

    const btnAnimate = document.getElementById('btn-animate');
    if (btnAnimate) btnAnimate.addEventListener('click', () => {
      const w = state.words[state.currentIndex];
      if (w) HP_LEARN.open(w);
    });

    const bind = (id, handler) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', handler);
    };

    bind('btn-quiz',        openWriteSetup);
    bind('btn-quiz-memory', openMemorySetup);
    bind('btn-trace',       handleTrace);
    bind('btn-audio',       handleAudio);
    bind('btn-srs',         srsOpen);
    bind('btn-mcq',         openMcqSetup);
    bind('btn-dictation',   openDictationSetup);
    bind('btn-sentences',   openSentenceModal);
    bind('btn-worksheets',  wsOpen);
    bind('btn-stats',       () => HP_STATS.open());
    bind('btn-prev',        handlePrev);
    bind('btn-next',        handleNext);

    HP_UI.els().themeToggle.addEventListener('click', handleThemeToggle);
    HP_UI.els().searchInput.addEventListener('input', handleSearchInput);
    HP_UI.els().searchClear.addEventListener('click', handleSearchClear);

    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea, select')) return;
      if (!document.getElementById('modal').hidden) return;
      if (elsSetup.modal && !elsSetup.modal.hidden) return;
      if (elsDictSetup.modal && !elsDictSetup.modal.hidden) return;
      if (elsWriteSetup.modal && !elsWriteSetup.modal.hidden) return;
      if (elsMemorySetup.modal && !elsMemorySetup.modal.hidden) return;
      if (elsSrsSetup.modal && !elsSrsSetup.modal.hidden) return;
      if (elsSent.modal && !elsSent.modal.hidden) return;
      if (elsRules.modal && !elsRules.modal.hidden) return;
      if (elsImportHelp.modal && !elsImportHelp.modal.hidden) return;

      const wsSetup = document.getElementById('wsSetupModal');
      const wsSheet = document.getElementById('wsSheetModal');
      if (wsSetup && !wsSetup.hidden) return;
      if (wsSheet && !wsSheet.hidden) return;

      if (HP_MCQ.isActive()) {
        if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
          const btns = document.querySelectorAll('.mcq__option');
          const idx = parseInt(e.key, 10) - 1;
          if (btns[idx] && !btns[idx].disabled) btns[idx].click();
        }
        if (e.key === 'Escape') HP_MCQ.exit();
        return;
      }
      if (srsIsActive()) return;
      if (e.key === 'ArrowRight')           handleNext();
      if (e.key === 'ArrowLeft')            handlePrev();
      if (e.key === 'q' || e.key === 'Q')   openWriteSetup();
      if (e.key === 'm' || e.key === 'M')   openMemorySetup();
      if (e.key === 't' || e.key === 'T')   handleTrace();
      if (e.key === 's' || e.key === 'S')   handleAudio();
      if (e.key === 'r' || e.key === 'R')   srsOpen();
      if (e.key === 'w' || e.key === 'W')   wsOpen();
      if (e.key === 'c' || e.key === 'C')   openMcqSetup();
      if (e.key === 'd' || e.key === 'D')   openDictationSetup();
      if (e.key === 'p' || e.key === 'P')   openSentenceModal();
      if (e.key === 'f' || e.key === 'F')   toggleStarCurrent();
      if (e.key === 'a' || e.key === 'A') {
        const w = state.words[state.currentIndex];
        if (w) HP_LEARN.open(w);
      }
    });

    // Загружаем пользовательские разделы до отрисовки
    injectUserSections();
    renderEverything();
  }

  init();

  window.HanziPath = {
    resetProgress() {
      HP_STORAGE.reset();
      renderCurrentWordList();
      HP_UI.updateProgress(getTotalWordCount());
      updateSrsBadge();
      HP_UI.setStatus('Прогресс сброшен');
    },
    state,
    storage: HP_STORAGE,
    theme: HP_THEME,
    stats: HP_STATS,
    sentences: HP_SENTENCES,
  };

  console.info('HanziPath запущен.');
})();