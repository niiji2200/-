import { MonthlyTheme, Faction } from '../types';

export const MONTHLY_THEMES: Record<number, MonthlyTheme> = {
  1: {
    id: 'theme-01',
    month: 1,
    title: '正月太りと仕事始め',
    subtitle: '新年の抱負 vs コタツの誘惑',
    description: '新年の目標と、お休みの名残がぶつかる1月のお題です。',
    heavenPrompt: '休めた分だけエネルギー回復！今年ものんびり頑張ろう。',
    hellPrompt: '神頼みしても仕事は減らない。現実を見よう。',
    tags: ['仕事始め', '正月太り', '新年の抱負']
  },
  2: {
    id: 'theme-02',
    month: 2,
    title: 'バレンタインと寒さ',
    subtitle: 'チョコの甘さ vs 冬の寒さ',
    description: 'ご褒美チョコと寒波がやってくる2月のお題です。',
    heavenPrompt: '自分へのご褒美チョコは最高！温かい部屋で癒やされよう。',
    hellPrompt: 'イベントに浮かれても寒いものは寒い。早く寝よう。',
    tags: ['バレンタイン', '寒波', 'チョコ']
  },
  3: {
    id: 'theme-03',
    month: 3,
    title: '出会いと別れ、花粉',
    subtitle: '春の訪れ vs 花粉のつらさ',
    description: '新生活の準備と花粉症が重なる3月のお題です。',
    heavenPrompt: '別れは新しい出会いの始まり！春を楽しもう。',
    hellPrompt: '環境が変わっても現実は同じ。目と鼻がつらい。',
    tags: ['花粉症', '卒業', '新生活']
  },
  4: {
    id: 'theme-04',
    month: 4,
    title: '新環境と人間関係',
    subtitle: '張り切り vs 気疲れ',
    description: '新しい職場やクラスで気疲れしやすい4月のお題です。',
    heavenPrompt: '緊張するのは頑張っている証拠。笑顔でいれば大丈夫！',
    hellPrompt: '無理にいい人を演じると疲れるだけ。マイペースでいこう。',
    tags: ['新生活', '歓迎会', '人間関係']
  },
  5: {
    id: 'theme-05',
    month: 5,
    title: '五月病と連休明け',
    subtitle: '連休の思い出 vs やる気ゼロ',
    description: '大型連休が明けてやる気が出ない5月のお題です。',
    heavenPrompt: '朝起きられただけで花丸！生きてるだけで満点！',
    hellPrompt: '次の連休までまだまだ遠い。現実逃避はやめよう。',
    tags: ['五月病', '連休明け', 'やる気出ない']
  },
  6: {
    id: 'theme-06',
    month: 6,
    title: '梅雨の湿気と低気圧',
    subtitle: '雨音の癒やし vs 頭痛と湿気',
    description: 'ジメジメした雨や低気圧で体が重い6月のお題です。',
    heavenPrompt: '雨の日は家でのんびり過ごすチャンス！',
    hellPrompt: '服も髪も湿気でボロボロ。何もしたくない。',
    tags: ['梅雨', '低気圧', '頭痛']
  },
  7: {
    id: 'theme-07',
    month: 7,
    title: '猛暑と夏バテ',
    subtitle: '夏本番 vs クーラー病',
    description: '暑さで体力が削られる7月のお題です。',
    heavenPrompt: 'アイスがおいしい季節！冷たいものを食べて乗り切ろう。',
    hellPrompt: '外に出るだけで倒れそう。電気代も怖い。',
    tags: ['猛暑', '電気代', '夏バテ']
  },
  8: {
    id: 'theme-08',
    month: 8,
    title: '夏の終わりと課題の山',
    subtitle: '夏の思い出 vs 迫る締切',
    description: '夏休みの終わりと残ったタスクが迫る8月のお題です。',
    heavenPrompt: '何もできなくても、この夏を乗り切っただけで偉い！',
    hellPrompt: '他人の楽しそうなSNSを見て落ち込むな。目の前のことをやろう。',
    tags: ['夏休み終了', 'タスク山積み', '宿題']
  },
  9: {
    id: 'theme-09',
    month: 9,
    title: '季節の変わり目の疲れ',
    subtitle: '秋の気配 vs 体調不良',
    description: '朝晩の寒暖差で疲れが出やすい9月のお題です。',
    heavenPrompt: '秋の夜は温かいお茶と読書でリラックスしよう。',
    hellPrompt: '今年も残り3ヶ月。何一つ進んでなくて焦る。',
    tags: ['寒暖差', '秋の気配', '疲れ']
  },
  10: {
    id: 'theme-10',
    month: 10,
    title: '秋の夜長と食欲の秋',
    subtitle: 'のんびり時間 vs 食べすぎ',
    description: '夜が長くなり、ついつい食べすぎてしまう10月のお題です。',
    heavenPrompt: 'おいしいものを食べるのは幸せなこと！秋を楽しもう。',
    hellPrompt: '夜遅くにスマホ見ながらお菓子食べて後悔するやつ。',
    tags: ['食欲の秋', '秋の夜長', '肌寒い']
  },
  11: {
    id: 'theme-11',
    month: 11,
    title: '布団から出られない朝',
    subtitle: '温かい布団 vs 年末の忙しさ',
    description: '冷え込みが厳しくなり、布団が恋しい11月のお題です。',
    heavenPrompt: '布団の温もりは最高！無理せずゆっくり起きよう。',
    hellPrompt: '二度寝して遅刻寸前。年末の仕事も溜まる一方。',
    tags: ['布団から出られない', '寒さ', '年末進行']
  },
  12: {
    id: 'theme-12',
    month: 12,
    title: '年末の忙しさと忘年会',
    subtitle: 'イルミネーション vs 胃腸の疲れ',
    description: '一年の終わりとイベントに追われる12月のお題です。',
    heavenPrompt: '今年一年よく頑張った！自分にご褒美をあげよう。',
    hellPrompt: '今年の目標、結局何一つ達成できなかったな。',
    tags: ['年末', '忘年会', '振り返り']
  }
};

/**
 * Get monthly theme for any given date or YYYY-MM string
 */
export function getMonthlyTheme(dateOrYm: Date | string): MonthlyTheme {
  let month = 10;
  if (typeof dateOrYm === 'string') {
    const parts = dateOrYm.split('-');
    if (parts.length >= 2) {
      month = parseInt(parts[1], 10);
    }
  } else if (dateOrYm instanceof Date) {
    month = dateOrYm.getMonth() + 1;
  }
  return MONTHLY_THEMES[month] || MONTHLY_THEMES[10];
}

/**
 * Suggestions for converting posts
 */
export const CONVERSION_INSPIRATIONS: Record<Faction, { label: string; template: string }[]> = {
  heaven: [
    {
      label: '全肯定',
      template: '今日も一日生き抜いただけで満点！ゆっくり休んでね。'
    },
    {
      label: '前向き',
      template: 'ピンチはチャンス！ここからきっと良くなるよ。'
    },
    {
      label: '共感',
      template: 'その気持ちよくわかるよ。無理せず自分のペースでいこう。'
    }
  ],
  hell: [
    {
      label: '本音',
      template: '綺麗事言っても始まらない。つらい時はつらいって言っていい。'
    },
    {
      label: 'ツッコミ',
      template: '悩んでも解決しないし、今日はもうふて寝しちゃえ。'
    },
    {
      label: '現実',
      template: '無理に頑張る必要なし。たまには全部投げ出そうぜ。'
    }
  ]
};

/**
 * User titles based on faction and accumulated points
 */
export function getFactionRankTitle(faction: Faction, points: number): { title: string; badge: string; color: string } {
  if (faction === 'heaven') {
    if (points >= 300) return { title: '最高位天使', badge: '最高位', color: 'text-amber-500' };
    if (points >= 150) return { title: '上級天使', badge: '上級', color: 'text-amber-500' };
    if (points >= 50) return { title: '中級天使', badge: '中級', color: 'text-amber-600' };
    return { title: '見習い天使', badge: '見習い', color: 'text-slate-400' };
  } else {
    if (points >= 300) return { title: '魔王', badge: '魔王', color: 'text-purple-400' };
    if (points >= 150) return { title: '上級悪魔', badge: '上級', color: 'text-rose-400' };
    if (points >= 50) return { title: '中級悪魔', badge: '中級', color: 'text-rose-500' };
    return { title: '見習い悪魔', badge: '見習い', color: 'text-slate-400' };
  }
}
