"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useTheme } from "next-themes";

export function QuizHistoryChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // セッション履歴を取得
  const sessions = useLiveQuery(async () => {
    return await db.sessions.where("endedAt").notEqual(0).toArray();
  });

  // コンテナのサイズを監視して、キャンバスのサイズを調整
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: Math.floor(width),
          height: Math.max(300, Math.floor(height)), // 最低高さを300pxに設定
        });
      }
    };

    // 初期サイズを設定
    updateDimensions();

    // リサイズイベントを監視
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // グラフを描画
  useEffect(() => {
    if (
      !sessions ||
      sessions.length === 0 ||
      !canvasRef.current ||
      dimensions.width === 0
    )
      return;

    const canvas = canvasRef.current;
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // キャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 最新10セッションを取得
    const recentSessions = [...sessions]
      .sort(
        (a, b) =>
          new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
      )
      .slice(-10);

    // グラフの設定
    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 40, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // 背景色（オプション）
    ctx.fillStyle = isDark
      ? "rgba(30, 41, 59, 0.2)"
      : "rgba(241, 245, 249, 0.5)";
    ctx.fillRect(0, 0, width, height);

    // グリッド線を描画
    ctx.beginPath();
    ctx.strokeStyle = isDark
      ? "rgba(148, 163, 184, 0.2)"
      : "rgba(203, 213, 225, 0.5)";
    ctx.lineWidth = 1;

    // 水平グリッド線
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
    }

    // 垂直グリッド線（セッション数に応じて）
    if (recentSessions.length > 0) {
      const step = chartWidth / recentSessions.length;
      for (let i = 0; i <= recentSessions.length; i++) {
        const x = padding.left + step * i;
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, height - padding.bottom);
      }
    }
    ctx.stroke();

    // 軸を描画
    ctx.beginPath();
    ctx.strokeStyle = isDark ? "#94a3b8" : "#64748b"; // slate-400 or slate-500
    ctx.lineWidth = 2;

    // X軸
    ctx.moveTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);

    // Y軸
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.stroke();

    // Y軸のラベル（0%, 25%, 50%, 75%, 100%）
    ctx.fillStyle = isDark ? "#e2e8f0" : "#334155"; // slate-200 or slate-700
    ctx.font = "12px sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * (4 - i);
      const label = `${i * 25}%`;
      ctx.fillText(label, padding.left - 10, y);
    }

    // データがない場合は終了
    if (recentSessions.length === 0) return;

    // 正答率を計算
    const correctRates = recentSessions.map((session) => {
      const score = session.score || 0;
      const total = session.totalQuestions || 1;
      return (score / total) * 100;
    });

    // バーの幅と間隔を計算
    const barWidth = Math.min(50, (chartWidth / recentSessions.length) * 0.6);
    const barSpacing =
      (chartWidth - barWidth * recentSessions.length) /
      (recentSessions.length + 1);

    // グラデーションを作成
    const barGradient = ctx.createLinearGradient(
      0,
      padding.top,
      0,
      height - padding.bottom
    );
    barGradient.addColorStop(
      0,
      isDark ? "rgba(56, 189, 248, 0.8)" : "rgba(14, 165, 233, 0.7)"
    ); // sky-400/500
    barGradient.addColorStop(
      1,
      isDark ? "rgba(56, 189, 248, 0.2)" : "rgba(14, 165, 233, 0.2)"
    );

    // 棒グラフを描画
    ctx.fillStyle = barGradient;

    correctRates.forEach((rate, index) => {
      const x = padding.left + barSpacing * (index + 1) + barWidth * index;
      const barHeight = (rate / 100) * chartHeight;
      const y = height - padding.bottom - barHeight;

      // 角丸の棒グラフ
      const radius = Math.min(barWidth / 2, 8);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + barWidth - radius, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
      ctx.lineTo(x + barWidth, height - padding.bottom);
      ctx.lineTo(x, height - padding.bottom);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();

      // 正答率の値を表示
      ctx.fillStyle = isDark ? "#e2e8f0" : "#334155";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(`${Math.round(rate)}%`, x + barWidth / 2, y - 5);
    });

    // 折れ線グラフを描画
    ctx.beginPath();
    ctx.strokeStyle = isDark ? "#818cf8" : "#4f46e5"; // indigo-400/600
    ctx.lineWidth = 3;

    correctRates.forEach((rate, index) => {
      const x =
        padding.left +
        barSpacing * (index + 1) +
        barWidth * index +
        barWidth / 2;
      const y = height - padding.bottom - (rate / 100) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // 点を描画
    correctRates.forEach((rate, index) => {
      const x =
        padding.left +
        barSpacing * (index + 1) +
        barWidth * index +
        barWidth / 2;
      const y = height - padding.bottom - (rate / 100) * chartHeight;

      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? "#e0e7ff" : "#ffffff"; // indigo-100/white
      ctx.fill();
      ctx.strokeStyle = isDark ? "#818cf8" : "#4f46e5"; // indigo-400/600
      ctx.lineWidth = 3;
      ctx.stroke();
    });

    // X軸のラベル（セッション番号）
    ctx.fillStyle = isDark ? "#e2e8f0" : "#334155"; // slate-200 or slate-700
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    correctRates.forEach((_, index) => {
      const x =
        padding.left +
        barSpacing * (index + 1) +
        barWidth * index +
        barWidth / 2;
      const sessionNumber = index + 1;
      ctx.fillText(`#${sessionNumber}`, x, height - padding.bottom + 10);
    });

    // グラフタイトル
    ctx.fillStyle = isDark ? "#e2e8f0" : "#334155"; // slate-200 or slate-700
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("クイズ正答率の推移", width / 2, 10);
  }, [sessions, dimensions, isDark]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[300px] flex items-center justify-center p-2 rounded-lg bg-card animate-fade-in"
    >
      {sessions && sessions.length > 0 ? (
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: dimensions.width > 0 ? "block" : "none" }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-6">
          <p className="text-muted-foreground mb-2">データがありません</p>
          <p className="text-sm text-muted-foreground">
            クイズに挑戦すると、ここに成績の推移が表示されます
          </p>
        </div>
      )}
    </div>
  );
}
