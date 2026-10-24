import type { KeyboardEvent } from 'react'

export function submitOnEnter(event: KeyboardEvent<HTMLInputElement>, submit: () => void) {
  if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.keyCode !== 229) {
    submit()
  }
}
