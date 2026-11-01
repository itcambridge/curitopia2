import { accountsNotConfigured, type AiSession } from '@/lib/ai/policy'
import { createClient } from '@/lib/supabase/server'

export async function openAiSession(): Promise<AiSession | Response> {
  try {
    const supabase = await createClient()
    return {
      auth: {
        getUser: () => supabase.auth.getUser(),
      },
    }
  } catch {
    return accountsNotConfigured()
  }
}
