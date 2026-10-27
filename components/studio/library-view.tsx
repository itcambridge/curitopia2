import { Eyebrow, coralButton, panelClass } from '@/components/studio/studio-ui'
import type { Workspace } from '@/lib/questions/types'

export function LibraryView({ workspace, onChange }: { workspace: Workspace; onChange: (workspace: Workspace) => void }) {
  const concepts = [...workspace.concepts].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  return (
    <div>
      <header className="mb-8">
        <Eyebrow>Library</Eyebrow>
        <h2 className="mt-2 font-serif text-4xl leading-[0.98] tracking-[-0.04em] sm:text-5xl">
          Concepts worth
          <br />
          <em className="text-studio-coral">looking at again.</em>
        </h2>
      </header>
      {concepts.length === 0 ? (
        <div className={panelClass}>
          <p className="max-w-xl text-studio-body">Nothing is kept yet. Gather a few questions, retain the ones you want to see, and name an image when one is worth keeping.</p>
          <button type="button" className={`${coralButton} mt-4`} onClick={() => onChange({ ...workspace, stage: 'gather' })}>Gather questions</button>
        </div>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2">
          {concepts.map((concept) => {
            const questions = concept.questionIds.flatMap((id) => {
              const item = workspace.questions.find((question) => question.id === id)
              return item ? [item.originalText] : []
            })
            return (
              <li key={concept.id}>
                <button
                  type="button"
                  onClick={() => onChange({ ...workspace, stage: 'distil', focusConceptId: concept.id, focusQuestionId: concept.anchorQuestionId })}
                  className="flex h-full w-full flex-col overflow-hidden rounded-[28px] border border-studio-line bg-studio-paper text-left shadow-studio-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral"
                >
                  <img src={concept.imageSrc} alt="" className="aspect-square w-full bg-studio-ink object-contain" />
                  <span className="flex flex-col gap-2 p-5">
                    <Eyebrow>
                      {concept.questionIds.length === 1 ? 'One question' : `${concept.questionIds.length} questions`}
                      {concept.imageSource === 'demo' ? ' · Demo fixture' : ''}
                    </Eyebrow>
                    <span className="font-serif text-3xl leading-tight">{concept.title}</span>
                    <span className="text-sm text-studio-body">{concept.forConsideredText}</span>
                    {questions.length > 1 && <span className="text-sm text-studio-muted">{questions.join(' · ')}</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
