/**
 * Работа с интерфейсом:
 *   - статус
 *   - список слов с уровнями (вкладки) — три группы:
 *     HSK, пользовательские разделы, служебные (⭐ ⚠ ⏰ Мои слова)
 *   - кнопки действий и звёздочки
 *   - модальное окно добавления/редактирования (с примером)
 *   - поле поиска (ссылки на DOM-элементы)
 */
window.HP_UI = (function () {
  const els = {};
  let onDeleteHandler = null;
  let onEditHandler   = null;
  let submitHandler   = null;

  function cache() {
    els.pinyin        = document.getElementById('pinyin');
    els.translation   = document.getElementById('translation');
    els.chars         = document.getElementById('chars');
    els.status        = document.getElementById('status');
    els.wordList      = document.getElementById('wordList');
    els.progressInfo  = document.getElementById('progress-info');
    els.extraControls = document.getElementById('extraControls');
    els.tabs          = document.getElementById('tabs');
    els.listActions   = document.getElementById('listActions');
    els.listTitle     = document.getElementById('listTitle');

    els.searchInput   = document.getElementById('searchInput');
    els.searchClear   = document.getElementById('searchClear');

    els.themeToggle   = document.getElementById('themeToggle');
    els.themeIcon     = document.getElementById('themeIcon');

    els.modal         = document.getElementById('modal');
    els.modalBackdrop = document.getElementById('modalBackdrop');
    els.modalTitle    = document.getElementById('modalTitle');
    els.modalCancel   = document.getElementById('modalCancel');
    els.form          = document.getElementById('wordForm');
    els.wordInput     = document.getElementById('wordInput');
    els.pinyinInput   = document.getElementById('pinyinInput');
    els.transInput    = document.getElementById('translationInput');
    els.exampleZhInput     = document.getElementById('exampleZhInput');
    els.examplePinyinInput = document.getElementById('examplePinyinInput');
    els.exampleRuInput     = document.getElementById('exampleRuInput');
    els.formError     = document.getElementById('formError');
  }

  function renderTabs(levels, activeLevel, onSelect) {
    els.tabs.innerHTML = '';

    const isHskLevel  = (id) => /^hsk\d+$/.test(id);
    const isUserLevel = (id) => String(id).startsWith('user_');

    const hskLevels     = levels.filter(l => isHskLevel(l.id));
    const userLevels    = levels.filter(l => isUserLevel(l.id));
    const specialLevels = levels.filter(l => !isHskLevel(l.id) && !isUserLevel(l.id));

    function makeTab(lvl) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tab' + (lvl.id === activeLevel ? ' tab--active' : '');
      if (lvl.isUser) btn.classList.add('tab--user');
      btn.innerHTML = `<span>${lvl.label}</span>`;
      if (typeof lvl.count === 'number') {
        const badge = document.createElement('span');
        badge.className = 'tab__count';
        badge.textContent = lvl.count;
        btn.appendChild(badge);
      }
      btn.addEventListener('click', () => onSelect(lvl.id));
      return btn;
    }

    if (hskLevels.length) {
      const hskGroup = document.createElement('div');
      hskGroup.className = 'tabs__group tabs__group--hsk';
      hskLevels.forEach(l => hskGroup.appendChild(makeTab(l)));
      els.tabs.appendChild(hskGroup);
    }

    if (userLevels.length) {
      const userGroup = document.createElement('div');
      userGroup.className = 'tabs__group tabs__group--user';
      userLevels.forEach(l => userGroup.appendChild(makeTab(l)));
      els.tabs.appendChild(userGroup);
    }

    if (specialLevels.length) {
      const specialGroup = document.createElement('div');
      specialGroup.className = 'tabs__group tabs__group--special';
      specialLevels.forEach(l => specialGroup.appendChild(makeTab(l)));
      els.tabs.appendChild(specialGroup);
    }
  }

  function renderWordList(words, currentIndex, onSelect, options = {}) {
    els.wordList.innerHTML = '';

    if (!words.length) {
      const empty = document.createElement('div');
      empty.className = 'word-list__empty';
      empty.textContent = options.emptyText
        ? options.emptyText
        : (options.editable
            ? 'Пока нет своих слов. Нажмите «Добавить слово» выше.'
            : 'Список пуст.');
      els.wordList.appendChild(empty);
      return;
    }

    const onStar = typeof options.onToggleStar === 'function' ? options.onToggleStar : null;

    words.forEach((w, i) => {
      const item = document.createElement('div');
      item.className = 'word-item';
      if (i === currentIndex) item.classList.add('current');
      if (window.HP_STORAGE.isLearned(w.word)) item.classList.add('learned');

      if (options.starrable !== false) {
        const isOn = window.HP_STORAGE.isStarred(w.word);
        const starBtn = document.createElement('button');
        starBtn.type = 'button';
        starBtn.className = 'word-item__star' + (isOn ? ' word-item__star--on' : '');
        starBtn.title = isOn
          ? 'Убрать из «Изучаю сейчас»'
          : 'Добавить в «Изучаю сейчас»';
        starBtn.setAttribute('aria-label', starBtn.title);
        starBtn.innerHTML = isOn
          ? '<i class="ri-star-fill"></i>'
          : '<i class="ri-star-line"></i>';
        starBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (onStar) onStar(w);
        });
        item.appendChild(starBtn);
      }

      const inner = document.createElement('div');
      inner.className = 'word-item__inner';
      inner.innerHTML = `
        <div class="word-item__word">${w.word}</div>
        <div class="word-item__pinyin">${w.pinyin || ''}</div>
        <div class="word-item__translation">${w.translation}</div>
      `;
      item.appendChild(inner);

      if (options.editable && w.id) {
        const actions = document.createElement('div');
        actions.className = 'word-item__actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'word-item__icon';
        editBtn.title = 'Редактировать';
        editBtn.innerHTML = '<i class="ri-edit-line"></i>';
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (typeof onEditHandler === 'function') onEditHandler(w);
        });

        const delBtn = document.createElement('button');
        delBtn.className = 'word-item__icon word-item__icon--danger';
        delBtn.title = 'Удалить';
        delBtn.innerHTML = '<i class="ri-delete-bin-line"></i>';
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (typeof onDeleteHandler === 'function') onDeleteHandler(w);
        });

        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        item.appendChild(actions);
      }

      item.addEventListener('click', () => onSelect(i));
      els.wordList.appendChild(item);
    });
  }

  function renderListActions(buttons) {
    els.listActions.innerHTML = '';
    buttons.forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'btn ' + (b.className || 'btn--secondary') + ' btn--sm';
      btn.innerHTML = b.label;
      btn.addEventListener('click', b.onClick);
      els.listActions.appendChild(btn);
    });
  }

  function openModal({
    title = 'Добавить слово',
    word = '',
    pinyin = '',
    translation = '',
    exampleZh = '',
    examplePinyin = '',
    exampleRu = '',
    onSubmit,
  }) {
    els.modalTitle.textContent = title;
    els.wordInput.value = word;
    els.pinyinInput.value = pinyin;
    els.transInput.value = translation;
    els.exampleZhInput.value = exampleZh;
    els.examplePinyinInput.value = examplePinyin;
    els.exampleRuInput.value = exampleRu;
    els.formError.hidden = true;
    els.formError.textContent = '';
    els.modal.hidden = false;
    submitHandler = onSubmit;
    setTimeout(() => els.wordInput.focus(), 50);
  }

  function closeModal() {
    els.modal.hidden = true;
    submitHandler = null;
  }

  function showFormError(text) {
    els.formError.textContent = text;
    els.formError.hidden = false;
  }

  function initModal() {
    els.modalCancel.addEventListener('click', closeModal);
    els.modalBackdrop.addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !els.modal.hidden) closeModal();
    });

    els.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const word = els.wordInput.value.trim();
      const pinyin = els.pinyinInput.value.trim();
      const translation = els.transInput.value.trim();
      const exampleZh = els.exampleZhInput.value.trim();
      const examplePinyin = els.examplePinyinInput.value.trim();
      const exampleRu = els.exampleRuInput.value.trim();

      if (!word) { showFormError('Введите иероглифы'); return; }
      if (!/[\u4e00-\u9fff]/.test(word)) {
        showFormError('Иероглифы должны содержать китайские символы (например: 电影)');
        return;
      }
      if (!translation) { showFormError('Введите перевод'); return; }

      const examples = exampleZh
        ? [{ zh: exampleZh, pinyin: examplePinyin, ru: exampleRu }]
        : [];

      try {
        if (typeof submitHandler === 'function') {
          submitHandler({ word, pinyin, translation, examples });
        }
        closeModal();
      } catch (err) {
        showFormError(err.message || 'Не удалось сохранить');
      }
    });
  }

  return {
    init() {
      cache();
      initModal();
    },

    els() { return els; },

    setStatus(text, type = '') {
      els.status.textContent = text;
      els.status.className = 'status' + (type ? ' ' + type : '');
    },

    setListTitle(text) {
      els.listTitle.textContent = text;
    },

    renderTabs,
    renderWordList,
    renderListActions,

    updateProgress(totalWords) {
      els.progressInfo.textContent =
        `Выучено: ${window.HP_STORAGE.learnedCount()} из ${totalWords}`;
    },

    showExtraButtons(buttons) {
      els.extraControls.innerHTML = '';
      if (!buttons || !buttons.length) {
        els.extraControls.hidden = true;
        return;
      }
      buttons.forEach(b => {
        const btn = document.createElement('button');
        btn.className = 'btn ' + (b.className || 'btn--secondary');
        btn.innerHTML = b.label;
        btn.addEventListener('click', b.onClick);
        els.extraControls.appendChild(btn);
      });
      els.extraControls.hidden = false;
    },

    clearExtraButtons() {
      els.extraControls.innerHTML = '';
      els.extraControls.hidden = true;
    },

    openModal,
    closeModal,
    showFormError,

    setListHandlers({ onEdit, onDelete }) {
      if (typeof onEdit === 'function')   onEditHandler = onEdit;
      if (typeof onDelete === 'function') onDeleteHandler = onDelete;
    },
  };
})();