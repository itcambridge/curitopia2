// Experience rows are stored only when the configured project URL is exactly
// one of these refs. The production project is refused even if its ref is
// added here. Missing or malformed configuration is refused as well.

const supabaseHostSuffix = '.supabase.co'
const projectRefPattern = /^[a-z0-9]{20}$/

export const productionExperienceProjectRef = 'dacfaoksxfqztnswmnfm'

export const experienceDevelopmentProjectRefs: readonly string[] = [
  'tnohnytbddsbchueghcf',
]

export type ExperienceWriteTarget = 'allowed' | 'production' | 'refused'

function exactProjectRef(value: string): string | null {
  const ref = value.trim().toLowerCase()
  if (!projectRefPattern.test(ref)) return null
  return ref
}

export function supabaseExperienceProjectRef(supabaseUrl: string): string | null {
  if (typeof supabaseUrl !== 'string') return null
  let url: URL
  try {
    url = new URL(supabaseUrl.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null
  if (url.username !== '' || url.password !== '') return null
  if (url.port !== '') return null
  const host = url.hostname.toLowerCase()
  if (!host.endsWith(supabaseHostSuffix)) return null
  return exactProjectRef(host.slice(0, -supabaseHostSuffix.length))
}

export function experienceWriteTarget(
  env: { url: string } | null | undefined,
  allowedRefs: readonly string[] = experienceDevelopmentProjectRefs,
): ExperienceWriteTarget {
  if (!env || typeof env.url !== 'string') return 'refused'
  const ref = supabaseExperienceProjectRef(env.url)
  if (!ref) return 'refused'
  if (ref === productionExperienceProjectRef) return 'production'
  const listed = allowedRefs.some((entry) => typeof entry === 'string' && exactProjectRef(entry) === ref)
  if (!listed) return 'refused'
  return 'allowed'
}

export function experiencePersistenceAllowed(
  supabaseUrl: string,
  allowedRefs: readonly string[] = experienceDevelopmentProjectRefs,
): boolean {
  return experienceWriteTarget({ url: supabaseUrl }, allowedRefs) === 'allowed'
}

export const experienceProductionPermit = 'allow'

export type ExperienceProductionDecision = 'development' | 'open' | 'closed' | 'split'

// The production ref stays classified as production. These permits can open
// that copy only when the process itself is production and both are exactly
// "allow". Development ignores the permits.
export function experienceProductionDecision(input: {
  nodeEnv: string | undefined
  target: ExperienceWriteTarget
  uiPermit: string | undefined
  apiPermit: string | undefined
}): ExperienceProductionDecision {
  if (input.nodeEnv === 'development') return input.target === 'allowed' ? 'development' : 'closed'
  if (input.target === 'allowed') return 'development'
  if (input.nodeEnv !== 'production' || input.target !== 'production') return 'closed'
  const ui = input.uiPermit === experienceProductionPermit
  const api = input.apiPermit === experienceProductionPermit
  if (ui && api) return 'open'
  if (ui || api) return 'split'
  return 'closed'
}

export function experienceClientProductionOpen(input: {
  nodeEnv: string | undefined
  target: ExperienceWriteTarget
  uiPermit: string | undefined
  serverDecision: ExperienceProductionDecision
}): boolean {
  return input.nodeEnv === 'production'
    && input.target === 'production'
    && input.uiPermit === experienceProductionPermit
    && input.serverDecision === 'open'
}

export function experienceRecordPermitted(input: {
  target: ExperienceWriteTarget
  nodeEnv: string | undefined
  uiPermit: string | undefined
  productionOpen: boolean
}): boolean {
  if (input.target === 'allowed') return true
  return experienceClientProductionOpen({
    nodeEnv: input.nodeEnv,
    target: input.target,
    uiPermit: input.uiPermit,
    serverDecision: input.productionOpen ? 'open' : 'closed',
  })
}

// The route maps an open production decision onto the existing allowed gate.
// experienceWriteTarget itself still returns production for that project.
export function experienceHttpTarget(
  target: ExperienceWriteTarget,
  decision: ExperienceProductionDecision,
): ExperienceWriteTarget {
  if (target === 'production' && decision === 'open') return 'allowed'
  return target
}

export function nextExperienceVisit(existingId: string | null): { action: 'resume'; id: string } | { action: 'create' } {
  if (existingId) return { action: 'resume', id: existingId }
  return { action: 'create' }
}
