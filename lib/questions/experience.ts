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

export function nextExperienceVisit(existingId: string | null): { action: 'resume'; id: string } | { action: 'create' } {
  if (existingId) return { action: 'resume', id: existingId }
  return { action: 'create' }
}
