"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type {
  PastDecision,
  Dialogue,
  Kpi,
  ValueLtm,
  Confidence,
} from "@/lib/types";
import {
  SAMPLE_PAST_DECISIONS,
  SAMPLE_DIALOGUES,
  SAMPLE_KPIS,
  SAMPLE_VALUES_LTM,
} from "@/lib/sampleData";

// Enterキーで同じ画面内の次の入力欄へフォーカスを移す（入力補助）
function focusNextOnEnter(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key !== "Enter") return;
  e.preventDefault();
  const form = e.currentTarget.form;
  if (!form) return;
  const focusable = Array.from(
    form.querySelectorAll<HTMLElement>(
      "input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
    ),
  );
  const idx = focusable.indexOf(e.currentTarget);
  if (idx > -1 && idx + 1 < focusable.length) {
    focusable[idx + 1].focus();
  }
}

// シミュレーション用DB（lib/sampleData.ts）が2026年4〜8月分しか無く、
// 過去3ヶ月分を参照できる月として2026年7月度・8月度のみ選択可にしている（POCの制約）。
const YEARS = [2026];
const MONTHS = [7, 8];

// "2026年8月" "2026年8月25日" のような日本語日付表記から年・月だけを抜き出す
function parseYearMonth(dateStr: string): { year: number; month: number } | null {
  const m = dateStr.match(/^(\d{4})年(\d{1,2})月/);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]) };
}

// systemPrompt.ts の「出力構成」の見出し番号と対応させ、生成中の進捗表示に使う
const REPORT_SECTIONS = [
  { n: 1, label: "エグゼクティブサマリー" },
  { n: 2, label: "対話と決定の軌跡" },
  { n: 3, label: "KPIハイライト" },
  { n: 4, label: "感情と価値観の蓄積" },
  { n: 5, label: "来月への提言" },
];

// ストリーミング中のテキストに「## n.」の見出しがどこまで出現したかで進捗を推定する
function getActiveSectionIndex(text: string): number {
  let idx = -1;
  REPORT_SECTIONS.forEach((s, i) => {
    if (text.includes(`## ${s.n}.`)) idx = i;
  });
  return idx;
}

type StepKey = "basic" | "past" | "dialogues" | "kpis" | "values";

const STEPS: { key: StepKey; title: string }[] = [
  { key: "basic", title: "基本情報" },
  { key: "past", title: "過去の決定" },
  { key: "dialogues", title: "今月の対話" },
  { key: "kpis", title: "KPI" },
  { key: "values", title: "価値観・大切にしていること" },
];

export default function Home() {
  const [screen, setScreen] = useState<"input" | "result">("input");
  const [openStep, setOpenStep] = useState<StepKey>("basic");

  const [companyName, setCompanyName] = useState("");
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(8); // 過去ログデータベースのシミュレートデータ（4〜8月ログ）の最新月をデフォルトに
  const [nextPriorityHint, setNextPriorityHint] = useState(
    "値上げ後の解約防止と、新卒教育・大口案件対応の両立を、今のリソースでどう安定させるか",
  );

  const [pastDecisions, setPastDecisions] = useState<PastDecision[]>(
    SAMPLE_PAST_DECISIONS,
  );
  const [dialogues, setDialogues] = useState<Dialogue[]>(SAMPLE_DIALOGUES);
  const [kpis, setKpis] = useState<Kpi[]>(SAMPLE_KPIS);
  const [valuesLtm, setValuesLtm] = useState<ValueLtm[]>(SAMPLE_VALUES_LTM);

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);

  const reportMonth = `${year}年${month}月度`;

  // 対象年月と、過去の決定・今月の対話に入っている個々の日付との整合性を確認する。
  // 「今月の対話」は対象年月と同じ年月、「過去の決定」は対象年月より前であるべき。
  function validateDateConsistency(): string[] {
    const errors: string[] = [];

    dialogues.forEach((d) => {
      if (!d.date.trim()) return;
      const parsed = parseYearMonth(d.date);
      if (parsed && (parsed.year !== year || parsed.month !== month)) {
        errors.push(
          `「今月の対話」の日付「${d.date}」が、対象年月（${year}年${month}月度）と一致していません。`,
        );
      }
    });

    pastDecisions.forEach((p) => {
      if (!p.date.trim()) return;
      const parsed = parseYearMonth(p.date);
      if (parsed) {
        const isBeforeTarget =
          parsed.year < year || (parsed.year === year && parsed.month < month);
        if (!isBeforeTarget) {
          errors.push(
            `「過去の決定」の日付「${p.date}」が、対象年月（${year}年${month}月度）より前になっていません。`,
          );
        }
      }
    });

    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) {
      setFieldErrors(["会社名を選択してください。"]);
      setOpenStep("basic");
      return;
    }

    const dateIssues = validateDateConsistency();
    if (dateIssues.length > 0) {
      setFieldErrors(dateIssues);
      setOpenStep(
        dateIssues.some((msg) => msg.includes("今月の対話"))
          ? "dialogues"
          : "past",
      );
      return;
    }

    setFieldErrors([]);
    setLoading(true);
    setReport("");
    setStatusMsg("生成中です…（数十秒かかることがあります）");
    setScreen("result");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName,
          report_month: reportMonth,
          next_priority_hint: nextPriorityHint,
          past_decisions: pastDecisions,
          dialogues,
          kpis,
          values_ltm: valuesLtm,
        }),
      });

      if (!res.ok || !res.body) {
        const text = await res.text();
        setStatusMsg(`エラー: ${text}`);
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setReport(acc);
      }
      setStatusMsg("");
    } catch (err) {
      setStatusMsg(
        `通信エラー: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setLoading(false);
    }
  }

  function copyReport() {
    navigator.clipboard.writeText(report);
  }

  function backToInput() {
    setScreen("input");
  }

  if (screen === "result") {
    return (
      <main>
        <div className="breadcrumb">
          <button className="back-link" type="button" onClick={backToInput}>
            ← 入力に戻る
          </button>
          <span className="breadcrumb-path">入力 &gt; <b>結果</b></span>
        </div>
        <span className="screen-badge screen-badge-output">出力：AIが生成したレポート</span>

        {loading && (
          <div className="progress-box">
            <p className="status status-standalone">{statusMsg}</p>
            <ul className="progress-steps">
              {REPORT_SECTIONS.map((s, i) => {
                const activeIdx = getActiveSectionIndex(report);
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
          </div>
        )}
        {statusMsg && !loading && statusMsg.startsWith("エラー") && (
          <p className="error status-standalone">{statusMsg}</p>
        )}

        {report && (
          <div className="report report-elevated">
            <div className="top-actions">
              <button className="secondary" onClick={copyReport} type="button">
                コピー
              </button>
            </div>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="with-sticky-bar">
      <div className="breadcrumb">
        <span className="breadcrumb-path"><b>入力</b> &gt; 結果</span>
      </div>
      <span className="screen-badge screen-badge-input">入力：この画面でデータを準備します</span>
      <h1>月次成果レポート ジェネレーター</h1>
      <p className="subtitle">
        右腕AI・月次成果レポート機能のPOC。各項目を入力して「レポートを生成する」を押してください。
      </p>

      <form onSubmit={handleSubmit}>
        <p className="zone-label zone-label-manual">
          ① あなたが入力する情報
        </p>
        <AccordionSection
          stepKey="basic"
          title="基本情報"
          openStep={openStep}
          setOpenStep={setOpenStep}
          summary={companyName || "未入力"}
        >
          <label htmlFor="companyName">会社名・代表者名</label>
          <select
            id="companyName"
            value={companyName}
            onChange={(e) => {
              setCompanyName(e.target.value);
              if (fieldErrors.length) setFieldErrors([]);
            }}
          >
            <option value="">選択してください</option>
            <option value="株式会社サンプル">株式会社サンプル</option>
            <option value="テスト株式会社">テスト株式会社</option>
          </select>

          <label htmlFor="reportYear">対象年月</label>
          <div className="month-picker">
            <select
              id="reportYear"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}年
                </option>
              ))}
            </select>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}月
                </option>
              ))}
            </select>
            <span className="month-picker-suffix">度</span>
          </div>
          <p className="note-subtle">
            ※ 現在のPOCはシミュレーション用データベース（2026年4月〜8月分）のみを保持しており、過去3ヶ月分を参照できる7月度・8月度のみ選択可能にしています。
          </p>

          <label htmlFor="nextPriorityHint">来月の優先課題</label>
          <textarea
            id="nextPriorityHint"
            value={nextPriorityHint}
            onChange={(e) => setNextPriorityHint(e.target.value)}
            rows={2}
            placeholder="例: 既存顧客との関係を維持しながら受注量を増やすには"
          />
        </AccordionSection>

        <div className="zone-divider">
          <p className="zone-label zone-label-auto">
            ② 本来は右腕AIの過去ログデータベースから自動連携される情報
          </p>
          <p className="zone-note">
            ここから先の4項目は、実際の右腕AIでは経営ダッシュボード・共創機能・LTMが右腕AIの過去ログデータベースに書き込んだデータを自動で読み込む想定です。
            現在のPOCにはその自動連携がまだ無いため、過去ログデータベースの各テーブルに入っているはずの内容を、手入力で再現（シミュレート）しています。
          </p>
        </div>

        <AccordionSection
          stepKey="past"
          title="過去の決定"
          openStep={openStep}
          setOpenStep={setOpenStep}
          summary={`${pastDecisions.length}件`}
        >
          <p className="hint">
            <span className="log-db-tag">右腕AIの過去ログデータベース: past_decisions テーブル</span>
            伏線回収の元ネタ。今も成果に影響を与え続けている過去の決断があれば追加してください。
          </p>
          {pastDecisions.map((row, i) => (
            <EntryRow
              key={i}
              onRemove={() =>
                setPastDecisions(pastDecisions.filter((_, j) => j !== i))
              }
            >
              <input
                type="text"
                value={row.date}
                onChange={(e) =>
                  updateAt(setPastDecisions, pastDecisions, i, {
                    date: e.target.value,
                  })
                }
                onKeyDown={focusNextOnEnter}
                placeholder="いつ（例: 2026年4月）"
              />
              <input
                type="text"
                value={row.event}
                onChange={(e) =>
                  updateAt(setPastDecisions, pastDecisions, i, {
                    event: e.target.value,
                  })
                }
                onKeyDown={focusNextOnEnter}
                placeholder="きっかけとなった出来事"
              />
              <input
                type="text"
                value={row.decision}
                onChange={(e) =>
                  updateAt(setPastDecisions, pastDecisions, i, {
                    decision: e.target.value,
                  })
                }
                onKeyDown={focusNextOnEnter}
                placeholder="その時下した決断"
              />
              <input
                type="text"
                value={row.kpi_to_track ?? ""}
                onChange={(e) =>
                  updateAt(setPastDecisions, pastDecisions, i, {
                    kpi_to_track: e.target.value || null,
                  })
                }
                onKeyDown={focusNextOnEnter}
                placeholder="追跡する指標（任意）"
              />
            </EntryRow>
          ))}
          <button
            type="button"
            className="add-row"
            onClick={() =>
              setPastDecisions([
                ...pastDecisions,
                { date: "", event: "", decision: "", kpi_to_track: null },
              ])
            }
          >
            + 過去の決定を追加
          </button>
        </AccordionSection>

        <AccordionSection
          stepKey="dialogues"
          title="今月の対話"
          openStep={openStep}
          setOpenStep={setOpenStep}
          summary={`${dialogues.length}件`}
        >
          <p className="hint">
            <span className="log-db-tag">右腕AIの過去ログデータベース: dialogues テーブル</span>
            共創機能に残る今月の対話ログです。対話中にAIがC案を提示した場合はチェックを入れてください。
          </p>
          {dialogues.map((row, i) => (
            <EntryRow
              key={i}
              onRemove={() => setDialogues(dialogues.filter((_, j) => j !== i))}
            >
              <input
                type="text"
                value={row.date}
                onChange={(e) =>
                  updateAt(setDialogues, dialogues, i, { date: e.target.value })
                }
                onKeyDown={focusNextOnEnter}
                placeholder="日付（例: 2026年7月10日）"
              />
              <input
                type="text"
                value={row.topic}
                onChange={(e) =>
                  updateAt(setDialogues, dialogues, i, { topic: e.target.value })
                }
                onKeyDown={focusNextOnEnter}
                placeholder="相談内容"
              />
              <input
                type="text"
                value={row.decision}
                onChange={(e) =>
                  updateAt(setDialogues, dialogues, i, {
                    decision: e.target.value,
                  })
                }
                onKeyDown={focusNextOnEnter}
                placeholder="決定した戦術"
              />
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={row.c_case !== null}
                  onChange={(e) =>
                    updateAt(setDialogues, dialogues, i, {
                      c_case: e.target.checked
                        ? {
                            option_a: "",
                            option_b: "",
                            presented: "",
                            reasoning_pattern: "",
                          }
                        : null,
                    })
                  }
                />
                この対話でC案が提示された
              </label>
              {row.c_case && (
                <div className="nested-fields">
                  <input
                    type="text"
                    value={row.c_case.option_a}
                    onChange={(e) =>
                      updateAt(setDialogues, dialogues, i, {
                        c_case: { ...row.c_case!, option_a: e.target.value },
                      })
                    }
                    onKeyDown={focusNextOnEnter}
                    placeholder="悩んでいたA案"
                  />
                  <input
                    type="text"
                    value={row.c_case.option_b}
                    onChange={(e) =>
                      updateAt(setDialogues, dialogues, i, {
                        c_case: { ...row.c_case!, option_b: e.target.value },
                      })
                    }
                    onKeyDown={focusNextOnEnter}
                    placeholder="悩んでいたB案"
                  />
                  <input
                    type="text"
                    value={row.c_case.presented}
                    onChange={(e) =>
                      updateAt(setDialogues, dialogues, i, {
                        c_case: { ...row.c_case!, presented: e.target.value },
                      })
                    }
                    onKeyDown={focusNextOnEnter}
                    placeholder="AIが提示したC案"
                  />
                  <input
                    type="text"
                    value={row.c_case.reasoning_pattern}
                    onChange={(e) =>
                      updateAt(setDialogues, dialogues, i, {
                        c_case: {
                          ...row.c_case!,
                          reasoning_pattern: e.target.value,
                        },
                      })
                    }
                    onKeyDown={focusNextOnEnter}
                    placeholder="思考の型（例: 対立軸をずらす）"
                  />
                </div>
              )}
            </EntryRow>
          ))}
          <button
            type="button"
            className="add-row"
            onClick={() =>
              setDialogues([
                ...dialogues,
                { date: "", topic: "", decision: "", c_case: null },
              ])
            }
          >
            + 対話を追加
          </button>
        </AccordionSection>

        <AccordionSection
          stepKey="kpis"
          title="KPI"
          openStep={openStep}
          setOpenStep={setOpenStep}
          summary={`${kpis.length}件`}
        >
          <p className="hint">
            <span className="log-db-tag">右腕AIの過去ログデータベース: kpis テーブル</span>
            経営ダッシュボードの実績。右腕AIとの関与有無に関わらず、会社全体の実績を全件含めてください。
          </p>
          {kpis.map((row, i) => (
            <EntryRow
              key={i}
              onRemove={() => setKpis(kpis.filter((_, j) => j !== i))}
            >
              <input
                type="text"
                value={row.name}
                onChange={(e) =>
                  updateAt(setKpis, kpis, i, { name: e.target.value })
                }
                onKeyDown={focusNextOnEnter}
                placeholder="指標名（例: 月間売上高）"
              />
              <div className="field-row">
                <input
                  type="number"
                  value={row.prev_value}
                  onChange={(e) =>
                    updateAt(setKpis, kpis, i, {
                      prev_value: Number(e.target.value),
                    })
                  }
                  onKeyDown={focusNextOnEnter}
                  placeholder="前月の値"
                />
                <input
                  type="number"
                  value={row.current_value}
                  onChange={(e) =>
                    updateAt(setKpis, kpis, i, {
                      current_value: Number(e.target.value),
                    })
                  }
                  onKeyDown={focusNextOnEnter}
                  placeholder="今月の値"
                />
                <input
                  type="text"
                  value={row.unit}
                  onChange={(e) =>
                    updateAt(setKpis, kpis, i, { unit: e.target.value })
                  }
                  onKeyDown={focusNextOnEnter}
                  placeholder="単位（円・件など）"
                  className="unit-input"
                />
                <input
                  type="number"
                  value={row.target ?? ""}
                  onChange={(e) =>
                    updateAt(setKpis, kpis, i, {
                      target: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  onKeyDown={focusNextOnEnter}
                  placeholder="目標値（任意）"
                />
              </div>
              <div className="field-row">
                <select
                  value={row.confidence ?? ""}
                  onChange={(e) =>
                    updateAt(setKpis, kpis, i, {
                      confidence: (e.target.value || null) as Confidence,
                    })
                  }
                >
                  <option value="">確信度：関連なし</option>
                  <option value="高">確信度：高</option>
                  <option value="中">確信度：中</option>
                  <option value="低">確信度：低</option>
                </select>
              </div>
              <input
                type="text"
                value={row.linked_dialogue_dates.join(", ")}
                onChange={(e) =>
                  updateAt(setKpis, kpis, i, {
                    linked_dialogue_dates: splitList(e.target.value),
                  })
                }
                onKeyDown={focusNextOnEnter}
                placeholder="関連する対話の日付（カンマ区切り、任意）"
              />
              <input
                type="text"
                value={row.linked_past_decisions.join(", ")}
                onChange={(e) =>
                  updateAt(setKpis, kpis, i, {
                    linked_past_decisions: splitList(e.target.value),
                  })
                }
                onKeyDown={focusNextOnEnter}
                placeholder="関連する過去の決定の年月（カンマ区切り、任意）"
              />
              <input
                type="text"
                value={row.alt_factors ?? ""}
                onChange={(e) =>
                  updateAt(setKpis, kpis, i, {
                    alt_factors: e.target.value || null,
                  })
                }
                onKeyDown={focusNextOnEnter}
                placeholder="他に考えられる要因（任意）"
              />
            </EntryRow>
          ))}
          <button
            type="button"
            className="add-row"
            onClick={() =>
              setKpis([
                ...kpis,
                {
                  name: "",
                  prev_value: 0,
                  current_value: 0,
                  unit: "",
                  target: null,
                  linked_dialogue_dates: [],
                  linked_past_decisions: [],
                  confidence: null,
                  alt_factors: null,
                },
              ])
            }
          >
            + KPIを追加
          </button>
        </AccordionSection>

        <AccordionSection
          stepKey="values"
          title="価値観・大切にしていること"
          openStep={openStep}
          setOpenStep={setOpenStep}
          summary={`${valuesLtm.length}件`}
        >
          <p className="hint">
            <span className="log-db-tag">右腕AIの過去ログデータベース: values_ltm テーブル</span>
            LTMから抽出された今月の価値観。
          </p>
          {valuesLtm.map((row, i) => (
            <EntryRow
              key={i}
              onRemove={() => setValuesLtm(valuesLtm.filter((_, j) => j !== i))}
            >
              <input
                type="text"
                value={row.keyword}
                onChange={(e) =>
                  updateAt(setValuesLtm, valuesLtm, i, {
                    keyword: e.target.value,
                  })
                }
                onKeyDown={focusNextOnEnter}
                placeholder="キーワード"
              />
              <input
                type="text"
                value={row.context}
                onChange={(e) =>
                  updateAt(setValuesLtm, valuesLtm, i, {
                    context: e.target.value,
                  })
                }
                onKeyDown={focusNextOnEnter}
                placeholder="どの対話・行動に表れていたか"
              />
            </EntryRow>
          ))}
          <button
            type="button"
            className="add-row"
            onClick={() =>
              setValuesLtm([...valuesLtm, { keyword: "", context: "" }])
            }
          >
            + 価値観を追加
          </button>
        </AccordionSection>

        <div className="sticky-bar">
          <button className="generate" type="submit" disabled={loading}>
            {loading ? "生成中…" : "レポートを生成する"}
          </button>
          {fieldErrors.length > 0 && (
            <ul className="field-error-list">
              {fieldErrors.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          )}
          {fieldErrors.length === 0 && statusMsg && (
            <span className="status">{statusMsg}</span>
          )}
        </div>
      </form>
    </main>
  );
}

function splitList(text: string): string[] {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function updateAt<T>(
  setter: (v: T[]) => void,
  arr: T[],
  index: number,
  patch: Partial<T>,
) {
  setter(arr.map((item, i) => (i === index ? { ...item, ...patch } : item)));
}

function AccordionSection({
  stepKey,
  title,
  openStep,
  setOpenStep,
  summary,
  children,
}: {
  stepKey: StepKey;
  title: string;
  openStep: StepKey;
  setOpenStep: (k: StepKey) => void;
  summary: string;
  children: React.ReactNode;
}) {
  const isOpen = openStep === stepKey;
  return (
    <section className={`accordion ${isOpen ? "open" : ""}`}>
      <button
        type="button"
        className="accordion-header"
        onClick={() => setOpenStep(stepKey)}
        aria-expanded={isOpen}
      >
        <span className="accordion-title">{title}</span>
        <span className="accordion-summary">{summary}</span>
        <span className="accordion-chevron">{isOpen ? "▾" : "▸"}</span>
      </button>
      {isOpen && <div className="accordion-body">{children}</div>}
    </section>
  );
}

function EntryRow({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <div className="entry-row">
      <div className="entry-row-content">{children}</div>
      <button
        type="button"
        className="entry-row-remove"
        onClick={onRemove}
        aria-label="この項目を削除"
        title="削除"
      >
        削除
      </button>
    </div>
  );
}
