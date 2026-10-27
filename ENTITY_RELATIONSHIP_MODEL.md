# Curitopia Entity-Relationship Model

**Status:** Proposed schema. The migration has not been applied and must not be executed from this document.  
**Migration:** `supabase/migrations/20261026000000_initial_v2_schema.sql`  
**Explanation:** `docs/schema-inventory/proposals/v2-initial-schema-proposal.md`  
**Experience:** `Curitopia_Garden_Experience_Framework.md` and `PRODUCT_VISION.md`.

V1 tables are untouched. V2 does not import them. This file describes the proposed first release. It is not permission to create a Supabase project.

## 1. Model goals

- The person owns questions, themes, and concepts directly. There is no exploration container.
- A question keeps its original text and its optional considered text.
- The Library of Curiosities archives visual concepts. A concept is one selected image, a one- or two-word title, the wording that image was made for, and any number of source questions. A question may inform any number of concepts. A concept is never a completed status.
- A question can belong to zero or more themes. A theme can contain zero or more questions. Themes are optional in the journey and included in this schema.
- The Lab, meaning investigations, is a later release. It is not a stage of the four-stage cycle and it is not in this migration.
- Stories, vision boards, candidate images, focus backdrops, and item thumbnails are not entities.
- `user_id` on each top-level record is the owner. Join rows repeat `user_id` so a link cannot cross owners.

## 2. First release

```mermaid
erDiagram
    AUTH_USER ||--o{ QUESTION : owns
    AUTH_USER ||--o{ THEME : owns
    AUTH_USER ||--o{ CONCEPT : owns

    THEME ||--o{ THEME_QUESTION : groups
    QUESTION ||--o{ THEME_QUESTION : belongs_to

    CONCEPT ||--o{ CONCEPT_QUESTION : cites
    QUESTION ||--o{ CONCEPT_QUESTION : informs

    QUESTION ||--o{ QUESTION : merged_into

    QUESTION {
        uuid id PK
        uuid user_id FK
        text original_text
        text considered_text
        text disposition
        uuid merged_into_id FK
        timestamptz created_at
        timestamptz updated_at
    }
    THEME {
        uuid id PK
        uuid user_id FK
        text name
        integer position
        timestamptz created_at
        timestamptz updated_at
    }
    THEME_QUESTION {
        uuid theme_id PK_FK
        uuid question_id PK_FK
        uuid user_id FK
        integer position
        timestamptz created_at
    }
    CONCEPT {
        uuid id PK
        uuid user_id FK
        text title
        text for_considered_text
        text image_path
        text image_model
        text prompt_version
        timestamptz created_at
        timestamptz updated_at
    }
    CONCEPT_QUESTION {
        uuid id PK
        uuid concept_id FK
        uuid question_id FK
        uuid user_id FK
        text original_text_snapshot
        text considered_text_snapshot
        timestamptz created_at
    }
```

The private bucket `concept-images` is not a table. `concepts.image_path` is `{user_id}/{concept_id}/{filename}`.

### Question

`original_text` is required and is not rewritten by a merge. `considered_text` is null until the person saves a considered question. `disposition` is `gathered`, `retained`, `parked`, or `discarded`. The application has no disposition value `merged`. A merge is `merged_into_id`. Restore clears that pointer. The application also sets disposition back to `gathered` when it restores; the database does not force that second write.

`merged_into_id` cannot be the same row, cannot point at another person's question, cannot be retargeted without a restore, and cannot form a cycle. Deleting a survivor while other questions still point at it fails at commit and leaves those source wordings in place. Deleting a merged source removes that row. The prototype does not hard-delete questions; park and discard are the reversible actions.

### Theme

A theme is a name and a position. It has no description. Names are unique per owner, ignoring case and surrounding spaces. An empty theme, meaning a theme with no questions, is valid. Deleting a theme deletes memberships only.

### Theme membership

`theme_questions` uses `(theme_id, question_id)` as its primary key. Both foreign keys include `user_id` and cascade. Deleting a question removes its memberships and leaves the theme.

### Concept

A concept does not require a surviving question. It has no anchor column and no completed flag. The prototype still stores one concept per `anchorQuestionId`. The schema does not. That is a prototype limit, not a database rule.

`title` is one word, or two words joined by exactly one ordinary space, at most 40 characters. `for_considered_text` is the considered wording the selected image was made for. `image_model` and `prompt_version` are required. Demo fixtures in the browser can have a data URL and a null model. Those fixtures are not rows in this schema.

### Concept link

`concept_questions.question_id` is nullable. The foreign key is `(question_id, user_id)` with `ON DELETE SET NULL (question_id)`, so only the live reference is cleared. `original_text_snapshot`, `considered_text_snapshot`, and `user_id` stay. The owner can still read a detached row. A live link cannot point at another person's question. Snapshots cannot be edited. A link can be detached. It cannot be retargeted.

Editing or parking a live question does not change the snapshots or `concepts.for_considered_text`.

## 3. Later release — the Lab

Not in this migration. Specified here so the Lab is not confused with the Library.

```mermaid
erDiagram
    AUTH_USER ||--o{ INVESTIGATION : owns
    INVESTIGATION ||--o{ INVESTIGATION_QUESTION : covers
    QUESTION ||--o{ INVESTIGATION_QUESTION : is_covered_by
    INVESTIGATION ||--o{ INVESTIGATION_ITEM : contains
    INVESTIGATION_ITEM o|--o{ INVESTIGATION_ITEM : relates_to

    INVESTIGATION {
        uuid id PK
        uuid user_id FK
        text title
        timestamptz created_at
        timestamptz updated_at
    }
    INVESTIGATION_QUESTION {
        uuid investigation_id PK_FK
        uuid question_id PK_FK
        uuid user_id FK
        timestamptz created_at
    }
    INVESTIGATION_ITEM {
        uuid id PK
        uuid investigation_id FK
        integer position
        text kind
        text body
        uuid related_item_id FK
        timestamptz created_at
        timestamptz updated_at
    }
```

An investigation has a short title and no completed state. It may have zero linked questions at the database.

There is no `theme_investigations` table.

Each item belongs to one investigation. Kinds are `concept`, `note`, `hypothesis`, `test`, `observation`, and `discovery`. The kind `concept` is a written thought inside the Lab. It is not a visual concept and it is not a row in the Library. There is no `image_path`. Whether that kind is renamed is still open. An optional related item must be in the same investigation, must not cycle, and must not exceed a depth of 32. The foreign key from `related_item_id` should be `ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED`. That rule is for a later migration.

Items do not copy question text. A visual concept is not an investigation item.

## 4. Earlier drafts

`v2-initial-schema-draft.sql` and the related-item validation SQL proposed explorations, Quickfire/Focus, focus images, and investigation thumbnails. They are history. Do not apply them.

`v2-revised-schema-proposal.md` put one image on `questions` and used a `question-images` bucket. That image placement is withdrawn. Do not apply it.

`v2-phase1-migration-proposal.md` proposed additive tables on the V1 database. It is withdrawn.

`hosted-catalog.sql` is a historical inventory. It is not a V2 setup step.

## 5. Integrity and security

These rules are the ones written in the proposed migration. Applying that file still needs an explicit approval.

- Every question, theme, and concept has one owner. `user_id` cannot change.
- Theme membership uses composite foreign keys, so both parents share that owner.
- A concept link's composite foreign key rejects a live question owned by someone else. The trigger keeps snapshots unchanged and allows a link to be detached rather than retargeted. Detached provenance remains readable by the concept owner.
- Row level security is enabled on the five tables and is not forced. Forcing it does not decide whether `ON DELETE SET NULL` can run. Policies are `to authenticated` and use `(select auth.uid()) = user_id` for select, insert, update, and delete.
- `authenticated` can select, insert, update, and delete its own rows. `anon` is not granted those privileges. The migration does not grant `service_role`. The browser does not use a service-role client.
- Deleting a theme removes its memberships. Questions, concepts, and files stay.
- Deleting a question removes its theme memberships, nulls live concept links, and leaves each concept with its image path, title, `for_considered_text`, and snapshots.
- Deleting a concept removes its links. The image file is removed through the Storage API, not by SQL. If that removal fails, the failure is reported and can be retried.
- Deleting an auth user can remove their questions, themes, concepts, and memberships in one cascade because the merge foreign key is deferred. The application removes their image files through the Storage API first. If file removal fails, the account deletion does not proceed. That sequence is not in the migration.
- There is one private image bucket, `concept-images`, at `{user_id}/{concept_id}/{filename}`, with an 8 MiB limit and PNG, JPEG, or WebP only. There is no thumbnail bucket, no focus-image bucket, and no story bucket. The schema requires PostgreSQL 15 or later.

## 6. Standing of this model

- [x] V2 is a separate Supabase project, when one is created. V1 is not modified and is not imported.
- [x] A question may inform many concepts, and a concept may be informed by many questions. The concept remains when a source is edited, parked, or removed.
- [x] The proposed columns, keys, private path, and removal mechanics are written in the migration named above. They have not been executed.
- [x] Original text and considered text are both stored. Merge is a pointer, not a fifth disposition.
- [x] Optional themes are `themes` and `theme_questions`. One name per owner, ignoring case and surrounding spaces. They are not a required step in the cycle.
- [x] Investigations are not in this release. The item kind `concept` is not a Library visual concept.
- [x] A visual concept has no completed state.

Confirmations still required are listed in `PRODUCT_VISION.md` section 10. The 8 MiB ceiling and the private path are the schema defaults. Applying the migration still needs an explicit yes.
