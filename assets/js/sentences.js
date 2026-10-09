/**
 * Проверка китайских предложений + база правил (25 правил, 3 уровня).
 *
 * ВАЖНО: проверка осторожная.
 *   - Критичные ошибки (100% уверенность) → ok: false
 *   - Сомнительные (возможно ошибка) → ok: true, warning: true
 *   - Не может проверить → ok: true, partial: true (без ругани)
 */
window.HP_SENTENCES = (function () {

  const POS = {
    '我': 'subj', '你': 'subj', '他': 'subj', '她': 'subj', '它': 'subj',
    '我们': 'subj', '你们': 'subj', '他们': 'subj', '她们': 'subj',
    '这': 'subj', '那': 'subj', '谁': 'subj', '什么': 'subj',
    '哪': 'subj', '哪儿': 'subj', '这里': 'subj', '那里': 'subj',
    '大家': 'subj', '您': 'subj',

    '是': 'copula',
    '不': 'neg', '没': 'neg', '别': 'neg', '未': 'neg', '无': 'neg',
    '有': 'have',
    '很': 'intens', '太': 'intens', '非常': 'intens', '真': 'intens',
    '最': 'intens', '更': 'intens', '特别': 'intens',
    '吗': 'q', '呢': 'q', '吧': 'q', '啊': 'q', '嘛': 'q',
    '的': 'de', '地': 'de', '得': 'de',

    '了': 'part-le', '过': 'part-guo', '着': 'part-zhe',

    '能': 'modal', '会': 'modal', '想': 'modal', '要': 'modal',
    '可以': 'modal', '应该': 'modal', '必须': 'modal',
    '敢': 'modal', '肯': 'modal',

    '个': 'mw', '本': 'mw', '张': 'mw', '只': 'mw', '件': 'mw',
    '杯': 'mw', '块': 'mw', '位': 'mw', '辆': 'mw', '条': 'mw',
    '架': 'mw', '把': 'mw',

    '一': 'num', '二': 'num', '三': 'num', '四': 'num', '五': 'num',
    '六': 'num', '七': 'num', '八': 'num', '九': 'num', '十': 'num',
    '两': 'num', '几': 'num', '多少': 'num', '百': 'num', '千': 'num',
    '零': 'num',

    '今天': 'time', '明天': 'time', '昨天': 'time', '现在': 'time',
    '每天': 'time', '早上': 'time', '上午': 'time', '中午': 'time',
    '下午': 'time', '晚上': 'time', '去年': 'time', '今年': 'time',
    '后天': 'time', '前天': 'time',

    '这里': 'place', '那里': 'place', '哪儿': 'place',

    '但是': 'conj', '可是': 'conj', '因为': 'conj', '所以': 'conj',
    '虽然': 'conj', '如果': 'conj', '或者': 'conj', '还是': 'conj',
    '和': 'conj', '跟': 'conj',

    '也': 'adv', '都': 'adv', '还': 'adv', '就': 'adv', '又': 'adv',
    '再': 'adv', '才': 'adv', '只': 'adv',

    '在': 'prep', '从': 'prep', '到': 'prep', '给': 'prep',
    '对': 'prep', '跟': 'prep', '往': 'prep', '离': 'prep',

    '爱': 'verb', '吃': 'verb', '喝': 'verb', '看': 'verb', '听': 'verb',
    '说': 'verb', '读': 'verb', '写': 'verb', '买': 'verb', '卖': 'verb',
    '去': 'verb', '来': 'verb', '回': 'verb', '认识': 'verb', '喜欢': 'verb',
    '叫': 'verb', '做': 'verb', '住': 'verb', '坐': 'verb', '开': 'verb',
    '学习': 'verb', '工作': 'verb', '笑': 'verb', '睡觉': 'verb',
    '打': 'verb', '打电话': 'verb', '看见': 'verb', '找': 'verb',
    '等': 'verb', '问': 'verb', '回答': 'verb', '洗': 'verb', '穿': 'verb',
    '帮助': 'verb', '唱歌': 'verb', '出': 'verb', '进': 'verb',
    '觉得': 'verb', '开始': 'verb', '介绍': 'verb', '让': 'verb',
    '送': 'verb', '说话': 'verb', '跳舞': 'verb', '玩': 'verb',
    '希望': 'verb', '知道': 'verb', '准备': 'verb', '走': 'verb',
    '起床': 'verb', '跑步': 'verb', '踢足球': 'verb', '打篮球': 'verb',
    '游泳': 'verb', '上班': 'verb', '生病': 'verb', '休息': 'verb',

    '饭': 'noun', '茶': 'noun', '水': 'noun', '菜': 'noun', '苹果': 'noun',
    '米饭': 'noun', '书': 'noun', '电影': 'noun', '电视': 'noun', '电脑': 'noun',
    '手机': 'noun', '钱': 'noun', '猫': 'noun', '狗': 'noun', '名字': 'noun',
    '家': 'noun', '学校': 'noun', '医院': 'noun', '商店': 'noun',
    '老师': 'noun', '学生': 'noun', '医生': 'noun', '朋友': 'noun',
    '孩子': 'noun', '妈妈': 'noun', '爸爸': 'noun', '儿子': 'noun',
    '女儿': 'noun', '中国人': 'noun', '北京': 'noun', '中国': 'noun',
    '杯子': 'noun', '时候': 'noun', '天气': 'noun', '衣服': 'noun',
    '椅子': 'noun', '桌子': 'noun', '字': 'noun', '汉语': 'noun',
    '水果': 'noun', '出租车': 'noun', '飞机': 'noun', '房间': 'noun',
    '东西': 'noun', '报纸': 'noun', '宾馆': 'noun', '船': 'noun',
    '弟弟': 'noun', '哥哥': 'noun', '姐姐': 'noun', '妹妹': 'noun',
    '服务员': 'noun', '公司': 'noun', '火车站': 'noun', '机场': 'noun',
    '鸡蛋': 'noun', '教室': 'noun', '咖啡': 'noun', '考试': 'noun',
    '课': 'noun', '路': 'noun', '门': 'noun', '面条': 'noun',
    '牛奶': 'noun', '票': 'noun', '妻子': 'noun', '铅笔': 'noun',
    '身体': 'noun', '生日': 'noun', '时间': 'noun', '事情': 'noun',
    '手表': 'noun', '题': 'noun', '问题': 'noun', '西瓜': 'noun',
    '小时': 'noun', '颜色': 'noun', '眼睛': 'noun', '羊肉': 'noun',
    '药': 'noun', '意思': 'noun', '丈夫': 'noun', '足球': 'noun',
    '篮球': 'noun', '公共汽车': 'noun',

    '好': 'adj', '大': 'adj', '小': 'adj', '多': 'adj', '少': 'adj',
    '冷': 'adj', '热': 'adj', '高兴': 'adj', '漂亮': 'adj', '忙': 'adj',
    '累': 'adj', '新': 'adj', '旧': 'adj', '长': 'adj', '短': 'adj',
    '早': 'adj', '晚': 'adj', '对': 'adj', '错': 'adj', '贵': 'adj',
    '便宜': 'adj', '快': 'adj', '慢': 'adj', '白': 'adj', '黑': 'adj',
    '红': 'adj', '近': 'adj', '远': 'adj', '晴': 'adj', '阴': 'adj',
    '快乐': 'adj', '好吃': 'adj',
  };

  function guessRole(translation) {
    const t = String(translation || '').toLowerCase().trim();
    if (!t) return 'noun';
    if (/^(я|ты|он|она|оно|мы|вы|они)\b/.test(t)) return 'subj';
    if (/^быть\b/.test(t)) return 'copula';
    if (/^(не|нет)\b/.test(t)) return 'neg';
    if (/^иметь\b/.test(t)) return 'have';
    if (/^(очень|слишком|самый)/.test(t)) return 'intens';
    if (/^\?$/.test(t) || /вопрос/.test(t)) return 'q';
    if (/^(мочь|уметь|хотеть|должен|надо)/.test(t)) return 'modal';
    if (/^(и|но|потому|хотя|если)/.test(t)) return 'conj';
    if (/^(тоже|ещё|уже|сразу|снова)/.test(t)) return 'adv';
    if (/^(в|на|из|от|к|с|для)\b/.test(t)) return 'prep';
    if (/^(to |делать|идти|ехать|говорить|читать|писать|пить|есть|смотреть)/.test(t)) return 'verb';
    if (/(ый|ой|ая|ое|ые|ий|ых|яя|ее)$/.test(t)) return 'adj';
    return 'noun';
  }

  function buildDict() {
    const result = {};
    const sources = [];
    const byLevel = window.HP_WORDS_BY_LEVEL || {};
    Object.keys(byLevel).forEach(lvl => {
      (byLevel[lvl] || []).forEach(w => sources.push(w));
    });
    try {
      if (window.HP_STORAGE && window.HP_STORAGE.getCustomWords) {
        window.HP_STORAGE.getCustomWords().forEach(w => sources.push(w));
      }
    } catch (e) {}

    sources.forEach(w => {
      const word = w.word;
      if (!word) return;
      const chars = [...word];
      const syllables = String(w.pinyin || '').trim().split(/\s+/);

      chars.forEach((ch, i) => {
        if (result[ch]) return;
        const py = syllables[i] || '';
        const role = POS[ch] || guessRole(w.translation);
        result[ch] = { w: ch, p: py, t: w.translation || '', role };
      });

      if (chars.length > 1 && !result[word]) {
        const role = POS[word] || guessRole(w.translation);
        result[word] = { w: word, p: w.pinyin || '', t: w.translation || '', role };
      }
    });
    return result;
  }

  function tokenize(text, dict) {
    const clean = text.replace(/[\s.,!?;:，。！？；：、"'"'']/g, '');
    const tokens = [];
    let i = 0;
    const keys = Object.keys(dict).sort((a, b) => b.length - a.length);

    while (i < clean.length) {
      let matched = null;
      for (const key of keys) {
        if (clean.startsWith(key, i)) { matched = dict[key]; break; }
      }
      if (matched) {
        tokens.push({ ...matched });
        i += matched.w.length;
      } else {
        tokens.push({ w: clean[i], p: '', t: '', role: 'unknown' });
        i++;
      }
    }
    return tokens;
  }

  function detectType(text) {
    const t = text.trim();
    if (/[?？]\s*$/.test(t)) return 'question';
    if (/[!！]\s*$/.test(t)) return 'exclamation';
    return 'statement';
  }

  function makeError(ruleId, hint, rule, explain, examples) {
    return { ok: false, ruleId, confidence: 'high', hint, rule, explain, examples };
  }
  function makeWarning(ruleId, hint, rule, explain, examples) {
    return {
      ok: true, warning: ruleId, confidence: 'medium',
      hint, rule, explain, examples,
    };
  }
  function makePartial(hint, rule, explain, examples) {
    return {
      ok: true, partial: true, confidence: 'low',
      hint, rule, explain, examples,
    };
  }
  function makeOk(explain, examples) {
    return {
      ok: true, confidence: 'high',
      hint: 'Выглядит правильно!',
      rule: 'Структура предложения корректна.',
      explain: explain || 'Соблюдены основные правила порядка слов, отрицания и частиц.',
      examples: examples || [],
    };
  }

  const RULES = [
    {
      id: 'subject-first', n: 1, level: 'basic',
      title: 'Подлежащее — в начале',
      summary: 'Сначала «кто?», потом всё остальное.',
      structure: '[Кто] + [что делает] + [что / кого]',
      explain: 'В китайском языке порядок слов строго фиксированный: подлежащее всегда стоит на первом месте.',
      examples: [
        { ok: true,  text: '我是学生。', note: 'я — студент.' },
        { ok: false, text: '学生是我。', note: 'подлежащее 我 должно быть первым.' },
      ],
    },
    {
      id: 'has-predicate', n: 2, level: 'basic',
      title: 'Есть сказуемое',
      summary: 'Между «кто» и «что» — глагол, 是 или прилагательное.',
      structure: 'S + (是 / V / Adj) + O',
      explain: 'Китайское предложение не может состоять из двух существительных без связки.',
      examples: [
        { ok: true,  text: '我是学生。', note: 'связка 是.' },
        { ok: false, text: '我学生。',   note: 'нет сказуемого.' },
      ],
    },
    {
      id: 'copula-position', n: 3, level: 'basic',
      title: '是 — между подлежащим и существительным',
      summary: 'Я + 是 + кто-то.',
      structure: 'S + 是 + N',
      explain: 'Связка 是 ставится только между двумя существительными.',
      examples: [
        { ok: true,  text: '我是学生。',   note: 'я — студент.' },
        { ok: false, text: '我很是学生。', note: '很 не ставится перед 是.' },
      ],
    },
    {
      id: 'neg-position', n: 4, level: 'basic',
      title: '不 — перед глаголом / прилагательным',
      summary: '不 стоит ПЕРЕД сказуемым, не после.',
      structure: 'S + 不 + V / Adj',
      explain: 'Отрицание 不 всегда стоит непосредственно перед глаголом или прилагательным.',
      examples: [
        { ok: true,  text: '我不喝茶。',   note: 'я не пью чай.' },
        { ok: false, text: '我喝不茶。',   note: '不 должно быть перед 喝.' },
      ],
    },
    {
      id: 'bu-with-you', n: 5, level: 'basic',
      title: '不 + 有 → 没 + 有',
      summary: 'У глагола 有 особое отрицание — 没.',
      structure: 'S + 没有 + N',
      explain: 'Глагол «иметь» 有 не отрицается через 不. Правильно — 没有.',
      examples: [
        { ok: true,  text: '我没有书。', note: 'у меня нет книги.' },
        { ok: false, text: '我不有书。', note: 'с 有 нельзя 不.' },
      ],
    },
    {
      id: 'hen-with-adj', n: 6, level: 'basic',
      title: '很 + прилагательное — только в утверждении',
      summary: '很 ставится в утверждении с прилагательным-сказуемым. В отрицании, вопросе и с 比 — НЕ ставится.',
      structure: 'Утверждение: S + 很 + Adj   |   Отрицание: S + 不 + Adj   |   Сравнение: A + 比 + B + Adj',
      explain: '很 нужен, когда прилагательное играет роль сказуемого в утвердительном предложении. Но если вы отрицаете (我不忙), задаёте вопрос (你忙吗?) или сравниваете с 比 (我比他高) — 很 не используется. Никогда не ставится перед 是 или перед глаголами. Внимание: 不太 / 别太 — правильные конструкции, там 很 не нужен.',
      examples: [
        { ok: true,  text: '我很好。',    note: 'утверждение — нужен 很.' },
        { ok: true,  text: '我不忙。',    note: 'отрицание — без 很.' },
        { ok: true,  text: '我不太忙。',  note: '不太 — правильно, без 很.' },
        { ok: true,  text: '别太快。',    note: '别太 — правильно, без 很.' },
        { ok: true,  text: '你忙吗？',    note: 'вопрос — без 很.' },
        { ok: true,  text: '我比他高。',  note: 'сравнение с 比 — без 很.' },
        { ok: false, text: '我不很忙。',  note: 'в отрицании 很 не нужен.' },
        { ok: false, text: '我很是学生。', note: '很 никогда не перед 是.' },
        { ok: false, text: '我很喝茶。',  note: '很 только с прилагательными.' },
      ],
    },
    {
      id: 'q-at-end', n: 7, level: 'basic',
      title: '吗 — всегда в конце',
      summary: 'Вопросительная частица ставится ПОСЛЕ всего.',
      structure: 'S + V + O + 吗？',
      explain: '吗 превращает утверждение в общий вопрос. Всегда в самом конце.',
      examples: [
        { ok: true,  text: '你是学生吗？', note: 'ты студент?' },
        { ok: false, text: '吗你是学生？', note: '吗 не в начале.' },
      ],
    },
    {
      id: 'object-after-verb', n: 8, level: 'basic',
      title: 'Объект — после глагола',
      summary: 'Сначала действие, потом то, на что оно направлено.',
      structure: 'S + V + O',
      explain: 'Порядок «глагол → объект» фиксирован.',
      examples: [
        { ok: true,  text: '我喝茶。',   note: 'я пью чай.' },
        { ok: false, text: '我茶喝。',   note: 'объект должен идти после глагола.' },
      ],
    },
    {
      id: 'de-position', n: 9, level: 'basic',
      title: '的 — между определением и существительным',
      summary: '的 связывает «чей / какой» со словом.',
      structure: '[Определение] + 的 + [Существительное]',
      explain: 'После 的 почти всегда идёт существительное.',
      examples: [
        { ok: true,  text: '我的书',   note: 'моя книга.' },
        { ok: false, text: '我的是好', note: 'после 的 — существительное.' },
      ],
    },
    {
      id: 'no-object-without-verb', n: 10, level: 'basic',
      title: 'Объект без глагола не ставится',
      summary: 'Два существительных подряд — ошибка.',
      structure: 'S + V + O',
      explain: 'Если два существительных идут подряд, между ними должен быть глагол или 是.',
      examples: [
        { ok: true,  text: '我喝茶。',   note: 'глагол 喝.' },
        { ok: false, text: '我茶。',     note: 'нет глагола.' },
      ],
    },
    {
      id: 'le-completion', n: 11, level: 'intermediate',
      title: '了 — завершённость действия',
      summary: '了 после глагола = действие выполнено.',
      structure: 'S + V + 了 (+ O)   |   S + V + O + 了',
      explain: '了 после глагола означает, что действие завершено.',
      examples: [
        { ok: true,  text: '我吃了饭。',  note: 'я поел.' },
        { ok: false, text: '了我吃饭。',  note: '了 не в начале.' },
      ],
    },
    {
      id: 'guo-experience', n: 12, level: 'intermediate',
      title: '过 — опыт в прошлом',
      summary: '过 после глагола = «когда-то делал».',
      structure: 'S + V + 过 + (O)',
      explain: '过 означает, что вы имели такой опыт.',
      examples: [
        { ok: true,  text: '我去过中国。', note: 'я бывал в Китае.' },
        { ok: false, text: '过我吃饭。',   note: '过 стоит после глагола.' },
      ],
    },
    {
      id: 'zhe-continuous', n: 13, level: 'intermediate',
      title: '着 — длящееся состояние',
      summary: '着 после глагола = «находится в состоянии».',
      structure: 'S + V + 着 + (O)',
      explain: '着 описывает состояние, которое длится: 他坐着.',
      examples: [
        { ok: true,  text: '他坐着。',   note: 'он сидит.' },
        { ok: false, text: '着他坐。',   note: '着 после глагола.' },
      ],
    },
    {
      id: 'measure-word', n: 14, level: 'intermediate',
      title: 'Счётное слово между числом и существительным',
      summary: 'Число + счётное слово + существительное.',
      structure: 'Num + MW + N',
      explain: 'Между числительным и существительным обязательно ставится счётное слово.',
      examples: [
        { ok: true,  text: '一本书',     note: 'одна книга.' },
        { ok: false, text: '一书',       note: 'без счётного слова нельзя.' },
      ],
    },
    {
      id: 'modal-before-verb', n: 15, level: 'intermediate',
      title: 'Модальный глагол — перед основным',
      summary: '能 / 会 / 想 / 要 — перед глаголом.',
      structure: 'S + Modal + V + (O)',
      explain: 'Модальные глаголы всегда стоят ПЕРЕД основным.',
      examples: [
        { ok: true,  text: '我会说汉语。',   note: 'я умею говорить.' },
        { ok: false, text: '我喝茶会。',     note: 'модальный — перед глаголом.' },
      ],
    },
    {
      id: 'time-before-verb', n: 16, level: 'intermediate',
      title: 'Обстоятельство времени — перед глаголом',
      summary: 'Время раньше места, место — раньше глагола.',
      structure: 'S + [Время] + [Место] + V + O',
      explain: 'Сначала время (когда?), потом место (где?), потом глагол.',
      examples: [
        { ok: true,  text: '我今天去学校。', note: 'я сегодня иду в школу.' },
        { ok: false, text: '我去学校今天。', note: 'время — перед глаголом.' },
      ],
    },
    {
      id: 'ba-construction', n: 17, level: 'advanced',
      title: '把-конструкция',
      summary: '把 переносит объект перед глаголом.',
      structure: 'S + 把 + O + V + (результат)',
      explain: '把 используется, когда важно подчеркнуть, что делают с объектом.',
      examples: [
        { ok: true,  text: '我把书看了。',   note: 'я прочитал книгу.' },
        { ok: false, text: '我把书看。',     note: 'после глагола должно быть дополнение.' },
      ],
    },
    {
      id: 'bei-construction', n: 18, level: 'advanced',
      title: '被-конструкция',
      summary: '被 превращает предложение в пассив.',
      structure: 'S + 被 + [кем] + V + (результат)',
      explain: '被 — показатель пассива.',
      examples: [
        { ok: true,  text: '门被他关上了。', note: 'дверь закрыта им.' },
        { ok: false, text: '被他了。',       note: 'нужен глагол.' },
      ],
    },
    {
      id: 'bi-comparison', n: 19, level: 'advanced',
      title: '比-конструкция',
      summary: '比 сравнивает два объекта.',
      structure: 'A + 比 + B + Adj',
      explain: '比 означает «А имеет больше какого-то качества, чем В». 很 не ставится.',
      examples: [
        { ok: true,  text: '我比他高。',       note: 'я выше него.' },
        { ok: false, text: '我比他很高。',     note: '很 не ставится с 比.' },
      ],
    },
    {
      id: 'result-complement', n: 20, level: 'advanced',
      title: 'Результативное дополнение',
      summary: 'После глагола — что получилось.',
      structure: 'S + V + 完/好/到/见 + (O)',
      explain: 'Часто указывают результат действия после глагола.',
      examples: [
        { ok: true,  text: '我吃完饭了。',   note: 'я закончил есть.' },
        { ok: true,  text: '他看见我了。',   note: 'он меня увидел.' },
      ],
    },
    {
      id: 'you-before-verb', n: 21, level: 'advanced',
      title: '再 / 又 / 还 — перед глаголом',
      summary: 'Наречия частоты — перед глаголом.',
      structure: 'S + 再/又/还 + V',
      explain: '再 (снова), 又 (опять), 还 (ещё) идут ПЕРЕД глаголом.',
      examples: [
        { ok: true,  text: '我再去一次。',   note: 'я схожу ещё раз.' },
        { ok: true,  text: '他又来了。',     note: 'он опять пришёл.' },
      ],
    },
    {
      id: 'adj-attr-with-de', n: 22, level: 'advanced',
      title: 'Прилагательное-определение — с 的',
      summary: 'Короткие — можно без 的, длинные — только с 的.',
      structure: 'Adj + (的) + N',
      explain: 'Односложные без 的, двусложные — обычно с 的.',
      examples: [
        { ok: true,  text: '好人',         note: 'хороший человек.' },
        { ok: true,  text: '漂亮的人',     note: 'красивый человек.' },
      ],
    },
    {
      id: 'double-object', n: 23, level: 'advanced',
      title: 'Два объекта подряд',
      summary: 'Некоторые глаголы берут два объекта.',
      structure: 'S + V + [кому] + [что]',
      explain: 'Глаголы 给, 教, 问, 送 могут брать два объекта.',
      examples: [
        { ok: true,  text: '我给你书。',   note: 'я даю тебе книгу.' },
        { ok: true,  text: '他问我名字。', note: 'он спросил моё имя.' },
      ],
    },
    {
      id: 'structural-de', n: 24, level: 'advanced',
      title: '是…的 — выделение',
      summary: '是…的 подчёркивает обстоятельство.',
      structure: 'S + 是 + [обстоятельство] + V + 的',
      explain: 'Конструкция 是…的 используется, чтобы подчеркнуть когда/где/как что-то произошло.',
      examples: [
        { ok: true,  text: '我是昨天来的。',   note: 'я приехал именно вчера.' },
      ],
    },
    {
      id: 'punctuation', n: 25, level: 'basic',
      title: 'Знак препинания — в конце',
      summary: '？ — вопрос, ！ — восклицание, 。 — утверждение.',
      structure: '… + 。 / ？ / ！',
      explain: 'Китайские знаки: 。 ？ ！',
      examples: [
        { ok: true,  text: '我是学生。',  note: 'утверждение.' },
        { ok: true,  text: '你好吗？',    note: 'вопрос.' },
      ],
    },
  ];

  function getRules(filter) {
    const all = RULES.map(r => ({ ...r }));
    if (!filter) return all;
    if (filter === 'basic' || filter === 'intermediate' || filter === 'advanced') {
      return all.filter(r => r.level === filter);
    }
    return all;
  }

  function getRuleById(id) {
    return RULES.find(r => r.id === id) || null;
  }

  function checkText(text) {
    const original = (text || '').trim();

    if (!original) {
      return makeError(
        'subject-first',
        'Введите предложение — например: 我是学生。',
        'Начните с простого: подлежащее + сказуемое + объект.',
        'Самое простое китайское предложение состоит из трёх частей: кто + что делает + что.',
        ['我是学生。', '我喝茶。', '我很好。']
      );
    }

    const dict = buildDict();
    const tokens = tokenize(original, dict);
    const roles = tokens.map(t => t.role);
    const type = detectType(original);
    const len = tokens.length;

    if (len <= 1) {
      return makePartial(
        'Слишком коротко для проверки.',
        'Проверка работает с предложениями из 2+ слов.',
        'Попробуйте ввести целое предложение — например, 我喝茶。',
        ['我是学生。', '我喝茶。']
      );
    }

    const unknownCount = roles.filter(r => r === 'unknown').length;
    const unknownPercent = unknownCount / len;
    if (unknownPercent > 0.4) {
      return makePartial(
        'Много слов вне словаря — не могу проверить полностью.',
        'Проверка основана на словаре проекта. Чем больше слов знает словарь, тем точнее проверка.',
        'Добавьте незнакомые слова через «Добавить слово» — и проверка станет точнее.',
        ['我是学生。', '我喝茶。']
      );
    }

    /* ============================================================
       СБОР КРИТИЧНЫХ ОШИБОК И ПРЕДУПРЕЖДЕНИЙ
       ============================================================ */
    const criticals = [];
    const warnings = [];

    /* a0) 比 + 很 — несовместимы */
    const hasBi  = tokens.some(t => t.w === '比');
    const hasHen = tokens.some(t => t.w === '很');
    if (hasBi && hasHen) {
      criticals.push(makeError(
        'bi-comparison',
        'В сравнении с 比 частица 很 не используется.',
        '比 уже означает «более чем», 很 лишний.',
        'Правильно: 我比他高 (без 很).',
        ['我比他高。', '他比我忙。']
      ));
    }

    /* a) 吗 не в самом конце */
    const qIdx = roles.indexOf('q');
    if (qIdx !== -1 && qIdx !== len - 1) {
      criticals.push(makeError(
        'q-at-end',
        '吗 стоит не в самом конце.',
        '吗 ВСЕГДА в самом конце предложения.',
        '吗 превращает предложение в общий вопрос и должна стоять после всего.',
        ['你是学生吗？', '你喝茶吗？']
      ));
    }

    /* b) 了 / 过 / 着 в начале */
    if (roles[0] === 'part-le' || roles[0] === 'part-guo' || roles[0] === 'part-zhe') {
      const ch = tokens[0].w;
      const ruleId = roles[0] === 'part-le' ? 'le-completion'
                   : roles[0] === 'part-guo' ? 'guo-experience'
                   : 'zhe-continuous';
      criticals.push(makeError(
        ruleId,
        `${ch} не может быть в начале предложения.`,
        `${ch} ставится после глагола.`,
        'Частицы времени и аспекта — после глагола.',
        ch === '了' ? ['我吃了饭。']
          : ch === '过' ? ['我去过中国。']
          : ['他坐着。']
      ));
    }

    /* c) 不 + 有 (без 没) */
    if (roles.includes('neg') && roles.includes('have')) {
      const hasNegMei = tokens.some(t => t.w === '没' || t.w === '没有');
      if (!hasNegMei) {
        criticals.push(makeError(
          'bu-with-you',
          'С 有 нельзя использовать 不.',
          'У глагола 有 особое отрицание — 没. Правильно: 没有.',
          'Отрицание «иметь» — историческое исключение.',
          ['我没有书。', '他没有钱。']
        ));
      }
    }

    /* d) Подлежащее не в начале (кроме времени / места / союза) */
    const first = roles[0];
    const allowedFirst = ['subj', 'time', 'place', 'unknown', 'conj'];
    if (!allowedFirst.includes(first)) {
      criticals.push(makeError(
        'subject-first',
        'Предложение начинается не с подлежащего.',
        'Китайское предложение начинается с того, о ком речь: 我, 你, 他, 她, 我们…',
        'Порядок слов в китайском фиксирован. Подлежащее — всегда первое.',
        ['我是学生。', '我喝茶。']
      ));
    }

    /* e) 很 прямо перед 是 — грубая ошибка */
    const intensIdx = roles.indexOf('intens');
    if (intensIdx !== -1) {
      const afterIntens = roles[intensIdx + 1];
      if (afterIntens === 'copula' && tokens[intensIdx].w === '很') {
        criticals.push(makeError(
          'hen-with-adj',
          '很 не ставится перед 是.',
          '很 работает только с прилагательными.',
          'Со связкой 是 он не используется.',
          ['我是学生。', '我很好。']
        ));
      }
    }

    /* a1) 是 + обстоятельство времени + V без 的 — вероятно 是…的 */
    const shiIdx = tokens.findIndex(t => t.w === '是');
    if (shiIdx !== -1) {
      const hasDe   = tokens.some(t => t.w === '的');
      const hasTime = tokens.some(t => t.role === 'time');
      const hasVerbNotShi = tokens.some(t => t.role === 'verb' && t.w !== '是');
      if (hasTime && hasVerbNotShi && !hasDe) {
        warnings.push(makeWarning(
          'structural-de',
          'Если подчёркивается обстоятельство (когда / где / как), используйте 是…的.',
          'S + 是 + [обстоятельство] + V + 的',
          'Например: 我是昨天来的 (я приехал именно вчера), а не 我是昨天来.',
          ['我是昨天来的。', '他是坐飞机来的。']
        ));
      }
    }

    /* a2) 再 / 又 / 还 не перед глаголом */
    const FREQ_WORDS = ['再', '又', '还'];
    for (let i = 0; i < tokens.length; i++) {
      if (FREQ_WORDS.includes(tokens[i].w)) {
        const nextRole = roles[i + 1];
        if (nextRole &&
            !['verb', 'modal', 'have', 'neg', 'adv', 'unknown'].includes(nextRole)) {
          warnings.push(makeWarning(
            'you-before-verb',
            `${tokens[i].w} обычно стоит перед глаголом.`,
            '再 / 又 / 还 + V',
            'Это наречия частоты — они идут перед действием.',
            ['我再去一次。', '他又来了。', '我还要喝茶。']
          ));
        }
        break;
      }
    }

    /* a) Нет сказуемого */
    const hasPredicate = roles.some(r =>
      ['verb', 'copula', 'adj', 'have', 'modal'].includes(r)
    );
    if (!hasPredicate) {
      warnings.push(makeWarning(
        'has-predicate',
        'Возможно, в предложении нет сказуемого.',
        'Обычно между подлежащим и объектом стоит глагол, 是 или прилагательное.',
        'Китайское предложение редко состоит только из двух существительных.',
        ['我是学生。', '我喝茶。']
      ));
    }

    /* b) 不 после сказуемого */
    const negIdx = roles.indexOf('neg');
    const firstPredIdx = roles.findIndex(r =>
      ['verb', 'copula', 'adj', 'have', 'modal'].includes(r)
    );
    if (negIdx !== -1 && firstPredIdx !== -1 && negIdx > firstPredIdx) {
      warnings.push(makeWarning(
        'neg-position',
        '不 стоит после сказуемого — вероятно ошибка.',
        '不 обычно идёт ПЕРЕД глаголом.',
        'Отрицание — перед тем, что отрицается.',
        ['我不喝茶。', '我不是学生。']
      ));
    }

    /* c) 很 в отрицании — ошибка. 不太 и 别太 — правильные. */
    if (intensIdx !== -1
        && tokens[intensIdx].w === '很'
        && intensIdx > 0
        && roles[intensIdx - 1] === 'neg') {
      warnings.push(makeWarning(
        'hen-with-adj',
        'В отрицании 很 обычно не используется.',
        'Правильно: 我不忙 (не 我不很忙). 不太 / 别太 — можно.',
        '在否定句中，很 通常省略；不太 / 别太 是固定搭配。',
        ['我不忙。', '我不太忙。', '别太快。']
      ));
    }

    /* c2) 很 перед глаголом / 是 */
    if (intensIdx !== -1 && tokens[intensIdx].w === '很') {
      const after = roles[intensIdx + 1];
      if (after && after !== 'adj') {
        warnings.push(makeWarning(
          'hen-with-adj',
          '很 стоит не перед прилагательным.',
          '很 используется только с прилагательными: 很 + Adj.',
          'С глаголами 很 не используется.',
          ['我很好。', '他很忙。']
        ));
      }
    }

    /* d) 的 не перед существительным */
    const deIdx = roles.indexOf('de');
    if (deIdx !== -1) {
      const afterDe = roles[deIdx + 1];
      if (afterDe && afterDe !== 'noun' && afterDe !== 'adj' && afterDe !== 'unknown') {
        warnings.push(makeWarning(
          'de-position',
          'После 的 обычно идёт существительное.',
          '的 стоит между определением и существительным.',
          '我的书, 好的学生.',
          ['我的书', '好的学生']
        ));
      }
    }

    /* e) Глагол без объекта */
    const verbIdx = roles.indexOf('verb');
    const endsWithVerb = verbIdx === len - 1;
    if (endsWithVerb && type !== 'question') {
      warnings.push(makeWarning(
        'object-after-verb',
        'После глагола не хватает объекта.',
        'После глагола обычно идёт объект — что? кого?',
        '我喝 — незаконченно; 我喝茶 — полное.',
        ['我喝茶。', '他看电影。']
      ));
    }

    /* f) Модальный не перед глаголом */
    const modalIdx = roles.indexOf('modal');
    if (modalIdx !== -1) {
      const afterModal = roles[modalIdx + 1];
      if (afterModal && !['verb', 'have', 'copula', 'unknown', 'adv', 'neg'].includes(afterModal)) {
        warnings.push(makeWarning(
          'modal-before-verb',
          'Модальный глагол стоит не перед основным.',
          '能 / 会 / 想 / 要 — перед основным глаголом.',
          'S + Modal + V + O',
          ['我会说汉语。', '我想喝茶。']
        ));
      }
    }

    /* ============================================================
       ВЫБОР ОТВЕТА
       ============================================================ */
    if (criticals.length > 0) return criticals[0];

    if (len >= 7 && warnings.length > 0) {
      return makePartial(
        'Длинное предложение — не могу проверить полностью.',
        warnings[0].rule,
        warnings[0].explain + ' Но в целом структура не вызывает критичных сомнений.',
        warnings[0].examples
      );
    }

    if (warnings.length > 0) return warnings[0];

    return makeOk(
      'Соблюдены основные правила порядка слов, отрицания и частиц.',
      [original.endsWith('。') || /[.?!？！]$/.test(original) ? original : original + '。']
    );
  }

  return {
    tokenize,
    checkText,
    getRules,
    getRuleById,
    buildDict,
  };
})();