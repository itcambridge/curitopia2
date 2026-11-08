// A saved concept closes the run for anything not already on screen.
// An image request that was already sent may still finish. Its result is discarded.
export function shouldStartNextImage(runOpen: boolean) {
  return runOpen
}

export function shouldApplyReturnedImage(runOpen: boolean) {
  return runOpen
}
