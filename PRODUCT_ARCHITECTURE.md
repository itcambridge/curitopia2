# Curitopia Product Architecture

**Status:** Proposed product direction — not an implementation specification or approval to change the database.  
**Purpose:** Define the product's conceptual structure, responsibilities, boundaries and principles for the next version.

## 1. Product intent

Curitopia helps people stay curious, ask more questions, explore different perspectives, investigate ideas when useful, and turn selected learning into a visual artefact.

The product should make it easy to continue thinking without turning every question into a task or every interesting thought into a separate workspace.

**Product slogan:** Ask. Experiment. Create.

### Core principles

1. **Unlimited curiosity; manageable investigation.** Asking a question must not create an obligation to investigate it.
2. **Keep the user in control.** AI may suggest questions, themes or connections, but the user decides what to keep and what to investigate.
3. **Organisation is optional.** Users can ask questions freely, group them when useful, or start an experiment directly.
4. **Evidence and speculation remain distinguishable.** Concepts, hypotheses, tests, observations and discoveries have different meanings. Do not represent an untested hypothesis as established fact or infer an outcome that was not recorded.
5. **Creation is an output, not a gate.** Users may create a Story from selected questions and experiment items without finishing an experiment first.
6. **Private by default.** Exploration content stays private. Export downloads a file; it does not publish it.
7. **Visuals should invite curiosity, not manipulate.** The vision-board aesthetic should be evocative and memorable, without presenting imagery as evidence or using pressure mechanics.

## 2. Conceptual product layers

The diagram is a mental model, not a compulsory linear funnel. Users may move between layers in whichever order supports their thinking.

### Home — Library of Curiosities

**Responsibility:** Entry point and return point for the user's explorations.

- Continue an existing exploration or start a new one.
- Show useful summary metadata and recent activity.
- Do not force the user to organise or complete an exploration before returning to it.

### Curiosity — capture and expand questions

**Responsibility:** Make asking and connecting questions fast, low-pressure and rewarding.

- Capture questions in Focus or Quickfire.
- Keep the question map and list views in sync.
- Support prioritisation, hiding/restoring, selecting questions and exploring alternative perspectives.
- Provide an optional backdrop Focus Image and simple visibility/dimming controls.
- Offer AI assistance only after an explicit user action and confirmation where required.
- Keep manual question entry fast. New questions receive consistent terminal question punctuation without rewriting their wording.

#### Questions-per-minute gauge

The gauge is intended to encourage free-thinking bursts, not to grade question quality.

**Proposed behaviour:**

- Optional and unobtrusive; the user can ignore or hide it.
- Show a simple rate based on questions successfully added in the preceding 60 seconds. Count only new saved questions, not keystrokes, edits, retries or generated suggestions that the user has not chosen to add.
- Use neutral or encouraging feedback; no target, failure state, ranking, streak, public comparison or quality score.
- Explain, if needed, that the rate is a playful pacing cue—not a measure of intelligence, insight or usefulness.
- Keep the measurement in the active browser session by default; do not persist or compare rates across users or sessions without a separate product and privacy decision.
- Do not allow the gauge to interrupt typing or automatically create questions.

**Validation question:** Does the gauge help users get ideas flowing, or does it make them feel rushed? Test it with users before making it prominent or persistent.

### Themes — optional organisation

**Responsibility:** Help users see clusters and relationships without requiring them to organise everything first.

- Users can create themes manually and group questions.
- AI may suggest themes or groupings, but never silently reorganises the exploration.
- Questions may belong to more than one theme; ungrouped questions remain valid.
- Themes are labels/containers for related inquiry, not separate copies of questions.
- Users can rename, regroup and dissolve themes without deleting the questions they contain.
- Themes should reduce clutter and reveal patterns, not become another administrative workload.

### Experiment — deliberate investigation

**Responsibility:** Develop an idea through structured or lightweight thinking.

- A shared investigation can relate to multiple questions.
- Users can begin an experiment directly from a question or from a theme; using a theme is optional.
- An investigation can contain concepts, notes, hypotheses, tests, observations and discoveries in any useful order.
- Reuse or link relevant existing items rather than requiring duplicate entries.
- Show which questions an investigation supports, while preserving each question's independent identity.
- Distinguish recorded facts, observations, hypotheses and proposed tests.
- Do not require a formal test when a note or conceptual exploration is all the user needs.

**Important architectural change:** the current implementation associates an experiment with one question. Supporting one investigation across multiple questions requires a deliberate relationship-model change; do not solve it with only a visual change.

### Vision — turn selected thinking into an artefact

**Responsibility:** Help users revisit, communicate or share selected parts of an exploration visually.

- Build from user-selected questions and experiment items.
- Support image-led cards/Stories, with concise optional subtitles.
- The current Story workflow creates browser-only drafts and exports a silent portrait MP4 locally.
- The visual metaphor should be stimulating, but imagery is not proof of a claim.
- Exporting is a local download and never automatically publishes or uploads content.
- Future formats such as a static gallery/screensaver may reuse the same selected-content model. They are not required to be built as separate content systems now.

## 3. Supporting capabilities (not extra stages)

These features support multiple layers and should not be represented as mandatory steps:

- **Authentication and ownership:** protect the user's private explorations and stored assets.
- **AI assistance:** question generation, perspective prompts, theme suggestions and image generation; each capability has its own consent, data-minimisation and error behaviour.
- **Focus Image:** an exploration backdrop, with hide/dim controls.
- **Visual design system:** shared dark surfaces, icon menu, consistent sidebars, tooltips, focus rings and workspace layout.
- **Be Present (possible future capability):** if retained, define it as an optional cross-cutting focus mode, not a required stage.
- **Timer:** not currently a core dependency; validate its value separately before adding it.

## 4. Shared interaction and layout model

- The application should share a recognisable shell: brand area, compact icon navigation, optional left controls sidebar, flexible main workspace, and an optional contextual panel where appropriate.
- Do not force every page into identical geometry. The Library, map, experiment constellation and Story preview have different spatial needs.
- Keep controls near the workspace they affect. Tooltips and accessible names are required for icon-only controls.
- The main workspace receives the remaining viewport space; sidebars must not collapse into unreadable strips.
- Scrolling in a long sidebar should not unnecessarily scroll or resize the primary visual workspace.
- Use the existing design tokens/components rather than duplicating styling per page.

## 5. Data and state boundaries

- **Exploration** is the main private context and owns questions, themes and investigations.
- **Questions** are independently addressable content; hiding or prioritising a question does not delete it or alter linked investigations.
- **Themes** group questions through relationships; regrouping must not copy or delete question records.
- **Investigations** can relate to multiple questions and optionally to themes. Their items belong to the investigation.
- **Experiment items** have a typed meaning and may optionally link to another item within the same investigation, using the existing integrity rules.
- **Story drafts** remain transient browser state. Do not add a Story table or Story storage bucket as part of this design direction.
- **Story artwork and video** are generated/assembled for the current browser session and downloaded locally. Do not persist them on the Curitopia server.
- **Focus Images and experiment thumbnails** retain their existing storage and ownership behaviour; do not confuse these with temporary Story export assets.

## 6. AI and safety boundaries

- No AI request occurs simply because a screen opens or a user navigates between views.
- Make AI generation an explicit action; show cost/privacy information before image generation where required.
- Send only the minimum selected content needed for the requested task.
- Never send hidden questions or unselected experiment items to an AI request.
- AI theme grouping must be advisory and reversible.
- AI-generated summaries and images must not fabricate test outcomes, scientific evidence or certainty.
- Keep model calls, secrets and provider-specific operations server-side when the current architecture requires it; keep Story image/video content out of persistent application storage.

## 7. Current implementation versus proposed direction

| Capability | Current understanding | Direction |
|---|---|---|
| Library, questions map/list, Focus/Quickfire, priorities, hiding | Implemented | Preserve and refine |
| Focus Image controls | Implemented | Preserve existing privacy/storage behaviour |
| Experiments and typed experiment items | Implemented; an experiment is currently attached to one question | Evolve the relationship model to allow multiple questions per investigation |
| Themes and question grouping | Proposed in the revised architecture | Design and test before schema migration |
| Questions-per-minute gauge | Proposed | Prototype as an optional, private, non-judgemental cue |
| Story selection/arrangement/review and local MP4 export | Implemented as a browser-only workflow | Preserve; improve iteratively |
| Saved Story drafts, persistent Story storage, public posting | Not part of the approved first release | Do not add without a new decision |
| Gallery/screensaver output, music, narration, public social features | Future ideas | Defer |

This table is an architectural baseline based on the current product direction; verify the repository before making implementation claims in future tasks.

## 8. Decisions to resolve before implementation of the next model

1. Whether theme grouping is manual-first with optional AI suggestions (recommended).
2. Whether an investigation must have at least one linked question or may be started at theme level with no direct question link.
3. Whether investigations may link to multiple themes (recommended as optional, using a join relationship).
4. Exact question-per-minute calculation, display and opt-out. Start with a rolling 60-second count of newly saved questions and test it with users.
5. How existing one-question experiments will be migrated and preserved.
6. Whether any theme grouping or question-rate data is ever persisted beyond the current session.
7. Whether Vision stays a product concept over the existing Story workflow or becomes a named navigation destination.

Do not use this document alone as authority to run a database migration. The entity-relationship model, compatibility plan and user journeys must be reviewed first.
