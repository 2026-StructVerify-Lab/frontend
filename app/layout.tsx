import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Structverify",
  description: "한국 뉴스 수치 자동 검증 플랫폼",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
