/* =========================================================
   hada note LP ｜ chatbot.js（AI肌カルテ・段階1）10/24 改訂
   ---------------------------------------------------------
   ・6つの質問の答え＋「今の季節（日付から自動で判定）」を組み合わせて、
     今のケア・暮らし・気持ち・季節のつながりから「あなたの理由」を文章にして返す
   ・文章の根拠：Googleドライブ「4つのつながりと肌の関係（調査メモ・10/24）」
     効果をうたう表現（改善・促進・回復など）は使わない
   ---------------------------------------------------------
   段階1：質問と結果の文章は、このファイルの中に書いてある（サーバー不要・無料）
   段階2：文章をGoogleスプレッドシートから読み込む／段階3：説明文をAIに書いてもらう
   → どの段階でも「画面の動き」はこのまま使えるよう、データと動きを分けて書いている
   ========================================================= */

(() => {
  /* ---------------------------------------------------------
     設定
     --------------------------------------------------------- */
  const CONFIG = {
    mode: "local",                 // "local"＝段階1（このファイルのデータを使う）
    lineUrl: "https://line.me/",   // 公式LINEのURLが決まったら差し替える
    typingMs: 650,                 // 「入力中…」を見せる時間（ミリ秒）
  };

  // 「動きを減らす」設定の人には、入力中の待ち時間を入れない
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, reduceMotion ? 0 : ms));

  /* 効果測定：GTM（Googleタグマネージャー）に渡すイベント */
  window.dataLayer = window.dataLayer || [];
  const track = (event, params = {}) => window.dataLayer.push({ event, ...params });

  /* =========================================================
     データ①：質問
     ---------------------------------------------------------
     score：その答えが「どのつながり」に何点入るか
       life＝暮らし／season＝季節／care＝今のケア／mind＝気持ち
     fact ：結果の文章に入れる「あなたの答え」の言いかえ
     ========================================================= */
  const QUESTIONS = [
    {
      id: "q1_concern",
      text: "いちばん気になっていることは？",
      options: [
        { label: "ハリが足りない", concern: "ハリ不足", key: "hari" },
        { label: "疲れて見える", concern: "疲れ顔", key: "tired", score: { mind: 0.5 } },
        { label: "乾燥しやすい", concern: "乾燥", key: "dry", score: { season: 1 } },
        { label: "赤みやざらつきで、ゆらぎやすい", concern: "肌のゆらぎ", key: "yuragi", score: { season: 1, mind: 0.5 } },
        { label: "なんとなく調子がいまいち", concern: "なんとなくの不調", key: "vague" },
      ],
    },
    {
      id: "q2_sleep",
      text: "最近、何時間くらい眠れていますか？",
      options: [
        { label: "6時間以上", score: {} },
        { label: "5〜6時間", score: { life: 1 }, fact: "眠るのは5〜6時間", chip: "睡眠5〜6時間" },
        { label: "5時間以下", score: { life: 2 }, fact: "眠るのは5時間以下", tag: "sleep", chip: "睡眠5時間以下" },
      ],
    },
    {
      id: "q3_rhythm",
      text: "寝る時刻は、毎日そろっていますか？",
      options: [
        { label: "だいたい同じ", score: {} },
        { label: "日によって1〜2時間ずれる", score: { life: 1 }, fact: "寝る時刻が日によってずれる", tag: "rhythm", chip: "寝る時刻が1〜2時間ずれる" },
        { label: "夜勤やシフトで不規則", score: { life: 2 }, fact: "夜勤やシフトで寝る時刻が不規則", tag: "shift", chip: "夜勤・シフトで不規則" },
      ],
    },
    {
      id: "q4_screen",
      text: "寝る前に、スマホやパソコンを見る時間は？",
      options: [
        { label: "ほとんど見ない", score: {} },
        { label: "30分くらい", score: { life: 0.5 }, chip: "寝る前の画面30分" },
        { label: "1時間以上", score: { life: 1 }, fact: "寝る前に1時間以上画面を見る", tag: "screen", chip: "寝る前の画面1時間以上" },
      ],
    },
    {
      id: "q5_mind",
      text: "ここ最近の気持ちに、近いのは？",
      options: [
        { label: "おだやかに過ごせている", score: {} },
        { label: "少し疲れ気味", score: { mind: 1 }, fact: "少し疲れ気味" },
        { label: "余裕がない日が多い", score: { mind: 2 }, fact: "余裕がない日が多い" },
        { label: "気づくと眉間に力が入っている", score: { mind: 1.5 }, fact: "気づくと眉間に力が入っている", tag: "frown" },
      ],
    },
    {
      id: "q6_care",
      text: "今のスキンケアについて、近いものは？",
      options: [
        { label: "合っているか自信がない", score: { care: 2 }, fact: "今の化粧品が合っているか自信がない", key: "unsure" },
        { label: "化粧品をよく買い足す", score: { care: 2 }, fact: "化粧品をよく買い足している", key: "buy" },
        { label: "季節でケアを変えていない", score: { care: 1, season: 1 }, fact: "季節でケアを変えていない", key: "noseason" },
        { label: "冬は熱めのお湯で洗顔する", score: { care: 1.5 }, fact: "熱めのお湯で洗顔している", tag: "hotwater", key: "hotwater" },
        { label: "必要最低限だけ", score: { care: 1 }, fact: "ケアは必要最低限", key: "minimal" },
      ],
    },
  ];

  /* =========================================================
     データ②：季節（今日の日付から自動で決める）
     transition：季節の変わり目の月は、ゆらぎやすいので点数を足す
     ========================================================= */
  const SEASONS = {
    spring: {
      name: "春", base: 1,
      reason: "冬の乾燥を引きずったまま紫外線が強くなり、花粉やほこりでも肌がゆらぎやすい季節です。環境の変化で、生活リズムも乱れがちです。",
      care: {
        hari: "冬にたまった角質をやさしくオフしてから、今のケアに美容液をプラスして集中的に。乾燥したまま紫外線を浴びないよう、日焼け止めは早めに。",
        tired: "環境の変化で疲れが出やすい季節。いつもよりやさしいお手入れで、塗るときは手のひらで顔を包んでひと呼吸。日焼け止めは早めに。",
        dry: "冬の乾燥を引きずりやすい時期。今のケアに美容液をプラスして、日焼け止めの前にしっかり保湿を。",
        yuragi: "花粉やほこりでゆらぎやすい季節。帰宅したら早めにやさしく洗顔し、角質ケアはお休みして、いつもより刺激の少ないお手入れを。",
        vague: "いつもよりやさしいお手入れを。冬にたまった角質をやさしくオフしてから、今のケアに美容液をプラス。日焼け止めは早めに。",
      },
    },
    summer: {
      name: "夏", base: 1,
      reason: "紫外線から守ろうとして角層が厚くなりやすい季節です。汗やエアコンで乾いているのに、表面は汗や皮脂でベタつきやすくなります。",
      care: {
        hari: "紫外線で角層が厚くなりやすい季節。肌の様子を見ながら角質ケアを取り入れ、化粧水で水分をしっかり。日焼け止めはこまめに塗り直しを。",
        tired: "汗とエアコンで乾きやすい季節。やさしく洗ったあと、化粧水で水分をしっかり。冷えた部屋では、体を冷やしすぎないように。",
        dry: "表面はベタついても、汗とエアコンで内側は乾きやすい季節。化粧水で水分をしっかり入れて、水分と油分のバランスを。",
        yuragi: "汗や皮脂、紫外線で刺激を受けやすい季節。汗はこまめにやさしくおさえ、角質ケアはお休みして、やさしいお手入れを。",
        vague: "汗や皮脂をためこまないよう、やさしく洗ってから化粧水で水分をしっかり。角質ケアは、肌の様子を見ながらときどき取り入れて。",
      },
    },
    autumn: {
      name: "秋", base: 1.5,
      reason: "夏の紫外線の影響や夏の疲れが残り、朝晩の寒暖差で肌がゆらぎやすい季節です。冬の前に、肌の土台を整えておきたい時期です。",
      care: {
        hari: "夏にたまった角質をやさしくオフしてから、今のケアに美容液をプラス。ハリが気になる今こそ、1年でいちばんお手入れを大切にしたい季節です。",
        tired: "夏の疲れが残りやすい時期。角質をやさしくオフしてから、今のケアに美容液をプラス。塗るときは手のひらで顔を包んで、ひと呼吸。",
        dry: "寒暖差で乾きやすくなる時期。今のケアに美容液をプラスして、乾燥しやすいほおや口元は重ねづけを。",
        yuragi: "寒暖差でゆらぎやすい時期。角質ケアはお休みして、いつもよりやさしく。美容液をプラスするなら、肌の様子を見ながら少しずつ。",
        vague: "夏にたまった角質をやさしくオフしてから、今のケアに美容液をプラス。1年でいちばん、お手入れを大切にしたい季節です。",
      },
    },
    winter: {
      name: "冬", base: 1,
      reason: "気温も湿度も下がり、暖房でさらに乾燥する季節です。寒さで血のめぐりが悪くなり、肌のサイクルもゆっくりになると言われています。",
      care: {
        hari: "洗顔はぬるま湯で。化粧水で水分をたっぷり入れたら、クリームでふたを。乾燥したままだと、ハリ不足を感じやすくなります。",
        tired: "寒さで血のめぐりがゆっくりになる季節。湯船で体を温めてから、手のひらで顔を包むようにお手入れを。洗顔はぬるま湯で。",
        dry: "洗顔はぬるま湯で。化粧水を重ねて水分をたっぷり入れ、クリームは必須。暖房の部屋では、湿度も気にしてみて。",
        yuragi: "乾燥で刺激を受けやすい季節。洗顔はぬるま湯でやさしく、こすらずに。クリームでしっかりふたを。",
        vague: "洗顔はぬるま湯で。化粧水で水分をたっぷり入れたら、クリームでふたを。テカるのに乾く人は、水分が足りていないこともあります。",
      },
    },
  };
  const getSeason = (date = new Date()) => {
    const m = date.getMonth() + 1;
    const key = m >= 3 && m <= 5 ? "spring" : m >= 6 && m <= 8 ? "summer" : m >= 9 && m <= 11 ? "autumn" : "winter";
    const transition = [3, 6, 9, 12].includes(m);   // 季節の変わり目の月
    return { key, month: m, transition, ...SEASONS[key] };
  };

  /* =========================================================
     データ③：つながりごとの説明と、暮らしの習慣
     ========================================================= */
  const LINKS = {
    life: {
      name: "暮らし",
      max: 4,   // バーの長さを決めるための満点
      reason: "肌がゆっくり休める時間が短くなっていそうです。肌のための成長ホルモンは、眠り始めの深い眠りのときに多く出ると言われています。",
      rhythm: "寝る時刻がずれると体内時計が乱れ、深く眠りにくくなります。",
    },
    season: { name: "季節", max: 3.5 },
    care: {
      name: "今のケア",
      max: 2.5,
      reason: "化粧品が合っていないというより、量や塗る場所が、今の肌と季節に合っていないのかもしれません。使うアイテムも量も、肌の状態と季節で変わります。",
    },
    mind: {
      name: "気持ち",
      max: 2.5,
      reason: "気持ちに余裕がない日が続くと、肌のうるおいを保つ働きが弱まりやすいと考えられています。眉間に力が入るなどの表情のくせも、しわにつながります。",
    },
  };
  const HABITS = {
    rhythm: "寝る時刻を、まずは毎日そろえることから。寝る前は部屋を暗くしてスマホを置き、眠り始めをぐっすり眠れる環境に。",
    shift: "夜勤の日も、寝る前の流れ（部屋を暗くする・スマホを置く・温かい飲みもの）を毎回そろえて、眠り始めをぐっすり眠れる環境に。",
    sleep: "まずは今より30分早く布団へ。眠り始めの3時間を、ぐっすり眠ることを大切に。",
    screen: "寝る30分前はスマホを伏せて、温かい飲みものを1杯。まずは週に3日から。",
    mind: "鏡を見るたびに、眉間の力をふっと抜いてみる。好きな香りを、気持ちを切りかえるきっかけに。",
    default: "1日のどこかで、温かい飲みものをゆっくり飲む時間を。スキンケアの1分だけ、手を止めて、ていねいに。",
  };
  /* 初回体験で担当者が見ること（3つの部品を組み合わせて1つの文章にする） */
  const STAFF_CHECK = {
    // ① いちばん気になること → 担当者が肌のどこを見るか
    focus: {
      hari: "ほおやフェイスラインのハリ感・乾燥の出方",
      tired: "目元や口元のくすみ・疲れの出方",
      dry: "乾燥しやすい場所・季節による変化",
      yuragi: "赤みやざらつきが出やすい場所・刺激になっていそうなこと",
      vague: "肌全体のうるおい・キメ",
    },
    // ② 今のケアの答え → ケアの何を一緒に確かめるか
    care: {
      unsure: "今お使いのアイテムが今の肌に合っているか、量と塗る場所も一緒に確かめます。",
      buy: "お手持ちのアイテムで、今の季節に使い分けられるものを一緒に整理します。新しく買い足す必要があるかどうかも、正直にお伝えします。",
      noseason: "今のケアを季節に合わせて変えるなら、どこを変えるとよいかを一緒に決めます。",
      hotwater: "洗顔の温度とやり方も、一緒に見直します。",
      minimal: "今の最低限のケアに足すなら、どれを1つ足すとよいかを一緒に考えます。",
      none: "今お使いのアイテムの量と塗る場所を、一緒に確かめます。",
    },
    // ③ いちばん関係していそうなつながり → ひとこと添える
    top: {
      life: "あわせて、眠りや暮らしのリズムで気になることも伺います。",
      season: "季節が変わるときの、お手入れの変え方も一緒に決めます。",
      care: "量や場所は、肌の状態と季節で変わります。",
      mind: "肌にふれる時間を、ほっとできる時間にするコツもお伝えします。",
    },
  };

  // 同点のときに、どれを優先するか（左ほど優先）
  const PRIORITY = ["life", "season", "care", "mind"];

  /* ---------------------------------------------------------
     画面の部品
     --------------------------------------------------------- */
  const dialog = document.getElementById("karteDialog");
  const log = document.getElementById("hnkLog");
  const choices = document.getElementById("hnkChoices");
  const progress = document.getElementById("hnkProgress");
  if (!dialog || !log || !choices) return;   // 部品が無いページでは何もしない

  let state = { started: false, step: 0, answers: [], busy: false };

  /* 要素を作る小さな関数（文字は textContent で入れるので、HTMLとして読まれず安全） */
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const addMessage = (text, who = "bot", extraClass = "") => {
    const p = el("p", `hnk-msg hnk-${who} ${extraClass}`.trim(), text);
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
    return p;
  };

  const botSay = async (text, extraClass) => {
    const typing = addMessage("", "bot", "hnk-typing");
    typing.setAttribute("aria-label", "入力中");
    await wait(CONFIG.typingMs);
    typing.remove();
    return addMessage(text, "bot", extraClass);
  };

  const showChoices = (items) => {
    choices.innerHTML = "";
    items.forEach(({ label, onClick, variant }) => {
      const btn = el("button", `hnk-choice ${variant ? "hnk-" + variant : ""}`.trim(), label);
      btn.type = "button";
      btn.addEventListener("click", onClick);
      choices.appendChild(btn);
    });
    log.scrollTop = log.scrollHeight;
    choices.querySelector("button")?.focus({ preventScroll: true });
  };

  const setProgress = () => {
    if (progress) progress.style.width = `${(state.step / QUESTIONS.length) * 100}%`;
  };

  /* ---------------------------------------------------------
     会話の流れ
     --------------------------------------------------------- */
  const start = async () => {
    state.started = true;
    await botSay("こんにちは。AI肌カルテです。");
    await botSay("6つの質問に、タップで答えるだけ。顔写真はいりません。答えたくない質問は飛ばせます。");
    showChoices([{ label: "はじめる", onClick: () => { choices.innerHTML = ""; ask(); } }]);
  };

  const ask = async () => {
    setProgress();
    const q = QUESTIONS[state.step];
    await botSay(`Q${state.step + 1}. ${q.text}`);
    const items = q.options.map((opt, i) => ({ label: opt.label, onClick: () => answer(i) }));
    if (state.step > 0) items.push({ label: "答えずに次へ", onClick: () => answer(null), variant: "skip" });
    showChoices(items);
  };

  const answer = (index) => {
    if (state.busy) return;   // 連打で2回進まないように
    state.busy = true;
    const q = QUESTIONS[state.step];
    choices.innerHTML = "";
    addMessage(index === null ? "（答えずに次へ）" : q.options[index].label, "user");
    state.answers.push(index);
    track("chat_question", { question_id: q.id, answer: index === null ? "skip" : q.options[index].label });
    state.step++;
    state.busy = false;
    if (state.step < QUESTIONS.length) ask();
    else showResult();
  };

  /* ---------------------------------------------------------
     判定：答えと季節から、4つのつながりの点数を出す
     --------------------------------------------------------- */
  const analyze = () => {
    const season = getSeason();
    const score = { life: 0, season: season.base + (season.transition ? 0.5 : 0), care: 0, mind: 0 };
    const facts = { life: [], care: [], mind: [] };   // 結果の文章に入れる「あなたの答え」
    const tags = new Set();                           // 習慣のアドバイスを選ぶ目印
    const picked = [];                                // 「あなたの回答」として見せるラベル

    state.answers.forEach((index, i) => {
      if (index === null) return;
      const q = QUESTIONS[i];
      const opt = q.options[index];
      Object.entries(opt.score || {}).forEach(([k, v]) => { score[k] += v; });
      if (opt.tag) tags.add(opt.tag);
      if (opt.fact) {
        const group = q.id === "q5_mind" ? "mind" : q.id === "q6_care" ? "care" : "life";
        facts[group].push(opt.fact);
      }
      // 「あなたの回答」には、点数がついた答えと悩みだけを出す（「6時間以上」などは出さない）
      if (i === 0 || Object.keys(opt.score || {}).length) picked.push(opt.chip || opt.label);
    });

    // 満点に対する割合（0〜1）で比べる
    const ratio = {};
    PRIORITY.forEach((k) => { ratio[k] = Math.min(1, score[k] / LINKS[k].max); });
    const ranked = [...PRIORITY].sort((a, b) => ratio[b] - ratio[a] || PRIORITY.indexOf(a) - PRIORITY.indexOf(b));

    const concernOpt = QUESTIONS[0].options[state.answers[0]];
    const concern = concernOpt?.concern || "今の肌の調子";
    const concernKey = concernOpt?.key || "vague";
    const careIndex = state.answers[5];
    const careKey = careIndex === null || careIndex === undefined ? "none" : QUESTIONS[5].options[careIndex].key;
    return { season, score, ratio, ranked, facts, tags, picked, concern, concernKey, careKey };
  };

  /* 見出しの「理由」の言葉 */
  const titlePhrase = (key, a) => {
    if (key === "life") return (a.tags.has("rhythm") || a.tags.has("shift")) && !a.tags.has("sleep") ? "“眠りのリズム”" : "“夜の過ごし方”";
    if (key === "season") return `“${a.season.name}の肌の変化”`;
    if (key === "care") return "“使い方”";
    return "“気持ちの余裕”";
  };

  /* 本文：上位2つのつながりを、答えの言葉を使ってつなげる */
  const buildBody = (a) => {
    const parts = [];
    const [top, second] = a.ranked;
    const use = [top];
    if (a.ratio[second] >= 0.45) use.push(second);   // 2番目も高ければ「重なっていそう」として入れる

    use.forEach((key, n) => {
      const lead = n === 0 ? "" : "そこに、";
      if (key === "life") {
        const f = a.facts.life.length ? `${a.facts.life.join("、")}。` : "";
        parts.push(`${lead}${f}${LINKS.life.reason}${a.tags.has("rhythm") || a.tags.has("shift") ? LINKS.life.rhythm : ""}`);
      } else if (key === "season") {
        parts.push(`${lead}今は${a.season.name}。${a.season.reason}`);
      } else if (key === "care") {
        const f = a.facts.care.length ? `${a.facts.care.join("、")}とのこと。` : "";
        parts.push(`${lead}${f}${LINKS.care.reason}`);
      } else {
        const f = a.facts.mind.length ? `${a.facts.mind.join("、")}とのこと。` : "";
        parts.push(`${lead}${f}${LINKS.mind.reason}`);
      }
    });
    // 季節が上位2つに入っていなくても、一言だけ添える
    if (!use.includes("season")) parts.push(`今は${a.season.name}。季節に合わせて、お手入れも少し変えていきましょう。`);
    return parts;
  };

  /* バーの横に出す一言 */
  const linkLabel = (key, a) => {
    if (key === a.ranked[0]) return "いちばん関係していそう";
    const r = a.ratio[key];
    if (r >= 0.45) return "重なっていそう";
    if (r >= 0.2) return "少し関係していそう";
    return "今回は小さめ";
  };

  /* 暮らしの習慣：答えの中で、いちばん効きそうなものを1つ */
  const pickHabit = (a) => {
    const lifeHigh = a.ranked.indexOf("life") <= 1 && a.ratio.life >= 0.3;
    const mindHigh = a.ranked.indexOf("mind") <= 1 && a.ratio.mind >= 0.4;
    if (lifeHigh && a.tags.has("shift")) return HABITS.shift;
    if (lifeHigh && a.tags.has("rhythm")) return HABITS.rhythm;
    if (lifeHigh && a.tags.has("sleep")) return HABITS.sleep;
    if (lifeHigh && a.tags.has("screen")) return HABITS.screen;
    if (mindHigh) return HABITS.mind;
    if (a.tags.has("screen")) return HABITS.screen;
    return HABITS.default;
  };

  /* カルテ番号：季節の頭文字＋答えの番号（飛ばした質問は 0）。例）HN-A-112-342 */
  const karteCode = (a) => {
    const d = state.answers.map((x) => (x === null ? 0 : x + 1)).join("");
    return `HN-${a.season.key[0].toUpperCase()}-${d.slice(0, 3)}-${d.slice(3)}`;
  };

  /* ---------------------------------------------------------
     結果を表示
     --------------------------------------------------------- */
  const showResult = async () => {
    setProgress();
    const a = analyze();
    await botSay("ありがとうございました。あなたの答えと、今の季節を合わせて読み解きました。");

    const card = el("div", "hnk-result");

    // あなたの回答（タグ）
    card.appendChild(el("p", "hnk-result-label", "あなたの回答"));
    const tagList = el("ul", "hnk-answers");
    [...a.picked, `今の季節：${a.season.name}（${a.season.month}月）`].forEach((t) => tagList.appendChild(el("li", "", t)));
    card.appendChild(tagList);

    // 見出し：「〇〇」の理由は、化粧品より“△△”にあるかもしれません。
    const title = el("p", "hnk-result-title");
    title.append(`「${a.concern}」の理由は、${a.ranked[0] === "care" ? "化粧品そのものより" : "化粧品より"}`);
    title.appendChild(el("mark", "", titlePhrase(a.ranked[0], a)));
    title.append("にあるかもしれません。");
    card.appendChild(title);

    // 本文
    buildBody(a).forEach((t) => card.appendChild(el("p", "hnk-result-body", t)));

    // 4つのつながりのバー
    const links = el("ul", "hnk-links");
    links.setAttribute("aria-label", "4つのつながりの関係の強さ");
    ["life", "season", "care", "mind"].forEach((k) => {
      const li = el("li");
      li.appendChild(el("span", "", LINKS[k].name));
      const bar = el("i");
      bar.style.setProperty("--w", `${Math.max(8, Math.round(a.ratio[k] * 100))}%`);
      li.appendChild(bar);
      li.appendChild(el("em", "", linkLabel(k, a)));
      links.appendChild(li);
    });
    card.appendChild(links);

    // 3つの提案
    // 季節のホームケア：季節 × 悩み。熱いお湯で洗っている人には、ぬるま湯をひとこと（すでに書いてあれば足さない）
    let care = a.season.care[a.concernKey] || a.season.care.vague;
    if (a.tags.has("hotwater") && !care.includes("ぬるま湯")) care += "洗顔は熱いお湯ではなく、ぬるま湯で。";
    // 担当者が見ること：悩み × 今のケア × いちばん関係していそうなつながり
    const staff = `今の肌状態と、${STAFF_CHECK.focus[a.concernKey]}。` +
      STAFF_CHECK.care[a.careKey] +
      // 同じ内容が2回出ないように：ケアが1位でケアの答えがある時／季節が1位で「季節で変えていない」と答えた時は省く
      ((a.ranked[0] === "care" && a.careKey !== "none") || (a.ranked[0] === "season" && a.careKey === "noseason") ? "" : STAFF_CHECK.top[a.ranked[0]]) +
      (a.careKey === "buy" ? "" : "買い足しが必要かどうかも、正直にお伝えします。");
    const advice = [
      [`今の季節（${a.season.name}）のホームケア`, care],
      ["暮らしの小さな習慣", pickHabit(a)],
      ["初回体験で、担当者が一緒に見ること", staff],
    ];
    const dl = el("dl", "hnk-advice");
    advice.forEach(([dt, dd]) => { dl.appendChild(el("dt", "", dt)); dl.appendChild(el("dd", "", dd)); });
    card.appendChild(dl);

    card.appendChild(el("p", "hnk-result-note", "※結果は今の肌の傾向を知る目安です。感じ方には個人差があり、実際の肌は担当者が確かめます。"));
    log.appendChild(card);
    track("chat_result", { result_type: a.ranked[0], result_second: a.ranked[1], season: a.season.key });

    const code = karteCode(a);
    await botSay(`カルテ番号：${code}`, "hnk-code");
    await botSay("予約のときにこの番号を送っていただくと、担当者がこの結果を読んでから施術します。勧誘はしません。");

    showChoices([
      { label: "LINEで初回体験を予約する（5,500円）", variant: "line", onClick: () => {
        track("chat_line_click", { karte_code: code });
        window.open(CONFIG.lineUrl, "_blank", "noopener");
      } },
      { label: "カルテ番号をコピー", variant: "sub", onClick: async (e) => {
        try { await navigator.clipboard.writeText(code); e.target.textContent = "コピーしました"; }
        catch { e.target.textContent = `番号：${code}`; }
      } },
      { label: "初回体験の内容を見る", variant: "sub", onClick: () => {
        dialog.close();
        document.getElementById("menu")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
      } },
      { label: "もう一度やり直す", variant: "skip", onClick: restart },
    ]);
    // 結果は見出しから読んでほしいので、結果カードの先頭までスクロールを戻す
    log.scrollTo({ top: card.offsetTop - log.offsetTop - 12, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const restart = () => {
    log.innerHTML = "";
    choices.innerHTML = "";
    state = { started: false, step: 0, answers: [], busy: false };
    setProgress();
    start();
  };

  /* 開くボタンが押されたら、はじめての時だけ会話を始める（途中で閉じても続きから） */
  document.querySelectorAll(".js-open-karte").forEach((btn) => {
    btn.addEventListener("click", () => {
      track("chat_open", { position: btn.dataset.track || "" });
      if (!state.started) start();
    });
  });
})();
