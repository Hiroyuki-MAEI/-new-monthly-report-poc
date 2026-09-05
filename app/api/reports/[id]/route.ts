import { getReport } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const report = await getReport(id);
    if (!report) {
      return Response.json({ error: "見つかりませんでした。" }, { status: 404 });
    }
    return Response.json({ report });
  } catch {
    return Response.json(
      { error: "履歴の取得中にエラーが発生しました。" },
      { status: 500 },
    );
  }
}
