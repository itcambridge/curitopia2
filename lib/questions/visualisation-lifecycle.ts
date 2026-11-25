// Close may delete the temporary source only when no save is using it.
// An in-flight save keeps the row. The seven-day purge removes abandoned rows.
export function shouldReleaseVisualisationSource(input: { saving: boolean; alreadyReleased: boolean }) {
  return !input.saving && !input.alreadyReleased
}
