import { listReports } from "@/lib/db";
import { resolveMonthStatuses } from "@/lib/months";
import { COMPANY_NAME } from "@/lib/config";

export const runtime = "nodejs";

export async function GET() {
  let confirmed: { year: number; month: number; id: string; autonomy_score: number | null; created_at: string }[] = [];
  try {
    const rows = await listReports(COMPANY_NAME);
    confirmed = rows.map((r) => ({
      id: r.id,
      year: r.report_year,
      month: r.report_month,
      autonomy_score: r.autonomy_score,
      created_at: r.created_at,
    }));
  } catch {
    confirmed = [];
  }

  const statuses = resolveMonthStatuses(confirmed);
  const months = statuses.map((s) => {
    const match = confirmed.find((c) => c.year === s.year && c.month === s.month);
    return {
      year: s.year,
      month: s.month,
      status: s.status,
      id: match?.id ?? null,
      autonomy_score: match?.autonomy_score ?? null,
      created_at: match?.created_at ?? null,
    };
  });

  return Response.json({ months });
}
