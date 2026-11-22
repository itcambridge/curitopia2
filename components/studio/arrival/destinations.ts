export const arrivalDestinations = ['home', 'garden', 'visualise', 'gallery', 'compare', 'experience'] as const

export type ArrivalDestination = (typeof arrivalDestinations)[number]

export type ArrivalSpec = {
  label: string
  // Home matches the 900ms seedling GIF. Gallery matches the 1,080ms blossom.
  durationMs: number
  widthClass: string
  gif?: { src: string; width: number; height: number }
}

export const arrivalSpecs: Record<ArrivalDestination, ArrivalSpec> = {
  home: {
    label: 'Home',
    durationMs: 900,
    widthClass: 'w-[min(16rem,72%)]',
    gif: { src: '/2.gif', width: 512, height: 341 },
  },
  garden: {
    label: 'Question Garden',
    durationMs: 900,
    widthClass: 'w-[min(13.5rem,68%)]',
  },
  visualise: {
    label: 'Visualise',
    durationMs: 900,
    widthClass: 'w-[min(20rem,88%)]',
  },
  gallery: {
    label: 'Gallery',
    durationMs: 1080,
    widthClass: 'w-[min(15rem,70%)]',
    gif: { src: '/blossom-bloom.gif', width: 431, height: 390 },
  },
  compare: {
    label: 'Compare',
    durationMs: 900,
    widthClass: 'w-[min(22rem,90%)]',
  },
  experience: {
    label: 'Experience',
    durationMs: 900,
    widthClass: 'w-[min(40rem,100%)]',
  },
}
