<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Curitopia project guidance

## Product source of truth

Read the product documents before making product, UX, data-model, or architectural changes:

1. `PRODUCT_VISION.md` — product intent, experience principles, quality bar, and current decisions.
2. `Curitopia_Garden_Experience_Framework.md` — garden metaphor and interaction principles.
3. `PRODUCT_ARCHITECTURE.md` — application surfaces, technical boundaries, and data responsibilities.
4. `USER_JOURNEYS.md` — expected behaviour and acceptance criteria.
5. `ENTITY_RELATIONSHIP_MODEL.md` — persisted entities, provenance, and proposed relationship model.

These documents describe the intended new Curitopia architecture. Where old code or comments still describe a four-stage Gather / Curate / Visualise / Distil workflow, treat that as legacy product language unless a current implementation detail is explicitly being preserved.

## The current product model

Curitopia is a continuous visual-thinking environment, not a staged wizard or productivity workflow. Its three primary surfaces are:

- **Garden:** a person's curiosities and the questions they are following. Capturing a question is lightweight and does not require curation.
- **Visualise:** an action opened from a question. It supports optional question refinement, explicit image generation, and selection of a meaningful representation.
- **Library of Curiosities:** the account-wide collection of saved visual concepts. It supports revisiting, side-by-side comparison, and discovering or recording connections.

There are no dedicated **Curate** or **Distil** stages. Do not reintroduce stage navigation, mandatory selection gates, completion states, or a title-entry screen. Useful legacy behaviours may remain as lightweight actions only when they support the continuous flow.

## Concept presentation rules

A saved concept is one selected artwork, a memorable title of no more than two words, the exact question wording the artwork represents, and provenance to any other questions that informed it.

Present the title as a clear overlay near the top of the artwork and the generation question near the bottom. Keep the original generated artwork unmodified; render text as application UI so it remains editable, selectable, accessible, responsive, and independent of the source image. If an export needs a single flattened image, compose a separate export asset rather than replacing the original artwork.

The question shown on the concept is the exact wording used for that image generation (normally the saved considered wording). Do not silently replace it with a later edit to the live question. Other contributing questions remain available in concept provenance/details.

## Comparison and connections

Side-by-side concept comparison is a core product interaction, not a decorative enhancement. The user chooses the concepts to compare, including concepts from different curiosities. Design the experience around the ideas represented by the images, not merely visual similarity between pixels. Keep titles and source questions visible while comparing.

A comparison is exploratory and can be left without saving anything. Recording a connection, a note, or a new question is explicit and user-directed. AI may offer optional perspectives only after the user asks; it must not choose the concepts, assert a connection as fact, or steer the user's conclusion.

## Data and migration safety

- Preserve existing V2 questions, concepts, image files, curiosity ownership, and question provenance.
- Treat `concepts` and `concept_questions` as the existing concept and provenance model described in `ENTITY_RELATIONSHIP_MODEL.md`.
- The concept-to-concept relationship is a proposed additive model, not a deployed table. Do not write or apply a migration for it without explicit approval.
- Do not remove old columns, tables, enum values, or storage objects merely because a UI stage has been retired. Confirm actual code usage and hosted migration state first.
- The supplied architecture snapshot records a historical status for the curiosities migration. Verify the current repository and hosted Supabase migration history before relying on any migration-status statement.
- Do not touch V1 or import V1 data unless explicitly approved.
- Keep owner isolation, row-level security, private storage, and server-side secrets intact. Never put a Supabase service-role key in browser code.
- This product-document update does not authorize SQL, schema changes, deployment, or changes to production data.

## Implementation expectations

- Prefer small, additive, testable changes. Preserve existing data and behaviour unless the new product specification explicitly changes it.
- Separate the original artwork from its rendered title/question treatment.
- Keep manual entry available when AI assistance is unavailable. AI suggestions never silently overwrite user text or save on the user's behalf.
- Do not call models simply because a page opens, a question is captured, or a concept is viewed.
- Keep candidate images temporary until the user explicitly saves a concept.
- Maintain keyboard access, accessible names, visible focus, responsive layouts, and readable image overlays.
- Update tests and the product documents when behaviour or decisions change.
