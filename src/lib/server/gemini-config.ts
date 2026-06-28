const DEFAULT_PRIMARY_MODEL = "gemini-2.5-flash-preview-04-17";
const DEFAULT_FALLBACK_MODEL = "gemini-2.0-flash";
const DEFAULT_THINKING_BUDGET = 24576;

export interface GeminiModelConfig {
  modelIdsToTry: string[];
  enableThinking: boolean;
  thinkingBudget: number;
  thinkingModelIds: string[];
}

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function parseBooleanEnv(
  value: string | undefined,
  defaultValue: boolean
): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();

  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

function parsePositiveIntegerEnv(
  value: string | undefined,
  defaultValue: number
): number {
  if (value === undefined) {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return defaultValue;
  }

  return parsed;
}

export function getGeminiModelConfig(): GeminiModelConfig {
  const primaryModel =
    readOptionalEnv("GEMINI_PRIMARY_MODEL") ?? DEFAULT_PRIMARY_MODEL;
  const fallbackModel =
    readOptionalEnv("GEMINI_FALLBACK_MODEL") ?? DEFAULT_FALLBACK_MODEL;
  const enableThinking = parseBooleanEnv(
    process.env.GEMINI_ENABLE_THINKING,
    true
  );
  const thinkingBudget = parsePositiveIntegerEnv(
    process.env.GEMINI_THINKING_BUDGET,
    DEFAULT_THINKING_BUDGET
  );

  const modelIdsToTry = Array.from(
    new Set([primaryModel, fallbackModel].filter(Boolean))
  );

  return {
    modelIdsToTry,
    enableThinking,
    thinkingBudget,
    thinkingModelIds: enableThinking ? [primaryModel] : [],
  };
}
