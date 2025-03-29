"use client";

import { useCallback, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db, type Quiz } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertCircle, History, Play } from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { QuizHistoryChart } from "@/components/quiz-history-chart";

export default function PlayPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [quizCount, setQuizCount] = useState<number>(10);
  const [error, setError] = useState<string | null>(null);

  // カテゴリの一覧を取得
  const categories = useLiveQuery(async () => {
    const quizzes = await db.quizzes.toArray();
    const categorySet = new Set(
      quizzes.map((quiz) => quiz.category).filter(Boolean)
    );
    return Array.from(categorySet);
  });

  // クイズの総数を取得
  const quizCount$ = useLiveQuery(() => db.quizzes.count());

  // セッション履歴を取得
  const sessions = useLiveQuery(async () => {
    return await db.sessions.orderBy("startedAt").reverse().limit(10).toArray();
  });

  // カテゴリ別の正答率を取得
  const categoryStats = useLiveQuery(async () => {
    const results = await db.results.toArray();
    const quizzes = await db.quizzes.toArray();

    // クイズIDとクイズのマップを作成
    const quizMap = new Map(quizzes.map((quiz) => [quiz.id, quiz]));

    // カテゴリごとの結果を集計
    const statsByCategory = new Map<
      string,
      { correct: number; total: number }
    >();

    for (const result of results) {
      const quiz = quizMap.get(result.quizId);
      if (quiz) {
        const category = quiz.category || "一般";
        if (!statsByCategory.has(category)) {
          statsByCategory.set(category, { correct: 0, total: 0 });
        }

        const stats = statsByCategory.get(category)!;
        stats.total += 1;
        if (result.isCorrect) {
          stats.correct += 1;
        }
      }
    }

    // 正答率を計算
    return Array.from(statsByCategory.entries()).map(([category, stats]) => ({
      category,
      correctRate: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
      total: stats.total,
    }));
  });

  // クイズを開始する関数
  const handleStartQuiz = useCallback(async () => {
    try {
      // カテゴリに基づいてクイズを取得
      let quizzes: Quiz[];

      if (selectedCategory === "all") {
        quizzes = await db.quizzes.toArray();
      } else {
        quizzes = await db.quizzes
          .where("category")
          .equals(selectedCategory)
          .toArray();
      }

      if (quizzes.length === 0) {
        setError("選択したカテゴリのクイズがありません");
        return;
      }

      // 出題数を調整（最大でクイズの総数まで）
      const actualQuizCount = Math.min(quizCount, quizzes.length);

      // セッションを開始
      router.push(
        `/play/session?category=${selectedCategory}&count=${actualQuizCount}`
      );
    } catch (error) {
      console.error("クイズの開始中にエラーが発生しました:", error);
      setError("クイズの開始中にエラーが発生しました");
    }
  }, [selectedCategory, quizCount]);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">クイズに挑戦</h2>
          <p className="text-muted-foreground">
            保存されたクイズに挑戦したり、過去の結果を確認できます。
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>エラー</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="start">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="start">クイズを始める</TabsTrigger>
            <TabsTrigger value="history">履歴</TabsTrigger>
            <TabsTrigger value="stats">統計</TabsTrigger>
          </TabsList>

          <TabsContent value="start" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>クイズ設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category">カテゴリ</Label>
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
                  <Label>出題数</Label>
                  <RadioGroup
                    value={quizCount.toString()}
                    onValueChange={(value) =>
                      setQuizCount(Number.parseInt(value))
                    }
                    className="flex space-x-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="5" id="count-5" />
                      <Label htmlFor="count-5">5問</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="10" id="count-10" />
                      <Label htmlFor="count-10">10問</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="20" id="count-20" />
                      <Label htmlFor="count-20">20問</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="30" id="count-30" />
                      <Label htmlFor="count-30">30問</Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  onClick={handleStartQuiz}
                  disabled={!quizCount$ || quizCount$ === 0}
                >
                  <Play className="mr-2 h-4 w-4" />
                  クイズを開始
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>クイズ履歴</CardTitle>
              </CardHeader>
              <CardContent>
                {sessions && sessions.length > 0 ? (
                  <div className="space-y-4">
                    {sessions.map((session) => (
                      <div key={session.id} className="border rounded-md p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold">
                              {session.category
                                ? `カテゴリ: ${session.category}`
                                : "すべてのカテゴリ"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(session.startedAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              {session.score} / {session.totalQuestions} 正解
                            </p>
                            <p className="text-sm text-muted-foreground">
                              正答率:{" "}
                              {Math.round(
                                ((session.score || 0) /
                                  (session.totalQuestions || 1)) *
                                  100
                              )}
                              %
                            </p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <Link href={`/results?sessionId=${session.id}`}>
                            <Button variant="outline" size="sm">
                              <History className="mr-2 h-4 w-4" />
                              詳細を見る
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    クイズの履歴がありません。クイズに挑戦して記録を作成しましょう。
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>統計情報</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryStats && categoryStats.length > 0 ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        カテゴリ別正答率
                      </h3>
                      <div className="space-y-2">
                        {categoryStats.map((stat) => (
                          <div key={stat.category} className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span>{stat.category}</span>
                              <span className="font-semibold">
                                {Math.round(stat.correctRate)}%
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2.5">
                              <div
                                className="bg-primary h-2.5 rounded-full"
                                style={{ width: `${stat.correctRate}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-muted-foreground text-right">
                              回答数: {stat.total}問
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">グラフ</h3>
                      <div className="h-64">
                        <QuizHistoryChart />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    統計情報がありません。クイズに挑戦して記録を作成しましょう。
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
