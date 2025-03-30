"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Calendar,
  Search,
  CheckCircle,
  XCircle,
  ArrowLeft,
  History,
  Clock,
  BarChart4,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default function HistoryPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // セッション履歴を取得
  const sessions = useLiveQuery(() =>
    db.sessions.orderBy("startedAt").reverse().toArray()
  );

  // カテゴリの一覧を取得
  const categories = useLiveQuery(async () => {
    if (!sessions) return [];
    const categorySet = new Set(
      sessions.map((session) => session.category).filter(Boolean) as string[]
    );
    return Array.from(categorySet);
  }, [sessions]);

  // 結果の統計を取得
  const stats = useLiveQuery(async () => {
    const results = await db.results.toArray();
    const totalSessions = await db.sessions.count();

    const correctCount = results.filter((r) => r.isCorrect).length;
    const incorrectCount = results.length - correctCount;
    const accuracy =
      results.length > 0 ? (correctCount / results.length) * 100 : 0;

    // 日別の統計
    const sessionsByDate = new Map<
      string,
      { count: number; score: number; total: number }
    >();

    for (const session of await db.sessions.toArray()) {
      const dateStr = format(new Date(session.startedAt), "yyyy-MM-dd");

      if (!sessionsByDate.has(dateStr)) {
        sessionsByDate.set(dateStr, { count: 0, score: 0, total: 0 });
      }

      const stats = sessionsByDate.get(dateStr)!;
      stats.count += 1;
      stats.score += session.score || 0;
      stats.total += session.totalQuestions || 0;
    }

    const dailyStats = Array.from(sessionsByDate.entries())
      .map(([date, stats]) => ({
        date,
        count: stats.count,
        score: stats.score,
        total: stats.total,
        accuracy: stats.total > 0 ? (stats.score / stats.total) * 100 : 0,
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 7)
      .reverse();

    return {
      totalSessions,
      totalAnswered: results.length,
      correctCount,
      incorrectCount,
      accuracy,
      dailyStats,
    };
  });

  // フィルタリングされたセッション
  const filteredSessions = sessions
    ? sessions.filter((session) => {
        // カテゴリフィルタ
        if (
          selectedCategory !== "all" &&
          session.category !== selectedCategory
        ) {
          return false;
        }

        // 期間フィルタ
        if (selectedPeriod !== "all") {
          const now = new Date();
          const sessionDate = new Date(session.startedAt);

          switch (selectedPeriod) {
            case "today":
              if (sessionDate.toDateString() !== now.toDateString()) {
                return false;
              }
              break;
            case "week":
              const weekAgo = new Date();
              weekAgo.setDate(now.getDate() - 7);
              if (sessionDate < weekAgo) {
                return false;
              }
              break;
            case "month":
              const monthAgo = new Date();
              monthAgo.setMonth(now.getMonth() - 1);
              if (sessionDate < monthAgo) {
                return false;
              }
              break;
          }
        }

        // 検索フィルタ
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const categoryMatch = session.category
            ?.toLowerCase()
            .includes(searchLower);
          const dateMatch = format(
            new Date(session.startedAt),
            "yyyy年MM月dd日"
          ).includes(searchTerm);

          return categoryMatch || dateMatch;
        }

        return true;
      })
    : [];

  // ページネーション
  const totalPages = Math.ceil((filteredSessions?.length || 0) / itemsPerPage);
  const paginatedSessions = filteredSessions?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ページが変わったときに先頭にスクロール
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">回答履歴</h2>
            <p className="text-muted-foreground">
              これまでのクイズセッションの履歴を確認できます。
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push("/play")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
        </div>

        <Tabs defaultValue="history">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="history">履歴一覧</TabsTrigger>
            <TabsTrigger value="stats">統計情報</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>フィルタ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">検索</label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="カテゴリや日付で検索..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setCurrentPage(1);
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">カテゴリ</label>
                    <Select
                      value={selectedCategory}
                      onValueChange={(value) => {
                        setSelectedCategory(value);
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="カテゴリを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">すべてのカテゴリ</SelectItem>
                        {categories?.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">期間</label>
                    <Select
                      value={selectedPeriod}
                      onValueChange={(value) => {
                        setSelectedPeriod(value);
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="期間を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">すべての期間</SelectItem>
                        <SelectItem value="today">今日</SelectItem>
                        <SelectItem value="week">過去7日間</SelectItem>
                        <SelectItem value="month">過去30日間</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {filteredSessions.length > 0 ? (
                <>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      全{filteredSessions.length}件中{" "}
                      {(currentPage - 1) * itemsPerPage + 1}〜
                      {Math.min(
                        currentPage * itemsPerPage,
                        filteredSessions.length
                      )}
                      件を表示
                    </p>
                  </div>

                  <div className="space-y-4">
                    {paginatedSessions.map((session) => {
                      const score = session.score || 0;
                      const total = session.totalQuestions || 0;
                      const percentage = total > 0 ? (score / total) * 100 : 0;

                      return (
                        <Link
                          key={session.id}
                          href={`/results?sessionId=${session.id}`}
                          className="block"
                        >
                          <Card className="hover:shadow-md transition-shadow duration-300">
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle className="text-base flex items-center gap-2">
                                    <History className="h-4 w-4 text-primary" />
                                    {session.category || "すべてのカテゴリ"}
                                  </CardTitle>
                                  <CardDescription>
                                    {format(
                                      new Date(session.startedAt),
                                      "yyyy年MM月dd日 HH:mm",
                                      { locale: ja }
                                    )}
                                  </CardDescription>
                                </div>
                                <Badge
                                  variant={
                                    percentage >= 80
                                      ? "secondary"
                                      : percentage >= 60
                                      ? "default"
                                      : "destructive"
                                  }
                                >
                                  {score}/{total} ({Math.round(percentage)}%)
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    <span className="text-sm">
                                      {score}問正解
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <XCircle className="h-4 w-4 text-red-500" />
                                    <span className="text-sm">
                                      {total - score}問不正解
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">
                                    {session.endedAt && session.startedAt
                                      ? `${Math.round(
                                          (Number(session.endedAt) -
                                            Number(session.startedAt)) /
                                            1000
                                        )}秒`
                                      : "時間不明"}
                                  </span>
                                </div>
                              </div>
                              <div className="mt-2 w-full bg-muted/50 rounded-full h-2.5">
                                <div
                                  className={`h-2.5 rounded-full ${
                                    percentage >= 80
                                      ? "bg-green-600"
                                      : percentage >= 60
                                      ? "bg-blue-600"
                                      : "bg-red-600"
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>

                  {totalPages > 1 && (
                    <Pagination className="mt-6">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage > 1)
                                setCurrentPage(currentPage - 1);
                            }}
                            className={
                              currentPage === 1
                                ? "pointer-events-none opacity-50"
                                : ""
                            }
                          />
                        </PaginationItem>

                        {Array.from({ length: totalPages }).map((_, i) => {
                          const page = i + 1;
                          // 現在のページの前後2ページまでと最初と最後のページを表示
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 2 && page <= currentPage + 2)
                          ) {
                            return (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setCurrentPage(page);
                                  }}
                                  isActive={page === currentPage}
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          }

                          // 省略記号を表示（前後の境界）
                          if (page === 2 || page === totalPages - 1) {
                            return (
                              <PaginationItem key={`ellipsis-${page}`}>
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          }

                          return null;
                        })}

                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage < totalPages)
                                setCurrentPage(currentPage + 1);
                            }}
                            className={
                              currentPage === totalPages
                                ? "pointer-events-none opacity-50"
                                : ""
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-10">
                    <History className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium mb-2">履歴がありません</p>
                    <p className="text-sm text-muted-foreground text-center mb-6">
                      クイズに挑戦すると、ここに履歴が表示されます。
                    </p>
                    <Button onClick={() => router.push("/play")}>
                      クイズに挑戦する
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>学習統計</CardTitle>
              </CardHeader>
              <CardContent>
                {stats ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <History className="h-4 w-4" />
                          <span>総セッション数</span>
                        </div>
                        <p className="text-2xl font-bold">
                          {stats.totalSessions}
                        </p>
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <BarChart4 className="h-4 w-4" />
                          <span>総回答数</span>
                        </div>
                        <p className="text-2xl font-bold">
                          {stats.totalAnswered}
                        </p>
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>正解数</span>
                        </div>
                        <p className="text-2xl font-bold">
                          {stats.correctCount}
                        </p>
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span>不正解数</span>
                        </div>
                        <p className="text-2xl font-bold">
                          {stats.incorrectCount}
                        </p>
                      </div>
                    </div>

                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <span>全体の正答率</span>
                      </div>
                      <div className="relative pt-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-semibold inline-block text-primary">
                              {stats.accuracy.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="overflow-hidden h-2 text-xs flex rounded bg-primary/20">
                          <div
                            style={{ width: `${stats.accuracy}%` }}
                            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary"
                          ></div>
                        </div>
                      </div>
                    </div>

                    {stats.dailyStats.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">
                          日別の学習状況
                        </h3>
                        <div className="space-y-3">
                          {stats.dailyStats.map((day) => (
                            <div
                              key={day.date}
                              className="bg-muted/30 p-3 rounded-lg"
                            >
                              <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">
                                    {format(
                                      new Date(day.date),
                                      "yyyy年MM月dd日",
                                      { locale: ja }
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-muted-foreground">
                                    セッション数:
                                  </span>
                                  <span className="font-medium">
                                    {day.count}
                                  </span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center text-sm mb-2">
                                <div className="flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                  <span>{day.score}問正解</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <XCircle className="h-3 w-3 text-red-500" />
                                  <span>{day.total - day.score}問不正解</span>
                                </div>
                                <div>
                                  <span className="font-medium">
                                    正答率: {Math.round(day.accuracy)}%
                                  </span>
                                </div>
                              </div>
                              <div className="w-full bg-muted/50 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    day.accuracy >= 80
                                      ? "bg-green-600"
                                      : day.accuracy >= 60
                                      ? "bg-blue-600"
                                      : "bg-red-600"
                                  }`}
                                  style={{ width: `${day.accuracy}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[200px]">
                    <p className="text-muted-foreground">
                      データがありません。クイズに挑戦して統計を表示しましょう。
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="outline" onClick={() => router.push("/play")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  戻る
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
