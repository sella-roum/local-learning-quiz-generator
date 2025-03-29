"use client";

import type React from "react";

import { useState, useEffect, useCallback } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { db, type Quiz } from "@/lib/db";
import { AlertCircle, Save } from "lucide-react";

interface PageProps {
  params: {
    quizId: string;
  };
}

export default function EditQuizPage({ params }: PageProps) {
  const router = useRouter();
  const quizId = Number.parseInt(params.quizId);

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editedQuiz, setEditedQuiz] = useState<{
    category: string;
    question: string;
    options: string[];
    correctOptionIndex: number;
    explanation: string;
  }>({
    category: "",
    question: "",
    options: ["", "", "", ""],
    correctOptionIndex: 0,
    explanation: "",
  });

  // クイズIDからクイズ情報を取得
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const quizData = await db.quizzes.get(quizId);
        if (quizData) {
          setQuiz(quizData);
          setEditedQuiz({
            category: quizData.category || "一般",
            question: quizData.question,
            options: [...quizData.options],
            correctOptionIndex: quizData.correctOptionIndex,
            explanation: quizData.explanation || "",
          });
        } else {
          setError("指定されたクイズが見つかりませんでした");
        }
      } catch (error) {
        console.error("クイズ情報の取得中にエラーが発生しました:", error);
        setError("クイズ情報の取得中にエラーが発生しました");
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuiz();
  }, [quizId]);

  // クイズを更新する関数
  const handleUpdateQuiz = useCallback(async () => {
    if (
      !quiz ||
      !editedQuiz.question ||
      editedQuiz.options.some((opt) => !opt)
    ) {
      setError("問題文と全ての選択肢を入力してください");
      return;
    }

    try {
      setIsSaving(true);

      await db.quizzes.update(quizId, {
        category: editedQuiz.category,
        question: editedQuiz.question,
        options: editedQuiz.options,
        correctOptionIndex: editedQuiz.correctOptionIndex,
        explanation: editedQuiz.explanation,
        updatedAt: new Date(),
      });

      router.push("/quizzes");
    } catch (error) {
      console.error("クイズの更新中にエラーが発生しました:", error);
      setError("クイズの更新中にエラーが発生しました");
    } finally {
      setIsSaving(false);
    }
  }, [quiz, editedQuiz]);

  // カテゴリを更新する関数
  const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedQuiz({
      ...editedQuiz,
      category: e.target.value,
    });
  };

  // 問題文を更新する関数
  const handleQuestionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedQuiz({
      ...editedQuiz,
      question: e.target.value,
    });
  };

  // 選択肢を更新する関数
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...editedQuiz.options];
    newOptions[index] = value;
    setEditedQuiz({
      ...editedQuiz,
      options: newOptions,
    });
  };

  // 正解の選択肢を更新する関数
  const handleCorrectOptionChange = (value: string) => {
    setEditedQuiz({
      ...editedQuiz,
      correctOptionIndex: Number.parseInt(value),
    });
  };

  // 解説を更新する関数
  const handleExplanationChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setEditedQuiz({
      ...editedQuiz,
      explanation: e.target.value,
    });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <p>読み込み中...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">クイズ編集</h2>
          <p className="text-muted-foreground">クイズの内容を編集します。</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>エラー</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {quiz ? (
          <Card>
            <CardHeader>
              <CardTitle>クイズ編集</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category">カテゴリ</Label>
                  <Input
                    id="category"
                    value={editedQuiz.category}
                    onChange={handleCategoryChange}
                    placeholder="カテゴリを入力"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="question">問題文</Label>
                  <Textarea
                    id="question"
                    value={editedQuiz.question}
                    onChange={handleQuestionChange}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>選択肢</Label>
                  <div className="space-y-3">
                    {editedQuiz.options.map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={option}
                          onChange={(e) =>
                            handleOptionChange(index, e.target.value)
                          }
                          placeholder={`選択肢 ${String.fromCharCode(
                            65 + index
                          )}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>正解の選択肢</Label>
                  <RadioGroup
                    value={editedQuiz.correctOptionIndex.toString()}
                    onValueChange={handleCorrectOptionChange}
                  >
                    {editedQuiz.options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={index.toString()}
                          id={`option-${index}`}
                        />
                        <Label htmlFor={`option-${index}`}>
                          {String.fromCharCode(65 + index)}:{" "}
                          {option ||
                            `選択肢 ${String.fromCharCode(65 + index)}`}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="explanation">解説</Label>
                  <Textarea
                    id="explanation"
                    value={editedQuiz.explanation}
                    onChange={handleExplanationChange}
                    rows={3}
                    placeholder="問題の解説を入力（任意）"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => router.push("/quizzes")}>
                キャンセル
              </Button>
              <Button
                variant="outline"
                onClick={handleUpdateQuiz}
                disabled={isSaving}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "保存中..." : "保存"}
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <p className="text-muted-foreground">
            クイズが見つかりませんでした。クイズ一覧画面から選択してください。
          </p>
        )}
      </div>
    </MainLayout>
  );
}
