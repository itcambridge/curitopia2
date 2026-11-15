import { experienceHttpTarget, experienceProductionDecision, experienceProductionPermit, experienceWriteTarget, type ExperienceProductionDecision, type ExperienceWriteTarget } from '@/lib/questions/experience'
import { readPublicSupabaseEnv } from '@/lib/supabase/env'

export function readExperienceProductionDecision(): ExperienceProductionDecision {
  const nodeEnv = process.env.NODE_ENV
  const target = experienceWriteTarget(readPublicSupabaseEnv())
  const uiPermit = process.env.NEXT_PUBLIC_EXPERIENCE_PRODUCTION_UI
  const apiPermit = process.env.EXPERIENCE_PRODUCTION_API
  const decision = experienceProductionDecision({ nodeEnv, target, uiPermit, apiPermit })
  if (decision === 'split' && nodeEnv === 'production' && target === 'production') {
    const ui = uiPermit === experienceProductionPermit
    console.info(ui
      ? 'Experience production API permission is absent. Experience stays closed.'
      : 'Experience production UI permission is absent. Experience stays closed.')
  }
  return decision
}

export function experienceRouteWriteTarget(): ExperienceWriteTarget {
  const target = experienceWriteTarget(readPublicSupabaseEnv())
  return experienceHttpTarget(target, readExperienceProductionDecision())
}
