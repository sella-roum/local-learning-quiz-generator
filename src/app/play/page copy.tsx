"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { formatDate } from "@/lib/utils";
import { QuizHistoryChart } from "@/components/quiz-history-chart";
import {
  AlertCircle,
  Play,
  Clock,
  BarChart4,
  Calendar,
  CheckCircle,
  XCircle,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function PlayPage() {
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [quizCount, setQuizCount] = useState(10);
  const [isDeleteHistoryDialogOpen, setIsDeleteHistoryDialogOpen] =
    useState(false);
  const router = useRouter();

  // クイズの一覧を取得
  const quizzes = useLiveQuery(() => db.quizzes.toArray());

  // カテゴリの一覧を取得
  const categories = useLiveQuery(async () => {
    if (!quizzes) return [];
    const categorySet = new Set(
      quizzes.map((quiz) => quiz.category).filter(Boolean)
    );
    return Array.from(categorySet);
  }, [quizzes]);

  // セッション履歴を取得
  const sessions = useLiveQuery(() =>
    db.sessions.orderBy("startedAt").reverse().toArray()
  );

  // 結果の統計を取得
  const stats = useLiveQuery(async () => {
    const results = await db.results.toArray();
    const totalQuizzes = await db.quizzes.count();
    const totalSessions = await db.sessions.count();

    const correctCount = results.filter((r) => r.isCorrect).length;
    const incorrectCount = results.length - correctCount;
    const accuracy =
      results.length > 0 ? (correctCount / results.length) * 100 : 0;

    return {
      totalQuizzes,
      totalSessions,
      totalAnswered: results.length,
      correctCount,
      incorrectCount,
      accuracy,
    };
  });

  // クイズを開始する関数
  const handleStartQuiz = async () => {
    try {
      // カテゴリでフィルタリングしたクイズIDを取得
      let filteredQuizIds: number[] = [];

      if (selectedCategory === "all") {
        // すべてのクイズから取得
        const allQuizzes = await db.quizzes.toArray();
        filteredQuizIds = allQuizzes.map((q) => q.id as number);
      } else {
        // 特定のカテゴリのクイズから取得
        const categoryQuizzes = await db.quizzes
          .where("category")
          .equals(selectedCategory)
          .toArray();
        filteredQuizIds = categoryQuizzes.map((q) => q.id as number);
      }

      if (filteredQuizIds.length === 0) {
        setError(
          selectedCategory === "all"
            ? "クイズがありません。先にクイズを作成してください。"
            : `カテゴリ「${selectedCategory}」のクイズがありません。`
        );
        return;
      }

      if (filteredQuizIds.length < quizCount) {
        setError(
          `選択されたカテゴリには${filteredQuizIds.length}問しかありません。問題数を減らすか、別のカテゴリを選択してください。`
        );
        return;
      }

      // ランダムにクイズを選択
      const shuffledIds = [...filteredQuizIds].sort(() => Math.random() - 0.5);
      const selectedIds = shuffledIds.slice(0, quizCount);

      // セッションを作成
      const sessionId = crypto.randomUUID();
      await db.sessions.add({
        id: sessionId,
        startedAt: new Date(),
        quizIds: selectedIds,
        category: selectedCategory === "all" ? undefined : selectedCategory,
        totalQuestions: selectedIds.length,
      });

      // セッションページに遷移
      router.push(`/play/session?sessionId=${sessionId}`);
    } catch (error) {
      console.error("クイズ開始中にエラーが発生しました:", error);
      setError("クイズ開始中にエラーが発生しました");
    }
  };

  // すべての履歴を削除する関数
  const handleDeleteAllHistory = async () => {
    try {
      // すべての結果を削除
      await db.results.clear();

      // すべてのセッションを削除
      await db.sessions.clear();

      setIsDeleteHistoryDialogOpen(false);
    } catch (error) {
      console.error("履歴の一括削除中にエラーが発生しました:", error);
      setError("履歴の一括削除中にエラーが発生しました");
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="page-header">
          <h2 className="page-title">クイズに挑戦</h2>
          <p className="page-description">
            保存されたクイズからランダムに問題を出題します。
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>エラー</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>クイズを開始</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="category"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    カテゴリ
                  </label>
                  <Select
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                  >
                    <SelectTrigger id="category">
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
                  <label
                    htmlFor="count"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    問題数
                  </label>
                  <Select
                    value={quizCount.toString()}
                    onValueChange={(value) => setQuizCount(Number(value))}
                  >
                    <SelectTrigger id="count">
                      <SelectValue placeholder="問題数を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5問</SelectItem>
                      <SelectItem value="10">10問</SelectItem>
                      <SelectItem value="15">15問</SelectItem>
                      <SelectItem value="20">20問</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleStartQuiz}
                disabled={!quizzes || quizzes.length === 0}
                className="w-full"
              >
                <Play className="mr-2 h-4 w-4" />
                クイズを開始
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>学習統計</CardTitle>
                {sessions && sessions.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDeleteHistoryDialogOpen(true)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    履歴を削除
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {stats ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <BarChart4 className="h-4 w-4" />
                        <span>総クイズ数</span>
                      </div>
                      <p className="text-2xl font-bold">{stats.totalQuizzes}</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Clock className="h-4 w-4" />
                        <span>総セッション数</span>
                      </div>
                      <p className="text-2xl font-bold">
                        {stats.totalSessions}
                      </p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>正解数</span>
                      </div>
                      <p className="text-2xl font-bold">{stats.correctCount}</p>
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
                      <span>正答率</span>
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

                  <div className="h-[200px]">
                    <QuizHistoryChart />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[200px]">
                  <p className="text-muted-foreground">
                    データがありません。クイズに挑戦して統計を表示しましょう。
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {sessions && sessions.length > 0 && (
          <div>
            <h3 className="text-xl font-bold mb-4">最近のクイズ履歴</h3>
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {sessions.slice(0, 6).map((session, index) => {
                  const score = session.score || 0;
                  const total = session.totalQuestions || 0;
                  const percentage = total > 0 ? (score / total) * 100 : 0;

                  return (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Link
                        href={`/results?sessionId=${session.id}`}
                        className="block"
                      >
                        <Card className="hover:shadow-md transition-shadow duration-300 cursor-pointer">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-base">
                                {session.category || "すべてのカテゴリ"}
                              </CardTitle>
                              <Badge
                                variant={
                                  percentage >= 80
                                    ? "secondary"
                                    : percentage >= 60
                                    ? "default"
                                    : "destructive"
                                }
                              >
                                {score}/{total}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="pb-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                                  <span className="text-muted-foreground">
                                    {formatDate(session.startedAt)}
                                  </span>
                                </div>
                                <span
                                  className={
                                    percentage >= 80
                                      ? "text-green-600"
                                      : percentage >= 60
                                      ? "text-blue-600"
                                      : "text-red-600"
                                  }
                                >
                                  {percentage.toFixed(0)}%
                                </span>
                              </div>
                              <div className="w-full bg-muted/50 rounded-full h-2.5">
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
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </div>
        )}
      </div>

      {/* 全履歴削除確認ダイアログ */}
      <Dialog
        open={isDeleteHistoryDialogOpen}
        onOpenChange={setIsDeleteHistoryDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>すべての履歴を削除</DialogTitle>
            <DialogDescription>
              すべてのクイズ履歴と結果を削除します。この操作は元に戻せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteHistoryDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDeleteAllHistory}>
              すべて削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
