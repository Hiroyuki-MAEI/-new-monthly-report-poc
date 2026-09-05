import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import type { ReportInput, ReportSummary, ReportDetail } from "./types";
import { AlreadyConfirmedError } from "./dbErrors";

// Neon Postgres（DATABASE_URL／POSTGRES_URL）が未設定のときのフォールバック。
// POCの動作確認・デモ用に、プロジェクト直下の .data/reports.json へ確定済みレポートを
// 保存する（本番の複数インスタンス・Vercelのサーバーレス環境では永続化されないため、
// ローカルでの実行専用。strategy_planning.md 決定ログ参照）。
const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "reports.json");

interface StoredReport {
  id: string;
  company_name: string;
  report_year: number;
  report_month: number;
  input_json: ReportInput;
  output_markdown: string;
  autonomy_score: number | null;
  created_at: string;
}

let writeQueue: Promise<unknown> = Promise.resolve();

async function readAll(): Promise<StoredReport[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as StoredReport[];
  } catch {
    return [];
  }
}

async function writeAll(rows: StoredReport[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(rows, null, 2), "utf-8");
}

// 同時書き込みによる読み込み→書き込みの競合を避けるため、直列化する
// （ローカルの単一プロセスでの利用を想定した簡易的な対策）。
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(task, task);
  writeQueue = result.catch(() => {});
  return result;
}

export async function saveReport(params: {
  companyName: string;
  reportYear: number;
  reportMonth: number;
  input: ReportInput;
  outputMarkdown: string;
  autonomyScore: number | null;
}): Promise<void> {
  await enqueue(async () => {
    const rows = await readAll();
    const duplicate = rows.some(
      (r) =>
        r.company_name === params.companyName &&
        r.report_year === params.reportYear &&
        r.report_month === params.reportMonth,
    );
    if (duplicate) throw new AlreadyConfirmedError();

    rows.push({
      id: crypto.randomUUID(),
      company_name: params.companyName,
      report_year: params.reportYear,
      report_month: params.reportMonth,
      input_json: params.input,
      output_markdown: params.outputMarkdown,
      autonomy_score: params.autonomyScore,
      created_at: new Date().toISOString(),
    });
    await writeAll(rows);
  });
}

export async function listReports(
  companyName: string,
): Promise<ReportSummary[]> {
  const rows = await readAll();
  return rows
    .filter((r) => r.company_name === companyName)
    .sort((a, b) =>
      a.report_year !== b.report_year
        ? b.report_year - a.report_year
        : a.report_month !== b.report_month
          ? b.report_month - a.report_month
          : b.created_at.localeCompare(a.created_at),
    )
    .map((r) => ({
      id: r.id,
      company_name: r.company_name,
      report_year: r.report_year,
      report_month: r.report_month,
      autonomy_score: r.autonomy_score,
      created_at: r.created_at,
    }));
}

export async function getReport(id: string): Promise<ReportDetail | null> {
  const rows = await readAll();
  const found = rows.find((r) => r.id === id);
  return found ?? null;
}

export async function getLatestScore(
  companyName: string,
  beforeYear: number,
  beforeMonth: number,
): Promise<number | null> {
  const rows = await readAll();
  const candidates = rows
    .filter(
      (r) =>
        r.company_name === companyName &&
        r.autonomy_score !== null &&
        (r.report_year < beforeYear ||
          (r.report_year === beforeYear && r.report_month < beforeMonth)),
    )
    .sort((a, b) =>
      a.report_year !== b.report_year
        ? b.report_year - a.report_year
        : a.report_month !== b.report_month
          ? b.report_month - a.report_month
          : b.created_at.localeCompare(a.created_at),
    );
  return candidates.length > 0 ? candidates[0].autonomy_score : null;
}
