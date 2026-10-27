import type { ReportedUsage } from '@/lib/providers/types'

export const spendCeilingUsd = 1.5
export const maxImageCalls = 4

const textInputPerToken = 5 / 1_000_000
const imageInputPerToken = 8 / 1_000_000
const imageOutputPerToken = 30 / 1_000_000

function asCount(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

export function usageCostUsd(usage: ReportedUsage) {
  return usage.textInputUsd + usage.imageInputUsd + usage.imageOutputUsd
}

export function readReportedUsage(value: unknown): ReportedUsage {
  const usage = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const inputDetails = usage.input_tokens_details && typeof usage.input_tokens_details === 'object'
    ? (usage.input_tokens_details as Record<string, unknown>)
    : {}
  const outputDetails = usage.output_tokens_details && typeof usage.output_tokens_details === 'object'
    ? (usage.output_tokens_details as Record<string, unknown>)
    : {}
  const textTokens = asCount(inputDetails.text_tokens)
  const imageInputTokens = asCount(inputDetails.image_tokens)
  const outputTokens = asCount(usage.output_tokens)
  const outputImageTokens = asCount(outputDetails.image_tokens) ?? outputTokens
  return {
    inputTokens: asCount(usage.input_tokens),
    textTokens,
    imageInputTokens,
    outputTokens,
    outputImageTokens,
    totalTokens: asCount(usage.total_tokens),
    textInputUsd: (textTokens ?? 0) * textInputPerToken,
    imageInputUsd: (imageInputTokens ?? 0) * imageInputPerToken,
    imageOutputUsd: (outputImageTokens ?? 0) * imageOutputPerToken,
  }
}

export function aboveSpendCeiling(spentUsd: number) {
  return spentUsd > spendCeilingUsd
}
