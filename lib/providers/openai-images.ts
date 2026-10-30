import { aboveSpendCeiling, maxImageCalls, readReportedUsage, spendCeilingUsd, usageCostUsd } from '@/lib/providers/cost'
import { demoFixtureSrc } from '@/lib/providers/demo-images'
import { imagePrompt, metaphorDirections } from '@/lib/providers/prompts'
import type { ImageCandidate, ImageSetResult, ReportedUsage } from '@/lib/providers/types'

const imageModel = 'gpt-image-2.5-flare'
const imageTimeoutMs = 55_000

function demoImages(considered: string, notice: string): ImageSetResult {
  return {
    source: 'demo',
    notice,
    reportedCostUsd: null,
    stoppedBecause: 'complete',
    model: null,
    promptVersion: null,
    candidates: metaphorDirections.map((direction) => ({
      id: direction.id,
      label: direction.label,
      metaphor: direction.instruction,
      prompt: imagePrompt(considered, direction.instruction),
      src: demoFixtureSrc(direction.id),
      source: 'demo' as const,
      usage: null,
    })),
  }
}

async function requestOneImage(prompt: string, apiKey: string, signal: AbortSignal) {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: imageModel,
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'high',
      output_format: 'webp',
    }),
    signal,
  })
  if (!response.ok) {
    const reason = response.status === 401 ? 'The image provider refused the credential.' : response.status === 429 ? 'The image provider is rate limiting. Nothing was retried.' : 'The image provider did not return an image. Nothing was retried.'
    return { ok: false as const, reason }
  }
  const body = await response.json() as { data?: { b64_json?: string }[]; usage?: unknown }
  const encoded = body.data?.[0]?.b64_json
  if (!encoded) return { ok: false as const, reason: 'The image provider returned no image. Nothing was retried.' }
  return {
    ok: true as const,
    src: `data:image/webp;base64,${encoded}`,
    usage: readReportedUsage(body.usage),
  }
}

export async function interpretQuestion(considered: string, parentSignal?: AbortSignal): Promise<ImageSetResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    return demoImages(considered, 'Demo fixtures. No image provider is connected. These drawings were not generated, and the prompts were not sent.')
  }

  const candidates: ImageCandidate[] = []
  let spent = 0
  let calls = 0
  for (const direction of metaphorDirections) {
    if (calls >= maxImageCalls || aboveSpendCeiling(spent) || parentSignal?.aborted) break
    calls += 1
    const signal = parentSignal ? AbortSignal.any([parentSignal, AbortSignal.timeout(imageTimeoutMs)]) : AbortSignal.timeout(imageTimeoutMs)
    let result: { ok: true; src: string; usage: ReportedUsage } | { ok: false; reason: string }
    try {
      result = await requestOneImage(imagePrompt(considered, direction.instruction), apiKey, signal)
    } catch {
      result = { ok: false, reason: 'The image request did not finish. Nothing was retried.' }
    }
    if (!result.ok) {
      return {
        source: 'openai',
        notice: result.reason,
        candidates,
        reportedCostUsd: spent,
        stoppedBecause: 'error',
        model: imageModel,
        promptVersion: 'image-eval-1',
      }
    }
    spent += usageCostUsd(result.usage)
    candidates.push({
      id: direction.id,
      label: direction.label,
      metaphor: direction.instruction,
      prompt: imagePrompt(considered, direction.instruction),
      src: result.src,
      source: 'openai',
      usage: result.usage,
    })
    if (aboveSpendCeiling(spent)) {
      return {
        source: 'openai',
        notice: `Stopped before another image. Recorded spend is above the $${spendCeilingUsd.toFixed(2)} monitoring ceiling.`,
        candidates,
        reportedCostUsd: spent,
        stoppedBecause: 'ceiling',
        model: imageModel,
        promptVersion: 'image-eval-1',
      }
    }
  }

  return {
    source: 'openai',
    notice: `Made ${calls} image ${calls === 1 ? 'call' : 'calls'} to ${imageModel} at 1024×1024, high quality. No automatic retry.`,
    candidates,
    reportedCostUsd: spent,
    stoppedBecause: 'complete',
    model: imageModel,
    promptVersion: 'image-eval-1',
  }
}
