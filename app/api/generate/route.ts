import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "@/lib/systemPrompt";
import type { ReportInput } from "@/lib/types";

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

  let input: ReportInput;
  try {
    input = await req.json();
  } catch {
    return new Response("リクエストの形式が不正です。", { status: 400 });
  }

  if (!input.company_name || !input.report_month) {
    return new Response("company_name と report_month は必須です。", {
      status: 400,
    });
  }

  const client = new Anthropic({ apiKey });

  const userContent = JSON.stringify(
    {
      company_name: input.company_name,
      report_month: input.report_month,
      past_decisions: input.past_decisions ?? [],
      dialogues: input.dialogues ?? [],
      kpis: input.kpis ?? [],
      values_ltm: input.values_ltm ?? [],
      next_priority_hint: input.next_priority_hint ?? "",
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
              "\n\n---\n⚠️ レポート生成がAIの安全機構により中断されました。入力内容を見直すか、もう一度お試しください。",
            ),
          );
        }
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
