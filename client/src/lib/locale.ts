export type Language = "zh-Hant" | "zh-Hans" | "en";

export const LANGUAGE_OPTIONS: Array<{ value: Language; label: string }> = [
  { value: "zh-Hant", label: "繁體中文" },
  { value: "zh-Hans", label: "简体中文" },
  { value: "en", label: "English" },
];

const STORAGE_KEY = "neon-velocity-language";
import type { ErrorAnomalyKind } from "@/game/errorDimension";
let memoryLanguage: Language = "zh-Hant";

export const getStoredLanguage = (): Language => {
  const value = typeof window === "undefined" ? memoryLanguage : window.localStorage.getItem(STORAGE_KEY);
  return value === "zh-Hans" || value === "en" ? value : "zh-Hant";
};

export const saveLanguage = (language: Language) => {
  memoryLanguage = language;
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, language);
};

export const languageText = {
  "zh-Hant": {
    language: "語言",
    score: "分數", speed: "速度", chain: "連段", sprint: "衝刺", sprinting: "衝刺中", pause: "暫停", reset: "重置",
    start: "開始衝刺 →", restart: "再跑一局 →", leaderboard: "全球排行榜", top10: "前 10 名", syncing: "同步中…", noScores: "尚無 NEON ID 成績",
    join: "用 NEON ID 加入排行榜 →", logout: "登出", login: "登入 NEON ID 後分享", share: "分享成績 ↗", home: "返回主頁", preparing: "準備中…", shared: "已分享 ✓", saved: "已儲存 PNG ✓", reshare: "重新分享",
    controls: "切線／生存", keyboard: "移動", touch: "手機點按", sprintToggle: "衝刺切換", originalIntro: "三條線，一次判斷。閃過封鎖，掠取晶片，讓速度反過來逼出你的極限。", errorIntro: "同一條三線跑道，同一台高速箭頭車。每十秒，錯誤維度會改寫一次規則。",
    originalEyebrow: "反應必須快過撞擊", errorEyebrow: "錯誤波必須慢過反應", originalLink: "進入 NEON VELOCITY:ERROR DIMENSION →", errorLink: "← 返回 NEON VELOCITY", originalCrash: "本次衝刺結束", errorCrash: "錯誤波追上／本次結束", originalBody: "速度不是獎勵。它是風險。下一條線已經出現。", errorBody: "錯誤波已收窄安全距離。收集晶體、讀懂下一個異常，再把波甩回身後。", history: "本局異常紀錄", add: "加入排行榜 →", needId: "可直接遊玩／需 NEON ID 才能上榜", connected: "NEON ID 已連結", createId: "建立 NEON ID", openId: "開啟我的 NEON ID", name: "顯示名稱", code: "六位遊戲碼", close: "關閉 NEON ID 面板", connect: "連結中…", createAndJoin: "建立並加入排行榜 →", openRecords: "開啟我的排行榜 →", existing: "已有 NEON ID？開啟我的紀錄 →", first: "第一次上榜？建立 NEON ID →", idDescription: "使用相同名稱和六位遊戲碼，即可在不同瀏覽器回到同一筆排行榜紀錄。遊戲碼不會公開，請自行記住。"
  },
  "zh-Hans": {
    language: "语言", score: "分数", speed: "速度", chain: "连段", sprint: "冲刺", sprinting: "冲刺中", pause: "暂停", reset: "重置", start: "开始冲刺 →", restart: "再跑一局 →", leaderboard: "全球排行榜", top10: "前 10 名", syncing: "同步中…", noScores: "尚无 NEON ID 成绩", join: "用 NEON ID 加入排行榜 →", logout: "登出", login: "登录 NEON ID 后分享", share: "分享成绩 ↗", home: "返回主页", preparing: "准备中…", shared: "已分享 ✓", saved: "已保存 PNG ✓", reshare: "重新分享", controls: "切线／生存", keyboard: "移动", touch: "手机点按", sprintToggle: "冲刺切换", originalIntro: "三条线，一次判断。避开封锁，收集晶体，让速度逼出你的极限。", errorIntro: "同一条三线跑道，同一台高速箭头车。每十秒，错误维度会改写一次规则。", originalEyebrow: "反应必须快过撞击", errorEyebrow: "错误波必须慢过反应", originalLink: "进入 NEON VELOCITY:ERROR DIMENSION →", errorLink: "← 返回 NEON VELOCITY", originalCrash: "本次冲刺结束", errorCrash: "错误波追上／本次结束", originalBody: "速度不是奖励。它是风险。下一条线已经出现。", errorBody: "错误波已收窄安全距离。收集晶体、读懂下一个异常，再把波甩回身后。", history: "本局异常记录", add: "加入排行榜 →", needId: "可直接游玩／需 NEON ID 才能上榜", connected: "NEON ID 已连接", createId: "创建 NEON ID", openId: "打开我的 NEON ID", name: "显示名称", code: "六位游戏码", close: "关闭 NEON ID 面板", connect: "连接中…", createAndJoin: "创建并加入排行榜 →", openRecords: "打开我的排行榜 →", existing: "已有 NEON ID？打开我的记录 →", first: "第一次上榜？创建 NEON ID →", idDescription: "使用相同名称和六位游戏码，即可在不同浏览器回到同一份排行榜记录。游戏码不会公开，请自行记住。"
  },
  en: {
    language: "Language", score: "SCORE", speed: "SPEED", chain: "CHAIN", sprint: "SPRINT", sprinting: "SPRINTING", pause: "PAUSE", reset: "RESET", start: "START RUN →", restart: "RUN AGAIN →", leaderboard: "GLOBAL LEADERBOARD", top10: "TOP 10", syncing: "SYNCING…", noScores: "NO NEON ID SCORES YET", join: "JOIN LEADERBOARD WITH NEON ID →", logout: "LOG OUT", login: "LOG IN TO SHARE", share: "SHARE SCORE ↗", home: "BACK TO HOME", preparing: "PREPARING…", shared: "SHARED ✓", saved: "PNG SAVED ✓", reshare: "SHARE AGAIN", controls: "LANES／SURVIVAL", keyboard: "MOVE", touch: "TAP", sprintToggle: "SPRINT TOGGLE", originalIntro: "Three lanes. One decision. Clear the blocks, take the crystals, and push speed past your limit.", errorIntro: "The same three-lane track. The same arrow runner. Every ten seconds, the Error Dimension rewrites one rule.", originalEyebrow: "REACTION MUST BEAT IMPACT", errorEyebrow: "THE ERROR WAVE MUST LOSE TO REACTION", originalLink: "ENTER NEON VELOCITY:ERROR DIMENSION →", errorLink: "← BACK TO NEON VELOCITY", originalCrash: "RUN COMPLETE", errorCrash: "ERROR WAVE／RUN COMPLETE", originalBody: "Speed is not a reward. It is risk. The next lane is already here.", errorBody: "The Error Wave has narrowed the gap. Take crystals, read the next anomaly, and throw the wave back behind you.", history: "RUN ANOMALY LOG", add: "JOIN LEADERBOARD →", needId: "PLAYABLE NOW／NEON ID REQUIRED FOR LEADERBOARD", connected: "NEON ID CONNECTED", createId: "CREATE NEON ID", openId: "OPEN MY NEON ID", name: "DISPLAY NAME", code: "SIX-DIGIT GAME CODE", close: "CLOSE NEON ID PANEL", connect: "CONNECTING…", createAndJoin: "CREATE AND JOIN LEADERBOARD →", openRecords: "OPEN MY LEADERBOARD →", existing: "HAVE A NEON ID? OPEN MY RECORD →", first: "FIRST RUN? CREATE NEON ID →", idDescription: "Use the same display name and six-digit game code to return to the same leaderboard record in another browser. Keep your code private."
  }
} as const;

export type LocaleText = { [Key in keyof typeof languageText["zh-Hant"]]: string };

export const anomalyText = {
  "zh-Hant": {
    mirror: ["鏡像指令", "左右切線暫時互換"], echo: ["殘響投影", "跑道會出現可見重影封鎖"], prism: ["稜鏡折射", "跑道與障礙出現彩色分光"], surge: ["波形湧升", "速度線與故障波明顯脈動"], text: ["文字故障", "3D 物件短暫切換成文字圖層"], fullscreen: ["全畫面錯誤", "整個錯誤維度正在分層、錯位與重組"], plane: ["平面切換", "立體跑道短暫壓平成分層貼片"], lag: ["超級卡頓", "畫面出現跳幀殘影後重新對齊"], debt: ["欠費版遊戲", "文字、車與正方形圖案取代原始畫面"]
  },
  "zh-Hans": {
    mirror: ["镜像指令", "左右切线暂时互换"], echo: ["残响投影", "跑道会出现可见重影封锁"], prism: ["棱镜折射", "跑道与障碍出现彩色分光"], surge: ["波形涌升", "速度线与错误波明显脉动"], text: ["文字故障", "3D 物件短暂切换成文字图层"], fullscreen: ["全画面错误", "整个错误维度正在分层、错位与重组"], plane: ["平面切换", "立体跑道短暂压平成分层贴片"], lag: ["超级卡顿", "画面出现跳帧残影后重新对齐"], debt: ["欠费版游戏", "文字、车辆与正方形图案取代原始画面"]
  },
  en: {
    mirror: ["MIRROR", "Left and right lanes are visibly reversed"], echo: ["ECHO", "Visible ghost blocks appear on the track"], prism: ["PRISM", "The track and obstacles split into bright colors"], surge: ["SURGE", "Speed lines and the Error Wave pulse visibly"], text: ["TEXT GLITCH", "3D objects briefly switch into bright text layers"], fullscreen: ["FULLSCREEN ERROR", "The entire dimension splits, shifts, scans, and rebuilds"], plane: ["PLANE SHIFT", "The three-dimensional track flattens into layered plates"], lag: ["SUPER LAG", "The view stutters with ghost frames, then realigns"], debt: ["DEBT BUILD", "Only text, the car, and a square remain in the broken draft"]
  }
} as const;

const EXTRA_ANOMALY_FAMILIES = {
  "zh-Hant": [["切片偏移", "跑道切片短暫錯開"], ["殘影複寫", "視覺殘影掠過安全線"], ["色票漂移", "車道色票短暫交換"], ["節拍脈衝", "速度線按錯誤節拍閃動"], ["座標折疊", "標記在相鄰座標間跳動"], ["字元散列", "字元片段沿跑道散開"], ["邊界閃爍", "跑道邊界出現亮色斷點"], ["波面折返", "錯誤波表面短暫折返"], ["訊號重播", "方向訊號延遲一拍重播"], ["維度重取樣", "整體畫面以新取樣短暫刷新"]],
  "zh-Hans": [["切片偏移", "跑道切片短暂错开"], ["残影复写", "视觉残影掠过安全线"], ["色票漂移", "车道色票短暂交换"], ["节拍脉冲", "速度线按错误节拍闪动"], ["坐标折叠", "标记在相邻坐标间跳动"], ["字符散列", "字符片段沿跑道散开"], ["边界闪烁", "跑道边界出现亮色断点"], ["波面折返", "错误波表面短暂折返"], ["信号重播", "方向信号延迟一拍重播"], ["维度重取样", "整体画面以新取样短暂刷新"]],
  en: [["SLICE SHIFT", "Track slices briefly separate"], ["GHOST COPY", "A visual ghost crosses the safe line"], ["PALETTE DRIFT", "Lane colors briefly exchange"], ["BEAT PULSE", "Speed lines flash off-beat"], ["COORDINATE FOLD", "Markers jump between nearby coordinates"], ["CHARACTER HASH", "Character fragments scatter along the track"], ["EDGE FLICKER", "Bright breaks appear on the track edge"], ["WAVE RETURN", "The Error Wave briefly folds back"], ["SIGNAL REPLAY", "Direction signals replay one beat late"], ["DIMENSION RESAMPLE", "The whole view briefly re-samples"]],
} as const;

export const getAnomalyText = (language: Language, kind: ErrorAnomalyKind): readonly [string, string] => {
  const known = anomalyText[language][kind as keyof typeof anomalyText[typeof language]];
  if (known) return known;
  const match = kind.match(/^anomaly-(\d{3})$/);
  if (!match) return [kind.toUpperCase(), "ERROR DIMENSION RULE SHIFT"];
  const serialNumber = Number(match[1]);
  const family = EXTRA_ANOMALY_FAMILIES[language][(serialNumber - 1) % 10];
  return [`${family[0]} ${match[1]}`, family[1]];
};

export const commonText = {
  "zh-Hant": { nextAnomaly: "下一個隨機異常", prepare: "牆體暫緩生成／準備反應", dimension: "錯誤維度", rulesSoon: "規則即將變化", you: "你", shareLogin: "登入 NEON ID 後分享", sharing: "準備中…", shared: "已分享 ✓", pngSaved: "已儲存 PNG ✓", shareAgain: "重新分享", noWebgl: "此瀏覽器不支援 3D WebGL。", block: "封鎖", compat: "2D 相容模式", compatNote: "仍可左右閃避封鎖並累積分數。速度會持續提高；按下衝刺可立即加快。", compatFooter: "2D 相容模式不會使用 3D 圖形功能。" },
  "zh-Hans": { nextAnomaly: "下一个随机异常", prepare: "墙体暂缓生成／准备反应", dimension: "错误维度", rulesSoon: "规则即将变化", you: "你", shareLogin: "登录 NEON ID 后分享", sharing: "准备中…", shared: "已分享 ✓", pngSaved: "已保存 PNG ✓", shareAgain: "重新分享", noWebgl: "此浏览器不支持 3D WebGL。", block: "封锁", compat: "2D 兼容模式", compatNote: "仍可左右躲避封锁并累积分数。速度会持续提高；按下冲刺可立即加快。", compatFooter: "2D 兼容模式不会使用 3D 图形功能。" },
  en: { nextAnomaly: "NEXT RANDOM ANOMALY", prepare: "WALLS PAUSE／PREPARE TO REACT", dimension: "ERROR DIMENSION", rulesSoon: "RULES WILL CHANGE", you: "YOU", shareLogin: "LOG IN TO SHARE", sharing: "PREPARING…", shared: "SHARED ✓", pngSaved: "PNG SAVED ✓", shareAgain: "SHARE AGAIN", noWebgl: "This browser does not support 3D WebGL.", block: "BLOCK", compat: "2D COMPAT MODE", compatNote: "Dodge blockers across three lanes and build score. Speed rises over time; tap sprint to accelerate.", compatFooter: "2D compatibility mode does not use 3D graphics." }
} as const;

export const getCommonText = (language: Language) => commonText[language];
export const getLocaleText = (language: Language): LocaleText => languageText[language];
