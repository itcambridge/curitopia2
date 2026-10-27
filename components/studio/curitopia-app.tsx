'use client'

import { CurateStage } from '@/components/studio/curate-stage'
import { DistilStage } from '@/components/studio/distil-stage'
import { GatherStage } from '@/components/studio/gather-stage'
import { LibraryView } from '@/components/studio/library-view'
import { StudioShell } from '@/components/studio/studio-shell'
import { useAccountWorkspace } from '@/components/studio/use-account-workspace'
import { VisualiseStage } from '@/components/studio/visualise-stage'
import type { StageId } from '@/lib/questions/types'
import { workspaceCounts } from '@/lib/questions/workspace'

export function CuritopiaApp() {
  const account = useAccountWorkspace()

  function openStage(stage: StageId) {
    account.write({ ...account.workspace, stage })
  }

  return (
    <StudioShell stage={account.workspace.stage} counts={workspaceCounts(account.workspace)} onStage={openStage} email={account.email} onSignOut={() => { void account.signOut() }}>
      {account.storeError && <p role="alert" className="mb-4 text-sm">{account.storeError}</p>}
      {!account.ready ? <p className="text-sm text-studio-muted">Opening the workspace…</p> : (
        <>
          {account.workspace.stage === 'gather' && <GatherStage workspace={account.workspace} onChange={account.write} saveIssue={account.storeError} />}
          {account.workspace.stage === 'curate' && <CurateStage workspace={account.workspace} onChange={account.write} />}
          {account.workspace.stage === 'visualise' && <VisualiseStage workspace={account.workspace} onChange={account.write} />}
          {account.workspace.stage === 'distil' && <DistilStage workspace={account.workspace} onChange={account.write} saving={account.saving} savedConceptId={account.savedConceptId} />}
          {account.workspace.stage === 'library' && <LibraryView workspace={account.workspace} onChange={account.write} conceptsLoaded={account.conceptsLoaded} />}
        </>
      )}
    </StudioShell>
  )
}
