import { aboveSpendCeiling, maxImageCalls, readReportedUsage, spendCeilingUsd, usageCostUsd } from '@/lib/providers/cost'
import { demoFixtureSrc } from '@/lib/providers/demo-images'
import { demoProposal, imagePrompt, metaphorDirections } from '@/lib/providers/prompts'
import type { ConsiderResult, ImageCandidate, ImageSetResult, ReportedUsage } from '@/lib/providers/types'

const imageModel = 'gpt-image-2.5-flare'
const imageTimeoutMs = 55_000

function demoConsider(original: string, attempt: number): ConsiderResult {
  return {
    source: 'demo',
    proposal: demoProposal(original, attempt),
    notice: 'Demo proposal. No text model is connected, so this is a scaffold for you to edit. It is not a generated reading of your question.',
  }
}

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

export async function considerQuestion(original: string, attempt: number): Promise<ConsiderResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  const model = process.env.OPENAI_TEXT_MODEL?.trim()
  if (!apiKey || !model) return demoConsider(original, attempt)
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content: 'Rewrite the unfinished thought as one considered question. Preserve the person\'s meaning. Add no facts, no list, and no advice. Reply with the question only.',
          },
          { role: 'user', content: original },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!response.ok) {
      return { ...demoConsider(original, attempt), notice: 'The text model did not respond. This scaffold is a demo, and nothing was retried.' }
    }
    const body = await response.json() as { choices?: { message?: { content?: string } }[] }
    const proposal = body.choices?.[0]?.message?.content?.trim()
    if (!proposal) {
      return { ...demoConsider(original, attempt), notice: 'The text model returned no question. This scaffold is a demo.' }
    }
    return {
      source: 'openai',
      proposal,
      notice: 'One proposal from the configured text model. Edit it, accept it, or ask again. The original wording stays as captured.',
    }
  } catch {
    return { ...demoConsider(original, attempt), notice: 'The text model did not finish. This scaffold is a demo, and nothing was retried.' }
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
