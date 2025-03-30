"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MainLayout } from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { QuizHistoryChart } from "@/components/quiz-history-chart";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import {
  BookOpen,
  FileText,
  Play,
  Plus,
  BarChart,
  Clock,
  CheckCircle,
  Award,
  Brain,
  Lightbulb,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  // ファイル数、クイズ数、セッション数を取得
  const fileCount = useLiveQuery(() => db.files.count());
  const quizCount = useLiveQuery(() => db.quizzes.count());
  const sessionCount = useLiveQuery(async () => {
    const allSessions = await db.sessions
      .orderBy("startedAt")
      .reverse()
      .toArray();
    return allSessions.filter((session) => session.endedAt && session.startedAt)
      .length; // 完了したセッションのみをフィルタリング
  });

  // 最新のセッション結果を取得
  const latestSession = useLiveQuery(async () => {
    const sessions = await db.sessions
      .where("endedAt")
      .above(0)
      .reverse()
      .limit(1)
      .toArray();

    if (sessions.length === 0) return null;

    const session = sessions[0];
    if (!session || !session.id) return null; // session または session.id が存在しない場合は null を返す

    const results = await db.results
      .where("sessionId")
      .equals(session.id)
      .toArray();

    const correctCount = results.filter((r) => r.isCorrect).length;
    const totalCount = results.length;

    return {
      session,
      correctCount,
      totalCount,
      percentage:
        totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0,
    };
  });

  // 総合成績を取得
  const overallStats = useLiveQuery(async () => {
    const sessions = await db.sessions.where("endedAt").above(0).toArray();

    if (sessions.length === 0) return null;

    // sessionIds が string 型であることを保証するためにフィルタリング
    const sessionIds = sessions
      .map((s) => s.id)
      .filter((id): id is string => typeof id === "string");
    const results = await db.results
      .where("sessionId")
      .anyOf(sessionIds)
      .toArray();

    const totalQuestions = results.length;
    const correctAnswers = results.filter((r) => r.isCorrect).length;

    return {
      totalSessions: sessions.length,
      totalQuestions,
      correctAnswers,
      averageScore:
        totalQuestions > 0
          ? Math.round((correctAnswers / totalQuestions) * 100)
          : 0,
    };
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="page-header animate-fade-in">
          <h2 className="page-title">学習クイズジェネレーター</h2>
          <p className="page-description">
            学習資料からAIがクイズを作成し、効率的に学習をサポートします
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
          <Card className="card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg">
                <FileText className="h-5 w-5 mr-2 text-primary" />
                学習資料
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{fileCount || 0}</div>
              <p className="text-sm text-muted-foreground">登録済みファイル</p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg">
                <BookOpen className="h-5 w-5 mr-2 text-primary" />
                クイズ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{quizCount || 0}</div>
              <p className="text-sm text-muted-foreground">作成済みクイズ</p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg">
                <Play className="h-5 w-5 mr-2 text-primary" />
                学習
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{sessionCount || 0}</div>
              <p className="text-sm text-muted-foreground">学習セッション</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
          <Card className="md:col-span-2 card-hover">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart className="h-5 w-5 mr-2 text-primary" />
                学習成績の推移
              </CardTitle>
              <CardDescription>
                過去10回分のクイズセッションの正答率
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <QuizHistoryChart />
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="h-5 w-5 mr-2 text-primary" />
                学習統計
              </CardTitle>
              <CardDescription>あなたの学習成果</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {overallStats ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="icon-container mr-3">
                        <Brain className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">総セッション数</p>
                        <p className="text-2xl font-bold">
                          {overallStats.totalSessions}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="icon-container mr-3">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">平均正答率</p>
                        <p className="text-2xl font-bold">
                          {overallStats.averageScore}%
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="icon-container mr-3">
                        <Lightbulb className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">総回答数</p>
                        <p className="text-2xl font-bold">
                          {overallStats.totalQuestions}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] text-center">
                  <Sparkles className="h-12 w-12 text-muted-foreground mb-4 animate-bounce-light" />
                  <p className="text-muted-foreground">
                    クイズに挑戦して
                    <br />
                    学習統計を表示しましょう
                  </p>
                </div>
              )}
            </CardContent>
            {latestSession && (
              <CardFooter className="border-t bg-muted/30 flex flex-col items-start p-4">
                <p className="text-sm font-medium mb-1">最新の成績</p>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-muted-foreground mr-1" />
                    <span className="text-sm text-muted-foreground">
                      最近のセッション
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium">
                      {latestSession.correctCount}/{latestSession.totalCount}
                    </span>
                    <span className="ml-1 text-sm px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {latestSession.percentage}%
                    </span>
                  </div>
                </div>
              </CardFooter>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle>クイズを作成・管理</CardTitle>
              <CardDescription>学習資料からクイズを生成</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">
                テキスト、画像、PDFファイルをアップロードして、AIがクイズを自動生成します。
                生成されたクイズは編集・保存できます。
              </p>
            </CardContent>
            <CardFooter className="flex justify-between gap-4">
              <Link href="/files" className="flex-1">
                <Button variant="outline" className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  ファイル管理
                </Button>
              </Link>
              <Link href="/quizzes/create" className="flex-1">
                <Button className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  クイズ一覧
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card className="card-hover">
            <CardHeader>
              <CardTitle>クイズに挑戦</CardTitle>
              <CardDescription>すぐに学習を始めましょう</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">
                登録済みのクイズからランダムに出題します。
                カテゴリ別の学習や、特定のファイルに関連するクイズに挑戦することもできます。
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/play" className="w-full">
                <Button className="w-full">
                  <Play className="h-4 w-4 mr-2" />
                  クイズに挑戦
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
