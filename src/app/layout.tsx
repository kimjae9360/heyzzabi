import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "헤이 짜비(Hey Zzabi) - 스마트 그룹웨어",
  description: "AI 기반 통합 업무 관리 플랫폼",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="min-h-full h-full">{children}</body>
    </html>
  );
}
