/**
 * Хранилище:
 *   - прогресс по словам (localStorage) + SRS-интервалы
 *   - пользовательские слова: CRUD + импорт/экспорт (с примерами)
 *   - серия дней активности
 *   - настройки проверки, диктанта, сессии «Писать» и «Повторение»
 *   - «Изучаю сейчас» (звёздочки)
 *   - сброс прогресса / статистики
 *   - экспорт / импорт ВСЕГО прогресса (не только своих слов)
 *   - пользовательские разделы слов (user sections)
 */
window.HP_STORAGE = (function () {
  const PROGRESS_KEY  = window.HP_CONFIG.storageKey;
  const CUSTOM_KEY    = 'hanzipath.custom.v1';
  const ACTIVITY_KEY  = 'hanzipath.activity.v1';
  const STREAK_KEY    = 'hanzipath.streak.v1';
  const MCQ_SETTINGS_KEY   = 'hanzipath.mcq.v1';
  const DICT_SETTINGS_KEY  = 'hanzipath.dictation.v1';
  const WRITE_SETTINGS_KEY = 'hanzipath.write.v1';
  const SRS_SETTINGS_KEY   = 'hanzipath.srs.v1';
  const STARRED_KEY        = 'hanzipath.starred.v1';
  const SECTIONS_KEY       = 'hanzipath.sections.v1';

  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  const LEARNED_CORRECT_THRESHOLD = 5;
  const LEARNED_WRONG_LIMIT       = 2;

  const SRS_INTERVALS_MS = [
    0,
    10 * 60 * 1000,
    24 * 60 * 60 * 1000,
    3 * MS_PER_DAY,
    7 * MS_PER_DAY,
    16 * MS_PER_DAY,
    35 * MS_PER_DAY,
    90 * MS_PER_DAY,
    180 * MS_PER_DAY,
  ];
  const SRS_MAX_LEVEL = SRS_INTERVALS_MS.length - 1;

  /* ID встроенных разделов. Их удалять нельзя. */
  const PROTECTED_LEVEL_IDS = new Set([
    'hsk1', 'hsk2', 'hsk3', 'hsk4', 'hsk5', 'hsk6',
    'starred', 'weak', 'due', 'custom',
  ]);

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { /* приватный режим */ }
  }

  function todayKey(ts = Date.now()) {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function normalizeExamples(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(ex => ex && typeof ex.zh === 'string' && ex.zh.trim())
      .map(ex => ({
        zh: ex.zh.trim(),
        pinyin: String(ex.pinyin || '').trim(),
        ru: String(ex.ru || '').trim(),
      }));
  }

  function normalizeWord(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const word = String(raw.word || '').trim();
    const translation = String(raw.translation || '').trim();
    if (!word || !translation) return null;
    return {
      word,
      pinyin: String(raw.pinyin || '').trim(),
      translation,
      examples: normalizeExamples(raw.examples),
    };
  }

  function readProgress()   { return readJSON(PROGRESS_KEY, {}); }
  function writeProgress(d) { writeJSON(PROGRESS_KEY, d); }

  function getEntry(map, word) {
    return map[word] || {
      learned: false,
      mistakes: 0,
      correctCount: 0,
      wrongCount: 0,
      srsLevel: 0,
      nextReviewAt: 0,
      lastSeenAt: 0,
    };
  }

  function maybeMarkLearned(entry) {
    if (!entry.learned &&
        entry.correctCount >= LEARNED_CORRECT_THRESHOLD &&
        entry.wrongCount <= LEARNED_WRONG_LIMIT) {
      entry.learned = true;
    }
  }

  function recordAnswer(word, correct, markLearned = false) {
    const map = readProgress();
    const e = getEntry(map, word);
    const now = Date.now();

    if (correct) e.correctCount++;
    else         e.wrongCount++;

    if (correct) {
      e.srsLevel = Math.min(e.srsLevel + 1, SRS_MAX_LEVEL);
    } else {
      e.srsLevel = 0;
    }

    const interval = SRS_INTERVALS_MS[e.srsLevel] || 0;
    e.nextReviewAt = now + interval;
    e.lastSeenAt = now;

    maybeMarkLearned(e);

    map[word] = e;
    writeProgress(map);
    recordActivity();
    return e;
  }

  function recordReview(word, rating) {
    const map = readProgress();
    const e = getEntry(map, word);
    const now = Date.now();

    const oldLevel = e.srsLevel || 0;
    let newLevel = oldLevel;
    let factor = 1;

    if (rating === 0) {
      newLevel = 0;
      e.wrongCount++;
      e.nextReviewAt = now + SRS_INTERVALS_MS[1];
    } else if (rating === 1) {
      newLevel = Math.max(1, oldLevel);
      factor = 0.6;
      e.correctCount++;
    } else if (rating === 2) {
      newLevel = Math.min(oldLevel + 1, SRS_MAX_LEVEL);
      e.correctCount++;
    } else if (rating === 3) {
      newLevel = Math.min(oldLevel + 2, SRS_MAX_LEVEL);
      e.correctCount++;
    }

    if (rating > 0) {
      e.nextReviewAt = now + Math.round((SRS_INTERVALS_MS[newLevel] || 0) * factor);
    }

    e.srsLevel = newLevel;
    e.lastSeenAt = now;

    maybeMarkLearned(e);

    map[word] = e;
    writeProgress(map);
    recordActivity();
    return e;
  }

  function previewReview(word, rating) {
    const map = readProgress();
    const e = getEntry(map, word);
    const oldLevel = e.srsLevel || 0;
    const now = Date.now();

    if (rating === 0) return now + SRS_INTERVALS_MS[1];

    let newLevel = oldLevel;
    let factor = 1;
    if (rating === 1) { newLevel = Math.max(1, oldLevel); factor = 0.6; }
    if (rating === 2) { newLevel = Math.min(oldLevel + 1, SRS_MAX_LEVEL); }
    if (rating === 3) { newLevel = Math.min(oldLevel + 2, SRS_MAX_LEVEL); }

    return now + Math.round((SRS_INTERVALS_MS[newLevel] || 0) * factor);
  }

  function readActivity()   { return readJSON(ACTIVITY_KEY, []); }
  function writeActivity(a) { writeJSON(ACTIVITY_KEY, a); }

  function recordActivity() {
    const today = todayKey();
    const list = readActivity();
    if (!list.includes(today)) {
      list.push(today);
      if (list.length > 400) list.splice(0, list.length - 400);
      writeActivity(list);
    }
    updateStreak();
  }

  function updateStreak() {
    const list = readActivity().slice().sort();
    if (!list.length) {
      writeJSON(STREAK_KEY, { current: 0, best: 0, lastDate: null });
      return;
    }

    let current = 0;
    let cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    for (let i = 0; i < 400; i++) {
      const key = todayKey(cursor.getTime());
      if (list.includes(key)) {
        current++;
        cursor.setTime(cursor.getTime() - MS_PER_DAY);
      } else {
        if (i === 0) {
          cursor.setTime(cursor.getTime() - MS_PER_DAY);
          continue;
        }
        break;
      }
    }

    const prev = readJSON(STREAK_KEY, { current: 0, best: 0 });
    const best = Math.max(prev.best || 0, current);

    writeJSON(STREAK_KEY, {
      current,
      best,
      lastDate: list[list.length - 1],
    });
  }

  function getStreak() {
    return readJSON(STREAK_KEY, { current: 0, best: 0, lastDate: null });
  }

  function readStarred()      { return readJSON(STARRED_KEY, []); }
  function writeStarred(list) { writeJSON(STARRED_KEY, list); }

  function getCustomWords()       { return readJSON(CUSTOM_KEY, []); }
  function writeCustomWords(list) { writeJSON(CUSTOM_KEY, list); }

  function genId() {
    return 'w_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  /* ============================================================
     Пользовательские разделы (user sections)
     ============================================================ */
  function genSectionId() {
    return 'user_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  }

  function isUserSectionId(id) {
    return /^user_/.test(String(id || ''));
  }

  function isProtectedLevelId(id) {
    return PROTECTED_LEVEL_IDS.has(String(id || ''));
  }

  function getUserSections() {
    const list = readJSON(SECTIONS_KEY, []);
    if (!Array.isArray(list)) return [];
    return list.filter(s => s && typeof s === 'object' && typeof s.id === 'string');
  }

  function writeUserSections(list) {
    writeJSON(SECTIONS_KEY, Array.isArray(list) ? list : []);
  }

  return {
    /* ---------- Прогресс ---------- */
    markLearned(word, mistakes = 0) {
      recordAnswer(word, mistakes === 0);
    },

    recordAnswer,
    recordReview,
    previewReview,

    isLearned(word) {
      return Boolean(readProgress()[word]?.learned);
    },

    learnedCount() {
      return Object.values(readProgress()).filter(x => x.learned).length;
    },

    reset() {
      writeProgress({});
      writeJSON(ACTIVITY_KEY, []);
      writeJSON(STREAK_KEY, { current: 0, best: 0, lastDate: null });
    },

    resetStats() {
      writeProgress({});
      writeJSON(ACTIVITY_KEY, []);
      writeJSON(STREAK_KEY, { current: 0, best: 0, lastDate: null });
    },

    getWordData(word) {
      return getEntry(readProgress(), word);
    },

    getDueWords(allWords) {
      const map = readProgress();
      const now = Date.now();
      return allWords
        .filter(w => {
          const e = map[w.word];
          if (!e) return false;
          if (!e.lastSeenAt) return false;
          return e.nextReviewAt <= now;
        })
        .sort((a, b) => {
          const ea = map[a.word], eb = map[b.word];
          return (ea.nextReviewAt || 0) - (eb.nextReviewAt || 0);
        });
    },

    getNewWords(allWords) {
      const map = readProgress();
      return allWords.filter(w => {
        const e = map[w.word];
        return !e || !e.lastSeenAt;
      });
    },

    getSrsStats(allWords) {
      const map = readProgress();
      const now = Date.now();
      let due = 0, fresh = 0, learning = 0, mature = 0;
      allWords.forEach(w => {
        const e = map[w.word];
        if (!e || !e.lastSeenAt) { fresh++; return; }
        if (e.nextReviewAt <= now) { due++; return; }
        if (e.srsLevel >= 5) mature++;
        else learning++;
      });
      return { due, fresh, learning, mature };
    },

    getSrsLevelDistribution(allWords) {
      const map = readProgress();
      const levels = new Array(SRS_MAX_LEVEL + 1).fill(0);
      allWords.forEach(w => {
        const e = map[w.word];
        if (!e || !e.lastSeenAt) return;
        const lvl = Math.max(0, Math.min(SRS_MAX_LEVEL, e.srsLevel || 0));
        levels[lvl]++;
      });
      return levels;
    },

    getSrsLevelInfo(level) {
      const labels = [
        'Новое', '10 мин', '1 день', '3 дня', '7 дней',
        '16 дней', '35 дней', '90 дней', '180 дней',
      ];
      return { level, label: labels[level] || 'Новое' };
    },

    getWeakWords(allWords, threshold = 2) {
      const map = readProgress();
      return allWords
        .map(w => ({ w, e: map[w.word] }))
        .filter(x => x.e && x.e.wrongCount >= threshold && x.e.srsLevel < 4)
        .sort((a, b) => (b.e.wrongCount - b.e.correctCount) - (a.e.wrongCount - a.e.correctCount))
        .map(x => x.w);
    },

    recordActivity,
    getStreak,

    getRecentActivity(days = 7) {
      const list = readActivity();
      const out = [];
      const cursor = new Date();
      cursor.setHours(0, 0, 0, 0);
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(cursor.getTime() - i * MS_PER_DAY);
        const key = todayKey(d.getTime());
        out.push({ date: key, active: list.includes(key), weekday: d.getDay() });
      }
      return out;
    },

    getMcqSettings() {
      return readJSON(MCQ_SETTINGS_KEY, { size: 10, optionsCount: 4, source: 'level' });
    },
    saveMcqSettings(settings) {
      writeJSON(MCQ_SETTINGS_KEY, settings);
    },

    getDictationSettings() {
      return readJSON(DICT_SETTINGS_KEY, { size: 10, source: 'level' });
    },
    saveDictationSettings(settings) {
      writeJSON(DICT_SETTINGS_KEY, settings);
    },

    getWriteSettings() {
      return readJSON(WRITE_SETTINGS_KEY, { size: 5, source: 'level' });
    },
    saveWriteSettings(settings) {
      writeJSON(WRITE_SETTINGS_KEY, settings);
    },

    getSrsSettings() {
      return readJSON(SRS_SETTINGS_KEY, { size: 20, source: 'level' });
    },
    saveSrsSettings(settings) {
      writeJSON(SRS_SETTINGS_KEY, settings);
    },

    getStarredWords() {
      return readStarred();
    },
    isStarred(word) {
      return readStarred().includes(word);
    },
    toggleStar(word) {
      const list = readStarred();
      const idx = list.indexOf(word);
      if (idx >= 0) {
        list.splice(idx, 1);
        writeStarred(list);
        return false;
      }
      list.push(word);
      writeStarred(list);
      return true;
    },
    starredCount() {
      return readStarred().length;
    },
    clearStarred() {
      writeStarred([]);
    },

    /* ---------- Пользовательские слова ---------- */
    getCustomWords,

    saveCustomWord({ id, word, pinyin = '', translation, examples = [] }) {
      const list = getCustomWords();
      word = String(word || '').trim();
      translation = String(translation || '').trim();
      pinyin = String(pinyin || '').trim();

      const cleanExamples = normalizeExamples(examples);

      if (id) {
        const idx = list.findIndex(w => w.id === id);
        if (idx >= 0) {
          list[idx] = { id, word, pinyin, translation, examples: cleanExamples };
          writeCustomWords(list);
          return list[idx];
        }
      }
      const item = { id: genId(), word, pinyin, translation, examples: cleanExamples };
      list.push(item);
      writeCustomWords(list);
      return item;
    },

    deleteCustomWord(id) {
      writeCustomWords(getCustomWords().filter(w => w.id !== id));
    },

    findCustomWord(id) {
      return getCustomWords().find(w => w.id === id) || null;
    },

    customWordExists(word) {
      return getCustomWords().some(w => w.word === word);
    },

    exportCustomWords() {
      return JSON.stringify(getCustomWords(), null, 2);
    },

    importCustomWords(json) {
      let incoming;
      try { incoming = JSON.parse(json); }
      catch (err) { throw new Error('Неверный JSON: ' + err.message); }
      if (!Array.isArray(incoming)) throw new Error('Ожидался массив слов');

      const list = getCustomWords();
      const byWord = new Map(list.map(w => [w.word, w]));
      let added = 0, updated = 0;

      for (const raw of incoming) {
        if (!raw || typeof raw !== 'object') continue;
        if (typeof raw.word !== 'string' || typeof raw.translation !== 'string') continue;

        const word = raw.word.trim();
        const translation = raw.translation.trim();
        const pinyin = String(raw.pinyin || '').trim();
        if (!word || !translation) continue;

        const cleanExamples = normalizeExamples(raw.examples);

        if (byWord.has(word)) {
          const cur = byWord.get(word);
          cur.pinyin = pinyin || cur.pinyin;
          cur.translation = translation;
          if (cleanExamples.length) cur.examples = cleanExamples;
          updated++;
        } else {
          const item = { id: genId(), word, pinyin, translation, examples: cleanExamples };
          list.push(item);
          byWord.set(word, item);
          added++;
        }
      }
      writeCustomWords(list);
      return { added, updated };
    },

    /* ---------- Экспорт / импорт всего прогресса ---------- */
    exportProgress() {
      const payload = {
        _format: 'hanzipath-progress',
        _version: 1,
        _exportedAt: new Date().toISOString(),
        progress: readProgress(),
        activity: readActivity(),
        streak:   readJSON(STREAK_KEY, { current: 0, best: 0, lastDate: null }),
        settings: {
          mcq:       readJSON(MCQ_SETTINGS_KEY, null),
          dictation: readJSON(DICT_SETTINGS_KEY, null),
          write:     readJSON(WRITE_SETTINGS_KEY, null),
          srs:       readJSON(SRS_SETTINGS_KEY, null),
          starred:   readStarred(),
        },
      };
      return JSON.stringify(payload, null, 2);
    },

    importProgress(json, { replace = false } = {}) {
      let incoming;
      try { incoming = JSON.parse(json); }
      catch (err) { throw new Error('Неверный JSON: ' + err.message); }

      if (!incoming || typeof incoming !== 'object') {
        throw new Error('Ожидался объект с полем progress');
      }
      if (incoming._format && incoming._format !== 'hanzipath-progress') {
        throw new Error('Это не файл прогресса HanziPath');
      }
      if (!incoming.progress || typeof incoming.progress !== 'object') {
        throw new Error('В файле нет поля progress');
      }

      let added = 0, updated = 0;

      if (replace) {
        writeProgress(incoming.progress);
        writeJSON(ACTIVITY_KEY, Array.isArray(incoming.activity) ? incoming.activity : []);
        writeJSON(STREAK_KEY, incoming.streak || { current: 0, best: 0, lastDate: null });
        if (incoming.settings) {
          if (incoming.settings.mcq)       writeJSON(MCQ_SETTINGS_KEY, incoming.settings.mcq);
          if (incoming.settings.dictation) writeJSON(DICT_SETTINGS_KEY, incoming.settings.dictation);
          if (incoming.settings.write)     writeJSON(WRITE_SETTINGS_KEY, incoming.settings.write);
          if (incoming.settings.srs)       writeJSON(SRS_SETTINGS_KEY, incoming.settings.srs);
          if (Array.isArray(incoming.settings.starred)) writeStarred(incoming.settings.starred);
        }
        added = Object.keys(incoming.progress).length;
      } else {
        const map = readProgress();
        for (const [word, inc] of Object.entries(incoming.progress)) {
          if (!inc || typeof inc !== 'object') continue;
          const cur = getEntry(map, word);
          const merged = {
            learned: Boolean(cur.learned || inc.learned),
            mistakes: Math.max(cur.mistakes || 0, inc.mistakes || 0),
            correctCount: (cur.correctCount || 0) + (inc.correctCount || 0),
            wrongCount:   (cur.wrongCount   || 0) + (inc.wrongCount   || 0),
            srsLevel: Math.max(cur.srsLevel || 0, inc.srsLevel || 0),
            nextReviewAt: Math.max(cur.nextReviewAt || 0, inc.nextReviewAt || 0),
            lastSeenAt:   Math.max(cur.lastSeenAt   || 0, inc.lastSeenAt   || 0),
          };
          map[word] = merged;
          if (Object.keys(cur).length) updated++;
          else added++;
        }
        writeProgress(map);

        if (Array.isArray(incoming.activity)) {
          const act = readActivity();
          const set = new Set(act);
          incoming.activity.forEach(d => set.add(d));
          writeActivity([...set].sort());
          updateStreak();
        }
        if (incoming.settings && Array.isArray(incoming.settings.starred)) {
          const star = new Set(readStarred());
          incoming.settings.starred.forEach(w => star.add(w));
          writeStarred([...star]);
        }
      }

      return { added, updated };
    },

    /* ============================================================
       Пользовательские разделы
       ============================================================ */
    getUserSections,
    isUserSection: isUserSectionId,
    isProtectedLevel: isProtectedLevelId,

    saveUserSection({ id, label, words }) {
      const list = getUserSections();
      const cleanedWords = (Array.isArray(words) ? words : [])
        .map(normalizeWord)
        .filter(Boolean);

      const sectionId = isUserSectionId(id) ? id : genSectionId();
      const sectionLabel = String(label || 'Без названия').trim().slice(0, 60) || 'Без названия';

      const item = {
        id: sectionId,
        label: sectionLabel,
        createdAt: Date.now(),
        words: cleanedWords,
      };

      const idx = list.findIndex(s => s.id === sectionId);
      if (idx >= 0) {
        item.createdAt = list[idx].createdAt || item.createdAt;
        list[idx] = item;
      } else {
        list.push(item);
      }

      writeUserSections(list);
      return item;
    },

    deleteUserSection(id) {
      if (!isUserSectionId(id)) {
        throw new Error('Этот раздел защищён от удаления');
      }
      const list = getUserSections().filter(s => s.id !== id);
      writeUserSections(list);
    },

    clearUserSections() {
      writeUserSections([]);
    },
  };
})();