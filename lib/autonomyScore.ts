import type { Dialogue } from "./types";

// 自立度スコア（A'）v1：strategy_planning.md 決定ログ#12の算出式。
// 「経営者本人主導で型が使われた回数 ÷（本人主導＋AI提示のc_case合計）× 100」
// 該当する対話が今月1件もない場合はnull（既存の「無理に絞り出さない」原則を踏襲）。
export function computeAutonomyScore(dialogues: Dialogue[]): number | null {
  const aiLedCount = dialogues.filter((d) => d.c_case !== null).length;
  const selfLedCount = dialogues.filter(
    (d) => d.self_initiated_pattern !== null,
  ).length;

  const total = aiLedCount + selfLedCount;
  if (total === 0) return null;

  return Math.round((selfLedCount / total) * 100);
}

export function countAutonomyLeads(dialogues: Dialogue[]): {
  aiLedCount: number;
  selfLedCount: number;
} {
  return {
    aiLedCount: dialogues.filter((d) => d.c_case !== null).length,
    selfLedCount: dialogues.filter((d) => d.self_initiated_pattern !== null)
      .length,
  };
}
