# Curitopia V2 — Product Vision

**Status:** Current working product direction. The continuous exploration model in this document supersedes the earlier Gather → Curate → Visualise → Distil stage cycle.  
**Companions:** `Curitopia_Garden_Experience_Framework.md`, `PRODUCT_ARCHITECTURE.md`, `USER_JOURNEYS.md`, and `ENTITY_RELATIONSHIP_MODEL.md`.  
**Persistence:** The existing V2 model described in `ENTITY_RELATIONSHIP_MODEL.md` stores questions, visual concepts, and question-to-concept provenance. It does not yet store a relationship between two concepts.  
**Scope:** Product intent and behaviour. This document does not authorise application changes, SQL, migrations, deployment, V1 changes, or use of secrets.

V2 has its own Supabase project, accounts, and private storage. V1 remains separate. A V1 account, row, or file is not present in V2 unless a later import is explicitly approved.

## 1. Product intent

Curitopia is a personal visual-thinking environment that helps people nurture curiosity and discover connections between ideas.

A person captures a question, explores it through an image, and may place that concept beside another. The comparison can reveal a relationship, tension, analogy, or entirely new question that was not apparent while considering either idea alone. The person decides what the relationship means and whether it is worth recording.

The product is not an image generator with a library attached. The image is a thinking medium. The Library is not just storage; it is a place to revisit ideas and bring them together. The value emerges through the cycle of curiosity, visual representation, comparison, and new curiosity.

The natural movement is:

**Capture a question → Visualise an idea → Compare concepts → Follow a new thread.**

This is not a mandatory sequence. A person can stop after capturing a question, reject every image, save a concept without comparing it, compare previously saved concepts, or follow a new question at any point. There are no Curate or Distil stages, no completion ceremony, and no requirement to turn every question into an image.

The emotional centre remains the garden: evolving curiosity, not productivity. The interface should feel warm, editorial, spacious, and exploratory. It should reduce friction and support a person's own direction rather than impose an externally prescribed journey.

## 2. The garden

The garden represents the person's evolving curiosity. It is not a streak, level, score, or gauge.

| Garden metaphor | Product meaning |
|---|---|
| Seed | A question just captured, preserved in its original wording |
| Shoot | A question receiving attention; not a required selection state |
| Branch | A relationship the person recognises between questions or ideas; not a merge |
| Blossom | A saved visual concept: artwork, a one- or two-word title, its represented question, and source provenance |
| Field notes | Optional personal observations and discoveries |

Growth follows real activity. A pause does not wither anything. A question that never becomes an image remains welcome. The garden should never imply that a person has failed to progress.

The visual system remains warm and editorial: cream and paper surfaces, coral accent, serif display typography, and a human field-notes voice. Botanical language should be sparing; actions should retain clear labels.

## 3. Product surfaces, not stages

The application is organised around three primary surfaces. They are places and contextual activities, not steps in a wizard.

### Garden — questions and curiosities

A signed-in person can keep multiple curiosities. Each curiosity is a persistent workspace containing its questions and related concepts. The Garden is the natural home for capturing raw thoughts and returning to questions.

- Enter adds a question and clears the input.
- Original wording is preserved.
- No AI refinement, theme, investigation, status selection, or image is required to capture a question.
- A person can open Visualise directly from any question.
- Lightweight actions such as edit, park, restore, or remove may remain when useful, but they are not a curation workflow and do not determine whether a question can be explored.
- Questions are not discarded automatically because no image is saved.

### Visualise — contextual image exploration

Visualise opens from a question or an existing concept. It is an explicit creative action, not a mandatory stage.

- The question can be used as captured. Optional refinement may help make the prompt more specific, but should not become another required step.
- The original capture remains intact.
- The exact wording sent to image generation is retained with the image as its represented question.
- Image generation begins only after an explicit user action.
- A small set of full-size candidates should differ in conceptual metaphor or interpretation.
- Candidates remain temporary until a user selects and saves one.
- The person may reject the whole set, regenerate, or leave without saving.

When a selected image is saved, the user gives the concept a memorable title of one or two words. Naming belongs in this save interaction. There is no separate Distil stage.

### Library of Curiosities — saved concepts and comparison

The Library is an account-wide collection of concepts, including concepts originating in different curiosities. It is a place to revisit, compare, and connect ideas rather than a final-results page.

A saved concept is presented as a composed visual object:

1. **Title at the top:** one or two words, with one word valid and two the maximum.
2. **Artwork in the centre:** the original selected image, given visual prominence.
3. **Question at the bottom:** the exact question wording used to generate that image.

The title and question are rendered by the application as text overlays. They are not generated as pixels in the image. The source artwork remains unmodified and stored independently. This makes the wording editable, accessible, responsive, and consistent across cards and comparison views. A separate flattened export may be composed later without replacing the original artwork.

The bottom question is the wording the image represents (normally the considered text sent to the image model). It must not silently change when a live question is edited. When several questions informed the concept, the displayed question is the primary generation question; the others remain visible in the concept's provenance/details.

## 4. The concept is the central saved artefact

A visual concept is not just an image, a question, or a title. It brings together:

- one selected image;
- a memorable title of no more than two words;
- the exact question wording the image was made to represent;
- links and wording snapshots for the other questions that informed it;
- the model and prompt version used to create the selected artwork.

A concept is saved only when the person explicitly selects an image and confirms a valid title. An image without a title is not a saved concept. A question without an image is still a valid question in the Garden.

A title of one word is entirely valid. Two words are the maximum. The existing database rule is more specific: a one-word title or two words joined by exactly one ordinary space, at most 40 characters. The application and database should enforce the same rule.

Brevity is not enough. The title should carry the essence of the idea, remain memorable, and still mean something when seen beside other concepts. It should not be a generic caption or an interchangeable label. “Spacetime Fusion” and “Russian Blackholes” are examples of concise handles, not required naming patterns or claims about the concepts they name.

A concept is never marked completed. It can be revisited, retitled, reinterpreted, compared, connected, and developed. Retitling updates that concept; it does not create a duplicate. A later model must not rename a saved concept without the user's action.

## 5. Comparison is the defining interaction

The product should make it easy to bring two saved concepts side by side, including concepts that came from different questions or different curiosities.

The person should be able to see each image, title, and represented question at the same time. The purpose is to compare the *ideas represented* by the images. A visual resemblance may be the starting point, but the more important discovery may be conceptual: one idea changes how the person understands the other.

For the first comparison experience:

- The user deliberately selects the concepts to compare.
- Two concepts are shown side by side at a size that supports close attention.
- Title and question overlays remain visible and readable.
- The user can swap or reorder the pair without losing context.
- The interface leaves room for looking and thinking before offering prompts.
- Optional prompts can ask what the person notices, where ideas overlap, what is in tension, or what one makes them notice about the other.
- The user may leave without saving a note or a relationship.
- The user may explicitly record a connection in their own words or create a new question from the observation.

Do not build an automatic knowledge graph, auto-select pairs, rank relationships, or force the person to classify a connection. Start with an excellent two-concept comparison. Expand beyond two only after use demonstrates value.

The product's key insight is that images can make abstract ideas tangible, while juxtaposition can reveal conceptual relationships. The experience should be optimised for that moment of recognition.

## 6. Capturing what emerges

A comparison may produce a complete observation, a tentative connection, or an unfinished question. All are valid.

- The user may write an optional note in their own words.
- The user may explicitly save the connection between the selected concepts, once the connection persistence model is implemented.
- The user may create a new question from the observation and choose the curiosity in which it belongs.
- The new question must retain its own wording and must not alter either source concept.
- Optional AI perspectives may help the person look again, but must remain suggestions. They must not present a speculative relationship as fact or replace the person's own observation.

A saved connection should point back to its concepts so the person can understand where the new thought came from. The initial comparison can be transient; persistence happens only when the person chooses to record something.

## 7. Supporting capabilities

**Question management.** Park, restore, edit, remove, and existing question relationship behaviour may remain as simple Garden actions. They are not a separate stage. Do not conflate a branch between two independent questions with a merge pointer; inspect the current implementation and migrations before changing either.

**Themes.** Optional labels for grouping questions. A question may belong to none, one, or several themes. Themes do not own images or concepts and are not required before visualising or comparing.

**The Lab.** An optional later space for investigations across questions, with notes, hypotheses, tests, observations, and discoveries. The Lab is not a required stage or a gate before Visualise. A written Lab item called `concept` is distinct from a Library visual concept.

**Curiosity Shelf.** A lightweight holding-space idea only if it serves a distinct need. It must not duplicate the Garden or Library.

**Storytelling.** May be reconsidered after the visual concept and comparison experience is strong. A previous slide-and-video workflow is not a requirement for V2.

## 8. What is deliberately out of scope

- A mandatory four- or five-stage wizard.
- Dedicated Curate and Distil routes or screens.
- Requiring questions to be retained, sorted, merged, themed, or investigated before image generation.
- Automatically generating images when a question is captured or a page is opened.
- Automatically choosing concepts to compare or declaring what their relationship means.
- A completed-concept state, progress scores, streaks, leaderboards, missed-day penalties, or questions-per-minute metrics.
- V1 data import, unless separately approved.
- Public sharing, galleries, music, narration, screensavers, or story media as a prerequisite to launch.
- A complex knowledge graph or automatic clustering in the first comparison release.
- Persisting rejected candidate images or unused title suggestions.

## 9. Image quality

Compelling images are a product risk. A schema cannot create them. Prompting, the model, and the comparison experience determine whether an image helps the person think differently. Persistence stores only the image the person chooses to keep.

### What the image is for

The image interprets the question's tension, relationship, or shift in perspective. It should use one dominant, specific metaphor and feel meaningful at a large size. It is not simply an illustration of the nouns in the sentence and is not evidence for a claim.

A successful image should give the person a useful representation to think with. It may be literal enough to remain legible, but should avoid generic stock illustration, decorative backdrops, and predictable visual clichés.

### How a generation is made

These are evaluation rules for prompt experiments, not a claim that any first wording is final:

- Send a request only after an explicit user action.
- The question is the subject. If a considered wording exists, use it as the exact generation question; the original text may be included as secondary context.
- Ask for one visually specific metaphor with conceptual and emotional weight.
- Make candidates meaningfully different in metaphor or interpretation.
- Exclude rendered text, logos, watermarks, infographic layouts, and stock tropes such as lightbulbs, generic silhouettes at a horizon, flat corporate illustration, clip-art icons, or a person paired with a question mark.
- Keep candidates large enough that composition and mood can be judged.
- Store the selected file in its returned PNG, JPEG, or WebP format. Do not replace the original with a thumbnail or text-composited version.

The existing storage specification describes a private `concept-images` bucket, an 8 MiB ceiling, and PNG/JPEG/WebP. Verify the live bucket and migration configuration before changing those limits. The concept stores `image_model` and `prompt_version`; the prompt body stays in source control. Candidate images remain temporary in the browser.

### How quality will be judged

Use a fixed review set of about eight to twelve of the product owner's own questions, covering abstract, personal, and concrete subjects. Run the current prompt and model and score the images by hand. A successful database test is not an image-quality test.

Each score is 0, 1, or 2:

| Criterion | 0 | 1 | 2 |
|---|---|---|---|
| Conceptual relevance | Misses the question or pictures only a noun | Related but generic | Someone who knows the question can feel why this image exists |
| Distinctiveness and resonance | Interchangeable with stock | Pleasant but forgettable | The person would look again because the question feels different |
| Stock avoidance | Uses a listed trope or template look | Avoids tropes but still looks like default model output | Specific and individual |
| Title | Generic, interchangeable, or longer than two words | Accurate but flat | Concise, faithful, and memorable beside this image |
| Comparison value | Adds no useful thinking value beside another concept | Makes a surface similarity visible | Helps the person notice a new relationship, tension, or question |
| Time to a kept result | Record minutes from a new capture to an image the person would keep, and note friction | | |

A prompt/model candidate is good enough to build on when median relevance, distinctiveness, and comparison value are 2, stock avoidance is never 0, and the reviewer would keep at least half of the tested questions without an immediate regenerate. This is a validation bar, not a score shown to users.

Change one of prompt, model, or comparison layout at a time. If the product later captures operational metrics, use them to understand which prompt/model pairings lead to concepts people actually keep. Do not introduce a rating system or productivity score to the user interface.

### What the interface owes the image

- The exact generation question remains visible during generation and candidate selection.
- Regeneration requests another set and leaves the current set available until the new set arrives.
- Saving requires an explicit image selection and a valid title of no more than two words.
- The title is entered in the save interaction; there is no Distil screen.
- The saved concept card renders the title at the top and the represented question at the bottom, with the original artwork between them.
- The text overlays are application-rendered, not part of the generated source file.
- The Library shows a recognisable concept and supports side-by-side comparison with other concepts.
- Editing, parking, or removing a source question does not delete the concept or change the wording the image represents.
- Discarding the originating question hides its saved concepts from the Library until that question is restored. The concept, image, title, and question snapshot remain stored. Discarding an additional contributing question does not hide the concept.
- Saving another selected image creates another concept unless an explicit replacement interaction is later approved. Existing concepts are not silently replaced.

## 10. Behaviour around AI

- Opening a screen or viewing a concept does not call a model.
- Capturing a question does not call a model.
- Optional question refinement receives only the relevant question text and the minimum context needed.
- Image generation receives the exact question to be represented and, where useful, the original capture as secondary context. It does not receive the entire workspace, unrelated concepts, themes, or Lab items.
- A proposed question is a clearer expression of the same uncertainty, not an invented fact or a list of tasks. The user accepts, edits, or discards it. Nothing is written until the user acts.
- Optional title suggestions are requested only from the save interaction. The model may propose three distinct titles, each within the one- or two-word rule. Manual entry always remains available.
- Optional perspectives on a selected pair of concepts are requested only when the user asks. They are prompts for reflection, not assertions or conclusions.
- AI does not choose which concepts should be compared, silently create relationships, or write user notes without acceptance.
- Generated imagery is an interpretation, not evidence, a scientific result, or a verdict on a question.
- Provider secrets remain server-side. The browser uses the signed-in user's session.
- A missing model, timeout, malformed result, or weak suggestion must not block manual entry or an otherwise valid save.

If a model is sent an image as context for title or comparison assistance, its image-input capability must be explicitly verified for the configured model and file format. Do not assume every text model accepts image input. Title suggestions do not call the image-generation endpoint or incur an image-generation request.

## 11. Data and persistence decisions

The existing V2 model described in `ENTITY_RELATIONSHIP_MODEL.md` stores questions, visual concepts, and the many-to-many `concept_questions` provenance relationship. It stores the title, image path, and wording the image was made for on the concept record. The title/question overlay is a presentation rule, not a reason to bake text into the stored artwork or introduce duplicate image records.

A concept-to-concept connection is a separate relationship from question provenance. The existing `concept_questions` table must not be overloaded to represent it. The entity model proposes a minimal `concept_connections` record for a user-selected pair and an optional user-authored note. It is a proposed model only; no migration is approved here.

The source architecture snapshot records a historical status for the curiosities migration. Curitopia 2 has evolved since some of these documents were written. Before implementation, inspect the current repository migrations and hosted Supabase migration history; do not infer live state from these documents alone.

## 12. Decisions and status

### Product decisions established by this update

- Curitopia is a continuous exploration environment, not a four-stage process.
- The primary surfaces are Garden, contextual Visualise, and Library of Curiosities.
- There is no dedicated Curate or Distil stage.
- A question can be visualised without prior curation, themes, or investigation.
- A question that does not produce a saved image remains a valid question in the Garden.
- Saving a concept requires a selected image and a user-confirmed title of no more than two words.
- The concept card presents title at the top, artwork centrally, and exact generation question at the bottom.
- Title and question are rendered as application overlays; source artwork remains unchanged.
- Side-by-side comparison of saved concepts, including concepts from different curiosities, is a core interaction.
- The user chooses what to compare and whether to record an emergent connection.
- AI perspectives are optional and never authoritative.
- Concepts are never completed.

### Existing model decisions to preserve unless separately changed

- V2 uses its own Supabase project and accounts; V1 remains separate.
- Concepts are independent saved records linked to source questions through `concept_questions`.
- One question may inform many concepts; one concept may be informed by many questions.
- Source-question wording snapshots preserve provenance if a live question changes or is removed.
- Titles use the existing one- or two-word rule (maximum 40 characters, with two words separated by one ordinary space).
- Optional themes remain optional.
- Candidate images and unused title suggestions are not persisted as Library concepts.
- Private storage and owner-scoped access remain in force.

### Open implementation decisions

1. **Connection persistence.** The proposed `concept_connections` model needs a schema review, ownership/RLS design, migration plan, and approval before implementation.
2. **Question relationship state.** The current product has used Branch as a link between independent questions. Verify its current persistence implementation separately from the legacy `merged_into_id` merge pointer; do not conflate the two.
3. **Comparison selection scope.** Initial design should compare two concepts at a time and allow cross-curiosity selection. Validate whether more than two helps before expanding.
4. **Question overlay fallback.** Confirm display behaviour for legacy concepts that have no usable `for_considered_text`; never invent a question or silently substitute unrelated text.
5. **Image replacement.** The current path creates a new concept when another image is saved. Decide separately whether replacing artwork on an existing concept is needed.
6. **Image provider, model, and retention terms.** Keep provider selection and retention policy explicit and reviewable.
7. **Themes, Lab, Curiosity Shelf, and storytelling.** Keep them optional and outside the primary flow until demonstrated useful.

## 13. Implementation sequence

1. **Audit before changing code.** Inspect the current app, routes, components, data model, migrations, hosted Supabase state, storage, and tests.
2. **Align product documentation.** Use this vision and its companion documents as the new product baseline.
3. **Simplify the shell.** Replace stage navigation with Garden and Library navigation; open Visualise contextually from a question.
4. **Compose concept cards.** Add responsive application-rendered title and question overlays while preserving original image files.
5. **Move naming into save.** Require a valid one- or two-word title only when a selected image is saved; keep title suggestions optional.
6. **Unify the Library.** Ensure the person can find concepts across their curiosities and select them for comparison.
7. **Build side-by-side comparison.** Keep title, exact question, and provenance available; let the person think before asking AI for suggestions.
8. **Add explicit connection recording.** Implement the approved relationship model only after review and migration approval.
9. **Retire legacy UX carefully.** Remove Curate and Distil navigation/screens only after preserving any useful lightweight actions and confirming that no live data depends on stage state.
10. **Defer supporting systems.** Revisit themes, Lab, broader canvases, and storytelling only when they demonstrably improve the central experience.

Do not treat successful persistence as proof of image quality, title quality, or discovery value. Do not treat the Library as the end of a required pipeline.
