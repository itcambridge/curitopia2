export type ProviderSource = 'demo' | 'openai'

export type ReportedUsage = {
  inputTokens: number | null
  textTokens: number | null
  imageInputTokens: number | null
  outputTokens: number | null
  outputImageTokens: number | null
  totalTokens: number | null
  textInputUsd: number
  imageInputUsd: number
  imageOutputUsd: number
}

export type ConsiderResult = {
  source: ProviderSource
  proposal: string
  notice: string
}

export type MetaphorId = 'tension' | 'trace' | 'scale' | 'relation'

export type ImageCandidate = {
  id: MetaphorId
  label: string
  metaphor: string
  prompt: string
  src: string
  source: ProviderSource
  usage: ReportedUsage | null
}

export type ImageSetResult = {
  source: ProviderSource
  notice: string
  candidates: ImageCandidate[]
  reportedCostUsd: number | null
  stoppedBecause: 'complete' | 'error' | 'ceiling'
  model: string | null
  promptVersion: string | null
}
