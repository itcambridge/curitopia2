import { readReportedUsage, usageCostUsd } from './cost.ts'
import { providerFailure, readProviderError } from './provider-error.ts'
import { demoFixtureSrc } from './demo-images.ts'
import { imagePrompt, metaphorDirections } from './prompts.ts'
import type { ImageCandidate, ImageSetResult, MetaphorId, ReportedUsage } from '@/lib/providers/types'

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

async function imageFailure(response: Response) {
  let detail = ''
  let code = ''
  try {
    const read = readProviderError(await response.json())
    detail = read.detail
    code = read.code
  } catch {
    detail = ''
  }
  const specific = providerFailure(response.status, detail, code, 'image provider', '')
  if (specific) return specific
  const extra = detail ? ` ${detail}` : ''
  return `The image provider did not return an image.${extra} Nothing was retried.`
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
  if (!response.ok) return { ok: false as const, reason: await imageFailure(response) }
  const body = await response.json() as { data?: { b64_json?: string }[]; usage?: unknown }
  const encoded = body.data?.[0]?.b64_json
  if (!encoded) return { ok: false as const, reason: 'The image provider returned no image. Nothing was retried.' }
  return {
    ok: true as const,
    src: `data:image/webp;base64,${encoded}`,
    usage: readReportedUsage(body.usage),
  }
}

export async function interpretQuestion(considered: string, parentSignal?: AbortSignal, direction?: MetaphorId): Promise<ImageSetResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  const directions = direction ? metaphorDirections.filter((item) => item.id === direction) : metaphorDirections
  if (!apiKey) {
    const demo = demoImages(considered, 'Demo fixtures. No image provider is connected. These drawings were not generated, and the prompts were not sent.')
    return { ...demo, candidates: demo.candidates.filter((candidate) => directions.some((item) => item.id === candidate.id)) }
  }

  const candidates: ImageCandidate[] = []
  let spent = 0
  let calls = 0
  for (const item of directions) {
    if (parentSignal?.aborted) break
    calls += 1
    const signal = parentSignal ? AbortSignal.any([parentSignal, AbortSignal.timeout(imageTimeoutMs)]) : AbortSignal.timeout(imageTimeoutMs)
    let result: { ok: true; src: string; usage: ReportedUsage } | { ok: false; reason: string }
    try {
      result = await requestOneImage(imagePrompt(considered, item.instruction), apiKey, signal)
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
      id: item.id,
      label: item.label,
      metaphor: item.instruction,
      prompt: imagePrompt(considered, item.instruction),
      src: result.src,
      source: 'openai',
      usage: result.usage,
    })
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
