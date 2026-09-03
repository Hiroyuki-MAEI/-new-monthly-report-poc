import type { PastDecision, Dialogue, Kpi, ValueLtm } from "./types";

// Supabase: past_decisions テーブルの想定データ（シミュレーションDBは2026年4月〜8月の5ヶ月分のみ保持している想定）
export const SAMPLE_PAST_DECISIONS: PastDecision[] = [
  {
    date: "2026年4月",
    event: "繁忙期を控え、既存スタッフだけでは受注量をこなしきれない見通しになった",
    decision: "アルバイトを1名追加採用し、繁忙期に向けた人員体制を厚くする方針にした",
    kpi_to_track: "月間売上高",
  },
  {
    date: "2026年5月",
    event: "受注が伸び悩む一方、単価の低い下請け案件ばかりが埋まっていた",
    decision: "単価の低い下請け案件を意図的に縮小し、直接受注の比率を上げる方針に切り替えた",
    kpi_to_track: "粗利率",
  },
  {
    date: "2026年6月",
    event: "主要仕入先から原材料の値上げ通知を受けた",
    decision: "値上げ分を全顧客への価格改定として転嫁することを決め、通知を送った",
    kpi_to_track: "月間売上高",
  },
  {
    date: "2026年7月",
    event: "主力スタッフが体調を崩し、繁忙期にもかかわらず休みが必要になった",
    decision: "無理な受注を一時的に断り、既存スタッフの負担を増やさない方針に切り替えた",
    kpi_to_track: "月間売上高",
  },
];

// Supabase: dialogues テーブルの想定データ（対象月：2026年8月）
export const SAMPLE_DIALOGUES: Dialogue[] = [
  {
    date: "2026年8月3日",
    topic: "値上げ通知後、既存顧客の解約リスクにどう向き合うか悩んでいる",
    decision: "全顧客に一律通知するのではなく、解約リスクの高い顧客から順に個別説明の機会を設けた",
    c_case: {
      option_a: "値上げを予定通り全顧客に一律通知する",
      option_b: "解約が怖いので値上げ自体を見送る",
      presented:
        "顧客を解約リスクの高さで並べ替え、上位の顧客だけ先に個別訪問して事情を説明し、残りは通知のみで済ませる",
      reasoning_pattern: "対立軸をずらす",
    },
  },
  {
    date: "2026年8月10日",
    topic: "新規の大口案件を受けるべきか、既存顧客への対応を優先すべきか悩んでいる",
    decision: "大口案件は一部のみ引き受け、既存顧客対応との両立ラインを引いた",
    c_case: {
      option_a: "大口案件をフルで受注し売上を最大化する",
      option_b: "大口案件を断り、既存顧客対応に専念する",
      presented:
        "大口案件を分割受注できないか先方と交渉し、既存顧客対応とのリソース比率を7:3に固定してから着手する",
      reasoning_pattern: "対立軸をずらす",
    },
  },
  {
    date: "2026年8月18日",
    topic: "新卒スタッフの教育に時間を割くべきか、目先の受注対応を優先すべきか",
    decision: "教育時間を週2日に固定し、残りの稼働をすべて受注対応に充てるルールを決めた",
    c_case: {
      option_a: "教育を後回しにして、今だけ受注対応にフルで人手を回す",
      option_b: "受注を絞ってでも教育を優先する",
      presented:
        "教育に使う曜日を固定で先に確保し、残りの稼働だけで受けられる受注量に上限を引き直す",
      reasoning_pattern: "制約を再定義する",
    },
  },
  {
    date: "2026年8月25日",
    topic: "資金繰りがやや厳しくなってきた中で、設備投資のタイミングを相談された",
    decision: "今期の設備投資は見送り、来期のキャッシュフローが安定してから再検討することにした",
    c_case: null,
  },
];

// Supabase: kpis テーブルの想定データ（対象月：2026年8月度、前月比は2026年7月）
export const SAMPLE_KPIS: Kpi[] = [
  {
    name: "月間売上高",
    prev_value: 4200000,
    current_value: 4550000,
    unit: "円",
    target: 4500000,
    linked_dialogue_dates: ["2026年8月10日"],
    linked_past_decisions: ["2026年7月"],
    confidence: "中",
    alt_factors: "夏季の受注シーズンによる季節要因も含まれる",
  },
  {
    name: "新規顧客数",
    prev_value: 5,
    current_value: 3,
    unit: "件",
    target: 6,
    linked_dialogue_dates: [],
    linked_past_decisions: [],
    confidence: null,
    alt_factors: "広告出稿を一時的に停止していた影響が大きいと見られる",
  },
  {
    name: "粗利率",
    prev_value: 28,
    current_value: 33,
    unit: "%",
    target: 30,
    linked_dialogue_dates: ["2026年8月3日"],
    linked_past_decisions: ["2026年5月"],
    confidence: "高",
    alt_factors: "値上げ後の解約が想定より少なく、価格転嫁がそのまま利益率に反映された",
  },
  {
    name: "従業員1人当たり売上高",
    prev_value: 1050000,
    current_value: 980000,
    unit: "円",
    target: 1100000,
    linked_dialogue_dates: ["2026年8月18日"],
    linked_past_decisions: [],
    confidence: "低",
    alt_factors: "新卒教育に稼働時間を割いた影響で一時的に下がっていると考えられる",
  },
  {
    name: "現預金残高",
    prev_value: 8500000,
    current_value: 7900000,
    unit: "円",
    target: null,
    linked_dialogue_dates: ["2026年8月25日"],
    linked_past_decisions: [],
    confidence: "中",
    alt_factors: "設備投資は見送ったが、価格改定切替の端境期で入金タイミングが一部ずれ込んだ",
  },
];

// Supabase: values_ltm テーブルの想定データ
export const SAMPLE_VALUES_LTM: ValueLtm[] = [
  {
    keyword: "既存顧客との信頼関係",
    context: "大口案件の相談の中で、既存顧客を後回しにしたくないと繰り返し発言していた",
  },
  {
    keyword: "スタッフの健康を優先する経営",
    context: "主力スタッフの体調不良をきっかけに、無理な受注より人を大事にする方針を繰り返し口にしていた",
  },
  {
    keyword: "正当な対価を受け取ることへの後ろめたさの克服",
    context: "値上げ通知の相談の中で、正当な対価を受け取ることに引け目を感じる必要はないと自分に言い聞かせるように話していた",
  },
];
