"use client";

import type React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Book, FileText, Home, Play, Sparkles, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { motion } from "framer-motion";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "ホーム", icon: Home },
    { href: "/files", label: "ファイル管理", icon: FileText },
    { href: "/quizzes", label: "クイズ一覧", icon: Book },
    { href: "/play", label: "クイズに挑戦", icon: Play },
    { href: "/document", label: "操作説明", icon: Info },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-md">
        {/* Header content */}
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <div className="icon-container animate-bounce-light">
                <Sparkles className="h-5 w-5" />
              </div>
            </Link>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              学習クイズジェネレーター
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10 py-6 pb-20 md:pb-6">
        {/* デスクトップ用サイドナビゲーション */}
        <aside className="fixed top-16 -ml-2 hidden w-full shrink-0 md:sticky md:block md:max-h-[calc(100vh-4rem)] md:overflow-y-auto">
          <nav className="py-6 pr-6 lg:py-8 rounded-lg bg-primary/10">
            <div className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "nav-item",
                      isActive ? "nav-item-active" : "nav-item-inactive"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 -z-10"
                        layoutId="nav-highlight-desktop"
                        transition={{ type: "spring", duration: 0.5 }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>
        </aside>
        <main className="flex w-full flex-col overflow-hidden animate-fade-in">
          {children}
        </main>
      </div>

      {/* モバイル用フッターナビゲーション */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 md:hidden bg-background border-t backdrop-blur-md">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full pt-1 transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="relative">
                  <Icon className="h-5 w-5 mb-1" />
                  {isActive && (
                    <motion.div
                      className="absolute -inset-1 -z-10 rounded-full bg-primary/10"
                      layoutId="nav-highlight-mobile"
                      transition={{ type: "spring", duration: 0.5 }}
                    />
                  )}
                </div>
                <span className="text-[10px]">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
