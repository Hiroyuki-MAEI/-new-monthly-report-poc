import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { ReportInput, ReportSummary, ReportDetail } from "./types";
import { AlreadyConfirmedError } from "./dbErrors";
import * as fileStore from "./fileStore";

export { AlreadyConfirmedError };

// Vercel経由でNeon Postgresを連携すると DATABASE_URL（推奨）または POSTGRES_URL が
// 自動的に環境変数へ設定される。未設定の間は lib/fileStore.ts（ローカルJSONファイル）に
// フォールバックする（strategy_planning.md 決定ログ参照。POCのデモ用途で、外部DBの
// 契約・設定なしに「確定」機能を動かせるようにするため）。
function getConnectionString(): string | null {
  return process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

let sqlClient: NeonQueryFunction<false, false> | null | undefined;

function getSql(): NeonQueryFunction<false, false> | null {
  if (sqlClient !== undefined) return sqlClient;
  const conn = getConnectionString();
  sqlClient = conn ? neon(conn) : null;
  return sqlClient;
}

let schemaEnsured = false;

async function ensureSchema(sql: NeonQueryFunction<false, false>) {
  if (schemaEnsured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS reports (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_name text NOT NULL,
      report_year int NOT NULL,
      report_month int NOT NULL,
      input_json jsonb NOT NULL,
      output_markdown text NOT NULL,
      autonomy_score int,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (company_name, report_year, report_month)
    )
  `;
  schemaEnsured = true;
}

// 1ヶ月1件・確定後は再生成不可を保証する一意制約（strategy_planning.md 決定ログ#16）。
// 違反時はAlreadyConfirmedErrorを投げる（Postgres・ローカルJSON共通）。
export async function saveReport(params: {
  companyName: string;
  reportYear: number;
  reportMonth: number;
  input: ReportInput;
  outputMarkdown: string;
  autonomyScore: number | null;
}): Promise<void> {
  const sql = getSql();
  if (!sql) return fileStore.saveReport(params);
  await ensureSchema(sql);
  try {
    await sql`
      INSERT INTO reports
        (company_name, report_year, report_month, input_json, output_markdown, autonomy_score)
      VALUES
        (${params.companyName}, ${params.reportYear}, ${params.reportMonth},
         ${JSON.stringify(params.input)}, ${params.outputMarkdown}, ${params.autonomyScore})
    `;
  } catch (err) {
    const code = (err as { code?: string } | null)?.code;
    if (code === "23505") {
      throw new AlreadyConfirmedError();
    }
    throw err;
  }
}

export async function listReports(
  companyName: string,
): Promise<ReportSummary[]> {
  const sql = getSql();
  if (!sql) return fileStore.listReports(companyName);
  await ensureSchema(sql);
  const rows = await sql`
    SELECT id, company_name, report_year, report_month, autonomy_score, created_at
    FROM reports
    WHERE company_name = ${companyName}
    ORDER BY report_year DESC, report_month DESC, created_at DESC
  `;
  return rows.map((r) => ({
    id: r.id as string,
    company_name: r.company_name as string,
    report_year: r.report_year as number,
    report_month: r.report_month as number,
    autonomy_score: r.autonomy_score as number | null,
    created_at: r.created_at as string,
  }));
}

export async function getReport(id: string): Promise<ReportDetail | null> {
  const sql = getSql();
  if (!sql) return fileStore.getReport(id);
  await ensureSchema(sql);
  const rows = await sql`
    SELECT id, company_name, report_year, report_month, input_json,
           output_markdown, autonomy_score, created_at
    FROM reports
    WHERE id = ${id}
  `;
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id as string,
    company_name: r.company_name as string,
    report_year: r.report_year as number,
    report_month: r.report_month as number,
    input_json: r.input_json as ReportInput,
    output_markdown: r.output_markdown as string,
    autonomy_score: r.autonomy_score as number | null,
    created_at: r.created_at as string,
  };
}

// その会社にとって「今回の対象年月より前の、直近の保存済みレポート」のスコアを1件返す。
// 前月固定ではなく直近の保存済みレポートを採用する（strategy_planning.md 決定ログ#9〜13）。
export async function getLatestScore(
  companyName: string,
  beforeYear: number,
  beforeMonth: number,
): Promise<number | null> {
  const sql = getSql();
  if (!sql) return fileStore.getLatestScore(companyName, beforeYear, beforeMonth);
  await ensureSchema(sql);
  const rows = await sql`
    SELECT autonomy_score
    FROM reports
    WHERE company_name = ${companyName}
      AND autonomy_score IS NOT NULL
      AND (report_year < ${beforeYear}
           OR (report_year = ${beforeYear} AND report_month < ${beforeMonth}))
    ORDER BY report_year DESC, report_month DESC, created_at DESC
    LIMIT 1
  `;
  return rows.length > 0 ? (rows[0].autonomy_score as number) : null;
}
