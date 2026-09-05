import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "@/lib/systemPrompt";
import { SAMPLE_DATA_BY_MONTH } from "@/lib/sampleData";
import { computeAutonomyScore, countAutonomyLeads } from "@/lib/autonomyScore";
import { getLatestScore, listReports } from "@/lib/db";
import {
  getMonthKey,
  getMonthStatus,
  getNextMonth,
  formatMonthLabel,
} from "@/lib/months";
import { COMPANY_NAME } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      "サーバーに ANTHROPIC_API_KEY が設定されていません。Vercel の環境変数を確認してください。",
      { status: 500 },
    );
  }

  let body: { report_year?: number; report_month?: number };
  try {
    body = await req.json();
  } catch {
    return new Response("リクエストの形式が不正です。", { status: 400 });
  }

  const reportYear = body.report_year;
  const reportMonth = body.report_month;
  if (!reportYear || !reportMonth) {
    return new Response("report_year と report_month は必須です。", {
      status: 400,
    });
  }

  const monthData = SAMPLE_DATA_BY_MONTH[getMonthKey({ year: reportYear, month: reportMonth })];
  if (!monthData) {
    return new Response("指定された月のデータが存在しません。", { status: 400 });
  }

  // 月の確定は厳密に古い月からの順番を強制する（決定ログ#19）。UI側の制御だけでなく
  // サーバー側でも「次に確定すべき月」であることを検証する。
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
    return new Response(
      status === "confirmed"
        ? "この月はすでに確定済みです。"
        : "この月はまだ生成できません。前の月から順に確定してください。",
      { status: 409 },
    );
  }

  const client = new Anthropic({ apiKey });

  const currentScore = computeAutonomyScore(monthData.dialogues);
  const { aiLedCount, selfLedCount } = countAutonomyLeads(monthData.dialogues);

  let previousScore: number | null = null;
  try {
    previousScore = await getLatestScore(COMPANY_NAME, reportYear, reportMonth);
  } catch {
    previousScore = null;
  }

  const nextMonth = getNextMonth({ year: reportYear, month: reportMonth });

  const userContent = JSON.stringify(
    {
      company_name: COMPANY_NAME,
      report_month: `${reportYear}年${reportMonth}月度`,
      next_report_month: formatMonthLabel(nextMonth, reportYear),
      past_decisions: monthData.past_decisions,
      dialogues: monthData.dialogues,
      kpis: monthData.kpis,
      values_ltm: monthData.values_ltm,
      next_priority_hint: monthData.next_priority_hint,
      autonomy: {
        current_score: currentScore,
        previous_score: previousScore,
        self_led_count: selfLedCount,
        ai_led_count: aiLedCount,
      },
    },
    null,
    2,
  );

  const encoder = new TextEncoder();

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const anthropicStream = client.messages.stream({
          model: "claude-opus-5",
          max_tokens: 16000,
          output_config: { effort: "high" },
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userContent }],
        });

        for await (const event of anthropicStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }

        const finalMessage = await anthropicStream.finalMessage();
        if (finalMessage.stop_reason === "refusal") {
          controller.enqueue(
            encoder.encode(
              "\n\n---\n⚠️ レポート生成がAIの安全機構により中断されました。もう一度お試しください。",
            ),
          );
        }
        // 確定（DBへの保存）は行わない。生成結果を見てから「確定する」を押すまでは
        // 何も永続化しない（strategy_planning.md 決定ログ#25, #28）。
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        controller.enqueue(
          encoder.encode(`\n\n---\n⚠️ 生成中にエラーが発生しました: ${message}`),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
