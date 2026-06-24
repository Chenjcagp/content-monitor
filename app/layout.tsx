import type { Metadata } from "next";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "内容雷达 · Content Radar",
  description: "多平台内容监控 + AI 选题分析",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-slate-50">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}