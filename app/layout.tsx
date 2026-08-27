import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "月次成果レポート ジェネレーター",
  description: "右腕AI 月次成果レポート生成POC",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
