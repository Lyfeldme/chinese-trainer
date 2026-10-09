/**
 * Универсальный пиньинь-IME.
 * Используется и в «Предложениях», и в «Диктанте».
 */
window.HP_IME = (function () {

  function stripTones(s) {
    return String(s).toLowerCase()
      .replace(/[āáǎà]/g, 'a').replace(/[ēéěè]/g, 'e')
      .replace(/[īíǐì]/g, 'i').replace(/[ōóǒò]/g, 'o')
      .replace(/[ūúǔù]/g, 'u').replace(/[ǖǘǚǜ]/g, 'v')
      .replace(/ü/g, 'v');
  }

  function buildDict() {
    const dict = {};
    const allWords = [];
    const byLevel = window.HP_WORDS_BY_LEVEL || {};
    Object.keys(byLevel).forEach(lvl => {
      (byLevel[lvl] || []).forEach(w => allWords.push(w));
    });
    try {
      if (window.HP_STORAGE && window.HP_STORAGE.getCustomWords) {
        window.HP_STORAGE.getCustomWords().forEach(w => allWords.push(w));
      }
    } catch (e) { /* ok */ }

    allWords.forEach(w => {
      if (!w.word || !w.pinyin) return;
      const chars = [...w.word];
      const syllables = String(w.pinyin).trim().split(/\s+/);
      if (chars.length !== syllables.length) return;
      chars.forEach((ch, i) => {
        const syl = syllables[i];
        const key = stripTones(syl);
        if (!key || !/^[a-z]+$/.test(key)) return;
        if (!dict[key]) dict[key] = [];
        if (!dict[key].some(x => x.ch === ch)) dict[key].push({ ch, p: syl });
      });
    });
    return dict;
  }

  function attach(refs) {
    const {
      panel, composeText, composeCaret, candidates, keyboard,
      closeBtn, input, toggleBtn,
    } = refs;

    let typed = '';
    let dict = buildDict();

    function insertIntoInput(text) {
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;
      const before = input.value.slice(0, start);
      const after = input.value.slice(end);
      input.value = before + text + after;
      const pos = start + text.length;
      input.selectionStart = pos;
      input.selectionEnd = pos;
      input.focus();
    }

    function renderCompose() {
      const wrap = composeText.parentElement;
      const old = wrap.querySelector('.vk__compose-placeholder');
      if (old) old.remove();
      composeText.textContent = typed;
      if (!typed) {
        composeCaret.style.display = 'none';
        const ph = document.createElement('span');
        ph.className = 'vk__compose-placeholder';
        ph.textContent = 'начните печатать: shu, wo, ni…';
        wrap.appendChild(ph);
      } else {
        composeCaret.style.display = '';
      }
    }

    function renderCandidates() {
      candidates.innerHTML = '';
      if (!typed) {
        candidates.innerHTML = '<div class="vk__candidates-empty">Начните вводить пиньинь, например <b>shu</b> или <b>wo</b>.</div>';
        return;
      }
      const list = dict[stripTones(typed)] || [];
      if (!list.length) {
        candidates.innerHTML = '<div class="vk__candidates-empty">Ничего не найдено.</div>';
        return;
      }
      list.forEach(item => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'vk__candidate';
        btn.innerHTML = `<span class="vk__candidate-char">${item.ch}</span><span class="vk__candidate-pinyin">${item.p}</span>`;
        btn.addEventListener('click', () => chooseCandidate(item));
        candidates.appendChild(btn);
      });
    }

    function chooseCandidate(item) {
      insertIntoInput(item.ch);
      typed = '';
      renderCompose();
      renderCandidates();
    }
    function pressKey(letter) {
      typed += letter;
      renderCompose();
      renderCandidates();
    }
    function pressBackspace() {
      typed = typed.slice(0, -1);
      renderCompose();
      renderCandidates();
    }
    function clearTyped() {
      typed = '';
      renderCompose();
      renderCandidates();
    }
    function pressSpace() {
      if (typed) {
        const list = dict[stripTones(typed)] || [];
        if (list.length) { chooseCandidate(list[0]); return; }
      }
      insertIntoInput(' ');
    }

    function renderKeyboard() {
      keyboard.innerHTML = '';

      const vl = document.createElement('div');
      vl.className = 'vk__kb-label';
      vl.innerHTML = '<i class="ri-font-size-2"></i><span>Гласные с тонами</span>';
      keyboard.appendChild(vl);

      [
        ['a', 'ā', 'á', 'ǎ', 'à', 'e', 'ē', 'é', 'ě', 'è'],
        ['i', 'ī', 'í', 'ǐ', 'ì', 'o', 'ō', 'ó', 'ǒ', 'ò'],
        ['u', 'ū', 'ú', 'ǔ', 'ù', 'ü', 'ǖ', 'ǘ', 'ǚ', 'ǜ'],
      ].forEach(row => {
        const rowEl = document.createElement('div');
        rowEl.className = 'vk__keyboard-row';
        row.forEach(k => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = k;
          const isToned = k.length === 1 && /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(k);
          btn.className = 'vk__key' + (isToned ? ' vk__key--tone' : '');
          btn.addEventListener('click', () => pressKey(k));
          rowEl.appendChild(btn);
        });
        keyboard.appendChild(rowEl);
      });

      const cl = document.createElement('div');
      cl.className = 'vk__kb-label';
      cl.innerHTML = '<i class="ri-font-size"></i><span>Согласные</span>';
      keyboard.appendChild(cl);

      [
        ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k'],
        ['h', 'j', 'q', 'x', 'zh', 'ch', 'sh', 'r', 'z', 'c'],
        ['s', 'y', 'w'],
      ].forEach(row => {
        const rowEl = document.createElement('div');
        rowEl.className = 'vk__keyboard-row';
        row.forEach(k => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'vk__key' + (k.length > 1 ? ' vk__key--digraph' : '');
          btn.textContent = k;
          btn.addEventListener('click', () => pressKey(k));
          rowEl.appendChild(btn);
        });
        keyboard.appendChild(rowEl);
      });

      const bottom = document.createElement('div');
      bottom.className = 'vk__keyboard-row vk__keyboard-row--bottom';

      const space = document.createElement('button');
      space.type = 'button';
      space.className = 'vk__key vk__key--wide';
      space.innerHTML = '<i class="ri-space"></i><span>Пробел / выбрать первый</span>';
      space.addEventListener('click', pressSpace);

      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'vk__key vk__key--wide';
      back.innerHTML = '<i class="ri-delete-back-line"></i><span>Удалить</span>';
      back.addEventListener('click', pressBackspace);

      const clear = document.createElement('button');
      clear.type = 'button';
      clear.className = 'vk__key vk__key--wide';
      clear.innerHTML = '<i class="ri-eraser-line"></i><span>Сброс</span>';
      clear.addEventListener('click', clearTyped);

      bottom.appendChild(space);
      bottom.appendChild(back);
      bottom.appendChild(clear);
      keyboard.appendChild(bottom);
    }

    function open() {
      dict = buildDict();
      typed = '';
      panel.hidden = false;
      renderKeyboard();
      renderCompose();
      renderCandidates();
    }
    function close() {
      panel.hidden = true;
      typed = '';
    }
    function toggle() {
      if (panel.hidden) open();
      else close();
    }

    if (toggleBtn) toggleBtn.addEventListener('click', toggle);
    if (closeBtn)  closeBtn.addEventListener('click', close);

    input.addEventListener('keydown', (e) => {
      if (panel.hidden) return;
      if (/^[a-zA-Z]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault(); pressKey(e.key.toLowerCase()); return;
      }
      if (e.key === 'Backspace' && !e.ctrlKey && !e.metaKey && typed) {
        e.preventDefault(); pressBackspace(); return;
      }
      if (e.key === ' ' && !e.ctrlKey && !e.metaKey && typed) {
        e.preventDefault(); pressSpace(); return;
      }
      if (e.key === 'Escape' && typed) {
        e.preventDefault(); clearTyped(); return;
      }
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey && typed) {
        e.preventDefault(); pressSpace(); return;
      }
    });

    return {
      open,
      close,
      toggle,
      isOpen: () => !panel.hidden,
      isTyping: () => typed.length > 0,
    };
  }

  return { attach, stripTones, buildDict };
})();