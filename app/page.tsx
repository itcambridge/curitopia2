'use client'

import { useEffect, useMemo, useState } from 'react'
import { HomeDashboard } from '@/components/home/home-dashboard'
import type { Idea } from '@/components/home/types'

const starterIdeas: Idea[] = [
  { title: 'Why do shadows change shape?', tag: 'Physics', color: 'coral' },
  { title: 'Can a story grow from one sound?', tag: 'Sound', color: 'violet' },
  { title: 'What makes a place feel like home?', tag: 'Place', color: 'mint' },
]

export default function Page() {
  const [active, setActive] = useState('curiosity')
  const [ideas, setIdeas] = useState<Idea[]>(starterIdeas)
  const [questionTimes, setQuestionTimes] = useState<number[]>([])
  const [, setClock] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => setClock((value) => value + 1), 1000)
    return () => window.clearInterval(interval)
  }, [])

  const qpm = useMemo(() => {
    const cutoff = Date.now() - 60_000
    return questionTimes.filter((time) => time > cutoff).length
  }, [questionTimes])

  const addQuestion = (question: string) => {
    setQuestionTimes((times) => [...times, Date.now()])
    setIdeas((current) => [{ title: question, tag: 'New thread', color: 'coral' }, ...current])
  }

  return (
    <HomeDashboard
      active={active}
      ideas={ideas}
      qpm={qpm}
      onNavigate={setActive}
      onAddQuestion={addQuestion}
      onOpenExperiment={() => setActive('experiment')}
    />
  )
}
