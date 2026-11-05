'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CurateStage } from '@/components/studio/curate-stage'
import { DistilStage } from '@/components/studio/distil-stage'
import { GatherStage } from '@/components/studio/gather-stage'
import { LeaveGuard } from '@/components/studio/leave-guard'
import { LibraryView } from '@/components/studio/library-view'
import { StudioShell } from '@/components/studio/studio-shell'
import { useAccountWorkspace } from '@/components/studio/use-account-workspace'
import { VisualiseStage } from '@/components/studio/visualise-stage'
import type { StageId } from '@/lib/questions/types'
import { studioPath } from '@/lib/paths'
import { initialLibraryFocus } from '@/lib/questions/library-focus'
import { branchContextNotice, noticeWithoutBranchContext } from '@/lib/questions/branch-notice'
import { workspaceCounts } from '@/lib/questions/workspace'

export function CuritopiaApp({ curiosityId, reviseConceptId = null, openGarden = false }: { curiosityId: string; reviseConceptId?: string | null; openGarden?: boolean }) {
  const router = useRouter()
  const account = useAccountWorkspace(curiosityId, reviseConceptId, openGarden)

  useEffect(() => {
    if (!openGarden || reviseConceptId) return
    router.replace(studioPath(`/?curiosity=${encodeURIComponent(curiosityId)}`))
  }, [openGarden, reviseConceptId, curiosityId, router])

  function openStage(stage: StageId) {
    account.write({ ...account.workspace, stage })
  }

  const notice = noticeWithoutBranchContext(account.storeError)
  const branchNotice = branchContextNotice(account.storeError)

  return (
    <LeaveGuard>
      <StudioShell stage={account.workspace.stage} counts={workspaceCounts(account.workspace)} onStage={openStage} email={account.email} curiosityId={curiosityId} curiosityName={account.curiosityName} onBeforeLeave={account.holdDrafts} onSignOut={() => { void account.signOut() }}>
      {notice && <p role="alert" className="mb-4 text-sm">{notice}</p>}
      {!account.ready ? <p className="text-sm text-studio-muted">Opening the workspace…</p> : account.missingCuriosity ? (
        <p className="text-sm">This curiosity is not in your account. <Link className="font-semibold underline-offset-2 hover:underline" href={studioPath('/')}>Return to your curiosities</Link></p>
      ) : (
        <>
          {account.workspace.stage === 'gather' && <GatherStage workspace={account.workspace} onChange={account.write} saveIssue={account.storeError} branchNotice={branchNotice} />}
          {account.workspace.stage === 'curate' && <CurateStage workspace={account.workspace} onChange={account.write} branchNotice={branchNotice} />}
          {account.workspace.stage === 'visualise' && <VisualiseStage workspace={account.workspace} curiosityId={curiosityId} saving={account.saving} savedConceptId={account.savedConceptId} onChange={account.write} />}
          {account.workspace.stage === 'distil' && <DistilStage workspace={account.workspace} onChange={account.write} saving={account.saving} savedConceptId={account.savedConceptId} />}
          {account.workspace.stage === 'library' && (
            <LibraryView
              workspace={account.workspace}
              onChange={account.write}
              openCuriosityId={curiosityId}
              openCuriosityName={account.curiosityName}
              initialFocus={initialLibraryFocus('curiosity', curiosityId)}
            />
          )}
        </>
      )}
      </StudioShell>
    </LeaveGuard>
  )
}
