export const SAMPLE_PAST_DECISIONS = [
  {
    date: "2026年4月",
    event: "主力スタッフが体調を崩し、繁忙期にもかかわらず休みが必要になった",
    decision: "無理な受注を一時的に断り、既存スタッフの負担を増やさない方針に切り替えた",
    kpi_to_track: "月間売上高",
  },
];

export const SAMPLE_DIALOGUES = [
  {
    date: "2026年7月10日",
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
];

export const SAMPLE_KPIS = [
  {
    name: "月間売上高",
    prev_value: 4200000,
    current_value: 4550000,
    unit: "円",
    target: 4500000,
    linked_dialogue_dates: ["2026年7月10日"],
    linked_past_decisions: ["2026年4月"],
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
    alt_factors: "広告出稿を一時停止していた影響が大きいと見られる",
  },
];

export const SAMPLE_VALUES_LTM = [
  {
    keyword: "既存顧客との信頼関係",
    context: "大口案件の相談の中で、既存顧客を後回しにしたくないと繰り返し発言していた",
  },
];
