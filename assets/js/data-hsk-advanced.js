/**
 * HanziPath — расширенные уровни HSK 3, HSK 4, HSK 5, HSK 6.
 *
 * Этот файл ДОПОЛНЯЕТ базовый data.js (HSK 1 + HSK 2).
 * Он подключается в index.html сразу после data.js.
 *
 * Формат слова:
 *   {
 *     word: '包子',
 *     pinyin: 'bāo zi',
 *     translation: 'баоцзы (паровые пирожки)',
 *     examples: [
 *       { zh: '我早上吃包子。', pinyin: 'wǒ zǎo shang chī bāo zi', ru: 'утром я ем баоцзы' }
 *     ]
 *   }
 *
 * Стартовые наборы ниже — это около 15 слов на уровень.
 * Чтобы добавить свои слова — допишите их в нужный массив.
 */

(function () {
  window.HP_WORDS_BY_LEVEL = window.HP_WORDS_BY_LEVEL || {};

  /* ============================================================
     HSK 3 — стартовый набор
     ============================================================ */
  window.HP_WORDS_BY_LEVEL.hsk3 = [
    { word: '阿姨', pinyin: 'ā yí', translation: 'тётя (по возрасту матери)',
      examples: [
        { zh: '阿姨对我很好。', pinyin: 'ā yí duì wǒ hěn hǎo', ru: 'тётя очень добра ко мне' }
      ] },
    { word: '啊', pinyin: 'a', translation: '[восклицательная частица]',
      examples: [
        { zh: '啊，原来是这样！', pinyin: 'a, yuán lái shì zhè yàng', ru: 'а, вот оно как!' }
      ] },
    { word: '矮', pinyin: 'ǎi', translation: 'низкий (о росте)',
      examples: [
        { zh: '他比我矮。', pinyin: 'tā bǐ wǒ ǎi', ru: 'он ниже меня' }
      ] },
    { word: '爱好', pinyin: 'ài hào', translation: 'увлечение, хобби',
      examples: [
        { zh: '我的爱好是看书。', pinyin: 'wǒ de ài hào shì kàn shū', ru: 'моё хобби — чтение' }
      ] },
    { word: '安静', pinyin: 'ān jìng', translation: 'тихий, спокойный',
      examples: [
        { zh: '教室里很安静。', pinyin: 'jiào shì lǐ hěn ān jìng', ru: 'в классе тихо' }
      ] },
    { word: '搬', pinyin: 'bān', translation: 'переезжать, переносить',
      examples: [
        { zh: '我下周要搬家。', pinyin: 'wǒ xià zhōu yào bān jiā', ru: 'на следующей неделе я переезжаю' }
      ] },
    { word: '班', pinyin: 'bān', translation: 'класс, группа',
      examples: [
        { zh: '我们班有二十个学生。', pinyin: 'wǒ men bān yǒu èr shí ge xué sheng', ru: 'в нашем классе двадцать учеников' }
      ] },
    { word: '办法', pinyin: 'bàn fǎ', translation: 'способ, метод',
      examples: [
        { zh: '我有一个好办法。', pinyin: 'wǒ yǒu yí ge hǎo bàn fǎ', ru: 'у меня есть хороший способ' }
      ] },
    { word: '办公室', pinyin: 'bàn gōng shì', translation: 'офис, кабинет',
      examples: [
        { zh: '他在办公室工作。', pinyin: 'tā zài bàn gōng shì gōng zuò', ru: 'он работает в офисе' }
      ] },
    { word: '帮忙', pinyin: 'bāng máng', translation: 'помогать',
      examples: [
        { zh: '你能帮我一个忙吗？', pinyin: 'nǐ néng bāng wǒ yí ge máng ma', ru: 'можешь мне помочь?' }
      ] },
    { word: '包', pinyin: 'bāo', translation: 'сумка; упаковывать',
      examples: [
        { zh: '这个包很贵。', pinyin: 'zhè ge bāo hěn guì', ru: 'эта сумка дорогая' }
      ] },
    { word: '北方', pinyin: 'běi fāng', translation: 'север, северная часть',
      examples: [
        { zh: '北方的冬天很冷。', pinyin: 'běi fāng de dōng tiān hěn lěng', ru: 'на севере зимой очень холодно' }
      ] },
    { word: '被', pinyin: 'bèi', translation: '[пассивная частица]; одеяло',
      examples: [
        { zh: '苹果被他吃了。', pinyin: 'píng guǒ bèi tā chī le', ru: 'яблоко было съедено им' }
      ] },
    { word: '鼻子', pinyin: 'bí zi', translation: 'нос',
      examples: [
        { zh: '他的鼻子很高。', pinyin: 'tā de bí zi hěn gāo', ru: 'у него высокий нос' }
      ] },
    { word: '比较', pinyin: 'bǐ jiào', translation: 'сравнительно, довольно',
      examples: [
        { zh: '今天比较热。', pinyin: 'jīn tiān bǐ jiào rè', ru: 'сегодня довольно жарко' }
      ] },
    { word: '比赛', pinyin: 'bǐ sài', translation: 'соревнование, матч',
      examples: [
        { zh: '明天有一场足球比赛。', pinyin: 'míng tiān yǒu yì chǎng zú qiú bǐ sài', ru: 'завтра футбольный матч' }
      ] },
    { word: '笔记本', pinyin: 'bǐ jì běn', translation: 'тетрадь; ноутбук',
      examples: [
        { zh: '我买了一个新笔记本。', pinyin: 'wǒ mǎi le yí ge xīn bǐ jì běn', ru: 'я купил новый ноутбук' }
      ] },
    { word: '变化', pinyin: 'biàn huà', translation: 'изменение, меняться',
      examples: [
        { zh: '这里的变化很大。', pinyin: 'zhè lǐ de biàn huà hěn dà', ru: 'здесь большие изменения' }
      ] },
    { word: '表示', pinyin: 'biǎo shì', translation: 'выражать, показывать',
      examples: [
        { zh: '他点了点头，表示同意。', pinyin: 'tā diǎn le diǎn tóu, biǎo shì tóng yì', ru: 'он кивнул, выражая согласие' }
      ] },
    { word: '表演', pinyin: 'biǎo yǎn', translation: 'выступление, выступать',
      examples: [
        { zh: '她的表演很精彩。', pinyin: 'tā de biǎo yǎn hěn jīng cǎi', ru: 'её выступление было блестящим' }
      ] },
  ];

  /* ============================================================
     HSK 4 — стартовый набор
     ============================================================ */
  window.HP_WORDS_BY_LEVEL.hsk4 = [
    { word: '爱情', pinyin: 'ài qíng', translation: 'любовь (романтическая)',
      examples: [
        { zh: '爱情需要两个人一起努力。', pinyin: 'ài qíng xū yào liǎng ge rén yì qǐ nǔ lì', ru: 'любовь требует усилий обоих' }
      ] },
    { word: '安排', pinyin: 'ān pái', translation: 'планировать, распоряжаться',
      examples: [
        { zh: '周末你有什么安排？', pinyin: 'zhōu mò nǐ yǒu shén me ān pái', ru: 'какие у тебя планы на выходные?' }
      ] },
    { word: '安全', pinyin: 'ān quán', translation: 'безопасный, безопасность',
      examples: [
        { zh: '这里很安全。', pinyin: 'zhè lǐ hěn ān quán', ru: 'здесь безопасно' }
      ] },
    { word: '按时', pinyin: 'àn shí', translation: 'вовремя, точно по времени',
      examples: [
        { zh: '请按时交作业。', pinyin: 'qǐng àn shí jiāo zuò yè', ru: 'сдавайте работу вовремя' }
      ] },
    { word: '按照', pinyin: 'àn zhào', translation: 'согласно, по',
      examples: [
        { zh: '按照计划，我们明天出发。', pinyin: 'àn zhào jì huà, wǒ men míng tiān chū fā', ru: 'по плану мы выезжаем завтра' }
      ] },
    { word: '百分之', pinyin: 'bǎi fēn zhī', translation: 'процент',
      examples: [
        { zh: '百分之八十的学生通过了考试。', pinyin: 'bǎi fēn zhī bā shí de xué sheng tōng guò le kǎo shì', ru: 'восемьдесят процентов учеников сдали экзамен' }
      ] },
    { word: '保护', pinyin: 'bǎo hù', translation: 'защищать, охранять',
      examples: [
        { zh: '我们要保护环境。', pinyin: 'wǒ men yào bǎo hù huán jìng', ru: 'мы должны защищать природу' }
      ] },
    { word: '保证', pinyin: 'bǎo zhèng', translation: 'гарантировать, гарантия',
      examples: [
        { zh: '我保证明天准时到。', pinyin: 'wǒ bǎo zhèng míng tiān zhǔn shí dào', ru: 'гарантирую прийти вовремя завтра' }
      ] },
    { word: '报名', pinyin: 'bào míng', translation: 'записываться, регистрироваться',
      examples: [
        { zh: '我已经报名参加比赛了。', pinyin: 'wǒ yǐ jīng bào míng cān jiā bǐ sài le', ru: 'я уже записался на соревнование' }
      ] },
    { word: '抱歉', pinyin: 'bào qiàn', translation: 'извиняться, сожалеть',
      examples: [
        { zh: '很抱歉，我来晚了。', pinyin: 'hěn bào qiàn, wǒ lái wǎn le', ru: 'извините, я опоздал' }
      ] },
    { word: '倍', pinyin: 'bèi', translation: 'раз (во сколько), -кратный',
      examples: [
        { zh: '这个比那个贵一倍。', pinyin: 'zhè ge bǐ nà ge guì yí bèi', ru: 'это вдвое дороже того' }
      ] },
    { word: '本来', pinyin: 'běn lái', translation: 'изначально, собственно',
      examples: [
        { zh: '我本来想去，可是下雨了。', pinyin: 'wǒ běn lái xiǎng qù, kě shì xià yǔ le', ru: 'я собирался пойти, но пошёл дождь' }
      ] },
    { word: '毕业', pinyin: 'bì yè', translation: 'окончить учебное заведение',
      examples: [
        { zh: '他去年大学毕业了。', pinyin: 'tā qù nián dà xué bì yè le', ru: 'он окончил университет в прошлом году' }
      ] },
    { word: '遍', pinyin: 'biàn', translation: 'раз (от начала до конца)',
      examples: [
        { zh: '这本书我看了三遍。', pinyin: 'zhè běn shū wǒ kàn le sān biàn', ru: 'я прочитал эту книгу три раза' }
      ] },
    { word: '标准', pinyin: 'biāo zhǔn', translation: 'стандарт, норма',
      examples: [
        { zh: '他的发音很标准。', pinyin: 'tā de fā yīn hěn biāo zhǔn', ru: 'у него образцовое произношение' }
      ] },
    { word: '表格', pinyin: 'biǎo gé', translation: 'таблица, бланк',
      examples: [
        { zh: '请填一下这张表格。', pinyin: 'qǐng tián yí xià zhè zhāng biǎo gé', ru: 'пожалуйста, заполните эту таблицу' }
      ] },
    { word: '冰箱', pinyin: 'bīng xiāng', translation: 'холодильник',
      examples: [
        { zh: '牛奶放在冰箱里。', pinyin: 'niú nǎi fàng zài bīng xiāng lǐ', ru: 'молоко в холодильнике' }
      ] },
    { word: '博士', pinyin: 'bó shì', translation: 'доктор наук',
      examples: [
        { zh: '他是博士。', pinyin: 'tā shì bó shì', ru: 'он доктор наук' }
      ] },
    { word: '不但', pinyin: 'bú dàn', translation: 'не только',
      examples: [
        { zh: '他不但聪明，而且努力。', pinyin: 'tā bú dàn cōng ming, ér qiě nǔ lì', ru: 'он не только умён, но и трудолюбив' }
      ] },
    { word: '不得不', pinyin: 'bù dé bù', translation: 'быть вынужденным',
      examples: [
        { zh: '我不得不加班。', pinyin: 'wǒ bù dé bù jiā bān', ru: 'мне приходится работать сверхурочно' }
      ] },
  ];

  /* ============================================================
     HSK 5 — стартовый набор
     ============================================================ */
  window.HP_WORDS_BY_LEVEL.hsk5 = [
    { word: '爱护', pinyin: 'ài hù', translation: 'беречь, заботиться',
      examples: [
        { zh: '我们要爱护公共设施。', pinyin: 'wǒ men yào ài hù gōng gòng shè shī', ru: 'мы должны беречь общественные объекты' }
      ] },
    { word: '安慰', pinyin: 'ān wèi', translation: 'утешать, успокаивать',
      examples: [
        { zh: '她安慰我说没关系。', pinyin: 'tā ān wèi wǒ shuō méi guān xi', ru: 'она утешила меня, что ничего страшного' }
      ] },
    { word: '安装', pinyin: 'ān zhuāng', translation: 'устанавливать, монтировать',
      examples: [
        { zh: '请帮我安装这个软件。', pinyin: 'qǐng bāng wǒ ān zhuāng zhè ge ruǎn jiàn', ru: 'пожалуйста, помогите установить эту программу' }
      ] },
    { word: '岸', pinyin: 'àn', translation: 'берег',
      examples: [
        { zh: '我们坐在河边岸上。', pinyin: 'wǒ men zuò zài hé biān àn shàng', ru: 'мы сидим на берегу реки' }
      ] },
    { word: '把握', pinyin: 'bǎ wò', translation: 'уверенность, держать',
      examples: [
        { zh: '我对这次考试很有把握。', pinyin: 'wǒ duì zhè cì kǎo shì hěn yǒu bǎ wò', ru: 'я уверен в этом экзамене' }
      ] },
    { word: '摆', pinyin: 'bǎi', translation: 'ставить, класть; размахивать',
      examples: [
        { zh: '桌子上摆着很多书。', pinyin: 'zhuō zi shàng bǎi zhe hěn duō shū', ru: 'на столе разложено много книг' }
      ] },
    { word: '办理', pinyin: 'bàn lǐ', translation: 'оформлять, проводить',
      examples: [
        { zh: '我需要去银行办理业务。', pinyin: 'wǒ xū yào qù yín háng bàn lǐ yè wù', ru: 'мне нужно сходить в банк по делам' }
      ] },
    { word: '包含', pinyin: 'bāo hán', translation: 'включать, содержать',
      examples: [
        { zh: '价格包含运费。', pinyin: 'jià gé bāo hán yùn fèi', ru: 'цена включает доставку' }
      ] },
    { word: '包括', pinyin: 'bāo kuò', translation: 'включая, в том числе',
      examples: [
        { zh: '我们班有二十个人，包括三个外国人。', pinyin: 'wǒ men bān yǒu èr shí ge rén, bāo kuò sān ge wài guó rén', ru: 'в нашем классе двадцать человек, включая трёх иностранцев' }
      ] },
    { word: '保重', pinyin: 'bǎo zhòng', translation: 'беречь себя',
      examples: [
        { zh: '路上小心，保重！', pinyin: 'lù shàng xiǎo xīn, bǎo zhòng', ru: 'осторожно в дороге, береги себя!' }
      ] },
    { word: '宝贵', pinyin: 'bǎo guì', translation: 'драгоценный, ценный',
      examples: [
        { zh: '时间非常宝贵。', pinyin: 'shí jiān fēi cháng bǎo guì', ru: 'время очень дорого' }
      ] },
    { word: '保持', pinyin: 'bǎo chí', translation: 'поддерживать, сохранять',
      examples: [
        { zh: '请保持安静。', pinyin: 'qǐng bǎo chí ān jìng', ru: 'пожалуйста, соблюдайте тишину' }
      ] },
    { word: '报到', pinyin: 'bào dào', translation: 'регистрироваться, являться',
      examples: [
        { zh: '新生明天报到。', pinyin: 'xīn shēng míng tiān bào dào', ru: 'новые студенты регистрируются завтра' }
      ] },
    { word: '报道', pinyin: 'bào dào', translation: 'сообщать, репортаж',
      examples: [
        { zh: '新闻里报道了这件事。', pinyin: 'xīn wén lǐ bào dào le zhè jiàn shì', ru: 'об этом сообщили в новостях' }
      ] },
    { word: '报告', pinyin: 'bào gào', translation: 'доклад, отчёт',
      examples: [
        { zh: '他做了一场精彩的报告。', pinyin: 'tā zuò le yì chǎng jīng cǎi de bào gào', ru: 'он сделал блестящий доклад' }
      ] },
    { word: '暴力', pinyin: 'bào lì', translation: 'насилие',
      examples: [
        { zh: '我们反对一切暴力。', pinyin: 'wǒ men fǎn duì yí qiè bào lì', ru: 'мы против любого насилия' }
      ] },
    { word: '悲观', pinyin: 'bēi guān', translation: 'пессимистичный',
      examples: [
        { zh: '不要太悲观，一切都会好的。', pinyin: 'bú yào tài bēi guān, yí qiè dōu huì hǎo de', ru: 'не будь пессимистом, всё будет хорошо' }
      ] },
    { word: '背景', pinyin: 'bèi jǐng', translation: 'фон, предыстория',
      examples: [
        { zh: '他的家庭背景很好。', pinyin: 'tā de jiā tíng bèi jǐng hěn hǎo', ru: 'у него хорошая семейная предыстория' }
      ] },
    { word: '被子', pinyin: 'bèi zi', translation: 'одеяло',
      examples: [
        { zh: '天冷了，要盖厚被子。', pinyin: 'tiān lěng le, yào gài hòu bèi zi', ru: 'стало холодно, нужно толстое одеяло' }
      ] },
    { word: '本科', pinyin: 'běn kē', translation: 'бакалавриат',
      examples: [
        { zh: '我是本科毕业的。', pinyin: 'wǒ shì běn kē bì yè de', ru: 'я окончил бакалавриат' }
      ] },
  ];

  /* ============================================================
     HSK 6 — стартовый набор
     ============================================================ */
  window.HP_WORDS_BY_LEVEL.hsk6 = [
    { word: '爱不释手', pinyin: 'ài bú shì shǒu', translation: 'не отрываться (от чего-то)',
      examples: [
        { zh: '他对这本书爱不释手。', pinyin: 'tā duì zhè běn shū ài bú shì shǒu', ru: 'он не может оторваться от этой книги' }
      ] },
    { word: '爱戴', pinyin: 'ài dài', translation: 'уважать и любить',
      examples: [
        { zh: '他深受学生爱戴。', pinyin: 'tā shēn shòu xué sheng ài dài', ru: 'студенты его глубоко уважают и любят' }
      ] },
    { word: '安宁', pinyin: 'ān níng', translation: 'спокойствие, мир',
      examples: [
        { zh: '这个小镇很安宁。', pinyin: 'zhè ge xiǎo zhèn hěn ān níng', ru: 'этот городок очень спокойный' }
      ] },
    { word: '安详', pinyin: 'ān xiáng', translation: 'безмятежный',
      examples: [
        { zh: '老人安详地坐着。', pinyin: 'lǎo rén ān xiáng de zuò zhe', ru: 'старик безмятежно сидел' }
      ] },
    { word: '安置', pinyin: 'ān zhì', translation: 'устраивать, размещать',
      examples: [
        { zh: '政府安置了受灾群众。', pinyin: 'zhèng fǔ ān zhì le shòu zāi qún zhòng', ru: 'правительство разместило пострадавших' }
      ] },
    { word: '昂贵', pinyin: 'áng guì', translation: 'дорогой, дорогостоящий',
      examples: [
        { zh: '这件衣服太昂贵了。', pinyin: 'zhè jiàn yī fu tài áng guì le', ru: 'эта одежда слишком дорогая' }
      ] },
    { word: '傲', pinyin: 'ào', translation: 'гордый, надменный',
      examples: [
        { zh: '他性格有点傲。', pinyin: 'tā xìng gé yǒu diǎn ào', ru: 'он немного высокомерен' }
      ] },
    { word: '奥秘', pinyin: 'ào mì', translation: 'тайна, секрет',
      examples: [
        { zh: '科学家揭开了自然的奥秘。', pinyin: 'kē xué jiā jiē kāi le zì rán de ào mì', ru: 'учёные раскрыли тайны природы' }
      ] },
    { word: '巴不得', pinyin: 'bā bù dé', translation: 'очень хотеть, не терпеться',
      examples: [
        { zh: '我巴不得马上回家。', pinyin: 'wǒ bā bù dé mǎ shàng huí jiā', ru: 'мне не терпится поскорее домой' }
      ] },
    { word: '把关', pinyin: 'bǎ guān', translation: 'строго проверять',
      examples: [
        { zh: '产品质量要把关。', pinyin: 'chǎn pǐn zhì liàng yào bǎ guān', ru: 'качество продукции нужно строго контролировать' }
      ] },
    { word: '把手', pinyin: 'bǎ shou', translation: 'ручка, рукоятка',
      examples: [
        { zh: '门的把手坏了。', pinyin: 'mén de bǎ shou huài le', ru: 'дверная ручка сломалась' }
      ] },
    { word: '罢免', pinyin: 'bà miǎn', translation: 'снять с должности',
      examples: [
        { zh: '他被罢免了职务。', pinyin: 'tā bèi bà miǎn le zhí wù', ru: 'его сняли с должности' }
      ] },
    { word: '霸道', pinyin: 'bà dào', translation: 'деспотичный, властный',
      examples: [
        { zh: '他做事很霸道。', pinyin: 'tā zuò shì hěn bà dào', ru: 'он ведёт себя как деспот' }
      ] },
    { word: '掰', pinyin: 'bāi', translation: 'разламывать руками',
      examples: [
        { zh: '他把面包掰成了两半。', pinyin: 'tā bǎ miàn bāo bāi chéng le liǎng bàn', ru: 'он разломил хлеб на две половины' }
      ] },
    { word: '颁布', pinyin: 'bān bù', translation: 'обнародовать, издавать',
      examples: [
        { zh: '政府颁布了新法律。', pinyin: 'zhèng fǔ bān bù le xīn fǎ lǜ', ru: 'правительство обнародовало новый закон' }
      ] },
    { word: '报酬', pinyin: 'bào chou', translation: 'вознаграждение',
      examples: [
        { zh: '这份工作的报酬很高。', pinyin: 'zhè fèn gōng zuò de bào chou hěn gāo', ru: 'оплата за эту работу высокая' }
      ] },
    { word: '抱歉', pinyin: 'bào qiàn', translation: 'сожалеть, извиняться',
      examples: [
        { zh: '实在抱歉，我帮不了你。', pinyin: 'shí zài bào qiàn, wǒ bāng bù liǎo nǐ', ru: 'мне очень жаль, я не могу помочь' }
      ] },
    { word: '暴利', pinyin: 'bào lì', translation: 'сверхприбыль',
      examples: [
        { zh: '这家公司赚取了暴利。', pinyin: 'zhè jiā gōng sī zhuàn qǔ le bào lì', ru: 'эта компания получила сверхприбыль' }
      ] },
    { word: '爆发', pinyin: 'bào fā', translation: 'вспыхнуть, разразиться',
      examples: [
        { zh: '战争突然爆发了。', pinyin: 'zhàn zhēng tū rán bào fā le', ru: 'война внезапно разразилась' }
      ] },
    { word: '卑鄙', pinyin: 'bēi bǐ', translation: 'подлый, низкий',
      examples: [
        { zh: '他的行为很卑鄙。', pinyin: 'tā de xíng wéi hěn bēi bǐ', ru: 'его поведение подлое' }
      ] },
  ];
})();