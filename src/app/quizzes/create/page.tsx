"use client";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Check,
  ChevronsUpDown,
  AlertCircle,
  Loader2,
  Save,
  Plus,
  X,
  Edit,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { db, type FileItem, type Quiz } from "@/lib/db";
import { generateQuizzes, type GenerateQuiz } from "@/lib/api-utils";
import { useLiveQuery } from "dexie-react-hooks";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CreateQuizPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileId = searchParams.get("fileId");

  const [file, setFile] = useState<FileItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedQuizzes, setGeneratedQuizzes] = useState<GenerateQuiz[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
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
  const [generationOptions, setGenerationOptions] = useState({
    count: 5,
    difficulty: "medium" as "easy" | "medium" | "hard",
    category: "",
    prompt: "",
  });
  const [openCategorySelect, setOpenCategorySelect] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [activeTab, setActiveTab] = useState("options");
  const [quizzesToSave, setQuizzesToSave] = useState<GenerateQuiz[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editingQuizIndex, setEditingQuizIndex] = useState<number | null>(null);

  // 既存のカテゴリを取得
  const categories = useLiveQuery(async () => {
    const quizzes = await db.quizzes.toArray();
    const categorySet = new Set(
      quizzes.map((quiz) => quiz.category).filter(Boolean)
    );
    return Array.from(categorySet);
  }, []);

  // ファイルIDからファイル情報を取得
  useEffect(() => {
    if (fileId) {
      const fetchFile = async () => {
        try {
          const fileData = await db.files.get(Number(fileId));
          if (fileData) {
            setFile(fileData);
          } else {
            setError("指定されたファイルが見つかりませんでした");
          }
        } catch (error) {
          console.error("ファイル情報の取得中にエラーが発生しました:", error);
          setError("ファイル情報の取得中にエラーが発生しました");
        }
      };

      fetchFile();
    }
  }, [fileId]);

  // クイズを自動生成する関数
  const handleGenerateQuizzes = useCallback(async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setGeneratedQuizzes([]);
    setQuizzesToSave([]);

    try {
      // クイズを生成
      const fileObject = new File([file.blob], file.name, { type: file.type });

      // ファイルの内容を取得
      let fileContent: string | ArrayBuffer;

      if (file.type === "application/pdf") {
        // PDFファイルの場合は、テキスト抽出内容があればそれを使用し、なければファイル自体を使用
        fileContent = file.extractedText || "";
      } else if (file.type.startsWith("text/")) {
        // テキストファイルの場合
        fileContent = file.extractedText || "";
      } else if (file.type.startsWith("image/")) {
        // 画像ファイルの場合はBlobからArrayBufferを取得
        fileContent = await file.blob.arrayBuffer();
      } else {
        throw new Error("サポートされていないファイル形式です");
      }

      const quizzes = await generateQuizzes(
        fileObject,
        fileContent,
        file.keywords,
        file.summary || "",
        file.structure || "",
        {
          ...generationOptions,
          category:
            generationOptions.category === "新規カテゴリを作成"
              ? newCategory
              : generationOptions.category,
        }
      );

      // ファイル情報を各クイズに追加
      const quizzesWithFileInfo = quizzes.map((quiz) => ({
        ...quiz,
        fileId: file.id,
        fileName: file.name,
      }));

      setGeneratedQuizzes(quizzesWithFileInfo);
      setQuizzesToSave(quizzesWithFileInfo);

      if (quizzesWithFileInfo.length > 0) {
        setCurrentQuizIndex(0);
        setEditedQuiz({
          category:
            quizzesWithFileInfo[0].category ||
            (generationOptions.category === "新規カテゴリを作成"
              ? newCategory
              : generationOptions.category),
          question: quizzesWithFileInfo[0].question,
          options: quizzesWithFileInfo[0].options.map((option) =>
            option.toString()
          ),
          correctOptionIndex: quizzesWithFileInfo[0].correctOptionIndex,
          explanation: quizzesWithFileInfo[0].explanation || "",
        });
        setActiveTab("review");
      }
    } catch (error) {
      console.error("クイズ生成中にエラーが発生しました:", error);
      setError(
        error instanceof Error
          ? error.message
          : "クイズ生成中にエラーが発生しました"
      );
    } finally {
      setIsLoading(false);
    }
  }, [generationOptions, newCategory, file]);

  // クイズを保存する関数
  const handleSaveQuizzes = useCallback(async () => {
    if (quizzesToSave.length === 0) {
      setError("保存するクイズがありません");
      return;
    }

    try {
      setIsLoading(true);

      // 選択されたクイズをすべて保存
      const quizzes = quizzesToSave.map((quiz) => ({
        fileId: quiz.fileId,
        category: quiz.category || generationOptions.category || "",
        question: quiz.question,
        options: quiz.options.map((opt) => opt.toString()),
        correctOptionIndex: quiz.correctOptionIndex,
        explanation: quiz.explanation || "",
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await db.quizzes.bulkAdd(quizzes as Quiz[]);
      router.push("/quizzes");
    } catch (error) {
      console.error("クイズの保存中にエラーが発生しました:", error);
      setError("クイズの保存中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }, [quizzesToSave, generationOptions.category, router]);

  // カテゴリ選択の処理
  const handleCategorySelect = (category: string) => {
    if (category === "新規カテゴリを作成") {
      setGenerationOptions({
        ...generationOptions,
        category,
      });
    } else {
      setGenerationOptions({
        ...generationOptions,
        category,
      });
      setOpenCategorySelect(false);
    }
  };

  // クイズの選択状態を切り替える
  const toggleQuizSelection = (index: number) => {
    setQuizzesToSave((prev) => {
      const isSelected = prev.some((q) => q === generatedQuizzes[index]);

      if (isSelected) {
        return prev.filter((q) => q !== generatedQuizzes[index]);
      } else {
        return [...prev, generatedQuizzes[index]];
      }
    });
  };

  // クイズが選択されているかチェック
  const isQuizSelected = (index: number) => {
    return quizzesToSave.some((q) => q === generatedQuizzes[index]);
  };

  // 編集モードを開始
  const startEditMode = (index: number) => {
    const quiz = generatedQuizzes[index];
    setEditingQuizIndex(index);
    setEditedQuiz({
      category: quiz.category || "",
      question: quiz.question,
      options: quiz.options.map((opt) => opt.toString()),
      correctOptionIndex: quiz.correctOptionIndex,
      explanation: quiz.explanation || "",
    });
    setEditMode(true);
  };

  // 編集モードを終了
  const cancelEditMode = () => {
    setEditMode(false);
    setEditingQuizIndex(null);
  };

  // 編集内容を保存
  const saveEditedQuiz = () => {
    if (editingQuizIndex === null) return;

    if (!editedQuiz.question || editedQuiz.options.some((opt) => !opt)) {
      setError("問題文と全ての選択肢を入力してください");
      return;
    }

    const updatedQuizzes = [...generatedQuizzes];
    updatedQuizzes[editingQuizIndex] = {
      ...updatedQuizzes[editingQuizIndex],
      category: editedQuiz.category,
      question: editedQuiz.question,
      options: editedQuiz.options.map((option) => ({
        text: option,
        isCorrect: false,
      })),
      correctOptionIndex: editedQuiz.correctOptionIndex,
      explanation: editedQuiz.explanation,
    };

    setGeneratedQuizzes(updatedQuizzes);

    // 選択済みのクイズも更新
    if (isQuizSelected(editingQuizIndex)) {
      const updatedSaveQuizzes = [...quizzesToSave];
      const saveIndex = updatedSaveQuizzes.findIndex(
        (q) => q === generatedQuizzes[editingQuizIndex]
      );
      if (saveIndex !== -1) {
        updatedSaveQuizzes[saveIndex] = updatedQuizzes[editingQuizIndex];
        setQuizzesToSave(updatedSaveQuizzes);
      }
    }

    setEditMode(false);
    setEditingQuizIndex(null);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">クイズ作成</h2>
          <p className="text-muted-foreground">
            ファイルの内容からAIを使って4択クイズを生成します。
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>エラー</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {file ? (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="options">生成オプション</TabsTrigger>
              <TabsTrigger
                value="review"
                disabled={generatedQuizzes.length === 0}
              >
                クイズ確認・編集
              </TabsTrigger>
            </TabsList>

            <TabsContent value="options" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>ソースファイル: {file.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <span className="font-semibold">ファイルタイプ:</span>{" "}
                      {file.type}
                    </div>
                    {file.summary && (
                      <div>
                        <span className="font-semibold">概要:</span>{" "}
                        <p className="text-sm">{file.summary}</p>
                      </div>
                    )}
                    <div>
                      <span className="font-semibold">キーワード:</span>{" "}
                      {file.keywords.map((keyword, index) => (
                        <Badge variant="outline" key={index}>
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                    {file.structure && (
                      <div>
                        <span className="font-semibold">構成:</span>{" "}
                        <p className="text-sm">{file.structure}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>クイズ生成オプション</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="count">生成数</Label>
                      <Select
                        value={generationOptions.count.toString()}
                        onValueChange={(value) =>
                          setGenerationOptions({
                            ...generationOptions,
                            count: Number.parseInt(value),
                          })
                        }
                      >
                        <SelectTrigger id="count">
                          <SelectValue placeholder="生成数を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1問</SelectItem>
                          <SelectItem value="3">3問</SelectItem>
                          <SelectItem value="5">5問</SelectItem>
                          <SelectItem value="10">10問</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="difficulty">難易度</Label>
                      <Select
                        value={generationOptions.difficulty}
                        onValueChange={(value: "easy" | "medium" | "hard") =>
                          setGenerationOptions({
                            ...generationOptions,
                            difficulty: value,
                          })
                        }
                      >
                        <SelectTrigger id="difficulty">
                          <SelectValue placeholder="難易度を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">簡単</SelectItem>
                          <SelectItem value="medium">普通</SelectItem>
                          <SelectItem value="hard">難しい</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label>カテゴリ</Label>
                      <div className="flex gap-2">
                        <Popover
                          open={openCategorySelect}
                          onOpenChange={setOpenCategorySelect}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openCategorySelect}
                              className="w-full justify-between"
                              onClick={() => {
                                setOpenCategorySelect(false);
                              }}
                            >
                              {generationOptions.category ===
                              "新規カテゴリを作成"
                                ? "新規カテゴリを作成"
                                : generationOptions.category}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="カテゴリを検索..." />
                              <CommandList>
                                <CommandEmpty>
                                  カテゴリが見つかりません
                                </CommandEmpty>
                                <CommandGroup>
                                  {categories?.map((category) => (
                                    <CommandItem
                                      key={category}
                                      value={category}
                                      onSelect={() =>
                                        handleCategorySelect(category)
                                      }
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          generationOptions.category ===
                                            category
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      {category}
                                    </CommandItem>
                                  ))}
                                  <CommandItem
                                    value="新規カテゴリを作成"
                                    onSelect={() => {
                                      handleCategorySelect(
                                        "新規カテゴリを作成"
                                      );
                                      setOpenCategorySelect(false);
                                    }}
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    新規カテゴリを作成
                                  </CommandItem>
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {generationOptions.category === "新規カテゴリを作成" && (
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="newCategory">新規カテゴリ名</Label>
                        <Input
                          id="newCategory"
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          placeholder="新しいカテゴリ名を入力"
                        />
                      </div>
                    )}

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="prompt">カスタムプロンプト（任意）</Label>
                      <Textarea
                        id="prompt"
                        value={generationOptions.prompt}
                        onChange={(e) =>
                          setGenerationOptions({
                            ...generationOptions,
                            prompt: e.target.value,
                          })
                        }
                        placeholder="AIに特定の指示を与えたい場合に入力してください（例：「歴史的な出来事に焦点を当てた問題を作成してください」）"
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        特定の内容や形式でクイズを生成したい場合に指示を入力できます。空欄の場合は自動的に適切な問題が生成されます。
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="outline"
                    onClick={handleGenerateQuizzes}
                    disabled={
                      isLoading ||
                      (generationOptions.category === "新規カテゴリを作成" &&
                        !newCategory) ||
                      generationOptions.category === ""
                    }
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        生成中...
                      </>
                    ) : (
                      "クイズを自動生成"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="review" className="space-y-6">
              {generatedQuizzes.length > 0 && (
                <>
                  {editMode && editingQuizIndex !== null ? (
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
                              onChange={(e) =>
                                setEditedQuiz({
                                  ...editedQuiz,
                                  category: e.target.value,
                                })
                              }
                              placeholder="カテゴリを入力"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="question">問題文</Label>
                            <Textarea
                              id="question"
                              value={editedQuiz.question}
                              onChange={(e) =>
                                setEditedQuiz({
                                  ...editedQuiz,
                                  question: e.target.value,
                                })
                              }
                              rows={4}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>選択肢</Label>
                            <div className="space-y-3">
                              {editedQuiz.options.map((option, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-2"
                                >
                                  <Input
                                    value={option}
                                    onChange={(e) => {
                                      const newOptions = [
                                        ...editedQuiz.options,
                                      ];
                                      newOptions[index] = e.target.value;
                                      setEditedQuiz({
                                        ...editedQuiz,
                                        options: newOptions,
                                      });
                                    }}
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
                              onValueChange={(value) =>
                                setEditedQuiz({
                                  ...editedQuiz,
                                  correctOptionIndex: Number.parseInt(value),
                                })
                              }
                            >
                              {editedQuiz.options.map((option, index) => (
                                <div
                                  key={index}
                                  className="flex items-center space-x-2"
                                >
                                  <RadioGroupItem
                                    value={index.toString()}
                                    id={`option-${index}`}
                                  />
                                  <Label htmlFor={`option-${index}`}>
                                    {String.fromCharCode(65 + index)}:{" "}
                                    {option ||
                                      `選択肢 ${String.fromCharCode(
                                        65 + index
                                      )}`}
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
                              onChange={(e) =>
                                setEditedQuiz({
                                  ...editedQuiz,
                                  explanation: e.target.value,
                                })
                              }
                              rows={3}
                              placeholder="問題の解説を入力（任意）"
                            />
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between">
                        <Button variant="outline" onClick={cancelEditMode}>
                          <X className="mr-2 h-4 w-4" />
                          キャンセル
                        </Button>
                        <Button onClick={saveEditedQuiz}>
                          <Save className="mr-2 h-4 w-4" />
                          変更を保存
                        </Button>
                      </CardFooter>
                    </Card>
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>
                          生成されたクイズ ({generatedQuizzes.length}問)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            保存したいクイズを選択してください。選択したクイズのみが保存されます。
                            デフォルトではすべてのクイズが選択されています。
                          </p>
                          <div className="grid grid-cols-1 gap-4">
                            {generatedQuizzes.map((quiz, index) => (
                              <Card
                                key={index}
                                className={`border-2 ${
                                  isQuizSelected(index)
                                    ? "border-primary bg-primary/5"
                                    : "border-muted"
                                }`}
                              >
                                <CardHeader className="p-4 pb-2 flex flex-row items-start gap-2">
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <CardTitle className="text-base flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          checked={isQuizSelected(index)}
                                          onChange={() =>
                                            toggleQuizSelection(index)
                                          }
                                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                        問題 {index + 1}
                                      </CardTitle>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline">
                                          {quiz.category ||
                                            generationOptions.category ||
                                            "カテゴリなし"}
                                        </Badge>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => startEditMode(index)}
                                          className="h-8 w-8 p-0"
                                        >
                                          <Edit className="h-4 w-4" />
                                          <span className="sr-only">編集</span>
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent className="p-4 pt-2">
                                  <div className="space-y-3">
                                    <p className="font-medium">
                                      {quiz.question}
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {quiz.options.map((option, optIndex) => (
                                        <div
                                          key={optIndex}
                                          className={`p-2 rounded border ${
                                            optIndex === quiz.correctOptionIndex
                                              ? "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700"
                                              : "bg-muted/50"
                                          }`}
                                        >
                                          <div className="flex items-center">
                                            <span className="font-bold mr-2 text-primary">
                                              {String.fromCharCode(
                                                65 + optIndex
                                              )}
                                              .
                                            </span>
                                            <span>{option.toString()}</span>
                                            {optIndex ===
                                              quiz.correctOptionIndex && (
                                              <Check className="ml-auto h-4 w-4 text-green-600" />
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    {quiz.explanation && (
                                      <div className="mt-2 pt-2 border-t">
                                        <p className="text-sm">
                                          <span className="font-semibold">
                                            解説:
                                          </span>{" "}
                                          {quiz.explanation}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between">
                        <Button
                          variant="outline"
                          onClick={() => setActiveTab("options")}
                        >
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          オプションに戻る
                        </Button>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => router.push("/quizzes")}
                          >
                            キャンセル
                          </Button>
                          <Button
                            onClick={handleSaveQuizzes}
                            disabled={isLoading || quizzesToSave.length === 0}
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                保存中...
                              </>
                            ) : (
                              <>
                                <Save className="mr-2 h-4 w-4" />
                                選択したクイズを保存 ({quizzesToSave.length}問)
                              </>
                            )}
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <p className="text-muted-foreground">
            ファイルが見つかりませんでした。ファイル管理画面からファイルを選択してください。
          </p>
        )}
      </div>
    </MainLayout>
  );
}
