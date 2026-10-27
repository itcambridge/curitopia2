const minimumTokens = 4
const overlapThreshold = 0.8

export function normalizeWording(text: string) {
  return text.toLocaleLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
}

function meaningfulTokens(text: string) {
  return new Set(normalizeWording(text).split(' ').filter((word) => word.length > 2))
}

export function similarWording(leftText: string, rightText: string) {
  const left = normalizeWording(leftText)
  const right = normalizeWording(rightText)
  if (!left || !right) return false
  if (left === right) return true
  const leftTokens = meaningfulTokens(leftText)
  const rightTokens = meaningfulTokens(rightText)
  if (leftTokens.size < minimumTokens || rightTokens.size < minimumTokens) return false
  let shared = 0
  for (const token of leftTokens) if (rightTokens.has(token)) shared += 1
  const union = leftTokens.size + rightTokens.size - shared
  return union > 0 && shared / union >= overlapThreshold
}

export function groupSimilarIds(items: { id: string; text: string }[]) {
  const parent = new Map(items.map((item) => [item.id, item.id]))
  function find(id: string): string {
    const current = parent.get(id) ?? id
    if (current === id) return id
    const root = find(current)
    parent.set(id, root)
    return root
  }
  function unite(left: string, right: string) {
    const leftRoot = find(left)
    const rightRoot = find(right)
    if (leftRoot !== rightRoot) parent.set(rightRoot, leftRoot)
  }
  for (let index = 0; index < items.length; index += 1) {
    for (let other = index + 1; other < items.length; other += 1) {
      if (similarWording(items[index].text, items[other].text)) unite(items[index].id, items[other].id)
    }
  }
  const groups = new Map<string, string[]>()
  for (const item of items) {
    const root = find(item.id)
    groups.set(root, [...(groups.get(root) ?? []), item.id])
  }
  return [...groups.values()].filter((group) => group.length > 1)
}
