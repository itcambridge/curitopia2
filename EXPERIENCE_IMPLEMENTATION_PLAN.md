# Experience implementation plan

**Status:** Plan for review, refined for Phase 3b. This phase changes no application code, no migration, and no database.
**Specification:** `EXPERIENCE_SPEC.md` version 0.3. That file is unchanged by this refinement.
**Companions:** `EXPERIENCE_DESIGN_PROPOSAL.md`, `EXPERIENCE_AI_ARCHITECTURE.md`.
**Date:** 2026-11-13

## 1. Documents that are not in the repository

These were requested and are absent. Their contents are not invented here.

- `AI_BEHAVIOUR.md`
- `MVP_SPEC.md`
- `DECISIONS.md`

AI behaviour is instead specified in `PRODUCT_VISION.md` section 10, `USER_JOURNEYS.md`, and `EXPERIENCE_SPEC.md` section 4. `EXPERIENCE_SPEC.md` was not edited. The tensions in section 8 of this plan are recorded here rather than folded back into the specification.

## 2. Current implementation audit

Verified from the repository on branch `feature/experience-foundation`. No database was queried in this phase.

### 2.1 What is implemented

Experience is a screen, not a curiosity stage.

- `app` search params accept `experience`. `CuritopiaEntry` renders `ExperienceScreen` when `curiosity` and `experience=1` are both present, before `CuritopiaApp`. The screen is keyed by curiosity id.
- Entry points are the curiosity card and the studio shell. The shell’s Garden / Visualise / Library destinations do not include Experience, and those links do not call `rememberCuriosityStage`.
- Return uses the curiosity open path and does not force the Garden flag.
- The first explicit open inserts one `experiences` row. A later open reads it. A unique `curiosity_id` plus a retry on conflict keeps a single row. `curiosity_id` is immutable in the migration. The row does not update `curiosities.stage`.
- `north_star` is an optional column in `supabase/migrations/20261113220000_experience_north_star_and_circles.sql`. The person can save, edit, and clear it. Empty wording stores null. The limit is 400 characters, trimmed.
- `experience_circle_items` stores a short `body` in exactly one of `concern`, `influence`, and `control`. The person can add, edit, delete, and move. `experience_id` and `user_id` are immutable. `circle` is the movable field. Phrase length is 240 characters.
- Both migrations enable RLS, owner policies, and a restrictive membership policy. The circle-item foreign key is `(experience_id, user_id)` → `experiences(id, user_id)` with cascade delete.
- Writes go through the browser Supabase client only after `experienceWriteTarget` resolves to `allowed`. The allowlist is `tnohnytbddsbchueghcf`. Production `dacfaoksxfqztnswmnfm` is refused. Missing, malformed, non-HTTPS, credentialed, or non-default-port URLs are refused.
- Local `next dev` reads `NEXT_PUBLIC_SUPABASE_DEV_URL` and `NEXT_PUBLIC_SUPABASE_DEV_PUBLISHABLE_KEY`. Other environments read the production public pair. This split was not changed in this phase.
- Checks cover paths, the write guard, migration text, North Star preparation, circle grouping and moves, and the absence of stage writes. `pnpm typecheck` is the project typecheck. There is no multi-turn AI test because there is no Experience AI.

### 2.2 What the screen actually feels like

`ExperienceMap` is three columns inside one panel. Each column has a heading, a hint, a list of notes, and always-visible Edit, Move, and Remove, plus an add field. The North Star is a separate panel with Write, Edit, and Clear. That matches the specification’s description of a functional foundation that feels like administration. It does not match section 8 of the specification.

The screen shows the map only after `loadExperienceContent` succeeds. If the North Star column or the items table is missing, the person sees a notice and the editors stay hidden. The Experience row can still exist.

### 2.3 What is reusable

- The route, the single Experience row, the write guard, and the owner-scoped reads and writes.
- North Star and circle-item functions as the Keep path. They already refuse to persist on the wrong project.
- Server AI session, authentication, single-flight lock, chat completions, and strict JSON Schema.
- Server-side loading of an owned question by id.
- Question and concept text already stored per curiosity: original wording, considered wording, concept title, and the question a concept represents.
- Manual editing when a model call fails.
- Design tokens, type, focus, and the 44px target. Proposal actions should keep their words, which the design system already allows when an icon would be ambiguous.

### 2.4 What would need to change

- `ExperienceMap` would stop being the primary interface. The Clearing would replace it as the thing `ExperienceScreen` shows after a successful load. The data functions underneath can stay.
- A new `POST /api/experience` and a facilitator prompt. `/api/consider` must not be reused; its prompt only emits an image prompt.
- Proposal state in the page: tentative versus kept. Kept writes call the existing functions. Tentative state must not.
- Context assembly on the server for this curiosity: every developed concept and its provenance snapshots. Unconverted questions are not included. There is no background sample.
- Transcript validation as specified in `EXPERIENCE_AI_ARCHITECTURE.md` section 3.5.
- Copy and controls: permanent per-card Edit / Move / Remove would go away in favour of actions on the selected phrase. Move works in either direction. At most three relationships, each with a written sentence.
- Tests for the response parser, the “no write until Keep” rule, source ownership, transcript rejection, and the write guard on the new route.

### 2.5 Development database, stated and not re-checked

`EXPERIENCE_SPEC.md` section 9.1 says the development environment already has one Experience per curiosity, an optional North Star, and persistent circle items. The Phase 2 work that produced the North Star migration did not apply that migration from this repository; application was left for a separate review. This discovery phase did not inspect the live catalog.

`DATABASE_BASELINE.md`, reviewed 13 November 2026, describes a hosted database with eight public tables, three migration-history rows, and no Experience tables. That history matches the production project this repository has been protecting. It does not describe the later development project, and it does not mention either project ref. It remains the production baseline. It is stale as a description of development if the foundation migrations were applied there afterward.

Before any future migration, inspect the development project’s catalog and migration history. Do not infer that state from `DATABASE_BASELINE.md`, and do not infer it from the presence of SQL files.

## 3. Proposed component and route changes

No file in this list has been changed by this plan.

| Area | Proposal |
|---|---|
| `CuritopiaEntry`, shell, curiosity card | Keep the current entry and return. |
| `ExperienceScreen` | Keep open, resume, the write-target notices, and the manual fallback. After load, render the Clearing instead of the three-column map. |
| New Clearing view | Ground, thread, North Star, one invitation. Composes existing data. Holds tentative proposals and at most three relationships in memory. |
| `ExperienceMap` | Retire from the main path once the Clearing is accepted. Until then it remains the working foundation. |
| `lib/questions/supabase-experience*.ts` | Keep. Call them on Keep and on direct edits only. |
| `app/api/experience/route.ts` | New. Authenticate, guard the project, load owned context, call the model, validate JSON. |
| `lib/providers/` facilitator module | New prompt and schema, beside the existing text helpers, not inside the image-prompt file. |
| Visualise, Garden, Library | Unchanged. |

The page must not import the model client. The key remains on the server.

## 4. Proposed AI API

`POST /api/experience`

Request: curiosity id, experience id, `message`, `turns`. The client may still send selected question ids, selected concept ids, and `includeBackground`. Those id lists do not choose the concept collection.

Server checks, before any provider call:

1. Signed-in user, through the user-scoped server client. No service role.
2. `experienceWriteTarget` is `allowed`. Otherwise return the same class of refusal the screen already shows.
3. The Experience belongs to the curiosity and the user.
4. Every concept for that curiosity is loaded, with `concept_questions` provenance. The questions table is not read. Client-supplied ids do not include, exclude, or rank concepts.
5. `includeBackground: true` is rejected. Unconverted questions are not attached.
6. `turns` passes the role, count, and size rules in `EXPERIENCE_AI_ARCHITECTURE.md` section 3.5. A system or developer role rejects the request.
7. `message` is present, separate from `turns`, and within 2000 characters.
8. `beginAiTurn` for the new endpoint.

Response: the validated object in `EXPERIENCE_AI_ARCHITECTURE.md`, or an error that leaves durable content unchanged. A model source id that was not in the loaded set is dropped from the object.

The client applies structured fields only as tentative UI. `saveNorthStar` and the circle functions run in a later click. A suggested move does not.

Opening Experience, switching curiosity, and focusing a phrase do not POST.

## 5. Data and persistence

### 5.1 Usable now, with no schema change

- One Experience per curiosity.
- One current North Star sentence, within 400 characters.
- Kept phrases in the three circles, within 240 characters, movable by the person.
- Questions and concepts as read-only source material.
- Tentative proposals, the thread, and at most three relationships held in the page for one sitting. The page says the conversation and the connections are held for the visit.
- A kept experiment held in the page for one sitting, with an honest note that it is not stored yet.

The prototype North Star sentence fits the current column. Its elaboration should stay in the thread. Putting both in `north_star` would press the 400-character check. That is a reason to keep elaboration out of the column, not a reason to migrate in the first build.

### 5.2 Application changes required before any new table

- The Clearing UI.
- The facilitator route and parser.
- Keep / Edit / Leave wired to the existing writes.
- Tests listed below.

### 5.3 Database changes that look necessary later

These are needs, not a migration. Do not add them before the Clearing has been tried against the reference journey.

| Need | Why it is not free today | When |
|---|---|---|
| Thread turns | A refresh drops the conversation. The specification wants a return without losing context. | After one sitting proves which fields are worth keeping. Store role, text, and authorship. Owner RLS. Cascade from the Experience. |
| Experiments | A kept invitation has no table. | After The Constructive Challenge has been judged on screen. Store name, why, source ids, approach, and the person’s wording. No status, due date, or reminder. |
| Phrase relationships | A sentence between phrases has nowhere to live. Phase A holds at most three for the visit. | Only if those sentences prove useful. A small edge between two phrase ids, with the allowed pair types only. Not a graph product. |
| Confirmed readings | A kept insight that is not a North Star or a phrase has no column. | Only if people keep readings as objects. Otherwise the thread is enough. |
| North Star history | The column stores the current sentence. | The specification allows revision. History can wait. |
| Agency-shift history | The current circle is the record. | A suggestion does not need history. A later reflection might. |

`themes` and `theme_questions` are not circles. Do not reuse them.

Candidate versus adopted can be a column or a separate table later. Until then, the database holds only adopted North Stars and phrases, which matches the rule that hypotheses are not stored as the person’s content.

### 5.4 Deferred on purpose

- Multiple source curiosities inside one Experience. The unique Experience row stays one-to-one with a curiosity. Cross-curiosity material would be an explicit selection, with server checks, and it is a product decision still open in specification section 12.
- Vector search, embeddings, agent runtimes, and a second model vendor.
- Calling `reserve_ai_request`.
- Sending concept images to the model.
- Conversation on production. The write guard stays in place. Production schema stays untouched.

## 6. Testing strategy

Extend the current `node --experimental-strip-types` checks. Do not require a hosted database.

- Parser: accepts a fixture shaped like the reference moves, and drops an unknown circle, an oversized phrase, an oversized North Star, a disallowed link, a shift without a reason, and a source id that was not loaded.
- Keep path: a candidate object is not passed to the save functions. A Keep action calls `saveNorthStar` or `addCircleItem` with the edited wording. A shift confirmation is the only path to `moveCircleItem` for a suggestion. Either direction is accepted by that path.
- Context builder: the payload contains every concept of the open curiosity and its provenance snapshots. An unconverted question is absent. A concept from another curiosity is absent. Image paths are omitted. A missing snapshot is not filled from a live question.
- Transcript: a `system` or `developer` role, a 21st turn, a 2001-character message, and a missing `message` each reject before a provider call. The latest statement is the `message` field.
- Route guard: a production URL and a missing URL return before any provider call. This can be a pure function test around the existing `experienceWriteTarget` check in the route’s source.
- Screen source: no `rememberCuriosityStage`, no call on first render, Garden / Visualise / Library destinations unchanged.
- Manual path: the Clearing still exposes direct North Star and phrase editing when the route returns an error.
- Relationships: a fourth link is refused while three remain; the written sentence is present for each kept link; removing a phrase removes its links.
- Reference fixture: the opening contractor paragraph plus a recorded facilitator fixture renders a reading, a tentative North Star, tentative phrases, and one named invitation, without marking them kept. The screen stops at the unanswered disagreement choices.

A signed-in pass on the development project comes after implementation, not in this phase. It should walk the reference journey once, refuse a second overlapping request, and show a provider failure without clearing kept phrases.

## 7. Suggested implementation phases

Each phase waits for review. None of them is started by this document.

**Phase A. Clearing, still manual.** Implemented in the application. The ground, the optional North Star, on-demand actions, and at most three visit-only relationships replace the three-column editor. North Star and phrases persist through the current functions. No model call. Review against the criteria in section 7.1.

**Phase B. One facilitator turn.** Add the route, the schema, transcript validation, and the curated concept collection. Tentative proposals appear on the ground. Keep writes on confirmation. The thread lives in the page and is sent back as untrusted `turns`. Use the reference opening as the manual test script. Unconverted questions are not attached.

**Phase C. Experiment invitation.** Render one invitation and its reason. Keep it in the sitting. Judge it against The Constructive Challenge: specific, optional, and explained. A source id is shown only when the server loaded that record.

**Phase D. Reflection.** When the person describes a try, allow a suggested move in either direction. Show the current circle, the proposed circle, and the reason. The phrase moves only after confirm. Offer a new Garden question only if they ask to plant it.

**Phase E. Persistence review.** Only if A–D are convincing, propose a migration for turns, experiments, and relationship edges against the development project, after a fresh catalog inspection. Production remains out of scope until a separate approval.

### 7.1 Phase A acceptance criteria

Phase A has no AI. A reviewer can observe the following on the development project, or against the existing local checks where no database is required.

1. **One situation.** At 375px and at the large breakpoint, Concern, Influence, and Control are visible together inside one frame. A reviewer can point to a single ground, not three separate lists with their own panels.
2. **Sparse at rest.** With several phrases saved, Edit, Move, Remove, and Link are absent until a phrase is selected. Selecting one reveals them. Leaving the selection hides them again.
3. **Add.** The reviewer adds a phrase to each circle. After refresh, those three phrases are in the same circles. The curiosity stage value is unchanged.
4. **Edit.** Changing a phrase’s wording and saving it shows the new wording after refresh. The other phrases are unchanged.
5. **Remove.** Removing a phrase removes it after refresh, and removes any visit-only relationship that named it.
6. **Move either way.** Moving a phrase from Concern to Control, and another from Control to Concern, each asks for confirmation and shows the destination’s one-line meaning. After confirm and refresh, each phrase is in the circle confirmed. Cancel leaves the first phrase where it was.
7. **Why it sits here.** Selecting a phrase shows its circle name, the words “for now”, and that circle’s one-line meaning. The meaning is readable without inferring it from colour alone.
8. **Relationships.** The reviewer links an influence to a concern and a choice to an influence. Each link is a full sentence on the page. A third link can be added. A fourth cannot, and the page says three connections are already on the ground. A concern cannot be linked directly to a choice. On a wide screen, lines appear only while a linked phrase is selected. At 375px there are no lines, and the sentences remain.
9. **Visit limit.** Refresh restores phrases and the North Star. It does not restore relationships. Before refresh, the page states that connections are held for the visit.
10. **North Star.** The reviewer can leave it empty, save a sentence, edit it, and clear it. An empty Experience still opens. The sentence survives refresh. Clearing it leaves the phrases in place.
11. **Empty.** With no phrases, the three named bands and their one-line meanings are still visible, each saying “Nothing here yet.”
12. **Loading.** While the Experience loads, the previous curiosity’s phrases are not visible.
13. **Wrong project.** With a refused or production target, the landscape editors are absent and the existing notice is shown. No phrase is written.
14. **Neighbours.** Garden, Visualise, and Library open as before. Experience is still outside the stage destinations. Return leaves the curiosity’s saved stage as it was.
15. **No model.** Loading, adding, editing, moving, and linking produce no request to `/api/experience`, `/api/consider`, `/api/titles`, or `/api/images`.

## 8. Risks, dependencies, and unresolved decisions

**The model may coach generically.** The reference transcript is the acceptance test. A reply that could fit any workplace fails, even if the JSON is valid. Mitigation: the prompt, a fixture, and a human reading of one real development-project sitting.

**The Clearing slides back into columns.** Mitigation: Phase A is visual and manual, so the layout can be rejected before the route exists. Phrases at rest have no admin controls.

**Context crosses a curiosity.** Mitigation: server-side loads, discard of ids that are not in the opened curiosity, no default attachment of the latest questions, and a test with two fixtures. The browser transcript is untrusted and cannot supply system instructions.

**A sitting forgets the thread and the relationships.** Accepted until Phase E. The page says the conversation and the connections are held for the visit. Kept phrases and the North Star reload.

**North Star elaboration does not fit the column.** Store the sentence only, until a reviewed change.

**Facilitation costs more than a title call.** One completion, single-flight, no call on open. Spend remains the existing manual account control. No new limiter in this plan.

**`beginAiTurn` is per process.** Already true for images and titles. A second instance could overlap. Out of scope unless Experience is deployed on more than one server.

**Design-system tension.** Icon-only buttons are the default. Keep, Edit, and Leave need words. The design system already allows words when the icon would be ambiguous. Use text actions for proposals.

**Specification versus baseline.** Section 9.1 of the specification describes development data this plan did not re-query. `DATABASE_BASELINE.md` describes an earlier hosted catalog without Experience tables. Implementation must inspect development before relying on either sentence.

**Prototype transcript versus section 10.** `Original_test_md` includes a dream-and-tunnel parallel and ends by offering situations the person does not answer. Section 10 does not require the dream parallel. The plan treats it as an optional tangent and does not add dream interpretation. It does not invent the person’s choice among the offered situations.

**One Experience and many curiosities.** Left open, as in specification section 12. The plan keeps one Experience per curiosity for the first build.

**Dependencies.** A development project that actually has `experiences` and `experience_circle_items`, a server text model and API key in the development environment, and the existing sign-in. This phase did not confirm those runtime facts.

## 9. What this phase did not do

This refinement updated the three proposal documents only. No application file, migration, environment file, Git branch, package, Docker stack, or Supabase project was changed. `EXPERIENCE_SPEC.md` was not edited. No database was queried.
