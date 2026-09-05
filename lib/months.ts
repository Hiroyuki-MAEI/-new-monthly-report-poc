import { SERVICE_START_YEAR, SERVICE_START_MONTH } from "./config";

export interface YearMonth {
  year: number;
  month: number;
}

export type MonthStatus = "confirmed" | "next" | "locked";

export interface MonthState extends YearMonth {
  status: MonthStatus;
}

function toIndex({ year, month }: YearMonth): number {
  return year * 12 + (month - 1);
}

function fromIndex(index: number): YearMonth {
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

// 月次実績はその月が終わってから確定する数字なので、生成可能な最新月は常に「前月」
// （進行中の今月は対象外。strategy_planning.md 決定ログ#20）。
export function getPreviousMonth(now: Date = new Date()): YearMonth {
  const index = now.getFullYear() * 12 + now.getMonth() - 1;
  return fromIndex(index);
}

export function getNextMonth({ year, month }: YearMonth): YearMonth {
  return fromIndex(toIndex({ year, month }) + 1);
}

// 「6. 〜への提言」の見出しに使う表示用ラベル。基準年（レポート自身のreport_year）と
// 同じ年なら年を省略し「7月度」、年をまたぐ場合のみ「2027年1月度」のように年を明記する
// （日付表記と同じ「年の省略」ルールをnext_report_month自体にも適用する）。
export function formatMonthLabel(
  target: YearMonth,
  referenceYear: number,
): string {
  return target.year === referenceYear
    ? `${target.month}月度`
    : `${target.year}年${target.month}月度`;
}

export function getMonthKey({ year, month }: YearMonth): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

// 利用開始月〜前月までの全月を古い順で返す（決定ログ#18）。
export function getAvailableMonths(now: Date = new Date()): YearMonth[] {
  const startIdx = toIndex({ year: SERVICE_START_YEAR, month: SERVICE_START_MONTH });
  const endIdx = toIndex(getPreviousMonth(now));
  const months: YearMonth[] = [];
  for (let idx = startIdx; idx <= endIdx; idx++) {
    months.push(fromIndex(idx));
  }
  return months;
}

// 確定済み月一覧と突き合わせ、各月に confirmed/next/locked を付与する。
// next は「確定済みに含まれない最古の1件」のみ。それより後の月はすべて locked
// （月の確定は厳密に古い月からの順番を強制する。決定ログ#19）。
export function resolveMonthStatuses(
  confirmed: YearMonth[],
  now: Date = new Date(),
): MonthState[] {
  const confirmedKeys = new Set(confirmed.map(getMonthKey));
  let nextAssigned = false;

  return getAvailableMonths(now).map((ym) => {
    if (confirmedKeys.has(getMonthKey(ym))) {
      return { ...ym, status: "confirmed" as const };
    }
    if (!nextAssigned) {
      nextAssigned = true;
      return { ...ym, status: "next" as const };
    }
    return { ...ym, status: "locked" as const };
  });
}

export function getMonthStatus(
  target: YearMonth,
  confirmed: YearMonth[],
  now: Date = new Date(),
): MonthStatus | null {
  const states = resolveMonthStatuses(confirmed, now);
  const found = states.find(
    (s) => s.year === target.year && s.month === target.month,
  );
  return found ? found.status : null;
}
