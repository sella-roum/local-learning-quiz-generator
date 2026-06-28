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

  const normalized = value.trim();

  if (!/^\d+$/.test(normalized)) {
    return defaultValue;
  }

  const parsed = Number(normalized);

  if (!Number.isSafeInteger(parsed)) {
    return defaultValue;
  }

  return parsed;
}

function supportsThinking(modelId: string): boolean {
  const normalized = modelId.toLowerCase();
  return (
    normalized.startsWith("gemini-2.5") || normalized.includes("thinking")
  );
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
  const rawThinkingBudget = parsePositiveIntegerEnv(
    process.env.GEMINI_THINKING_BUDGET,
    DEFAULT_THINKING_BUDGET
  );
  const thinkingBudget =
    rawThinkingBudget < 1024 ? DEFAULT_THINKING_BUDGET : rawThinkingBudget;

  const modelIdsToTry = Array.from(
    new Set([primaryModel, fallbackModel].filter(Boolean))
  );
  const thinkingModelIds =
    enableThinking && supportsThinking(primaryModel) ? [primaryModel] : [];

  return {
    modelIdsToTry,
    enableThinking,
    thinkingBudget,
    thinkingModelIds,
  };
}
