"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { db, type Quiz, type Result, type Session } from "@/lib/db";
import {
  AlertCircle,
  CheckCircle,
  Home,
  Play,
  XCircle,
  Trophy,
  Clock,
  Calendar,
  BarChart4,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

export default function ResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  const [results, setResults] = useState<(Result & { quiz?: Quiz })[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // セッションIDから結果を取得
  useEffect(() => {
    const fetchResults = async () => {
      if (!sessionId) {
        setError("セッションIDが指定されていません");
        setIsLoading(false);
        return;
      }

      try {
        // セッション情報を取得
        const sessionData = await db.sessions.get(sessionId);
        if (!sessionData) {
          setError("セッションが見つかりませんでした");
          setIsLoading(false);
          return;
        }

        setSession(sessionData);

        // セッションに関連する結果を取得
        const sessionResults = await db.results
          .where("sessionId")
          .equals(sessionId)
          .toArray();

        if (sessionResults.length === 0) {
          setError("結果が見つかりませんでした");
          setIsLoading(false);
          return;
        }

        // クイズIDの一覧を取得
        const quizIds = [
          ...new Set(sessionResults.map((result) => result.quizId)),
        ];

        // クイズ情報を一括取得
        const quizzes = await db.quizzes.where("id").anyOf(quizIds).toArray();
        const quizMap = new Map(quizzes.map((quiz) => [quiz.id, quiz]));

        // 結果とクイズ情報を結合
        const resultsWithQuizzes = sessionResults.map((result) => ({
          ...result,
          quiz: quizMap.get(result.quizId),
        }));

        setResults(resultsWithQuizzes);
      } catch (error) {
        console.error("結果の取得中にエラーが発生しました:", error);
        setError("結果の取得中にエラーが発生しました");
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [sessionId]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="flex flex-col items-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
            <p className="text-muted-foreground">結果を読み込み中...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="page-header">
            <h2 className="page-title">クイズ結果</h2>
          </div>

          <Alert variant="destructive" className="animate-fade-in">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>エラー</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>

          <Button
            onClick={() => router.push("/play")}
            className="animate-fade-in"
          >
            <Home className="mr-2 h-4 w-4" />
            ホームに戻る
          </Button>
        </div>
      </MainLayout>
    );
  }

  const score = results.filter((r) => r.isCorrect).length;
  const percentage = Math.round((score / results.length) * 100);
  const sessionDate = session?.startedAt
    ? new Date(session.startedAt)
    : new Date();
  const timeAgo = formatDistanceToNow(sessionDate, {
    addSuffix: true,
    locale: ja,
  });
  const duration =
    session?.endedAt && session?.startedAt
      ? Math.round((Number(session.endedAt) - Number(session.startedAt)) / 1000)
      : 0;

  // 成績に応じたメッセージ
  let performanceMessage = "";
  if (percentage >= 90) {
    performanceMessage = "素晴らしい成績です！";
  } else if (percentage >= 70) {
    performanceMessage = "良い成績です！";
  } else if (percentage >= 50) {
    performanceMessage = "もう少し頑張りましょう！";
  } else {
    performanceMessage = "次回に向けて復習しましょう！";
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="page-header animate-fade-in">
          <h2 className="page-title">クイズ結果</h2>
          <p className="page-description">
            あなたの成績を確認しましょう。{performanceMessage}
          </p>
        </div>

        <Card className="overflow-hidden border-2 animate-fade-in">
          <div className="bg-gradient-to-r from-primary/20 to-secondary/20 p-1"></div>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">成績サマリー</CardTitle>
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 mr-1" />
                <span>{timeAgo}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="relative w-36 h-36">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        {percentage}%
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {score} / {results.length}
                      </p>
                    </div>
                  </div>
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle
                      className="text-muted stroke-current"
                      strokeWidth="10"
                      fill="transparent"
                      r="40"
                      cx="50"
                      cy="50"
                    />
                    <circle
                      className="text-primary stroke-current"
                      strokeWidth="10"
                      strokeLinecap="round"
                      fill="transparent"
                      r="40"
                      cx="50"
                      cy="50"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${
                        2 * Math.PI * 40 * (1 - percentage / 100)
                      }`}
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-card border rounded-lg p-4 flex items-center space-x-4">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">正解</p>
                    <p className="text-xl font-semibold">{score}問</p>
                  </div>
                </div>

                <div className="bg-card border rounded-lg p-4 flex items-center space-x-4">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30">
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">不正解</p>
                    <p className="text-xl font-semibold">
                      {results.length - score}問
                    </p>
                  </div>
                </div>

                <div className="bg-card border rounded-lg p-4 flex items-center space-x-4">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">所要時間</p>
                    <p className="text-xl font-semibold">{duration}秒</p>
                  </div>
                </div>
              </div>

              {session?.category && (
                <div className="flex items-center justify-center">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-accent/20 text-accent-foreground">
                    <BarChart4 className="h-4 w-4 mr-1" />
                    カテゴリ: {session.category}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-center gap-4 border-t bg-muted/50 p-4">
            <Link href="/play">
              <Button variant="outline" className="w-32">
                <Home className="mr-2 h-4 w-4" />
                ホームへ
              </Button>
            </Link>
            <Link href="/play">
              <Button className="w-32">
                <Play className="mr-2 h-4 w-4" />
                再挑戦
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <div className="animate-fade-in">
          <h3 className="section-title flex items-center">
            <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
            問題別結果
          </h3>
          <div className="space-y-4">
            {results.map((result, index) => (
              <Card
                key={index}
                className={`overflow-hidden transition-all duration-300 hover:shadow-md ${
                  result.isCorrect
                    ? "border-l-4 border-l-green-500"
                    : "border-l-4 border-l-red-500"
                }`}
              >
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div
                    className={`flex items-center justify-center h-8 w-8 rounded-full ${
                      result.isCorrect
                        ? "bg-green-100 dark:bg-green-900/30"
                        : "bg-red-100 dark:bg-red-900/30"
                    }`}
                  >
                    {result.isCorrect ? (
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        問題 {index + 1}
                      </CardTitle>
                      {result.quiz?.category && (
                        <span className="text-xs px-2 py-1 rounded-full bg-secondary/10 text-secondary-foreground">
                          {result.quiz.category}
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="font-medium text-lg">
                      {result.quiz?.question}
                    </p>
                    <div className="space-y-2 mt-3">
                      {result.quiz?.options.map((option, optIndex) => {
                        const isCorrect =
                          optIndex === result.quiz?.correctOptionIndex;
                        const isSelected =
                          optIndex === result.selectedOptionIndex;
                        const isIncorrectSelection =
                          isSelected && !result.isCorrect;

                        let bgClass = "bg-muted/50 hover:bg-muted/70";
                        if (isCorrect) {
                          bgClass =
                            "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700";
                        } else if (isIncorrectSelection) {
                          bgClass =
                            "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700";
                        }

                        return (
                          <div
                            key={optIndex}
                            className={`px-4 py-3 rounded-lg border ${bgClass} transition-all`}
                          >
                            <div className="flex items-center">
                              <div
                                className={`flex items-center justify-center h-6 w-6 rounded-full mr-3 ${
                                  isCorrect
                                    ? "bg-green-500 text-white"
                                    : isIncorrectSelection
                                    ? "bg-red-500 text-white"
                                    : "bg-muted-foreground/20 text-muted-foreground"
                                }`}
                              >
                                <span className="text-xs font-bold">
                                  {String.fromCharCode(65 + optIndex)}
                                </span>
                              </div>
                              <span
                                className={`flex-1 ${
                                  isCorrect
                                    ? "font-medium"
                                    : isIncorrectSelection
                                    ? "line-through opacity-70"
                                    : ""
                                }`}
                              >
                                {option}
                              </span>
                              {isCorrect && (
                                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 ml-2" />
                              )}
                              {isIncorrectSelection && (
                                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 ml-2" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {result.quiz?.explanation && (
                      <div className="mt-4 pt-3 border-t">
                        <div className="bg-accent/10 rounded-lg p-3">
                          <p className="text-sm">
                            <span className="font-semibold">解説:</span>{" "}
                            {result.quiz.explanation}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
