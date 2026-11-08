# Curitopia Key User Journeys

**Status:** Updated journeys for the continuous exploration model.  
**Experience framework:** `Curitopia_Garden_Experience_Framework.md`.  
**Product scope and image quality:** `PRODUCT_VISION.md`.  
**Technical boundaries and entities:** `PRODUCT_ARCHITECTURE.md`, `ENTITY_RELATIONSHIP_MODEL.md`.

Curitopia is not a four-stage wizard. Its primary surfaces are the Garden, contextual Visualise, and the Library of Curiosities. A person can move between them freely. Saving a concept does not complete it. Comparing concepts does not require saving a connection.

## Shared rules

- A question's original wording remains available after optional refinement and after a merge.
- A person can visualise a question directly, without keeping, curating, merging, theming, or investigating it first.
- Opening a screen is not a request to an AI model. Capturing a question does not call a model or generate an image.
- AI writes nothing until the person accepts, edits, or supplies the text themselves.
- A person can stop at any point. A question that does not become an image remains part of the Garden.
- Image candidates are temporary. Only the selected image becomes a saved concept.
- A concept requires an image and a user-confirmed title of one or two words. Naming occurs inline during Save, not in a separate Distil stage.
- The saved concept card shows its title at the top, artwork in the centre, and exact generation question at the bottom.
- The title and question are application-rendered overlays; the original image stays unchanged.
- The represented question is the wording sent to generate that image. Later edits to the live question do not silently alter the concept.
- A concept may have several source questions. Its generation question remains the displayed primary question; additional provenance remains accessible.
- The Library can compare concepts from different curiosities. The person chooses which concepts to compare.
- A comparison can be left without saving anything. A recorded connection or note is explicit and user-directed.
- The workspace, Library, questions, concepts, and stored images are private to their owner.
- Counts are counts, not scores. The garden does not wither when a person pauses.

---

## Journey 1 — Capture a curiosity

### Intent

The person wants to capture an unfinished thought quickly, without having to refine or categorise it first.

### Entry

The Garden for an existing curiosity, or the list of curiosities after sign-in.

### Happy path

1. The person opens an existing curiosity or creates a new one.
2. They type a question in their own words.
3. Pressing Enter adds the question and clears the input for another thought.
4. The question appears in the Garden using its original wording.
5. The person can capture more questions, open one to explore, or leave and return later.

### Guardrails

- Empty or whitespace-only captures are not saved.
- Capture does not trigger AI refinement or image generation.
- Curitopia does not rewrite the capture into a tidier question.
- No Keep, Park, Discard, Merge, Theme, or Lab action is required before visualisation.
- Lightweight question management may be available, but it does not become a curation stage.

### What good looks like

- A person can capture several thoughts without losing momentum.
- The wording still sounds like the person who wrote it.
- The Garden feels like a safe place for unfinished thoughts, not a list of work to complete.

---

## Journey 2 — Visualise a question and save a concept

### Intent

The person wants to explore what a question might look like, select an image that helps them think about it, and preserve that visual concept if it is worth returning to.

### Entry

A question in the Garden, or an existing question opened from another part of the app.

### Happy path

1. The person chooses **Visualise** from a question.
2. Curitopia shows the original question. The person may use it unchanged or optionally refine the wording. The original capture remains intact.
3. Curitopia makes clear which exact wording will be sent to image generation.
4. The person chooses 1, 2, or 4 images and explicitly requests them. A first visit starts at 1 image. The last choice is remembered in this browser.
5. Curitopia shows that the image is being created. Each image request, including one tried again, starts its own countdown at 30 seconds and decreases it once per second. The supporting line reads “Usually around 30 seconds. Sometimes quicker!” A finished image is shown immediately, even when time remains on the countdown. If the request is still running at zero, the number stops, it does not go negative, and the line changes to “Taking a little longer than usual…” while generation continues. One image is the quickest look. Two images offer a couple of interpretations. Four images explore a wider range, and they can differ in concept or metaphor.
6. The person can select a finished image while later images are still being created. They can hide an image, try a failed image again without losing the others, request another set, or leave without saving.
7. If one image is worth keeping, the person selects it and chooses **Save concept**.
8. The save interaction presents a title field. The person writes a title of one or two words, or explicitly asks for optional title suggestions and adopts/edits one. The person's final wording is authoritative.
9. Curitopia validates the title and saves the original selected artwork, the title, the exact generation wording, model/prompt metadata, and links to the source questions.
10. The saved concept appears in the Library with its title rendered at the top, original artwork in the centre, and exact generation question at the bottom.
11. The person may continue exploring, return to the Garden, compare the new concept with another, or leave.

### Guardrails

- Image generation requires a fresh explicit action.
- The first finished image is shown without waiting for the rest of the requested set, and without waiting for the countdown to reach zero. The countdown belongs only to the request in progress. After zero, the screen says “Taking a little longer than usual…” and keeps waiting. A failure stays on that image, and the successful images remain. A result is kept only for the question and prompt that requested it.
- A considered question is optional refinement, not a separate stage. If the existing implementation still requires it, assess that dependency before removing it; do not silently change the text sent to generation.
- The exact wording that generated the image is retained as the concept's represented question.
- The generated image is an interpretation, not evidence or a verdict on the question.
- A title is one or two words, with one word valid and two the maximum. Enforce the existing 40-character/one-ordinary-space database rule.
- A title is required to save a concept; an invalid or blank title produces inline validation. Manual title entry remains available even if AI title help fails.
- Title suggestions are optional and requested only by the person. They are not stored until adopted and saved.
- Title help does not call image generation.
- The model must not render title/question text into the source image. The application creates text overlays.
- The source image file remains unchanged. A future flattened export is a separate derivative.
- Rejected candidates are not Library concepts and are not uploaded to the concept storage bucket.
- Saving another selected image creates another concept unless a separately approved replace interaction is implemented.
- Editing, parking, or removing a source question does not rewrite or delete an existing concept. Discarding the originating question hides its saved concepts from the Library until that question is restored. Discarding an additional contributing question leaves the concept visible. Neither action deletes the concept, its image, or its provenance.

### What good looks like

- The person can go from a raw question to image candidates without an administrative stage.
- An image that arrives before 30 seconds appears at once. A longer wait is explained rather than left looking stuck.
- The images feel like thoughtful interpretations rather than stock illustrations.
- The person can reject all images without being made to feel that the question failed.
- The saved concept is self-contained: its title and represented question travel with the artwork.
- The title is memorable and meaningful beside other concepts.

---

## Journey 3 — Compare concepts and discover a connection

### Intent

The person has two concepts and wants to see what becomes visible when they are considered together. The concepts may represent different questions. They may belong to different curiosities when Library scope is All curiosities. When Library scope is one curiosity, both concepts come from that curiosity.

### Entry

The Library of Curiosities.

### Happy path

1. The person chooses a Library scope, then selects two concepts from the concepts that choice includes. Curitopia does not choose the pair. If Library scope changes, a concept that no longer belongs to that scope leaves the comparison. A pair that still belongs stays open. A curiosity with fewer than two saved concepts explains that there is nothing there to compare, and Library scope can be returned to All curiosities.
2. Curitopia places the concepts side by side at a useful size.
3. Each concept displays its title at the top, original artwork in the centre, and the original user-authored question at the bottom. The image-generation prompt is not shown as that question.
4. The person looks at the concepts together. They may notice a resemblance, shared structure, analogy, tension, contradiction, dependency, or a completely new idea.
5. They can swap or reorder the concepts and inspect the source questions that informed each.
6. Optional reflection prompts may be offered, such as:
   - What do you notice when these are together?
   - What does one make you notice about the other?
   - Where might these ideas overlap?
   - What is different or in tension?
   - What new question appears only when you consider both?
7. The person can leave the comparison without recording anything. Looking and thinking is a complete use of the feature.
8. The reflection written beside the comparison is not stored. If they want to preserve what emerged as a relationship between the two concepts, that waits until connection persistence is implemented.
9. They may turn the reflection into a new question and choose which existing curiosity receives it. Curitopia saves that question only when they confirm.

### Guardrails

- This is a comparison of the concepts represented, not only an image-similarity feature.
- The original title and question context stay visible throughout.
- The user chooses the pair; no automatic ranking or pairing.
- Comparison follows the selected Library scope. Cross-curiosity comparison is available when All curiosities is selected.
- Do not tell the person that two concepts are scientifically or causally related merely because their images appear similar.
- AI readings are suggestions, only on request. The user may accept, edit, reject, or ignore them.
- A new note or connection is not saved until explicit confirmation.
- A new question is the user's own wording and does not rewrite either source concept.
- Concepts are not merged by comparison and are never marked completed.
- The first version should make a two-concept comparison excellent. A larger canvas is a later decision.

### What good looks like

- The two concepts can be understood without returning to the conversation that created them.
- Their images, titles, and generation questions are legible together.
- The person notices something they had not previously considered.
- Curitopia makes room for the person's insight rather than supplying a premature interpretation.
- The comparison remains useful even when the person saves nothing.

---

## Journey 4 — Record a connection or plant a new question

### Intent

The person wants to preserve an insight that emerged from comparing two concepts, or use it to start another line of curiosity.

### Standing

The experience is a core product direction. Persistent concept-to-concept connection storage is proposed in `ENTITY_RELATIONSHIP_MODEL.md` and is not yet part of the deployed schema described by the original architecture.

### Happy path

1. From a comparison, the person chooses **Record connection**.
2. They may write an optional note describing what they see. A note is not mandatory; the person may simply save that the two concepts are connected.
3. Curitopia stores the selected pair and the user's note only after explicit confirmation and only after the connection model is implemented.
4. The connection can be opened from either concept, preserving the context of the pair.
5. Alternatively, the person chooses **Turn into a question**, edits the wording they want to keep, and confirms. This is available now and does not create a connection.
6. They choose the curiosity in which the new question belongs. The question becomes an ordinary Garden question with its own original wording.
7. They can continue from that question into Visualise, or leave it for later.

### Guardrails

- A comparison alone does not create a persistent connection.
- The user's words are the source of truth for a saved observation.
- AI suggestions are not saved unless the person adopts or edits them.
- A resulting question does not silently become a source question for either existing concept.
- The connection must not delete, merge, or otherwise mutate either concept.
- A connection may span concepts from different curiosities, but it must remain within one account owner.

### What good looks like

- The person can preserve a relationship without maintaining a complex knowledge graph.
- A connection always points back to the two concepts that prompted it.
- A new question can start a new exploration while retaining the user's authorship.

---

## Journey 5 — Return to a concept

### Intent

The person wants to revisit an idea after time has passed, perhaps with new context or a different question in mind.

### Happy path

1. They open the Library and find a concept by its title, image, curiosity, or other available organisation.
2. The concept card shows its title and represented question with the original artwork.
3. They open details to see its source questions and wording snapshots.
4. They may retitle the concept, compare it with another, open a source question, or leave it unchanged.
5. If they retitle it, the same concept is updated. The image and provenance are retained.
6. If they want a different image, they explicitly create another concept or use a replacement interaction only if one is separately approved.

### Guardrails

- The Library is account-wide; concepts from multiple curiosities can be discovered and compared.
- A concept remains available if a source question is edited, parked, or removed. It leaves the Library only while its originating question is discarded, and it returns when that question is restored.
- The exact generation question is not rewritten from the current live question.
- No concept is marked complete, archived as a reward, or scored.
- A later AI model must not retitle a saved concept without the person's action.

---

## Journey 6 — Optional supporting capabilities

### Themes

A person may group questions with a theme. Themes are optional and never required to visualise or compare concepts. Grouping does not copy question text or change concept provenance.

### Branching questions

A person may link two independent questions when they notice a relationship. Branching must remain distinct from merging. The current persistence implementation must be confirmed before changing its data model.

### The Lab

A person may later open an optional investigation across questions and keep notes, hypotheses, tests, observations, and discoveries. The Lab does not own Library images and is not required before Visualise or concept comparison.

---

## Invariants

1. **No stage wizard.** Garden, contextual Visualise, and the Library are surfaces, not mandatory steps.
2. **No curation gate.** A question can be explored without being retained, merged, themed, or investigated first.
3. **A question can remain a question.** Not generating or saving an image is a valid outcome.
4. **The concept is the saved visual artefact.** It contains one selected original image, a one- or two-word title, the exact generation question, and question provenance.
5. **Composition is separate from artwork.** Title and question are rendered as overlays; the original source image is unchanged.
6. **Comparison is central.** The user chooses the pair and sees each image, title, and represented question together.
7. **A connection is explicit.** Viewing two concepts together does not persist a relationship. The user decides what to record.
8. **Provenance survives.** Editing or removing a live question does not rewrite an existing concept's generation wording or provenance snapshots.
9. **No silent mutation.** AI does not overwrite captures, titles, notes, or connections without explicit user action.
10. **Privacy.** Owner boundaries and private image storage are enforced server-side.
11. **No score or completion.** No questions-per-minute gauge, streaks, withering, completed-concept state, or progress penalty.
12. **Accessible controls.** Overlaid text has sufficient contrast and remains available to assistive technology. Icon-only controls have accessible names, keyboard access, visible focus, and tooltips.
13. **Stopping is allowed.** A capture with no image, a rejected candidate set, an unrecorded comparison, a parked question, or an investigation with no test are all valid.
