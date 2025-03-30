"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useTheme } from "next-themes";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { BarChart4 } from "lucide-react"; // データなし表示用

const getColor = (colorName: string, shade: string = "DEFAULT"): string => {
  // CSS変数名に変換 (例: primary -> --primary)
  const cssVar = `--${colorName}${shade === "DEFAULT" ? "" : `-${shade}`}`;
  // CSS変数の値を取得 (例: 221 83% 53%)
  let colorValue = "0 0% 0%"; // デフォルト値
  if (typeof window !== "undefined") {
    colorValue = getComputedStyle(document.documentElement)
      .getPropertyValue(cssVar)
      .trim();
  }
  // HSL形式に変換 (例: hsl(221 83% 53%))
  return `hsl(${colorValue})`;
};

export function QuizHistoryChart() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // セッション履歴を取得 (完了したもののみ)
  const sessions = useLiveQuery(async () => {
    return await db.sessions.where("endedAt").above(0).sortBy("startedAt"); // startedAtでソート
  });

  // グラフ用データを作成 (最新10件)
  const chartData = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];

    const recentSessions = sessions.slice(-10); // 最新10件を取得

    return recentSessions.map((session, index) => {
      const score = session.score || 0;
      const total = session.totalQuestions || 1; // 0除算を防ぐ
      const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
      return {
        name: `#${sessions.length - recentSessions.length + index + 1}`, // セッション番号 (全体での番号)
        正答率: percentage,
      };
    });
  }, [sessions]);

  // テーマに応じた色設定
  const primaryColor = useMemo(
    () => (isDark ? getColor("primary") : getColor("primary")),
    [isDark]
  );
  const secondaryColor = useMemo(
    () => (isDark ? getColor("secondary") : getColor("secondary")),
    [isDark]
  );
  const textColor = useMemo(
    () =>
      isDark ? getColor("muted-foreground") : getColor("muted-foreground"),
    [isDark]
  );
  const gridColor = useMemo(
    () => (isDark ? "rgba(100, 116, 139, 0.2)" : "rgba(226, 232, 240, 0.8)"), // slate-500/slate-200 with opacity
    [isDark]
  );
  const tooltipBg = useMemo(
    () => (isDark ? getColor("popover") : getColor("popover")),
    [isDark]
  );
  const tooltipText = useMemo(
    () =>
      isDark ? getColor("popover-foreground") : getColor("popover-foreground"),
    [isDark]
  );

  // データがない場合の表示
  if (!chartData || chartData.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center p-4 rounded-lg bg-card animate-fade-in">
        <div className="flex flex-col items-center justify-center text-center p-6">
          <BarChart4 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">データがありません</p>
          <p className="text-sm text-muted-foreground">
            クイズに挑戦すると、ここに成績の推移が表示されます
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full animate-fade-in">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{
            top: 20,
            right: 20,
            bottom: 5, // X軸ラベル用に少しスペースを確保
            left: -10, // Y軸ラベル用に少しスペースを確保
          }}
        >
          <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            tick={{ fill: textColor, fontSize: 12 }}
            axisLine={{ stroke: gridColor }}
            tickLine={{ stroke: gridColor }}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            tick={{ fill: textColor, fontSize: 12 }}
            axisLine={{ stroke: gridColor }}
            tickLine={{ stroke: gridColor }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: tooltipBg,
              borderColor: gridColor,
              borderRadius: "0.5rem", // tailwind md
              color: tooltipText,
              fontSize: "12px",
              boxShadow:
                "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)", // shadow-md
            }}
            itemStyle={{ color: tooltipText }}
            cursor={{
              fill: isDark
                ? "rgba(100, 116, 139, 0.1)"
                : "rgba(226, 232, 240, 0.4)",
            }} // slate-500/slate-200 with opacity
          />
          <Legend
            wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
            formatter={(value) => (
              <span style={{ color: textColor }}>{value}</span>
            )}
          />
          <Bar
            dataKey="正答率"
            fill={primaryColor} // プライマリカラーを使用
            radius={[4, 4, 0, 0]} // 上部角丸
            barSize={20} // バーの最大幅
            animationDuration={500}
          />
          <Line
            type="monotone"
            dataKey="正答率"
            stroke={secondaryColor} // セカンダリカラーを使用
            strokeWidth={2}
            dot={{
              r: 4,
              fill: secondaryColor,
              stroke: tooltipBg,
              strokeWidth: 1,
            }}
            activeDot={{
              r: 6,
              fill: secondaryColor,
              stroke: tooltipBg,
              strokeWidth: 2,
            }}
            animationDuration={500}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
