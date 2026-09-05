import type { PastDecision, Dialogue, Kpi, ValueLtm } from "./types";

// 月ごとのシミュレートデータ。実際の右腕AIでは経営ダッシュボード・共創機能・LTMが
// 自動で書き込む想定のデータであり、経営者からは見えない・触れない形にする
// （strategy_planning.md 決定ログ#29, #30）。キーは getMonthKey() と同じ "YYYY-MM" 形式。
export interface MonthlyInput {
  next_priority_hint: string;
  past_decisions: PastDecision[];
  dialogues: Dialogue[];
  kpis: Kpi[];
  values_ltm: ValueLtm[];
}

export const SAMPLE_DATA_BY_MONTH: Record<string, MonthlyInput> = {
  "2026-04": {
    next_priority_hint: "新しく増えた人員体制を、繁忙期にどう定着させるか",
    past_decisions: [],
    dialogues: [
      {
        date: "2026年4月8日",
        topic: "繁忙期を控え、既存スタッフだけで受注量をこなせるか不安に思っている",
        decision: "アルバイトを1名追加採用し、繁忙期に向けた人員体制を厚くする方針にした",
        c_case: {
          option_a: "既存スタッフの残業を増やして乗り切る",
          option_b: "受注そのものを繁忙期だけ制限する",
          presented:
            "繁忙期限定のアルバイトを1名採用し、既存スタッフの負担を増やさずに受注量を維持する",
          reasoning_pattern: "水平思考",
        },
        self_initiated_pattern: null,
      },
    ],
    kpis: [
      {
        name: "月間売上高",
        prev_value: 3700000,
        current_value: 3900000,
        unit: "円",
        target: 3900000,
        linked_dialogue_dates: ["2026年4月8日"],
        linked_past_decisions: [],
        confidence: "高",
        alt_factors: null,
      },
      {
        name: "粗利率",
        prev_value: 26,
        current_value: 26,
        unit: "%",
        target: 27,
        linked_dialogue_dates: [],
        linked_past_decisions: [],
        confidence: null,
        alt_factors: "人員体制の強化に注力しており、粗利率改善にはまだ着手していないこと",
      },
      {
        name: "新規顧客数",
        prev_value: 3,
        current_value: 4,
        unit: "件",
        target: 5,
        linked_dialogue_dates: ["2026年4月8日"],
        linked_past_decisions: [],
        confidence: "中",
        alt_factors: "繁忙期に向けた人員増強が功を奏したと考えられること",
      },
      {
        name: "従業員1人当たり売上高",
        prev_value: 980000,
        current_value: 1000000,
        unit: "円",
        target: 1050000,
        linked_dialogue_dates: ["2026年4月8日"],
        linked_past_decisions: [],
        confidence: "低",
        alt_factors: "新人アルバイトの習熟にはまだ時間がかかること",
      },
      {
        name: "現預金残高",
        prev_value: 9000000,
        current_value: 8900000,
        unit: "円",
        target: null,
        linked_dialogue_dates: ["2026年4月8日"],
        linked_past_decisions: [],
        confidence: "中",
        alt_factors: "採用に伴う人件費の先行投資があったこと",
      },
    ],
    values_ltm: [
      {
        keyword: "スタッフの負担を増やさない経営",
        context: "繁忙期でも既存スタッフに無理をさせたくないと繰り返し話していた",
      },
    ],
  },

  "2026-05": {
    next_priority_hint: "直接受注の比率を上げながら、当面の売上の落ち込みをどう乗り切るか",
    past_decisions: [
      {
        date: "2026年4月",
        event: "繁忙期を控え、既存スタッフだけでは受注量をこなしきれない見通しになった",
        decision: "アルバイトを1名追加採用し、繁忙期に向けた人員体制を厚くする方針にした",
        kpi_to_track: "月間売上高",
      },
    ],
    dialogues: [
      {
        date: "2026年5月14日",
        topic: "受注が伸び悩む中、単価の低い下請け案件ばかりが埋まっていることに悩んでいる",
        decision: "単価の低い下請け案件を意図的に縮小し、直接受注の比率を上げる方針に切り替えた",
        c_case: {
          option_a: "下請け案件を今まで通り受け続けて売上額を確保する",
          option_b: "下請けも直接受注も両方減らして様子を見る",
          presented:
            "下請け案件の新規受付だけを止め、既存の下請け契約は満了まで続けながら直接受注の営業に時間を振り向ける",
          reasoning_pattern: "水平思考",
        },
        self_initiated_pattern: null,
      },
    ],
    kpis: [
      {
        name: "月間売上高",
        prev_value: 3900000,
        current_value: 3950000,
        unit: "円",
        target: 4100000,
        linked_dialogue_dates: ["2026年5月14日"],
        linked_past_decisions: [],
        confidence: "中",
        alt_factors: "下請け案件を意図的に縮小した影響で一時的に伸びが鈍いこと",
      },
      {
        name: "粗利率",
        prev_value: 26,
        current_value: 28,
        unit: "%",
        target: 27,
        linked_dialogue_dates: ["2026年5月14日"],
        linked_past_decisions: [],
        confidence: "高",
        alt_factors: null,
      },
      {
        name: "新規顧客数",
        prev_value: 4,
        current_value: 3,
        unit: "件",
        target: 5,
        linked_dialogue_dates: ["2026年5月14日"],
        linked_past_decisions: [],
        confidence: "中",
        alt_factors: "下請け案件の新規受付を止めたことで件数自体は減っていること",
      },
      {
        name: "従業員1人当たり売上高",
        prev_value: 1000000,
        current_value: 1010000,
        unit: "円",
        target: 1050000,
        linked_dialogue_dates: [],
        linked_past_decisions: [],
        confidence: null,
        alt_factors: "人員体制の効果が徐々に定着してきていると見られること",
      },
      {
        name: "現預金残高",
        prev_value: 8900000,
        current_value: 8800000,
        unit: "円",
        target: null,
        linked_dialogue_dates: [],
        linked_past_decisions: ["2026年4月"],
        confidence: "低",
        alt_factors: "4月に採用した人件費の影響が引き続き残っていること",
      },
    ],
    values_ltm: [
      {
        keyword: "適正な受注の選び方",
        context: "単価だけでなく、その先の関係性を重視して案件を選びたいと話していた",
      },
    ],
  },

  "2026-06": {
    next_priority_hint: "価格改定後、既存顧客からの反応にどう向き合うか",
    past_decisions: [
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
    ],
    dialogues: [
      {
        date: "2026年6月9日",
        topic: "主要仕入先から原材料の値上げ通知を受け、対応に悩んでいる",
        decision: "値上げ分を全顧客への価格改定として転嫁することを決め、通知を送った",
        c_case: null,
        self_initiated_pattern: "批判的思考",
      },
    ],
    kpis: [
      {
        name: "月間売上高",
        prev_value: 3950000,
        current_value: 4050000,
        unit: "円",
        target: 4000000,
        linked_dialogue_dates: [],
        linked_past_decisions: ["2026年5月"],
        confidence: "中",
        alt_factors: "直接受注比率向上の効果が出始めていること",
      },
      {
        name: "粗利率",
        prev_value: 28,
        current_value: 29,
        unit: "%",
        target: 28,
        linked_dialogue_dates: [],
        linked_past_decisions: ["2026年5月"],
        confidence: "高",
        alt_factors: null,
      },
      {
        name: "新規顧客数",
        prev_value: 3,
        current_value: 4,
        unit: "件",
        target: 5,
        linked_dialogue_dates: [],
        linked_past_decisions: [],
        confidence: null,
        alt_factors: "直接受注への営業シフトが徐々に成果につながり始めていると見られること",
      },
      {
        name: "従業員1人当たり売上高",
        prev_value: 1010000,
        current_value: 1020000,
        unit: "円",
        target: 1050000,
        linked_dialogue_dates: [],
        linked_past_decisions: [],
        confidence: "低",
        alt_factors: null,
      },
      {
        name: "現預金残高",
        prev_value: 8800000,
        current_value: 8700000,
        unit: "円",
        target: null,
        linked_dialogue_dates: ["2026年6月9日"],
        linked_past_decisions: [],
        confidence: "中",
        alt_factors: "値上げ通知の準備・印刷等の細かな支出があったこと",
      },
    ],
    values_ltm: [
      {
        keyword: "正当な対価を受け取る覚悟",
        context: "値上げ通知を送ることに最後まで迷いながらも、正当な価格を求めていいのだと自分に言い聞かせるように話していた",
      },
    ],
  },

  "2026-07": {
    next_priority_hint:
      "値上げ後の顧客反応を注視しながら、繁忙期の人員負荷をどう乗り切るか",
    past_decisions: [
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
    ],
    dialogues: [
      {
        date: "2026年7月5日",
        topic: "主力スタッフが体調を崩し、繁忙期にもかかわらず休みが必要になった",
        decision: "無理な受注を一時的に断り、既存スタッフの負担を増やさない方針に切り替えた",
        c_case: {
          option_a: "スタッフの体調を無視して、予定通り全ての受注を受け切る",
          option_b: "繁忙期の受注そのものを大幅に縮小する",
          presented:
            "新規の大口案件だけ一時的にお断りし、既存の継続案件は縮小せずに他のメンバーで穴を分担する",
          reasoning_pattern: "水平思考",
        },
        self_initiated_pattern: null,
      },
      {
        date: "2026年7月12日",
        topic: "値上げ通知を送った後、特に反応が薄かった大口顧客への対応をどうするか悩んでいる",
        decision:
          "反応が薄い顧客ほど価格に同意しているとは限らず、単に見落としている可能性を考え、催促ではなく個別に電話で状況を確認することにした",
        c_case: null,
        self_initiated_pattern: "批判的思考",
      },
    ],
    kpis: [
      {
        name: "月間売上高",
        prev_value: 4050000,
        current_value: 4200000,
        unit: "円",
        target: 4500000,
        linked_dialogue_dates: ["2026年7月5日"],
        linked_past_decisions: ["2026年6月"],
        confidence: "中",
        alt_factors: "値上げ効果が本格化する前の段階であること",
      },
      {
        name: "粗利率",
        prev_value: 29,
        current_value: 31,
        unit: "%",
        target: 30,
        linked_dialogue_dates: [],
        linked_past_decisions: ["2026年6月"],
        confidence: "高",
        alt_factors: null,
      },
      {
        name: "新規顧客数",
        prev_value: 4,
        current_value: 5,
        unit: "件",
        target: 6,
        linked_dialogue_dates: [],
        linked_past_decisions: [],
        confidence: null,
        alt_factors: "既存顧客対応を優先し、新規開拓に割ける時間が限られていたこと",
      },
      {
        name: "従業員1人当たり売上高",
        prev_value: 1020000,
        current_value: 990000,
        unit: "円",
        target: 1080000,
        linked_dialogue_dates: ["2026年7月5日"],
        linked_past_decisions: [],
        confidence: "中",
        alt_factors: "受注を絞った影響で一時的に下がっていると考えられること",
      },
      {
        name: "現預金残高",
        prev_value: 8700000,
        current_value: 8500000,
        unit: "円",
        target: null,
        linked_dialogue_dates: [],
        linked_past_decisions: ["2026年6月"],
        confidence: "低",
        alt_factors: "価格改定の入金への反映にはまだ時間差があること",
      },
    ],
    values_ltm: [
      {
        keyword: "スタッフを守る経営判断",
        context: "繁忙期でも無理な受注をせず、まず人を守る選択をしたいと繰り返し話していた",
      },
      {
        keyword: "正当な価格を求める姿勢",
        context: "値上げ通知への反応の薄さに動揺せず、催促ではなく丁寧な確認から入る判断をしていた",
      },
    ],
  },

  "2026-08": {
    next_priority_hint:
      "値上げ後の解約防止と、新卒教育・大口案件対応の両立を、今のリソースでどう安定させるか",
    past_decisions: [
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
    ],
    dialogues: [
      {
        date: "2026年8月3日",
        topic: "値上げ通知後、既存顧客の解約リスクにどう向き合うか悩んでいる",
        decision: "全顧客に一律通知するのではなく、解約リスクの高い顧客から順に個別説明の機会を設けた",
        c_case: {
          option_a: "値上げを予定通り全顧客に一律通知する",
          option_b: "解約が怖いので値上げ自体を見送る",
          presented:
            "顧客を解約リスクの高さで並べ替え、上位の顧客だけ先に個別訪問して事情を説明し、残りは通知のみで済ませる",
          reasoning_pattern: "水平思考",
        },
        self_initiated_pattern: null,
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
          reasoning_pattern: "水平思考",
        },
        self_initiated_pattern: null,
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
          reasoning_pattern: "水平思考",
        },
        self_initiated_pattern: null,
      },
      {
        date: "2026年8月25日",
        topic: "資金繰りがやや厳しくなってきた中で、設備投資のタイミングを相談された",
        decision: "今期の設備投資は見送り、来期のキャッシュフローが安定してから再検討することにした",
        c_case: null,
        self_initiated_pattern: "批判的思考",
      },
    ],
    kpis: [
      {
        name: "月間売上高",
        prev_value: 4200000,
        current_value: 4550000,
        unit: "円",
        target: 4500000,
        linked_dialogue_dates: ["2026年8月10日"],
        linked_past_decisions: ["2026年7月"],
        confidence: "中",
        alt_factors: "夏季の受注シーズンによる季節要因も含まれること",
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
        alt_factors: "広告出稿を一時的に停止していた影響が大きいと見られること",
      },
      {
        name: "粗利率",
        prev_value: 31,
        current_value: 33,
        unit: "%",
        target: 30,
        linked_dialogue_dates: ["2026年8月3日"],
        linked_past_decisions: ["2026年5月"],
        confidence: "高",
        alt_factors: null,
      },
      {
        name: "従業員1人当たり売上高",
        prev_value: 990000,
        current_value: 980000,
        unit: "円",
        target: 1100000,
        linked_dialogue_dates: ["2026年8月18日"],
        linked_past_decisions: [],
        confidence: "低",
        alt_factors: "新卒教育に稼働時間を割いた影響で一時的に下がっていると考えられること",
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
        alt_factors: "設備投資は見送ったが、価格改定切替の端境期で入金タイミングが一部ずれ込んだこと",
      },
    ],
    values_ltm: [
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
    ],
  },
};
