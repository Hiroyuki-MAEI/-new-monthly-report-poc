"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { COMPANY_NAME } from "@/lib/config";
import type { MonthStatus } from "@/lib/months";

interface MonthRow {
  year: number;
  month: number;
  status: MonthStatus;
  id: string | null;
  autonomy_score: number | null;
  created_at: string | null;
}

// systemPrompt.ts の「出力構成」の見出し番号と対応させ、生成中の進捗表示に使う。
// 「自立度スコア」はスコアがnullの月は出力されず番号が欠けることがある
// （systemPrompt.tsの「## 2. 自立度スコア」の指示を参照）。
const REPORT_SECTIONS = [
  { n: 1, label: "エグゼクティブサマリー" },
  { n: 2, label: "自立度スコア" },
  { n: 3, label: "対話と決定の軌跡" },
  { n: 4, label: "KPIハイライト" },
  { n: 5, label: "感情と価値観の蓄積" },
  { n: 6, label: "来月への提言" },
];

// ストリーミング中のテキストに「## n.」の見出しがどこまで出現したかで進捗を推定する。
// 1文字でも届いていれば、見出し自体が未検出でも項目1は「進行中」扱いにする
// （見出しが届く前の書き出し部分も実質的には項目1の作業であるため。無反応に見えないようにする）。
function getActiveSectionIndex(text: string): number {
  if (!text) return -1;
  let idx = 0;
  REPORT_SECTIONS.forEach((s, i) => {
    if (text.includes(`## ${s.n}.`)) idx = i;
  });
  return idx;
}

function downloadMarkdown(markdown: string, filename: string) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

type ModalState =
  | { mode: "generating"; year: number; month: number; text: string }
  | { mode: "review"; year: number; month: number; text: string; confirmError: string }
  | { mode: "viewing"; year: number; month: number; text: string }
  | { mode: "error"; year: number; month: number; message: string };

export default function Home() {
  const [months, setMonths] = useState<MonthRow[]>([]);
  const [monthsLoading, setMonthsLoading] = useState(true);
  const [monthsError, setMonthsError] = useState("");
  const [modal, setModal] = useState<ModalState | null>(null);
  const [confirming, setConfirming] = useState(false);

  function loadMonths() {
    setMonthsLoading(true);
    setMonthsError("");
    fetch("/api/reports")
      .then((res) => res.json())
      .then((data) => setMonths(data.months ?? []))
      .catch(() => setMonthsError("月の一覧の取得に失敗しました。"))
      .finally(() => setMonthsLoading(false));
  }

  useEffect(() => {
    loadMonths();
  }, []);

  async function generate(year: number, month: number) {
    setModal({ mode: "generating", year, month, text: "" });
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_year: year, report_month: month }),
      });

      if (!res.ok || !res.body) {
        const message = await res.text();
        setModal({ mode: "error", year, month, message });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setModal({ mode: "generating", year, month, text: acc });
      }
      setModal({ mode: "review", year, month, text: acc, confirmError: "" });
    } catch (err) {
      setModal({
        mode: "error",
        year,
        month,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function viewConfirmed(row: MonthRow) {
    if (!row.id) return;
    setModal({ mode: "viewing", year: row.year, month: row.month, text: "" });
    try {
      const res = await fetch(`/api/reports/${row.id}`);
      const data = await res.json();
      if (data.report) {
        setModal({
          mode: "viewing",
          year: row.year,
          month: row.month,
          text: data.report.output_markdown,
        });
      } else {
        setModal({
          mode: "error",
          year: row.year,
          month: row.month,
          message: data.error ?? "見つかりませんでした。",
        });
      }
    } catch (err) {
      setModal({
        mode: "error",
        year: row.year,
        month: row.month,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function confirmMonth() {
    if (!modal || modal.mode !== "review") return;
    const ok = window.confirm(
      `${modal.year}年${modal.month}月度を確定します。確定すると二度と作り直せません。よろしいですか？`,
    );
    if (!ok) return;

    setConfirming(true);
    try {
      const res = await fetch("/api/reports/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_year: modal.year,
          report_month: modal.month,
          output_markdown: modal.text,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setModal({ ...modal, confirmError: data.error ?? "確定に失敗しました。" });
        return;
      }
      setModal(null);
      loadMonths();
    } catch (err) {
      setModal({
        ...modal,
        confirmError: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setConfirming(false);
    }
  }

  return (
    <main>
      <h1>月次成果レポート（POC版）</h1>
      <p className="subtitle">
        生成済の月はレポートを確認することができます。未確定の月は生成することができます。
      </p>

      {monthsLoading && <p className="status status-standalone">読み込み中…</p>}
      {monthsError && <p className="error status-standalone">{monthsError}</p>}

      {!monthsLoading && months.length > 0 && (
        <>
          <p className="month-grid-year">{months[0].year}年</p>
          <div className="month-grid">
            {months.map((row) => {
              const title =
                row.status === "confirmed"
                  ? "見る"
                  : row.status === "next"
                    ? "生成する"
                    : "未生成";
              const statusLabel =
                row.status === "confirmed"
                  ? row.autonomy_score !== null
                    ? `✓ ${row.autonomy_score}点`
                    : "✓ 生成済み"
                  : row.status === "next"
                    ? "生成する →"
                    : "順番待ち";
              return (
                <button
                  type="button"
                  key={`${row.year}-${row.month}`}
                  className={`month-tile month-tile-${row.status}`}
                  disabled={row.status === "locked"}
                  title={title}
                  onClick={() =>
                    row.status === "confirmed"
                      ? viewConfirmed(row)
                      : row.status === "next"
                        ? generate(row.year, row.month)
                        : undefined
                  }
                >
                  <span className="month-tile-month">{row.month}月度</span>
                  <span className="month-tile-status">{statusLabel}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="top-actions">
              <button
                className="secondary"
                type="button"
                onClick={() => setModal(null)}
              >
                閉じる
              </button>
            </div>

            <p className="modal-company">{COMPANY_NAME}</p>
            <h2 className="modal-title">
              {modal.year}年{modal.month}月度
            </h2>

            {modal.mode === "generating" && (
              <div className="progress-box">
                {modal.text === "" ? (
                  <p className="status status-standalone thinking-line">
                    <span className="spinner" aria-hidden="true" />
                    AIが考えています…
                  </p>
                ) : (
                  <p className="status status-standalone">
                    生成中です…（数十秒かかることがあります）
                  </p>
                )}
                <ul className="progress-steps">
                  {REPORT_SECTIONS.map((s, i) => {
                    const activeIdx = getActiveSectionIndex(modal.text);
                    const state =
                      i < activeIdx ? "done" : i === activeIdx ? "active" : "pending";
                    return (
                      <li key={s.n} className={`progress-step progress-step-${state}`}>
                        <span className="progress-step-icon">
                          {state === "done" ? "✓" : state === "active" ? "…" : "○"}
                        </span>
                        {s.n}. {s.label}
                      </li>
                    );
                  })}
                </ul>
                {modal.text && (
                  <div className="report">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {modal.text}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            )}

            {modal.mode === "error" && (
              <p className="error status-standalone">{modal.message}</p>
            )}

            {(modal.mode === "review" || modal.mode === "viewing") && (
              <>
                <div className="top-actions">
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => navigator.clipboard.writeText(modal.text)}
                  >
                    コピー
                  </button>
                  <button
                    className="secondary"
                    type="button"
                    onClick={() =>
                      downloadMarkdown(
                        modal.text,
                        `月次成果レポート_${COMPANY_NAME}_${modal.year}年${modal.month}月度.md`,
                      )
                    }
                  >
                    Markdownをダウンロード
                  </button>
                </div>
                <div className="report report-elevated">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {modal.text}
                  </ReactMarkdown>
                </div>
              </>
            )}

            {modal.mode === "review" && (
              <div className="modal-review-actions">
                {modal.confirmError && (
                  <p className="error status-standalone">{modal.confirmError}</p>
                )}
                <p className="note-subtle">
                  ※「やり直す」を押すたびに、AI生成のAPI料金が発生します。
                </p>
                <div className="modal-review-buttons">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => generate(modal.year, modal.month)}
                    disabled={confirming}
                  >
                    やり直す
                  </button>
                  <button
                    type="button"
                    className="generate"
                    onClick={confirmMonth}
                    disabled={confirming}
                  >
                    {confirming ? "確定中…" : "この内容で確定する"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
