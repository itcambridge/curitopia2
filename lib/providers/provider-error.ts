export function readProviderError(body: unknown) {
  const error = body && typeof body === 'object' && 'error' in body
    ? (body as { error?: { message?: unknown; code?: unknown; type?: unknown } }).error
    : undefined
  const detail = typeof error?.message === 'string' ? error.message.replace(/\s+/g, ' ').trim().slice(0, 180) : ''
  const code = typeof error?.code === 'string' ? error.code : typeof error?.type === 'string' ? error.type : ''
  return { detail, code }
}

export function providerFailure(status: number, detail: string, code: string, subject: 'text model' | 'image provider', unchanged: string) {
  const extra = detail ? ` ${detail}` : ''
  const billing = status === 402 || /\b(insufficient_quota|billing|credits?)\b/i.test(`${code} ${detail}`)
  if (billing) return `The ${subject} has no remaining credit.${extra} ${unchanged}Nothing was retried.`
  if (status === 401) return `The ${subject} refused the credential.${extra} ${unchanged}Nothing was retried.`
  if (status === 429) return `The ${subject} is rate limiting.${extra} ${unchanged}Nothing was retried.`
  return ''
}
