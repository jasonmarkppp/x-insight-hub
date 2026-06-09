import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "X Insight Hub - Content Intelligence Platform",
  description:
    "Monitor X/Twitter accounts, analyze content with AI, and generate multi-platform content.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="ml-60 flex-1">
              {/* Top bar */}
              <header className="sticky top-0 z-30 flex h-14 items-center justify-end gap-4 border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <ThemeToggle />
              </header>
              {/* Page content */}
              <div className="p-6">{children}</div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
