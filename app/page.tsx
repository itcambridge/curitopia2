'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  FlaskConical,
  Grid2X2,
  Info,
  Lightbulb,
  Menu,
  Play,
  Plus,
  Sparkles,
  Timer,
  WandSparkles,
  X,
} from 'lucide-react'

type Idea = { title: string; tag: string; color: 'coral' | 'violet' | 'mint' }

const stages = [
  { id: 'curiosity', label: 'Curiosity', icon: Lightbulb, note: 'Ask a better question' },
  { id: 'experiment', label: 'Experiment', icon: FlaskConical, note: 'Test your hunch' },
  { id: 'vision', label: 'Vision', icon: WandSparkles, note: 'Make it memorable' },
]

const starterIdeas: Idea[] = [
  { title: 'Why do shadows change shape?', tag: 'Physics', color: 'coral' },
  { title: 'Can a story grow from one sound?', tag: 'Sound', color: 'violet' },
  { title: 'What makes a place feel like home?', tag: 'Place', color: 'mint' },
]

function QpmGauge({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="rounded-2xl border border-[#d8d0c2] bg-[#fffaf3] px-4 py-2.5">
        <p className="font-mono text-[9px] uppercase tracking-widest text-[#84908b]">Questions / minute</p>
        <p className="mt-0.5 font-serif text-2xl leading-none text-[#ff765d]">{value}<span className="ml-1 text-sm text-[#7d8781]">qpm</span></p>
      </div>
      <button title="Counts questions added during this session over the last 60 seconds." aria-label="About questions per minute" className="grid size-11 place-items-center rounded-full border border-[#cfc6b7] bg-[#fffaf3] text-[#68736e] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff765d]"><Info size={17} /></button>
    </div>
  )
}

function Sidebar({ active, onNavigate }: { active: string; onNavigate: (id: string) => void }) {
  return (
    <aside className="flex w-full flex-col justify-between border-b border-[#d8d0c2] bg-[#ebe5da] px-6 py-6 lg:w-[238px] lg:border-b-0 lg:border-r lg:px-7 lg:py-8">
      <div>
        <div className="mb-10 flex items-center gap-3"><div className="grid size-10 place-items-center rounded-[14px] bg-[#ff765d] text-[#fff8ed] shadow-[4px_4px_0_#182326]"><Sparkles size={19} /></div><div><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#65706d]">Field notes / 042</p><h1 className="font-serif text-[22px] font-semibold tracking-tight">curitopia</h1></div></div>
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#7b837c]">Your journey</p>
        <nav aria-label="Curitopia journey" className="flex gap-2 lg:flex-col">
          {stages.map((stage, index) => { const Icon = stage.icon; const selected = active === stage.id; return <button key={stage.id} onClick={() => onNavigate(stage.id)} aria-current={selected ? 'page' : undefined} className={`group flex flex-1 items-center gap-3 rounded-2xl p-3 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff765d] lg:flex-none ${selected ? 'bg-[#182326] text-[#fff8ed] shadow-[4px_4px_0_#ff765d]' : 'text-[#5d6865] hover:bg-[#e2dace]'}`}><span className={`grid size-9 place-items-center rounded-xl ${selected ? 'bg-[#ff765d] text-[#182326]' : 'bg-[#f7f2ea]'}`}><Icon size={17} /></span><span className="hidden min-[420px]:block"><span className="block text-sm font-semibold">{stage.label}</span><span className={`hidden text-[11px] lg:block ${selected ? 'text-[#b9c7bf]' : 'text-[#89918b]'}`}>{stage.note}</span></span>{index < stages.length - 1 && <ChevronRight className="ml-auto hidden lg:block" size={15} />}</button> })}
        </nav>
        <div className="my-8 hidden h-px bg-[#d3cbbc] lg:block" />
        <div className="hidden gap-2 lg:flex lg:flex-col"><button onClick={() => onNavigate('library')} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#5d6865] hover:bg-[#e2dace]"><BookOpen size={17} />Library of curiosities</button><button className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#5d6865] hover:bg-[#e2dace]"><Timer size={17} />Focus timer <span className="ml-auto font-mono text-[10px]">25:00</span></button></div>
      </div>
      <div className="hidden items-center gap-3 rounded-2xl bg-[#f5f1ea] p-3 lg:flex"><div className="grid size-9 place-items-center rounded-full bg-[#a8d6c1] font-serif font-semibold">A</div><div className="min-w-0"><p className="truncate text-xs font-semibold">Alex Morgan</p><p className="font-mono text-[10px] text-[#7d8781]">Prototype space</p></div><Menu size={16} className="ml-auto text-[#7d8781]" /></div>
    </aside>
  )
}

function ActiveThread({ onQuestion }: { onQuestion: (question: string) => void }) {
  const [question, setQuestion] = useState('')
  const submit = () => { if (question.trim()) { onQuestion(question.trim()); setQuestion('') } }
  return <section className="rounded-[30px] border border-[#d8d0c2] bg-[#fffaf3] p-6 shadow-[0_16px_40px_rgba(66,51,34,0.06)] sm:p-8">
    <div className="mb-8 flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#85908a]">Active thread / 01</p><h3 className="mt-1 text-lg font-semibold">The question garden</h3></div><span className="rounded-full bg-[#e3f0e5] px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-[#47715c]">in bloom</span></div>
    <div className="relative mx-auto flex min-h-[245px] max-w-2xl items-center justify-center max-[480px]:min-h-[290px]"><div className="absolute inset-x-8 top-1/2 h-px bg-[#d6cdc0] max-[480px]:inset-x-4" /><div className="absolute left-1/2 top-7 h-[190px] w-px bg-[#d6cdc0] max-[480px]:h-[225px]" /><div className="relative z-10 grid size-28 place-items-center rounded-full border-[5px] border-[#182326] bg-[#ff765d] text-center shadow-[7px_7px_0_#182326] max-[480px]:size-24"><span className="font-serif text-xl font-semibold leading-none max-[480px]:text-lg">stay<br />curious</span></div><Prompt position="left" eyebrow="start with" text="Something you notice" /><Prompt position="right" eyebrow="try turning" text="It sideways" /><Prompt position="bottom" eyebrow="keep it" text="Playfully specific" /></div>
    <div className="mt-8 rounded-2xl bg-[#182326] p-4"><div className="mb-3 flex items-center gap-2 text-[#b9c7bf]"><Sparkles size={14} /><span className="font-mono text-[10px] uppercase tracking-widest">plant a new seed</span></div><div className="flex gap-2"><input value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.keyCode !== 229) submit() }} placeholder="I wonder why..." aria-label="Add a question" className="min-w-0 flex-1 bg-transparent text-sm text-[#fffaf3] outline-none placeholder:text-[#7f918b]" /><button onClick={submit} aria-label="Plant question" className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#ff765d] text-[#182326] transition hover:bg-[#ff907c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fffaf3]"><ArrowUpRight size={17} /></button></div></div>
  </section>
}

function Prompt({ position, eyebrow, text }: { position: 'left' | 'right' | 'bottom'; eyebrow: string; text: string }) { return <div className={`absolute ${position === 'left' ? 'left-0 top-1/2 -translate-y-1/2' : position === 'right' ? 'right-0 top-1/2 -translate-y-1/2' : 'bottom-0 left-1/2 -translate-x-1/2'} rounded-2xl border border-[#d8d0c2] bg-[#f5f1ea] px-4 py-3 text-center max-[480px]:max-w-[39%] max-[480px]:px-2 max-[480px]:py-2`}><p className="font-mono text-[9px] uppercase tracking-widest text-[#84908b] max-[480px]:text-[7px]">{eyebrow}</p><p className="mt-1 text-sm font-semibold max-[480px]:text-[10px]">{text}</p></div> }

function NextUp({ onOpen }: { onOpen: () => void }) { return <div className="rounded-[30px] bg-[#a8d6c1] p-6"><div className="mb-10 flex items-start justify-between"><div className="grid size-10 place-items-center rounded-xl bg-[#f5f1ea] text-[#182326]"><Play size={17} fill="currentColor" /></div><span className="font-mono text-[10px] uppercase tracking-widest text-[#47715c]">next up</span></div><p className="font-mono text-[10px] uppercase tracking-widest text-[#47715c]">experiment</p><h3 className="mt-2 max-w-[220px] font-serif text-3xl leading-tight">Make the invisible visible.</h3><button onClick={onOpen} className="mt-8 flex items-center gap-2 text-sm font-semibold underline decoration-[#47715c] underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#182326]">Open the lab <ArrowUpRight size={15} /></button></div> }

function CuriosityShelf({ ideas, onAdd }: { ideas: Idea[]; onAdd: (value: string) => void }) {
  const [adding, setAdding] = useState(false); const [value, setValue] = useState('')
  const submit = () => { if (value.trim()) { onAdd(value.trim()); setValue(''); setAdding(false) } }
  return <div className="rounded-[30px] border border-[#d8d0c2] bg-[#fffaf3] p-6"><div className="mb-5 flex items-center justify-between"><h3 className="font-semibold">Curiosity shelf</h3><button onClick={() => setAdding((open) => !open)} aria-label={adding ? 'Close add question' : 'Add a question'} className="grid size-8 place-items-center rounded-full bg-[#ebe5da] transition hover:bg-[#e0d8ca] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff765d]">{adding ? <X size={16} /> : <Plus size={16} />}</button></div>{adding && <div className="mb-4 flex gap-2 rounded-xl border border-[#d8d0c2] bg-[#f5f1ea] p-2"><input autoFocus value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.keyCode !== 229) submit() }} placeholder="Save a question for later" aria-label="Save a question for later" className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none" /><button onClick={submit} className="rounded-lg bg-[#182326] px-3 py-1.5 text-xs text-white">Add</button></div>}<div className="flex flex-col gap-3">{ideas.map((idea) => <button key={idea.title} onClick={() => onAdd(idea.title)} className="group flex min-h-8 items-center gap-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff765d]"><span className={`size-2.5 shrink-0 rounded-full ${idea.color === 'coral' ? 'bg-[#ff765d]' : idea.color === 'violet' ? 'bg-[#9b8de8]' : 'bg-[#a8d6c1]'}`} /><span className="min-w-0 flex-1 text-sm text-[#45524f]">{idea.title}</span><span className="font-mono text-[9px] uppercase tracking-wider text-[#929b94] group-hover:text-[#ff765d]">{idea.tag}</span></button>)}</div><button className="mt-5 flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-[#ff765d]">View all <ChevronRight size={13} /></button></div>
}

export default function Page() {
  const [active, setActive] = useState('curiosity'); const [ideas, setIdeas] = useState<Idea[]>(starterIdeas); const [questionTimes, setQuestionTimes] = useState<number[]>([]); const [, setClock] = useState(0)
  useEffect(() => { const interval = window.setInterval(() => setClock((value) => value + 1), 1000); return () => window.clearInterval(interval) }, [])
  const qpm = useMemo(() => { const cutoff = Date.now() - 60_000; return questionTimes.filter((time) => time > cutoff).length }, [questionTimes])
  const addQuestion = (question: string) => { setQuestionTimes((times) => [...times, Date.now()]); setIdeas((current) => [{ title: question, tag: 'New thread', color: 'coral' }, ...current]) }
  return <main className="min-h-screen overflow-hidden bg-[#f5f1ea] text-[#182326]"><div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row"><Sidebar active={active} onNavigate={setActive} /><section className="relative flex-1 px-5 py-7 sm:px-8 lg:px-12 lg:py-10"><div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-[#d9e6d5] opacity-70 blur-3xl" /><header className="relative mb-10 flex items-start justify-between gap-5"><div><div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#7c8781]"><span className="size-2 rounded-full bg-[#ff765d]" />Tuesday, October 24 · Studio 01</div><h2 className="max-w-xl font-serif text-4xl leading-[0.98] tracking-[-0.04em] sm:text-5xl">Follow the thread.<br /><em className="text-[#ff765d]">See what unfolds.</em></h2></div><QpmGauge value={qpm} /></header><div className="relative grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]"><ActiveThread onQuestion={addQuestion} /><div className="flex flex-col gap-5"><NextUp onOpen={() => setActive('experiment')} /><CuriosityShelf ideas={ideas} onAdd={addQuestion} /></div></div><footer className="relative mt-8 flex flex-wrap items-center gap-3 text-[11px] text-[#89928c]"><span className="font-mono uppercase tracking-widest">A gentle reminder</span><span className="size-1 rounded-full bg-[#ff765d]" /><span>You don&apos;t have to know the answer to begin.</span><span className="ml-auto hidden items-center gap-2 sm:flex"><Grid2X2 size={14} /> 4 paths in motion <Check size={14} className="text-[#5c9976]" /></span></footer></section></div></main>
}
