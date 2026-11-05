# Curitopia V2 — Garden Experience Framework

**Status:** Updated product experience framework for the new Curitopia direction. `PRODUCT_VISION.md`, `PRODUCT_ARCHITECTURE.md`, `USER_JOURNEYS.md`, and `ENTITY_RELATIONSHIP_MODEL.md` follow this document.  
**Purpose:** Define the emotional metaphor, continuous exploration model, and interaction principles that guide Curitopia V2.  
**Implementation note:** This document describes the intended experience. It does not approve or freeze a database schema or authorise a migration.

## 1. Product idea

Curitopia is a personal place to nurture curiosity and discover connections between ideas. It helps a person capture an unfinished thought, explore it through visual representations, and bring those representations together with other concepts. The most valuable outcome may be an image, a new relationship between existing ideas, or a question the person had not thought to ask before.

The intended movement is:

**Sow freely → See what unfolds → Bring ideas together → Follow the new thread.**

This is a description of a natural rhythm, not a sequence of mandatory stages. A person can move directly from a question to visualisation, compare concepts from different curiosities, return to an earlier idea, or stop without saving anything. The product should feel inviting and contemplative—not like a course, form wizard, productivity dashboard, or checklist.

The central insight is that an image is not merely the output of a question. It is a way to think about the concept the question represents. When two concepts are placed side by side, the person may recognise a relationship that was difficult to see while considering either one alone. Curitopia should make that act of comparison easy and preserve whatever insight emerges.

## 2. The garden metaphor

The garden is the emotional centre of Curitopia. It represents a person's evolving curiosity, not a score of productivity, learning, or creative output.

- **Seeds:** freshly captured questions, preserved in their original wording.
- **Shoots:** questions receiving attention. This is a visual metaphor, not a mandatory retained state or a curation gate.
- **Branches:** relationships the person notices or deliberately creates between questions or ideas. A branch is not the same as merging two questions.
- **Blossoms:** saved visual concepts. Each blossom brings together the original artwork, a title of no more than two words, the exact question the artwork represents, and provenance to any other questions that informed it. A blossom remains open to reinterpretation.
- **Field notes:** the person's own observations and discoveries. Notes should support the experience without becoming mandatory record-keeping.
- **Open the Lab:** a possible future, optional space for deeper investigation and testing a hunch. It is not a required route to an image or a connection.

### How the garden changes

The garden may grow as genuine activity occurs. A newly captured question can appear as a seed; concepts the person chooses to save can appear as blossoms; and links can represent relationships the person chooses to preserve.

Growth should be expressed through restrained illustration and gentle transitions—not points, streaks, leaderboards, deadlines, levels, or pressure to produce more. Questions that do not become images remain welcome. Nothing withers because a person takes a break, chooses not to generate an image, or leaves a thought unfinished.

The garden should be beautiful and legible before it becomes technically elaborate. An evolving illustration is an acceptable first version; a complex interactive tree is not a prerequisite.

## 3. The three primary product surfaces

These are persistent places and contextual activities, not stages. Navigation should help the person understand where they are without suggesting that one surface must be completed before another.

### Garden — capture and follow curiosity

**Microcopy direction:** “Sow freely.” / “What else is on your mind?”

The Garden is the home of a person's curiosities and questions. It should make capturing a thought immediate and make it easy to return to an existing question.

Experience principles:
- Fast, keyboard-friendly capture. Pressing Enter adds a question and readies the input for another thought.
- Preserve the original wording as entered.
- Keep the user's questions visible; avoid a separate curation stage before they can explore one.
- A question can be visualised directly. It does not need to be kept, curated, merged, themed, or investigated first.
- Questions that are not turned into images remain in the Garden. Not saving an image is a valid outcome, not a failure.
- Lightweight actions such as park, restore, edit, or remove may be available where useful, but they must not become a new workflow or gate.
- Do not generate images automatically while the person is capturing thoughts.

**Outcome:** a living collection of questions and curiosities that can be revisited and explored at any time.

### Visualise — give an idea a form

**Microcopy direction:** “See what unfolds.” / “What might this question look like?”

Visualise opens from a question. It helps the person explore a question through imagery and select a representation that changes how the idea feels or can be understood.

Experience principles:
- The user chooses when to visualise a question; opening a question does not generate an image.
- Preserve the original question. A considered wording may be edited or proposed when it genuinely helps the image prompt, but refinement is a lightweight aid rather than a required stage.
- Make clear which exact wording was sent to image generation.
- Generate only after an explicit user action.
- Show a small set of large candidates that differ in metaphor or conceptual interpretation, not merely colour or composition.
- Give imagery room to breathe. Avoid burying the artwork in explanatory UI.
- Candidates are temporary until the person selects and saves one.
- If the question wording changes after generation, keep the candidates associated with the wording that produced them. Do not imply they interpret the newer wording.
- The person can reject every candidate, ask for another set, or leave without saving.
- Quality and conceptual resonance matter more than minimising every second or API call.

**Outcome:** a selected artwork that represents a specific question or concept. It becomes a Library concept only when the user explicitly saves it with a valid title.

### Library of Curiosities — revisit, compare, connect

**Microcopy direction:** “Return to what caught your attention.” / “What do you notice together?”

The Library is an account-wide collection of saved concepts, potentially originating in different curiosities. It is more than an archive: it is a place to revisit ideas, compare their representations, and notice relationships.

Experience principles:
- Show a recognisable concept card with its title at the top, artwork in the centre, and the exact question represented at the bottom.
- The title is one or two words; one word is valid and two is the maximum.
- The question shown on the card is the exact wording used to generate that image, not a later, silently updated version of the live question.
- Preserve links to all other questions that informed the concept. Show these in its details or provenance view.
- Allow the person to select two concepts and place them side by side. Start with a clear two-concept comparison; do not require the concepts to come from the same curiosity.
- Keep the title and question visible during comparison so the person is thinking about the concepts, not just looking at anonymous images.
- A comparison can be left without recording anything.
- The person may explicitly record an insight, a relationship, or a new question. Nothing is saved merely because the concepts were placed together.
- Concepts are never completed. They can be retitled, reconsidered, compared, connected, and reinterpreted over time.

**Outcome:** a living collection of visual ideas that can stimulate further thought.

## 4. The concept as a composed visual object

A saved concept is three things held together:

1. **Title:** a memorable handle of no more than two words.
2. **Artwork:** the original, selected generated image.
3. **Question:** the exact question wording the artwork represents.

The standard presentation places the title near the top of the image, the artwork in the middle, and the question near the bottom. The title should have clear prominence. The question should remain readable but visually secondary. Subtle gradients, scrims, or typography treatments may support legibility without competing with the artwork.

Do not ask the image-generation model to render the title or question. The application should render them as text overlays. This keeps spelling reliable, supports edits and accessibility, adapts to different screen sizes, and preserves the original artwork. A flattened image for export or sharing may be composed separately; it must not replace the stored original.

The question at the bottom is the wording that was actually sent to generate the selected image (normally the saved considered question). If no refinement occurred, this may be the original capture. The concept also keeps its source-question provenance. When several questions informed it, the generation question remains the card's primary question, while additional source questions are available in the concept details.

A title can be suggested by AI, but the person chooses or writes it. Naming happens inline when saving a selected image, not in a separate Distil screen.

## 5. Comparison is a core thinking interaction

The important comparison is not simply whether two images look alike. It is what the represented concepts reveal when considered together.

A side-by-side comparison should:
- Let the person choose the concepts; do not have the product choose a pair on their behalf.
- Work across different questions and different curiosities.
- Display each concept's title and originating question with its image.
- Give images enough size and space to be considered together.
- Allow the person to reorder or swap the pair without losing context.
- Support an unstructured pause to look and think. Do not force a prompt, rating, or note.
- Offer optional prompts such as “What do you notice?”, “Where do these ideas overlap?”, “What is in tension?”, or “What does one make you notice about the other?”
- Keep observations distinct from facts. Similarity is not proof of causation or scientific relationship.
- Allow an explicitly recorded connection or a new question to retain links to the concepts that prompted it, subject to the eventual data model.

The first version should make two-concept comparison excellent before attempting a large canvas, automatic clustering, or a knowledge graph. More than two can be explored later if real use demonstrates that it helps.

## 6. Interaction principles

- **No mandatory curation.** Do not make people classify, keep, park, discard, or merge questions before they can explore them.
- **Natural selection.** The person may generate an image, reject all candidates, or choose not to create one. Saving a concept is the explicit act of selection.
- **Title at the point of saving.** Require one valid title of no more than two words when saving a concept. Do not create a separate naming stage.
- **Preserve context.** Keep the exact image-generation question and the provenance of contributing questions.
- **Comparison before interpretation.** Let people form their own connection before suggesting AI-generated readings.
- **User judgement over automated judgement.** AI may help refine a question, suggest titles, or offer perspectives on a selected pair. The person decides what matters.
- **No silent mutation.** AI suggestions, image candidates, and potential connections do not overwrite or save user content without explicit action.
- **Saved does not mean completed.** A concept is something worth returning to, not a finished result.
- **Privacy and truthful persistence.** Clearly distinguish temporary candidate images from saved concepts and browser-local drafts from account-backed data.

## 7. Optional supporting capabilities

- **Themes:** optional labels for grouping questions. They must not become a prerequisite for visualising or comparing concepts.
- **Branching questions:** a way to preserve a user-recognised relationship between separate questions, if supported by the current implementation. Branching is not the same as merging; never overload a merge pointer to represent a branch.
- **Field notes:** lightweight user-authored observations, especially when a comparison prompts an insight. They should not become required form fields.
- **The Lab:** a possible later space for deeper investigation, testing a hunch, and recording notes, hypotheses, tests, observations, and discoveries. It is not a required gateway to images or connections.
- **Curiosity Shelf:** an optional holding-space idea only if a distinct use emerges. It must not duplicate the Library.
- **Storytelling:** may be reconsidered after the core concept and comparison experience is strong. It is not a requirement to preserve an older export workflow.

## 8. Brand language and tone

The following phrases fit the product world and can be retained where they help:

- “Follow the thread.”
- “See what unfolds.”
- “Question garden.”
- “Plant a new seed.”
- “Field notes.”
- “Library of Curiosities.”
- “What do you notice together?”

The tone should be warm, human, curious, and inspirational. Avoid a childish gardening-game aesthetic, overly mystical claims, gamified productivity mechanics, or an excess of metaphors that obscure what an action does. Control labels should remain plain and understandable.

## 9. Product and data-model implications

The primary retained artefact remains a **concept**, not an image field on one question. Questions and concepts are many-to-many: one question may inform many concepts, and one concept may be informed by many questions. A concept remains in the Library if a source question is edited, parked, or removed. It keeps the wording the image was made for.

The existing model described in `ENTITY_RELATIONSHIP_MODEL.md` uses a `concepts` record and a `concept_questions` provenance link. The selected image, `title`, and `for_considered_text` are already represented in that model. The visible title/question treatment is a presentation layer; it does not require text to be baked into the stored artwork.

A relationship between two concepts is different from provenance between a concept and its source questions. The deployed model described in the original architecture does not contain a concept-to-concept relationship. A proposed `concept_connections` entity is described in `ENTITY_RELATIONSHIP_MODEL.md`, but it is not deployed and this document does not approve SQL. Verify the actual hosted migration history before implementation because the source architecture snapshot may predate later Curitopia 2 changes.

Candidate images and unsaved title suggestions remain temporary. A concept is saved only when the user selects an image and confirms a valid title. Optional themes remain optional. Investigations can be introduced later without becoming a prerequisite.

## 10. Principles to protect

1. **Quantity before quality in the Garden.** Do not make a person polish a thought before capturing it.
2. **No curation gate.** A question can be explored directly. Lightweight question-management actions must not recreate a Curate stage.
3. **Visualise is an action, not a compulsory step.** A person can decide not to generate an image.
4. **A concept is the saved artefact.** One selected image, a memorable one- or two-word title, the question represented, and source provenance.
5. **Text belongs to the composition, not the generated pixels.** Render title and question with application typography and preserve the source artwork.
6. **Comparison reveals ideas.** The product helps users compare concepts, not merely browse a set of images.
7. **User judgement over automated judgement.** AI suggestions never dictate what a person should think or save.
8. **Preserve provenance.** Keep original wording, generation wording, and links to contributing questions.
9. **Saved does not mean completed.** The Library is an open collection.
10. **No shame-based growth mechanics.** No dead plants, missed-day penalties, streaks, or productivity scores.
11. **Be truthful about AI and persistence.** Distinguish suggestions, generated candidates, saved concepts, and recorded user insights.
12. **Build the experience before overbuilding the infrastructure.** Validate comparison and connection behaviours before building a complex graph or investigation system.

## 11. Suggested implementation order

1. Update product documentation and remove the old stage-based assumptions from the UX specification.
2. Audit the current code, deployed migrations, and storage paths. Do not infer live schema state from an older architecture note.
3. Simplify navigation to the Garden and Library, with Visualise opened contextually from a question.
4. Implement the standard concept composition: title overlay at the top, artwork, exact generation question at the bottom. Keep original image bytes unchanged.
5. Move title entry and optional title suggestions into the save interaction. Enforce the existing one- or two-word rule.
6. Make the Library account-wide and support selecting concepts from different curiosities, if current querying does not already do so.
7. Build a focused two-concept comparison experience, keeping title and question visible.
8. Allow the person to record a connection or plant a new question explicitly. Add persistence only after the connection model is approved and tested.
9. Remove obsolete Curate and Distil UI and code only after confirming no data, route, or useful action depends on it.
10. Revisit themes, the Lab, storytelling, and broader visual canvases only when they add demonstrated value.
