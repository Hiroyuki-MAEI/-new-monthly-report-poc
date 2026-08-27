"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  SAMPLE_PAST_DECISIONS,
  SAMPLE_DIALOGUES,
  SAMPLE_KPIS,
  SAMPLE_VALUES_LTM,
} from "@/lib/sampleData";

type JsonFieldKey =
  | "pastDecisionsText"
  | "dialoguesText"
  | "kpisText"
  | "valuesLtmText";

export default function Home() {
  const [companyName, setCompanyName] = useState("");
  const [reportMonth, setReportMonth] = useState("2026年7月度");
  const [nextPriorityHint, setNextPriorityHint] = useState(
    "既存顧客との関係を維持しながら、受注量をどう安定的に増やしていくか",
  );

  const [pastDecisionsText, setPastDecisionsText] = useState(
    JSON.stringify(SAMPLE_PAST_DECISIONS, null, 2),
  );
  const [dialoguesText, setDialoguesText] = useState(
    JSON.stringify(SAMPLE_DIALOGUES, null, 2),
  );
  const [kpisText, setKpisText] = useState(JSON.stringify(SAMPLE_KPIS, null, 2));
  const [valuesLtmText, setValuesLtmText] = useState(
    JSON.stringify(SAMPLE_VALUES_LTM, null, 2),
  );

  const [errors, setErrors] = useState<Partial<Record<JsonFieldKey, string>>>(
    {},
  );
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  function parseJsonField(
    key: JsonFieldKey,
    text: string,
  ): unknown[] | null {
    try {
      const parsed = JSON.parse(text || "[]");
      if (!Array.isArray(parsed)) {
        setErrors((prev) => ({ ...prev, [key]: "配列（[...]）形式である必要があります" }));
        return null;
      }
      setErrors((prev) => ({ ...prev, [key]: undefined }));
      return parsed;
    } catch (e) {
      setErrors((prev) => ({
        ...prev,
        [key]: `JSONとして読み取れません: ${e instanceof Error ? e.message : String(e)}`,
      }));
      return null;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const pastDecisions = parseJsonField("pastDecisionsText", pastDecisionsText);
    const dialogues = parseJsonField("dialoguesText", dialoguesText);
    const kpis = parseJsonField("kpisText", kpisText);
    const valuesLtm = parseJsonField("valuesLtmText", valuesLtmText);

    if (!pastDecisions || !dialogues || !kpis || !valuesLtm) {
      return;
    }
    if (!companyName.trim() || !reportMonth.trim()) {
      setStatusMsg("会社名と対象月は必須です。");
      return;
    }

    setLoading(true);
    setReport("");
    setStatusMsg("生成中です…（数十秒かかることがあります）");

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

  return (
    <main>
      <h1>月次成果レポート ジェネレーター</h1>
      <p className="subtitle">
        右腕AI・月次成果レポート機能のPOC。左の項目を入力して生成すると、下にレポートが表示されます。
      </p>

      <form onSubmit={handleSubmit}>
        <section className="card">
          <h2>基本情報</h2>
          <label htmlFor="companyName">会社名 / 代表の呼称</label>
          <input
            id="companyName"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="例: 株式会社サンプル"
          />

          <label htmlFor="reportMonth">対象月</label>
          <input
            id="reportMonth"
            type="text"
            value={reportMonth}
            onChange={(e) => setReportMonth(e.target.value)}
            placeholder="例: 2026年7月度"
          />

          <label htmlFor="nextPriorityHint">来月の優先課題ヒント（next_priority_hint）</label>
          <textarea
            id="nextPriorityHint"
            value={nextPriorityHint}
            onChange={(e) => setNextPriorityHint(e.target.value)}
            rows={2}
          />
        </section>

        <section className="card">
          <h2>過去の決定（past_decisions）</h2>
          <p className="hint">
            伏線回収の元ネタ。今も成果に影響を与え続けている過去の決断があれば配列で記述。無ければ [] のままでOK。
          </p>
          <textarea
            value={pastDecisionsText}
            onChange={(e) => setPastDecisionsText(e.target.value)}
            rows={8}
            spellCheck={false}
          />
          {errors.pastDecisionsText && (
            <p className="error">{errors.pastDecisionsText}</p>
          )}
        </section>

        <section className="card">
          <h2>今月の対話（dialogues）</h2>
          <p className="hint">
            共創機能に残る今月の対話ログ。c_case は対話中にリアルタイムでC案が提示された場合のみ記載、なければ null。
          </p>
          <textarea
            value={dialoguesText}
            onChange={(e) => setDialoguesText(e.target.value)}
            rows={12}
            spellCheck={false}
          />
          {errors.dialoguesText && <p className="error">{errors.dialoguesText}</p>}
        </section>

        <section className="card">
          <h2>KPI（kpis）</h2>
          <p className="hint">
            経営ダッシュボードの実績。右腕AIとの関与有無に関わらず、会社全体の実績を全件含める。
          </p>
          <textarea
            value={kpisText}
            onChange={(e) => setKpisText(e.target.value)}
            rows={14}
            spellCheck={false}
          />
          {errors.kpisText && <p className="error">{errors.kpisText}</p>}
        </section>

        <section className="card">
          <h2>価値観・重要キーワード（values_ltm）</h2>
          <p className="hint">LTMから抽出された今月の価値観。</p>
          <textarea
            value={valuesLtmText}
            onChange={(e) => setValuesLtmText(e.target.value)}
            rows={6}
            spellCheck={false}
          />
          {errors.valuesLtmText && (
            <p className="error">{errors.valuesLtmText}</p>
          )}
        </section>

        <div className="actions">
          <button className="generate" type="submit" disabled={loading}>
            {loading ? "生成中…" : "レポートを生成する"}
          </button>
          {statusMsg && <span className="status">{statusMsg}</span>}
        </div>
      </form>

      {report && (
        <div className="report">
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
