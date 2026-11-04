import type { ReactNode } from 'react'
import Image from 'next/image'
import { consultantName, consultantTitle, contactEmail, navigation, projects, qualifications, results, services, stages } from '@/components/consultancy/content'
import { SiteBanner } from '@/components/site-banner'
import { withBasePath } from '@/lib/paths'

const sectionClass = 'scroll-mt-40 border-t border-studio-line px-5 py-20 sm:px-8 sm:py-28'
const copyClass = 'max-w-2xl text-lg leading-relaxed text-studio-body'
const cardClass = 'flex h-full flex-col border border-studio-line bg-studio-paper p-6 sm:p-8'

export function ConsultancyPage() {
  return (
    <div className="consultancy min-h-screen bg-studio-cream text-studio-ink">
      <style>{`
        html:has(.consultancy) { scroll-behavior: smooth; }
        @media (prefers-reduced-motion: reduce) {
          html:has(.consultancy) { scroll-behavior: auto; }
        }
      `}</style>
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:bg-studio-paper focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header id="top" className="sticky top-0 z-20 border-b border-studio-line bg-studio-cream/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-4 sm:px-8">
          <SiteBanner alt="curitopia" />
          <div className="flex items-baseline justify-between gap-6">
            <a href="#top" className="font-serif text-xl tracking-tight">
              {consultantName}
            </a>
            <a href="#contact" className="hidden text-sm font-medium underline decoration-studio-coral decoration-2 underline-offset-4 sm:inline">
              Discuss a project
            </a>
          </div>
          <nav aria-label="Page" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-studio-body">
            {navigation.map((item) => (
              <a key={item.href} href={item.href} className="shrink-0 hover:text-studio-ink">
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main id="content">
        <section className="px-5 py-20 sm:px-8 sm:py-28" aria-labelledby="hero-heading">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-end">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.16em] text-studio-kicker">
                {consultantTitle}
              </p>
              <h1 id="hero-heading" className="mt-6 max-w-4xl font-serif text-4xl leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
                Infrastructure Architecture. Clear Thinking. Reliable Delivery.
              </h1>
              <div className="mt-8 max-w-2xl space-y-5 text-lg leading-relaxed text-studio-body">
                <p>Independent infrastructure architecture and technical consultancy for organisations navigating complex IT change.</p>
                <p>
                  From enterprise infrastructure and cloud migration to workplace transformation, identity and security, I help turn challenging technical requirements into practical solutions.
                </p>
              </div>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <a href="#contact" className="inline-flex items-center justify-center bg-studio-ink px-5 py-3 text-sm font-medium text-studio-cream hover:bg-studio-ink/90">
                  Discuss a Project
                </a>
                <a href="#work" className="inline-flex items-center justify-center border border-studio-ink px-5 py-3 text-sm font-medium hover:bg-studio-paper">
                  Explore My Work
                </a>
              </div>
            </div>
            <p className="border-l border-studio-coral pl-5 text-sm leading-relaxed text-studio-body lg:pb-2">
              Turning complex infrastructure challenges into clear, secure and deliverable solutions.
            </p>
          </div>
        </section>

        <section id="services" className={sectionClass} aria-labelledby="services-heading">
          <div className="mx-auto max-w-6xl">
            <SectionIntro eyebrow="Services" title="Five areas of practice" headingId="services-heading">
              <p className={copyClass}>
                I help organisations design, modernise and migrate complex IT environments. The work stays practical: architecture, delivery leadership and hands-on problem-solving from initial design through to implementation.
              </p>
            </SectionIntro>
            <ul className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
              {services.map((service, index) => (
                <li key={service.title} className={index > 2 ? 'xl:col-span-3' : 'xl:col-span-2'}>
                  <article className={cardClass}>
                    <h3 className="font-serif text-2xl tracking-tight">{service.title}</h3>
                    <ul className="mt-5 space-y-2 text-sm leading-relaxed text-studio-body">
                      {service.points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  </article>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="results" className={sectionClass} aria-labelledby="results-heading">
          <div className="mx-auto max-w-6xl">
            <SectionIntro eyebrow="Experience" title="Results from delivery" headingId="results-heading">
              <p className={copyClass}>Selected outcomes from infrastructure programmes. The migration and recovery figures open the project notes below.</p>
            </SectionIntro>
            <ul className="mt-12 grid gap-4 md:grid-cols-2">
              {results.map((result) => (
                <li key={result.unit}>
                  <article className={cardClass}>
                    <p className="font-serif text-5xl tracking-tight sm:text-6xl">{result.figure}</p>
                    <h3 className="mt-3 text-sm font-medium uppercase tracking-[0.14em] text-studio-kicker">{result.unit}</h3>
                    <p className="mt-4 flex-1 leading-relaxed text-studio-body">{result.text}</p>
                    <a href={result.href} className="mt-6 text-sm font-medium underline decoration-studio-coral decoration-2 underline-offset-4">
                      {result.link}
                    </a>
                  </article>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="work" className={sectionClass} aria-labelledby="work-heading">
          <div className="mx-auto max-w-6xl">
            <SectionIntro eyebrow="Selected work" title="Selected project experience" headingId="work-heading">
              <p className={copyClass}>The challenge, the role, and the technical contribution. The current engagement is anonymised.</p>
            </SectionIntro>
            <div className="mt-12 grid gap-4 lg:grid-cols-2">
              {projects.map((project) => (
                <article key={project.id} id={project.id} className={`${cardClass} scroll-mt-40`}>
                  <h3 className="font-serif text-2xl tracking-tight sm:text-3xl">{project.title}</h3>
                  <p className="mt-4 leading-relaxed text-studio-body">{project.summary}</p>
                  <ul className="mt-5 space-y-2 text-sm leading-relaxed text-studio-body">
                    {project.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="approach" className={sectionClass} aria-labelledby="approach-heading">
          <div className="mx-auto max-w-6xl">
            <SectionIntro eyebrow="How I work" title="From the problem to a stable handover" headingId="approach-heading">
              <p className={copyClass}>
                I take practical ownership of the work, stay close to the people doing it, and keep the plan understandable for technical and non-technical stakeholders.
              </p>
            </SectionIntro>
            <ol className="mt-12 grid gap-4 md:grid-cols-5">
              {stages.map((stage, index) => (
                <li key={stage.title} className={cardClass}>
                  <p className="font-serif text-3xl text-studio-coral">{index + 1}</p>
                  <h3 className="mt-4 font-serif text-2xl">{stage.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-studio-body">{stage.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="about" className={sectionClass} aria-labelledby="about-heading">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)]">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.16em] text-studio-kicker">About</p>
              <h2 id="about-heading" className="mt-4 max-w-xl font-serif text-4xl tracking-tight sm:text-5xl">
                Experienced in infrastructure. Curious about what comes next.
              </h2>
              <div className="mt-8 space-y-5 text-lg leading-relaxed text-studio-body">
                <p>
                  I am {consultantName}, an {consultantTitle}. I deliver infrastructure design, migration and transformation projects across enterprise, public-sector and regulated environments.
                </p>
                <p>
                  My background combines deep technical experience with the ability to understand complex application dependencies, coordinate delivery teams and translate technical architecture into practical outcomes.
                </p>
                <p>
                  More recently, I have expanded into AI infrastructure and modern application development, building and deploying containerised AI solutions and exploring how AI can improve the way software is designed and delivered.
                </p>
                <p>I enjoy understanding difficult problems, finding practical solutions and taking ownership of delivery.</p>
              </div>
            </div>
            <aside className={cardClass} aria-labelledby="qualifications-heading">
              <h3 id="qualifications-heading" className="font-serif text-2xl">Qualifications</h3>
              <ul className="mt-5 space-y-3 text-sm leading-relaxed text-studio-body">
                {qualifications.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </aside>
          </div>
        </section>

        <section id="curitopia" className="scroll-mt-40 bg-studio-ink px-5 py-20 text-studio-cream sm:px-8 sm:py-28" aria-labelledby="curitopia-heading">
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[auto_minmax(0,1fr)]">
            <Image
              src={withBasePath('/Coral-logo.png')}
              alt=""
              width={96}
              height={96}
              className="size-24 object-contain"
            />
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.16em] text-studio-note-on">Live project</p>
              <h2 id="curitopia-heading" className="mt-4 font-serif text-4xl tracking-tight sm:text-5xl">
                Putting AI Engineering into Practice
              </h2>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-studio-note-on">
                Curitopia is an AI-powered curiosity and exploration application, designed, developed and deployed as a live product.
              </p>
              <p className="mt-4 max-w-2xl leading-relaxed text-studio-note-on">
                It demonstrates practical experience across modern web development, AI integration, application architecture, authentication, persistence, cloud deployment and user experience design.
              </p>
              <a href="/42" className="mt-8 inline-flex items-center justify-center bg-studio-coral px-5 py-3 text-sm font-medium text-studio-ink hover:bg-studio-coral-hover">
                Explore Curitopia
              </a>
            </div>
          </div>
        </section>

        <section id="contact" className={sectionClass} aria-labelledby="contact-heading">
          <div className="mx-auto max-w-6xl">
            <h2 id="contact-heading" className="max-w-3xl font-serif text-4xl tracking-tight sm:text-6xl">
              Have a complex infrastructure challenge?
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-studio-body">
              Whether you need architecture expertise, technical leadership or hands-on delivery support, I&apos;d welcome a conversation.
            </p>
            <a href={`mailto:${contactEmail}`} className="mt-10 inline-flex items-center justify-center bg-studio-ink px-5 py-3 text-sm font-medium text-studio-cream hover:bg-studio-ink/90">
              Discuss a Project
            </a>
            <p className="mt-6 text-sm text-studio-body">
              Email <a className="underline decoration-studio-coral decoration-2 underline-offset-4" href={`mailto:${contactEmail}`}>{contactEmail}</a>
            </p>
          </div>
        </section>
      </main>
      <footer className="border-t border-studio-line px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-studio-body sm:flex-row sm:items-center sm:justify-between">
          <p>{consultantName}. {consultantTitle}.</p>
          <a href="#top" className="underline decoration-studio-line-strong underline-offset-4">Back to top</a>
        </div>
      </footer>
    </div>
  )
}

function SectionIntro({
  eyebrow,
  title,
  headingId,
  children,
}: {
  eyebrow: string
  title: string
  headingId: string
  children: ReactNode
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-sm font-medium uppercase tracking-[0.16em] text-studio-kicker">{eyebrow}</p>
      <h2 id={headingId} className="mt-4 font-serif text-4xl tracking-tight sm:text-5xl">{title}</h2>
      <div className="mt-6">{children}</div>
    </div>
  )
}
