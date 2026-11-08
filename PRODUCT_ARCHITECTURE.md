# Curitopia V2 — Product Architecture

**Status:** Updated working architecture for the continuous exploration model. Product intent and quality criteria are in `PRODUCT_VISION.md`; experience principles are in `Curitopia_Garden_Experience_Framework.md`.  
**Journeys and entities:** `USER_JOURNEYS.md`, `ENTITY_RELATIONSHIP_MODEL.md`.  
**Important:** This is an architecture specification, not approval to apply SQL, change the hosted database, alter V1, or deploy application changes.

## 1. Design driver

Curitopia is a visual-thinking environment. A person captures questions, visualises one when they choose, and brings saved concepts together to discover relationships and new questions. The product should optimise for the moment when one representation changes how the person understands another.

The application is not organised as a staged pipeline. Its primary surfaces are:

1. **Garden:** capture and revisit questions within a curiosity.
2. **Visualise:** a contextual action from a question, for generating and selecting a visual interpretation.
3. **Library of Curiosities:** an account-wide collection of saved concepts, for revisiting, comparing, and recording connections.

There are no dedicated Curate or Distil stages. Question parking, discard, restore, and branching live in the Garden. Retitling a saved concept and editing its contributing questions live in the Library. A stored curiosity stage of `curate` opens the Garden, and a stored stage of `distil` opens the Library. New navigation writes only `gather`, `visualise`, or `library`.

A person can stop after capture, reject all image candidates, save a concept, compare existing concepts, or follow a new question. No action implies completion.

## 2. Architectural principles

1. **Question capture is independent.** Preserve original text and allow direct exploration without curation, themes, or investigation.
2. **Visualisation is contextual and explicit.** It is launched from a question. Opening a page does not generate images.
3. **Natural selection.** Candidate images remain temporary; only a user-selected image with a valid title becomes a saved concept.
4. **Concepts are independent records.** Do not store an image as a field on one question. Preserve many-to-many provenance to source questions.
5. **Concept cards are composed at presentation time.** Keep original image bytes unchanged; render title and represented question as accessible text overlays.
6. **Comparison is central.** Allow the user to select concepts from different curiosities and view them side by side with their context.
7. **Connections are user-authored.** The user chooses the pair and decides what, if anything, to record.
8. **No automatic interpretation.** AI may help only when requested; suggestions are not conclusions.
9. **Saved is not complete.** Concepts can be revisited, retitled, reinterpreted, compared, and connected.
10. **Private by default.** Preserve owner isolation, RLS, private storage, and server-side secrets.
11. **Additive change.** Preserve existing V2 data and do not remove legacy columns until their use and migration history are audited.

## 3. Product surfaces and responsibilities

### Garden

The Garden shows a person's curiosities and their questions. A curiosity is a persistent context, not a task, session, or stage. Questions retain their original wording and any optional considered wording.

Responsibilities:
- Create, rename, open, and switch curiosities.
- Capture raw questions quickly.
- Keep questions visible and easy to revisit.
- Open Visualise directly from a question.
- Retain lightweight edit/park/restore/remove actions only where useful.
- Preserve existing branch behaviour between independent questions where it exists; keep it distinct from merge semantics.

The Garden must not force a Keep/Park/Discard curation ceremony before Visualise. Existing `disposition` values are persisted data and must not be deleted as part of a UI refactor. Their ongoing user-facing role should be assessed separately.

### Visualise

Visualise is a contextual workspace opened from a question. It may include an optional question-refinement action, a prompt context display, image generation, and candidate selection.

Responsibilities:
- Show the original question and the exact generation wording.
- Allow the person to use the original wording or refine it without overwriting the capture.
- Generate 1, 2, or 4 distinct image interpretations after an explicit action. The default is 1 image until the person chooses otherwise. The last choice is stored in this browser, not in the account.
- Request each image separately. Show the first finished image immediately, then add each later image as it returns. One provider call is in flight at a time.
- Compare candidates at a useful size.
- Keep candidates temporary.
- Keep successful images when one image fails, and let that image be requested again on its own.
- Allow reject/regenerate/leave-without-save.
- Offer Save for a selected candidate, with title entry inline.

The Visualise screen sends one `POST /api/images` for each requested image, with the accepted prompt, one metaphor direction (`tension`, `trace`, `scale`, or `relation`), and the id of that generation run. The route can still generate every direction inside one request when no direction is sent, but the screen does not use that batch. The account accepts one image request at a time, so the screen waits for each image to finish before requesting the next. The first image is therefore shown on its own, and a later image does not compete with it. While a request is open, the screen counts down from 30 seconds for that image only. The remaining time is taken from the clock at the start of that request, so a hidden browser tab does not make the count drift. The count stops when the request succeeds, fails, or is discarded, and a returned image is shown immediately. At zero the number stops, the screen says “Taking a little longer than usual…”, and generation continues. Spending is left to the OpenAI account. Saving the selected image does not start any further image in that run. A request already sent may still finish and be charged; its result is not applied to the saved concept or put back into the draft.

No separate Distil page or route exists in the target UX. A selected image does not automatically become a Library record.

### Save concept interaction

Saving is the point at which a candidate becomes a concept.

Required inputs:
- Selected original artwork.
- User-confirmed title satisfying the existing one- or two-word rule.
- Exact wording used to generate the image (`for_considered_text`).
- Source-question links and wording snapshots.
- Image model and prompt version metadata.

Optional input:
- An explicit request for title suggestions. Suggestions are temporary and user-selected or edited; they never overwrite manual text.

The title field appears in the save interaction. If the image has no valid title, saving is blocked with a clear inline validation message, but manual entry is always available. A title request failure does not block saving a manually entered valid title.

### Library of Curiosities

The Library reads the signed-in user's concepts. Library scope chooses All curiosities or one curiosity, and that choice is independent of the curiosity open in the Garden. Browsing loops inside that scope: the concept after the last is the first, and the concept before the first is the last. Changing scope starts again at the first concept in the new collection. Comparison follows the same scope but does not loop a carousel. Discarding a question removes it from active Garden exploration and leaves it restorable. Saved concepts whose originating question is discarded leave the Library, its carousel, its counts, and comparison until that question is restored. The records themselves stay: the concept, image, title, generation prompt, and provenance are not deleted, and restoring the originating question brings the concepts back without saving them again. An additional contributing question does not hide a concept while its originating question remains active. A concept whose live originating question is gone, and only a wording snapshot remains, stays visible. All curiosities can place concepts from different curiosities side by side. One curiosity limits both comparison slots, search, and replacement to that curiosity. Changing Library scope keeps an open pair only when both concepts still belong to the new scope. A concept outside that scope leaves the comparison, and the remaining concept stays selected when there are still at least two concepts to choose from. A curiosity with fewer than two visible concepts explains that comparison is not available there. Comparison never offers a concept hidden by Library scope or by a discarded originating question.

Responsibilities:
- Show concept cards with title at top, artwork centrally, and generation question at bottom.
- Keep the original image file unchanged; use application-rendered overlays.
- Show all contributing source questions and wording snapshots in concept details.
- Support retitling the same concept.
- Select two concepts for side-by-side comparison.
- Let the user explicitly record an insight/connection or create a new question from it.
- Keep the collection open-ended; never display completion states.

### Side-by-side comparison

Comparison should initially focus on two concepts at a time. When Library scope is All curiosities, the selected concepts may belong to different curiosities. When Library scope is one curiosity, both concepts belong to it.

The comparison surface displays each concept's image, title, and represented question. Users can swap/reorder the two, revisit source-question details, and optionally use reflection prompts. The experience must not assume the relationship is visual similarity: it may be a conceptual connection, contrast, tension, analogy, or a new question.

The comparison itself can be transient. If the person leaves without recording anything, no database write is required. A saved connection is a separate explicit action and is not implemented. The current comparison keeps the selected pair and any reflection in memory only. The person can turn that reflection into an ordinary question in a curiosity they choose. That uses the existing question insert and does not move, copy, or connect the compared concepts.

## 4. Concept presentation contract

Each saved concept is represented in the interface as:

```text
┌──────────────────────────────────────────┐
│                 TITLE                    │  ← one or two words
│                                          │
│                                          │
│             ORIGINAL ARTWORK             │
│                                          │
│                                          │
│       Exact question represented         │  ← generation wording
└──────────────────────────────────────────┘
```

This is a presentation contract, not a new raster format or table.

- `concepts.title` supplies the top overlay.
- `concepts.image_path` supplies the original artwork.
- `concepts.for_considered_text` supplies the bottom question overlay.
- `concept_questions` supplies contributing-question provenance and snapshots.

Render overlays using application typography/DOM or an equivalent accessible presentation layer. Do not ask the image model to render the title or question. Do not modify the stored original image when showing it in the app. For a future download/share image, create a separate flattened export from the original plus overlays; do not replace the source file.

If a legacy concept lacks a usable `for_considered_text`, the UI must show an honest fallback such as “Question not recorded” or hide the question overlay with a clear indication. It must not invent or silently substitute a later question.

## 5. Data boundaries and existing V2 model

The supplied entity model describes the initial V2 account model. It identifies these core records:

- `questions`: owner, curiosity, original text, optional considered text, disposition, and legacy merge pointer.
- `concepts`: owner, curiosity, title, `for_considered_text`, original image storage path, model, and prompt version.
- `concept_questions`: many-to-many provenance from a concept to questions, including wording snapshots.
- `themes` and `theme_questions`: optional question grouping.
- `curiosities`: named user workspaces, subject to the migration-status caveat below.

One question may inform many concepts. One concept may be informed by many questions. A concept does not require its source question to remain live; provenance snapshots keep the historical context. Editing or parking a source question does not rewrite a saved concept.

### Migration-status caveat

The supplied `ENTITY_RELATIONSHIP_MODEL.md` states that `supabase/migrations/20261028173000_curiosities.sql` adds curiosities and had not been applied at the time that document was written. Subsequent Curitopia 2 work includes curiosity cover images. Do not rely on that old status without checking the current repository and hosted Supabase migration history. No migration status is inferred or changed by this document update.

The prior proposal that stored images directly on `questions` is withdrawn and must not be used. V1 is outside this repository and remains untouched.

## 6. Proposed concept-connection model

`concept_questions` describes provenance between a concept and its source questions. It must not be repurposed to mean that two concepts are connected.

The target product supports an explicit user-recorded relationship between two existing concepts. A minimal additive model to review is:

### `concept_connections` — proposed, not deployed

| Field | Purpose |
|---|---|
| `id` | Connection identifier |
| `user_id` | Owner; both concepts must belong to this user |
| `concept_a_id` | First concept in the pair |
| `concept_b_id` | Second concept in the pair |
| `note` | Optional user-authored explanation or observation |
| `created_at` / `updated_at` | Record timestamps |

Model rules to review before implementation:
- A connection is undirected: A–B is the same pair as B–A.
- A concept cannot be connected to itself.
- Store each pair once per owner (canonical ID ordering or an equivalent uniqueness strategy).
- The two concepts must belong to the same user, but they may belong to different curiosities.
- The note is optional and user-authored. AI suggestions are not stored unless the person adopts or edits them.
- Deleting a connection must not delete either concept.
- Deleting a concept must remove or safely detach connections involving it; choose explicit FK behaviour in the migration design.
- RLS must enforce owner access and prevent cross-owner links.

A question created from a connection is a new, ordinary question in a curiosity chosen by the person. Whether to store a direct `resulting_question_id` on the connection is an open implementation detail; do not add it until the navigation and deletion behaviour are designed.

This proposal is sufficient to guide a schema review. It is not approval to create a migration, and the first UI comparison can be validated without persistent connection records.

## 7. Question relationships and legacy state

The older data model records merge using `questions.merged_into_id`. A merge is not the same as a branch between two independent questions. Curitopia 2 has also used a Branch interaction to create a saved link between separate questions. Inspect current source and deployed migrations to identify its actual persistence representation before modifying it. Never overload `merged_into_id` for an independent branch.

The existing question `disposition` values (`gathered`, `retained`, `parked`, `discarded`) are not stages. They are persisted legacy state. The new UX must not require a disposition change before a question can be visualised. Do not remove or reinterpret stored values without a separate data audit.

The `stage` field mentioned on curiosity records is legacy navigation state if present. It should no longer drive a required stage-based journey. Do not drop it in the same change as the UX refactor; first confirm actual use and migration state.

## 8. Optional supporting capabilities

### Themes

`themes` and `theme_questions` remain optional groupings. They do not own images or concepts and are not prerequisites for any primary interaction.

### The Lab

Investigations remain a possible later feature. They may contain notes, hypotheses, tests, observations, discoveries, and written thoughts. A Lab item of kind `concept` is not a Library visual concept and does not own an image. The Lab is not a primary navigation step or a gateway to image generation or concept comparison.

### Storytelling

Any future storytelling should be built from saved concepts and their composed title/question presentation. It is not a reason to preserve an older slide/MP4 architecture.

## 9. AI boundaries

- No model call is implied by navigation, typing in the Garden, viewing the Library, opening a concept, or selecting a pair.
- Question help receives only the relevant question text and minimum context. The original capture is never overwritten automatically.
- Image generation receives the exact question to be represented and, where useful, the original wording as secondary context. Do not send the full workspace or unrelated concepts.
- Title suggestions are requested explicitly from the save interaction. They are separate from image generation and do not incur an image-generation request.
- Comparison perspectives are requested only after the user asks. Send only the selected concepts and necessary question context. Do not provide unrelated workspace data.
- AI output is a suggestion. The person accepts, edits, rejects, or ignores it.
- Do not describe AI output as a fact, proof, experiment, observation, or discovery unless it has been independently established.
- Keep provider secrets server-side. The browser uses the signed-in user's session; do not use a service-role key in client code.
- If the configured text model's image-input capability is not verified for the selected file format, do not send the image. Wording-only fallback must remain functional.

## 10. Quality and test strategy

Tests need to cover both persistence correctness and the new discovery experience.

### Garden and question tests

- Empty or whitespace-only capture is rejected.
- Original text is preserved exactly.
- Question refinement does not overwrite original text without an explicit user action.
- A question can be visualised without prior keep/curate/theme/Lab steps.
- A question can remain in the Garden when no image is saved.
- Park/restore and existing Branch behaviour work without blocking Visualise.

### Visualise and save tests

- No image generation occurs on page open or question capture.
- Generation requires an explicit action.
- A new browser starts at 1 image. Choosing 2 or 4 is remembered for the next request. Each image is requested on its own, shown when it returns, and a failed image can be retried without removing the images that succeeded. A result for a different prompt is ignored.
- Candidates are visibly distinct and large enough to judge.
- Rejected candidates are not stored as concepts or uploaded to the private Library bucket.
- Save requires a selected image and a valid one- or two-word title.
- A failed title suggestion does not block manual save.
- Retitling updates the existing concept.
- Original image bytes are preserved; overlays do not mutate the stored file.
- The title is displayed at the top and the exact generation wording at the bottom.
- Editing a live source question does not rewrite the saved concept's represented wording or provenance snapshots.

### Library and comparison tests

- The Library can retrieve concepts across a user's curiosities.
- The user can select two concepts from different curiosities when Library scope is All curiosities.
- A single-curiosity Library scope limits selection, search, and replacement to that curiosity. Changing Library scope drops a concept that is no longer in scope.
- Both images, titles, and generation questions remain visible together.
- The pair can be swapped or exited without saving a connection.
- A connection/note is persisted only after explicit user action and is owner-scoped once that schema is approved.
- A new question from a comparison keeps its own wording and does not rewrite either concept.
- There is no completion state or score.

### Security and storage tests

Preserve the deployed model's ownership, RLS, composite foreign keys, private image paths, allowed MIME types, size limits, and Storage API cleanup behaviour. Verify live migration state before running persistence tests or changing policy. The source architecture's smoke checks are a starting point, not proof that a hosted test has passed.

## 11. Release order

1. Audit current code, routes, schema, migrations, storage, and tests.
2. Replace stage navigation with Garden and Library; launch Visualise from questions.
3. Implement concept-card title/question overlays while leaving source artwork unchanged.
4. Move title entry and optional title help into the save action.
5. Make the Library a user-wide collection and allow cross-curiosity selection.
6. Build a two-concept comparison experience and validate it with real use.
7. Add explicit connection recording after the proposed model has been reviewed and approved.
8. Remove legacy Curate/Distil routes and unused code after confirming their data and useful behaviours are preserved.
9. Defer theme screens, the Lab, broader canvases, and storytelling until they add demonstrable value.

Do not use a product-document update as permission to run SQL or deploy. Do not treat a successful persistence test as proof that images or comparisons are meaningful.
