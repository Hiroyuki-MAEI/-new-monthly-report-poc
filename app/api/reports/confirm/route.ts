import { SAMPLE_DATA_BY_MONTH } from "@/lib/sampleData";
import { computeAutonomyScore } from "@/lib/autonomyScore";
import { saveReport, listReports, AlreadyConfirmedError } from "@/lib/db";
import {
  getMonthKey,
  getMonthStatus,
  getNextMonth,
  formatMonthLabel,
} from "@/lib/months";
import { COMPANY_NAME } from "@/lib/config";
import type { ReportInput } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: {
    report_year?: number;
    report_month?: number;
    output_markdown?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "リクエストの形式が不正です。" }, { status: 400 });
  }

  const { report_year: reportYear, report_month: reportMonth, output_markdown: outputMarkdown } = body;
  if (!reportYear || !reportMonth || !outputMarkdown) {
    return Response.json(
      { error: "report_year・report_month・output_markdown は必須です。" },
      { status: 400 },
    );
  }

  const monthData = SAMPLE_DATA_BY_MONTH[getMonthKey({ year: reportYear, month: reportMonth })];
  if (!monthData) {
    return Response.json({ error: "指定された月のデータが存在しません。" }, { status: 400 });
  }

  // クライアントの値は信用せず、確定直前にもう一度「次に確定すべき月」であることを
  // 検証する（レース対策の一次防御。最終防御はDBの一意制約）。
  let confirmedMonths: { year: number; month: number }[] = [];
  try {
    confirmedMonths = (await listReports(COMPANY_NAME)).map((r) => ({
      year: r.report_year,
      month: r.report_month,
    }));
  } catch {
    confirmedMonths = [];
  }
  const status = getMonthStatus({ year: reportYear, month: reportMonth }, confirmedMonths);
  if (status !== "next") {
    return Response.json(
      { error: "この月はすでに確定済み、またはまだ確定できません。" },
      { status: 409 },
    );
  }

  // 自立度スコアはクライアント値を信用せず、サーバー側で再計算する。
  const autonomyScore = computeAutonomyScore(monthData.dialogues);

  const nextMonth = getNextMonth({ year: reportYear, month: reportMonth });

  const input: ReportInput = {
    company_name: COMPANY_NAME,
    report_month: `${reportYear}年${reportMonth}月度`,
    next_report_month: formatMonthLabel(nextMonth, reportYear),
    report_year: reportYear,
    report_month_num: reportMonth,
    past_decisions: monthData.past_decisions,
    dialogues: monthData.dialogues,
    kpis: monthData.kpis,
    values_ltm: monthData.values_ltm,
    next_priority_hint: monthData.next_priority_hint,
  };

  try {
    await saveReport({
      companyName: COMPANY_NAME,
      reportYear,
      reportMonth,
      input,
      outputMarkdown,
      autonomyScore,
    });
  } catch (err) {
    if (err instanceof AlreadyConfirmedError) {
      return Response.json({ error: err.message }, { status: 409 });
    }
    return Response.json(
      { error: "確定処理中にエラーが発生しました。" },
      { status: 500 },
    );
  }

  return Response.json({ ok: true });
}
