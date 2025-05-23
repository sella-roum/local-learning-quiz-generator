"use client";

import { Badge } from "@/components/ui/badge";

import { useState, useEffect, useCallback } from "react";
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
import { Progress } from "@/components/ui/progress";
import { db, type Quiz, type Result } from "@/lib/db";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  XCircle,
  HelpCircle,
  Timer,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

interface ShuffledOption {
  originalIndex: number;
  text: string;
}

export default function QuizSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const category = searchParams.get("category") || "all";
  const count = Number.parseInt(searchParams.get("count") || "10");
  const timeLimit = Number.parseInt(searchParams.get("timeLimit") || "30");

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffledOptions, setShuffledOptions] = useState<ShuffledOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [sessionIdState, setSessionId] = useState<string | null>(null);

  // 選択肢をシャッフルする関数
  const shuffleQuizOptions = useCallback((quiz: Quiz) => {
    const options = quiz.options.map((text, index) => ({
      originalIndex: index,
      text,
    }));

    setShuffledOptions(shuffleArray(options));
  }, []);

  // クイズを取得
  const fetchQuizzes = useCallback(async () => {
    try {
      // セッションIDがある場合はそのセッションのクイズを取得
      if (sessionId) {
        const session = await db.sessions.get(sessionId);
        if (!session) {
          setError("セッションが見つかりません");
          setIsLoading(false);
          return;
        }

        // セッションに保存されたクイズIDからクイズを取得
        const quizPromises = session.quizIds.map((id) => db.quizzes.get(id));
        const quizResults = await Promise.all(quizPromises);
        const validQuizzes = quizResults.filter(Boolean) as Quiz[];

        if (validQuizzes.length === 0) {
          setError("クイズが見つかりません");
          setIsLoading(false);
          return;
        }

        setQuizzes(validQuizzes);

        // 最初の問題の選択肢をシャッフル
        if (validQuizzes.length > 0) {
          shuffleQuizOptions(validQuizzes[0]);
        }

        // タイマーを設定
        setTimeLeft(timeLimit);
      } else {
        // カテゴリに基づいてクイズを取得
        let allQuizzes: Quiz[];

        if (category === "all") {
          allQuizzes = await db.quizzes.toArray();
        } else {
          allQuizzes = await db.quizzes
            .where("category")
            .equals(category)
            .toArray();
        }

        if (allQuizzes.length === 0) {
          setError("選択したカテゴリのクイズがありません");
          setIsLoading(false);
          return;
        }

        // ランダムに選択（または全問）
        const selectedQuizzes =
          allQuizzes.length <= count
            ? allQuizzes
            : shuffleArray(allQuizzes).slice(0, count);

        setQuizzes(selectedQuizzes);

        // 最初の問題の選択肢をシャッフル
        if (selectedQuizzes.length > 0) {
          shuffleQuizOptions(selectedQuizzes[0]);
        }

        // 新しいセッションIDを生成
        const newSessionId = uuidv4();
        setSessionId(newSessionId);

        // セッション情報を保存
        await db.sessions.add({
          id: newSessionId,
          startedAt: new Date(),
          quizIds: selectedQuizzes.map((q) => q.id as number),
          category: category !== "all" ? category : undefined,
          totalQuestions: selectedQuizzes.length,
        });

        // タイマーを設定
        setTimeLeft(timeLimit);
      }
    } catch (error) {
      console.error("クイズの取得中にエラーが発生しました:", error);
      setError("クイズの取得中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }, [category, count, shuffleQuizOptions, sessionId, timeLimit]);

  // 初期化時にクイズを取得
  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  // タイマー処理
  useEffect(() => {
    if (timeLeft === null || isAnswered) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          // 時間切れの場合は不正解として処理
          if (!isAnswered) {
            handleTimeUp();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isAnswered]);

  // 時間切れの処理
  const handleTimeUp = useCallback(async () => {
    if (isAnswered) return;

    setIsAnswered(true);
    setIsCorrect(false);

    const currentQuiz = quizzes[currentIndex];

    // 結果を保存
    const result: Result = {
      quizId: currentQuiz.id as number,
      selectedOptionIndex: -1, // 時間切れは-1
      isCorrect: false,
      answeredAt: new Date(),
      sessionId: sessionId!,
    };

    try {
      await db.results.add(result);
      setResults([...results, result]);
    } catch (error) {
      console.error("結果の保存中にエラーが発生しました:", error);
    }
  }, [currentIndex, isAnswered, quizzes, results, sessionId]);

  // 選択肢をクリックした時の処理
  const handleSelectOption = useCallback(
    async (optionIndex: number) => {
      if (isAnswered) return;

      const originalIndex = shuffledOptions[optionIndex].originalIndex;
      setSelectedOption(optionIndex);
      setIsAnswered(true);

      const currentQuiz = quizzes[currentIndex];
      const correct = originalIndex === currentQuiz.correctOptionIndex;
      setIsCorrect(correct);

      if (correct) {
        setScore(score + 1);
        // 正解時に紙吹雪エフェクト
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }

      // 結果を保存
      const result: Result = {
        quizId: currentQuiz.id as number,
        selectedOptionIndex: originalIndex, // 元の選択肢のインデックスを保存
        isCorrect: correct,
        answeredAt: new Date(),
        sessionId: sessionId!,
      };

      try {
        await db.results.add(result);
        setResults([...results, result]);
      } catch (error) {
        console.error("結果の保存中にエラーが発生しました:", error);
      }
    },
    [
      currentIndex,
      isAnswered,
      shuffledOptions,
      quizzes,
      results,
      sessionId,
      score,
    ]
  );

  // 次の問題に進む
  const handleNextQuestion = useCallback(() => {
    if (currentIndex < quizzes.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      shuffleQuizOptions(quizzes[nextIndex]);
      setSelectedOption(null);
      setIsAnswered(false);
      setTimeLeft(timeLimit); // タイマーをリセット
    } else {
      // 全問終了したら結果画面に遷移
      finishSession();
    }
  }, [currentIndex, quizzes, shuffleQuizOptions, timeLimit]);

  // セッションを終了して結果画面に遷移
  const finishSession = useCallback(async () => {
    try {
      // セッション情報を更新
      await db.sessions.update(sessionId!, {
        endedAt: new Date(),
        score: results.filter((r) => r.isCorrect).length,
      });

      // 結果画面に遷移
      router.push(`/results?sessionId=${sessionId}`);
    } catch (error) {
      console.error("セッション終了処理中にエラーが発生しました:", error);
      setError("セッション終了処理中にエラーが発生しました");
    }
  }, [sessionId, router, results]);

  // 配列をシャッフルする関数
  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-lg font-medium">クイズを準備中...</p>
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
            <h2 className="page-title">クイズに挑戦</h2>
          </div>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>エラー</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>

          <Button onClick={() => router.push("/play")}>戻る</Button>
        </div>
      </MainLayout>
    );
  }

  if (quizzes.length === 0) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="page-header">
            <h2 className="page-title">クイズに挑戦</h2>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>クイズがありません</AlertTitle>
            <AlertDescription>
              選択したカテゴリにクイズがありません。別のカテゴリを選択してください。
            </AlertDescription>
          </Alert>

          <Button onClick={() => router.push("/play")}>戻る</Button>
        </div>
      </MainLayout>
    );
  }

  const currentQuiz = quizzes[currentIndex];
  const progress = ((currentIndex + 1) / quizzes.length) * 100;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="page-title">クイズに挑戦</h2>
            <p className="text-muted-foreground">
              問題 {currentIndex + 1} / {quizzes.length}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary">
                {currentQuiz.category || "一般"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="font-medium">{score}</span>
            </div>
          </div>
        </div>

        <div className="relative">
          <Progress value={progress} className="h-2 w-full bg-muted" />
          <motion.div
            className="absolute top-0 left-0 h-2 bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-2 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-background to-muted/50 pb-4">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">
                    {currentQuiz.question}
                  </CardTitle>
                  {timeLeft !== null && (
                    <div
                      className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                        timeLeft > 10
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      <Timer className="h-4 w-4" />
                      <span className="font-medium">{timeLeft}</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {shuffledOptions.map((option, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.1 }}
                    >
                      <Button
                        key={index}
                        variant="outline"
                        // 高さを自動調整し、内容を左寄せにする
                        className={`quiz-option h-auto justify-start text-left ${
                          // text-left を Button に移動
                          isAnswered &&
                          option.originalIndex ===
                            currentQuiz.correctOptionIndex
                            ? "quiz-option-correct"
                            : isAnswered && index === selectedOption
                            ? "quiz-option-incorrect"
                            : selectedOption === index
                            ? "quiz-option-selected"
                            : ""
                        }`}
                        onClick={() => handleSelectOption(index)}
                        disabled={isAnswered}
                      >
                        {/* アイテムを中央揃えに戻す */}
                        <div className="flex items-center gap-3 w-full">
                          {/* shrink-0 は維持、マージン削除 */}
                          <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                            {String.fromCharCode(65 + index)}
                          </div>
                          {/* テキスト折り返しと単語の強制改行を許可 */}
                          <span className="flex-grow whitespace-normal break-words">
                            {option.text}
                          </span>
                          {/* アイコンを右端に配置するためのコンテナ */}
                          {/* self-center は親が items-center なので不要 */}
                          <div className="flex-shrink-0 ml-auto pl-2">
                            {isAnswered &&
                              option.originalIndex ===
                                currentQuiz.correctOptionIndex && (
                                // アイコンサイズを明示的に指定
                                <CheckCircle className="quiz-option-icon text-green-600 w-5 h-5" />
                              )}
                            {isAnswered &&
                              index === selectedOption &&
                              option.originalIndex !==
                                currentQuiz.correctOptionIndex && (
                                // アイコンサイズを明示的に指定
                                <XCircle className="quiz-option-icon text-red-600 w-5 h-5" />
                              )}
                          </div>
                        </div>
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
              {/* デフォルトは縦並び (flex-col)、sm (640px) 以上で横並び (flex-row) に */}
              <CardFooter className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-t bg-muted/20 p-4">
                {isAnswered ? (
                  // モバイルでも幅いっぱいを使うように w-full を追加
                  <div className="flex-1 w-full">
                    <Alert
                      variant={isCorrect ? "default" : "destructive"}
                      // items-left を削除 (デフォルトの items-center で良い場合) または調整
                      // text-left を AlertDescription など適切な場所に追加する方が良い場合もある
                      className={`flex flex-col ${
                        isCorrect
                          ? "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700"
                          : "bg-red-100 dark:bg-red-900/30"
                      }`}
                    >
                      <AlertTitle>
                        <div className="flex items-center gap-2">
                          {isCorrect ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="font-bold text-green-700 dark:text-green-400">
                                正解！
                              </span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 text-red-600" />
                              <span className="font-bold text-red-700 dark:text-red-400">
                                不正解
                              </span>
                            </>
                          )}
                        </div>
                      </AlertTitle>
                      <AlertDescription
                        // ここに text-left を追加して、説明文を左寄せに
                        className={`text-left ${
                          isCorrect
                            ? "text-green-700 dark:text-green-400"
                            : "text-red-700 dark:text-red-400"
                        }`}
                      >
                        {isCorrect
                          ? "素晴らしい！正解です。"
                          : `正解は ${String.fromCharCode(
                              65 +
                                shuffledOptions.findIndex(
                                  // A, B, C... で表示
                                  (o) =>
                                    o.originalIndex ===
                                    currentQuiz.correctOptionIndex
                                )
                            )}: ${
                              currentQuiz.options[
                                currentQuiz.correctOptionIndex
                              ]
                            } です。`}
                        {currentQuiz.explanation && (
                          <div
                            // text-left をここにも追加
                            className={`mt-2 pt-2 border-t text-left ${
                              isCorrect
                                ? "border-green-300 dark:border-green-700"
                                : "border-red-300 dark:border-red-700"
                            }`}
                          >
                            <div className="flex items-center gap-1 mb-1">
                              <HelpCircle className="h-4 w-4" />
                              <span className="font-semibold">解説:</span>
                            </div>
                            {currentQuiz.explanation}
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : (
                  // 回答前も高さを合わせるため (必要なら)
                  <div className="flex-1 w-full"></div>
                )}

                {isAnswered && (
                  <Button
                    onClick={handleNextQuestion}
                    // モバイルでは上マージン(mt-4)と幅いっぱい(w-full)
                    // sm以上では上マージンなし(sm:mt-0)、幅自動(sm:w-auto)、左マージン(sm:ml-4)
                    className="mt-4 w-full sm:mt-0 sm:w-auto sm:ml-4 bg-primary hover:bg-primary/90"
                  >
                    {currentIndex < quizzes.length - 1 ? (
                      <>
                        次の問題 <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      "結果を見る"
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </MainLayout>
  );
}
