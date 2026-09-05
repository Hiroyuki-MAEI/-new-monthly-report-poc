// report_generation_prompt.md セクション2「入力データ仕様」に対応する型定義

export interface PastDecision {
  date: string;
  event: string;
  decision: string;
  kpi_to_track: string | null;
}

// 「批判的思考（Critical Thinking）」「水平思考（Lateral Thinking）」の2モードに固定
// （strategy_planning.md 決定ログ#11。出典：Google Drive「月次成果レポート生成機能（最新版）」第3階層の記述）
export type ReasoningPattern = "批判的思考" | "水平思考";

export interface CCase {
  option_a: string;
  option_b: string;
  presented: string;
  reasoning_pattern: ReasoningPattern;
}

export interface Dialogue {
  date: string;
  topic: string;
  decision: string;
  c_case: CCase | null;
  // AIのc_case提示なしで、経営者本人の発言だけで思考の型が確認できた場合に記録する
  // （自立度スコアの「本人主導」カウント対象。strategy_planning.md 決定ログ#9〜13）
  self_initiated_pattern: ReasoningPattern | null;
}

export type Confidence = "高" | "中" | "低" | null;

export interface Kpi {
  name: string;
  prev_value: number;
  current_value: number;
  unit: string;
  target: number | null;
  linked_dialogue_dates: string[];
  linked_past_decisions: string[];
  confidence: Confidence;
  alt_factors: string | null;
}

export interface ValueLtm {
  keyword: string;
  context: string;
}

export interface ReportInput {
  company_name: string;
  report_month: string;
  next_report_month: string;
  report_year: number;
  report_month_num: number;
  past_decisions: PastDecision[];
  dialogues: Dialogue[];
  kpis: Kpi[];
  values_ltm: ValueLtm[];
  next_priority_hint: string;
}

// 履歴一覧（/api/reports）の1行分。入力・出力本文は含まない軽量表示用
export interface ReportSummary {
  id: string;
  company_name: string;
  report_year: number;
  report_month: number;
  autonomy_score: number | null;
  created_at: string;
}

// 履歴詳細（/api/reports/[id]）。過去レポートの再表示に使う全文
export interface ReportDetail extends ReportSummary {
  input_json: ReportInput;
  output_markdown: string;
}
