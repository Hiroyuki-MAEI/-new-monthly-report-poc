// report_generation_prompt.md セクション2「入力データ仕様」に対応する型定義

export interface PastDecision {
  date: string;
  event: string;
  decision: string;
  kpi_to_track: string | null;
}

export interface CCase {
  option_a: string;
  option_b: string;
  presented: string;
  reasoning_pattern: string;
}

export interface Dialogue {
  date: string;
  topic: string;
  decision: string;
  c_case: CCase | null;
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
  past_decisions: PastDecision[];
  dialogues: Dialogue[];
  kpis: Kpi[];
  values_ltm: ValueLtm[];
  next_priority_hint: string;
}
