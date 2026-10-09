/**
 * Режим «Обводить»: свободное рисование мышкой/пальцем
 * поверх контура иероглифа. Ничего не проверяется.
 */
window.HP_TRACE = (function () {
  const CFG = window.HP_CONFIG;
  let active = false;
  let canvases = [];

  function attachCanvas(writerEntry) {
    const { box } = writerEntry;
    const size = window.HP_WRITER.pickSize();

    const canvas = document.createElement('canvas');
    canvas.className = 'char-box__canvas';
    canvas.width = size;
    canvas.height = size;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';

    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = CFG.trace.color;
    ctx.globalAlpha = CFG.trace.alpha;
    ctx.lineWidth = CFG.trace.lineWidth;

    const state = { canvas, ctx, drawing: false, lastX: 0, lastY: 0 };

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * (canvas.width  / rect.width),
        y: (clientY - rect.top)  * (canvas.height / rect.height),
      };
    }

    function start(e) {
      e.preventDefault();
      state.drawing = true;
      const { x, y } = getPos(e);
      state.lastX = x;
      state.lastY = y;
      ctx.beginPath();
      ctx.arc(x, y, CFG.trace.lineWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = CFG.trace.color;
      ctx.fill();
    }

    function move(e) {
      if (!state.drawing) return;
      e.preventDefault();
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(state.lastX, state.lastY);
      ctx.lineTo(x, y);
      ctx.stroke();
      state.lastX = x;
      state.lastY = y;
    }

    function end() {
      state.drawing = false;
    }

    // --- Мышь ---
    canvas.addEventListener('mousedown',  start);
    canvas.addEventListener('mousemove',  move);
    canvas.addEventListener('mouseup',    end);
    canvas.addEventListener('mouseleave', end);

    // --- Палец ---
    canvas.addEventListener('touchstart',  start, { passive: false });
    canvas.addEventListener('touchmove',   move,  { passive: false });
    canvas.addEventListener('touchend',    end);
    canvas.addEventListener('touchcancel', end);

    // --- Запрет контекстного меню и drag — иначе iOS/Android
    //     будут предлагать «сохранить картинку» или выделить текст ---
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('dragstart',   (e) => e.preventDefault());

    box.appendChild(canvas);
    canvases.push(state);
  }

  return {
    start(writers) {
      if (active) return;
      active = true;
      writers.forEach(attachCanvas);
    },

    clear() {
      canvases.forEach(({ canvas, ctx }) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      });
    },

    stop() {
      active = false;
      canvases.forEach(({ canvas }) => canvas.remove());
      canvases = [];
    },

    isActive() { return active; },
  };
})();