import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { productionExperienceProjectRef } from '../questions/experience.ts'
import { selectPublicSupabaseEnv } from './env.ts'

const developmentRef = 'tnohnytbddsbchueghcf'
const developmentUrl = `https://${developmentRef}.supabase.co/rest/v1/`
const productionUrl = `https://${productionExperienceProjectRef}.supabase.co`
const publishable = 'sb_publishable_test_key'
const secret = 'sb_secret_test_key'

function token(role: string) {
  const payload = Buffer.from(JSON.stringify({ role })).toString('base64url')
  return `eyJhbGciOiJub25lIn0.${payload}.sig`
}

const production = {
  productionUrl,
  productionKey: publishable,
  developmentUrl,
  developmentKey: publishable,
}

assert.equal(selectPublicSupabaseEnv({ nodeEnv: 'development', ...production })?.url, `https://${developmentRef}.supabase.co`)
assert.equal(selectPublicSupabaseEnv({ nodeEnv: 'development', ...production, productionUrl: 'https://evil.example' })?.url, `https://${developmentRef}.supabase.co`)
assert.equal(selectPublicSupabaseEnv({ nodeEnv: 'production', ...production })?.url, productionUrl)
assert.equal(selectPublicSupabaseEnv({ nodeEnv: undefined, ...production })?.url, productionUrl)

assert.equal(selectPublicSupabaseEnv({ nodeEnv: 'development', ...production, developmentUrl: undefined }), null)
assert.equal(selectPublicSupabaseEnv({ nodeEnv: 'development', ...production, developmentKey: '   ' }), null)
assert.equal(selectPublicSupabaseEnv({ nodeEnv: 'development', ...production, developmentUrl: 'not a url' }), null)
assert.equal(selectPublicSupabaseEnv({ nodeEnv: 'development', ...production, developmentUrl: `http://${developmentRef}.supabase.co` }), null)
assert.equal(selectPublicSupabaseEnv({ nodeEnv: 'development', ...production, developmentUrl: `https://${developmentRef}.supabase.co:8443` }), null)
assert.equal(selectPublicSupabaseEnv({ nodeEnv: 'development', ...production, developmentUrl: `https://user:pass@${developmentRef}.supabase.co` }), null)
assert.equal(selectPublicSupabaseEnv({ nodeEnv: 'development', ...production, developmentUrl: productionUrl }), null)
assert.equal(selectPublicSupabaseEnv({ nodeEnv: 'development', ...production, developmentKey: secret }), null)
assert.equal(selectPublicSupabaseEnv({ nodeEnv: 'development', ...production, developmentKey: token('service_role') }), null)
assert.equal(selectPublicSupabaseEnv({ nodeEnv: 'development', ...production, developmentKey: token('anon') })?.url, `https://${developmentRef}.supabase.co`)
assert.equal(selectPublicSupabaseEnv({ nodeEnv: 'production', ...production, productionKey: secret }), null)
assert.equal(selectPublicSupabaseEnv({ nodeEnv: 'production', productionUrl: undefined, productionKey: undefined, developmentUrl, developmentKey: publishable }), null)

const envSource = readFileSync(new URL('./env.ts', import.meta.url), 'utf8')
const clientSource = readFileSync(new URL('./client.ts', import.meta.url), 'utf8')
const serverSource = readFileSync(new URL('./server.ts', import.meta.url), 'utf8')
const writer = readFileSync(new URL('../questions/supabase-experience.ts', import.meta.url), 'utf8')
const guard = readFileSync(new URL('../questions/experience.ts', import.meta.url), 'utf8')
assert.equal(envSource.includes('process.env.NEXT_PUBLIC_SUPABASE_URL'), true)
assert.equal(envSource.includes('process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'), true)
assert.equal(envSource.includes('process.env.NEXT_PUBLIC_SUPABASE_DEV_URL'), true)
assert.equal(envSource.includes('process.env.NEXT_PUBLIC_SUPABASE_DEV_PUBLISHABLE_KEY'), true)
assert.equal(envSource.includes('SUPABASE_SERVICE_ROLE'), false)
assert.equal(clientSource.includes('requirePublicSupabaseEnv'), true)
assert.equal(clientSource.includes('service_role'), false)
assert.equal(serverSource.includes('requirePublicSupabaseEnv'), true)
assert.equal(serverSource.includes('service_role'), false)
assert.equal(writer.includes('experienceWriteTarget(readPublicSupabaseEnv())'), true)
assert.equal(guard.includes('NEXT_PUBLIC_SUPABASE_DEV'), false)

console.log('supabase env checks passed')
