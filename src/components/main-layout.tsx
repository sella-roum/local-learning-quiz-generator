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
            <div className="icon-container animate-bounce-light">
              <Sparkles className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              学習クイズジェネレーター
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10 py-6">
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
                        layoutId="nav-highlight"
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
    </div>
  );
}
