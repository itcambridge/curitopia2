export const branchMigrationNotice = 'Branches are not saved yet. The question relationship migration still needs to be applied. Neither question was changed.'

export function branchContextNotice(error: string | null) {
  if (!error?.includes(branchMigrationNotice)) return null
  return branchMigrationNotice
}

export function noticeWithoutBranchContext(error: string | null) {
  if (!error) return null
  const rest = error.split(branchMigrationNotice).join(' ').replace(/\s+/g, ' ').trim()
  return rest || null
}
