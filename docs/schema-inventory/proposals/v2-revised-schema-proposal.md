# V2 revised schema proposal

**Status:** Withdrawn sketch. This file contains no executable migration. It has not been applied. Do not copy it into `supabase/migrations/`. Do not run it against a hosted project or against V1.  
**Use instead:** `v2-initial-schema-proposal.md` and `supabase/migrations/20261026000000_initial_v2_schema.sql`. That migration is proposed and has not been applied.  
**Why this file remains:** It records the earlier assumption that one image lived on `questions`. That assumption is withdrawn. Questions and visual concepts are many-to-many.  
**Does not supersede** `v2-initial-schema-proposal.md`. The exploration draft SQL, the related-item validation SQL, and the phase-1 files in this folder are also history and are not deployable.

The column rules below record the previous working assumption so a later review can see it. They are not instructions to migrate. The image columns on `questions` are not part of the proposed schema. Follow `v2-initial-schema-proposal.md` for the tables that are proposed.

## 1. Decision

V2 starts from an empty database in its own Supabase project. That project has not been created.

- V1 is not a source and not a target. There is no backfill and no compatibility trigger.
- A person who used V1 creates a new account here. Their V1 rows and files are absent.
- Optional themes, through `themes` and `theme_questions`, are included in the initial schema. They are not a required step in the cycle.
- The previous assumption of one private image per question, stored on `questions`, is withdrawn.
- The adopted relationship, which this file does not implement, is many-to-many. A concept keeps its own image, title, and the wording that image was made for. One question may inform many concepts. Removing a source leaves the concept in the Library. The concept has no completed state.
- Investigations are specified in section 8 and are not in any approved release. A Lab item of kind `concept` is a written note. It is not a Library visual concept.
- There is no `visions` table, no `explorations` table, no story table, no thumbnail column, and no completed-concept flag.

Candidate images are not rows. The sections below still describe image columns on `questions` because that is the withdrawn sketch. Do not copy those columns into a migration. Follow `ENTITY_RELATIONSHIP_MODEL.md` section 2 when the concept tables are written.

## 2. Authentication and the image bucket

V2 uses Supabase Auth on the new project. The working assumption, pending confirmation, is email and password, with new accounts. The application uses the signed-in person's JWT. Table privileges go to `authenticated`. `anon` and `service_role` do not receive them. The app does not embed a service-role key to bypass row-level security.

`user_id` is set from `auth.uid()` on insert. A policy rejects an insert or update that presents a different owner. `user_id` is immutable after insert.

One private bucket:

| Bucket | Public | Ceiling to confirm | Path stored on the question |
|---|---|---|---|
| `question-images` | no | 8 MiB; png, jpeg, or webp | `questions.image_path` = `{user_id}/{question_id}/{file}.png\|jpeg\|webp` |

The ceiling is a working assumption for one full generated file. It replaces the old figures of 5 MiB for a focus backdrop and 150 KiB for an item thumbnail. Those figures belonged to features this design does not have. Confirm the ceiling before creating the bucket.

The stored object is the file the model returned, when the format is one of the three above. The application does not transcode it into a thumbnail. The interface scales it down for layout.

There is no `exploration-images` bucket, no `investigation-thumbnails` bucket, and no story bucket. Do not add policies, triggers, or path columns for them.

Storage access:

- Select, insert, and update of an object require the authenticated owner. The first path segment is `auth.uid()`, and a question row owned by that person has that id as its second segment.
- Delete through a policy requires the owner and the parent question, so the signed-in person can remove a file after `image_path` is cleared and while the question still exists.
- No public URL. The browser reads the object with the owner's session.

The database delete does not remove the file. The application does, with the Storage API, as the signed-in person:

1. Read `image_path` for the question being deleted, or the previous path when a kept image is replaced.
2. Commit the database change.
3. Call the Storage API `remove` for that path in `question-images`.

That call removes the file and its object metadata together. Do not `DELETE FROM storage.objects`. If the call fails after commit, the file remains private under the owner's prefix and the application retries the same call. Account deletion reverses the order: remove the person's objects first, and delete the auth user only after that succeeds, so a failed removal does not orphan the only handle on the files by cascading the rows away.

Candidate images are displayed from the generation response and are not copied into `question-images`. Only the selected file is uploaded, and only as part of the save that also sets the title, the model, and the prompt version.

## 3. Previous first-release sketch

The tables in this section are the image-on-question assumption. They are not the approved first release. Application-supplied uuids are the primary keys. Theme position is assigned on insert.

| Table | Primary key | Owner | Notes |
|---|---|---|---|
| `questions` | `id` | `user_id` → `auth.users` | Both question texts. Optional kept image. Unique `(id, user_id)`. |
| `themes` | `id` | `user_id` → `auth.users` | Name 1–120. No description. Unique `(id, user_id)`. |
| `theme_questions` | `(theme_id, question_id)` | `user_id` on the row | Optional membership. Position is per theme. |

### `questions`

| Column | Rule |
|---|---|
| `id` | uuid primary key, supplied by the application. |
| `user_id` | Not null. References `auth.users`. Immutable. |
| `original_text` | Not null. Trimmed, 1–2000 characters. Never updated by accepting a considered-question proposal. |
| `considered_text` | Null until the person saves one. Trimmed, 1–2000 characters when present. |
| `image_title` | Null, or trimmed, 1–40 characters. No leading or trailing space, and no whitespace other than at most one ASCII space. The interface additionally requires one or two words. |
| `image_path` | Null, or the owner-and-question path in section 2. |
| `image_model` | Null, or trimmed, 1–80 characters. A model label, not a secret. |
| `prompt_version` | Null, or trimmed, 1–40 characters. A template label, not the prompt body. |
| `created_at`, `updated_at` | `timestamptz`, default `now()`. Updates set `updated_at`. |

Check: `image_title`, `image_path`, `image_model`, and `prompt_version` are all null or all set. If they are set, `considered_text` is not null.

No `status`, `mode`, `role`, `is_hidden`, `is_prioritised`, `perspective_origin`, or `focus_image_path`.

The library orders by `(user_id, updated_at desc)`.

### `themes`

| Column | Rule |
|---|---|
| `id` | uuid primary key, supplied by the application. |
| `user_id` | Not null. Immutable. |
| `name` | Not null. Trimmed, 1–120 characters. Repeated names for one user are allowed. |
| `position` | Integer `>= 0`. Unique per user. Assigned on insert. |
| `created_at`, `updated_at` | `timestamptz`. Updates set `updated_at`. |

`user_id` cannot change. An empty theme is valid.

### `theme_questions`

| Column | Rule |
|---|---|
| `theme_id`, `question_id` | Composite primary key. |
| `user_id` | Not null. Must match both parents. Immutable, as are the two ids. |
| `position` | Integer `>= 0`. Unique per theme. Assigned on insert. |
| `created_at` | `timestamptz`, default `now()`. |

Foreign keys:

- `(theme_id, user_id)` → `themes (id, user_id)` `ON DELETE CASCADE`
- `(question_id, user_id)` → `questions (id, user_id)` `ON DELETE CASCADE`

A membership whose question belongs to someone else fails the foreign key, including for a role that bypasses row-level security.

Indexes beyond the unique keys: `theme_questions (question_id)` and `theme_questions (user_id)`, so "themes for this question" and "memberships for this person" are cheap.

`questions.updated_at` moves when the question's own fields change. Changing a theme membership does not need to rewrite the question. The library's notion of recent work is the question's `updated_at`.

## 4. Row-level security

Enabled and forced on all three tables. Policies are `to authenticated` and use `(select auth.uid())`.

- Questions and themes: `user_id` is the current user, for select, insert, update, and delete.
- Memberships: `user_id` is the current user, and both parents are owned by that user.

The same owner predicate is used for select, insert, update, and delete. `service_role` is not granted table access as a way around a failed check.

## 5. Deletion

| Delete | Result |
|---|---|
| Theme membership | That row goes. Theme and question stay. |
| Theme | Theme and its memberships go. Questions and image files stay. |
| Question | Question and its memberships go. The application then removes the image file if `image_path` was set. |
| Auth user | The application removes that user's objects in `question-images` first. Then the user delete cascades questions, themes, and memberships. |
| Last question | Allowed. A person may own zero questions. |

## 6. Images and quality metadata

The columns `image_model` and `prompt_version` exist so kept images can later be grouped by how they were made. They do not make an image better. The prompt text, the review scores, and the rejected candidates stay out of this schema.

- Set all four image fields in the same update that uploads the file.
- Clear them only by replacing them as a set, or by an explicit removal of the kept image.
- Do not add a `generation_attempts` table, a ratings table, or a job table in this release.

## 7. Behaviour the first release does not carry over

The superseded clean-schema draft copied these from V1. They are omitted here:

- Explorations, including title, mode, completion, and a mandatory first question.
- Quickfire and Focus, central and satellite roles, and perspective origin.
- Hiding, priority, and any questions-per-minute storage.
- Focus-image storage.
- Investigation thumbnail storage.
- A deferred constraint that an exploration cannot be empty.
- Story media of any kind.

Question punctuation is an interface concern. The original capture is stored as written. The interface may help the person form the considered text; it does not silently rewrite `original_text`.

## 8. Later release — investigations

Add these in a subsequent migration, after the four-stage cycle is usable and after the concept relationship has its own reviewed design. Do not add them by reviving `v2-initial-schema-draft.sql`, which also creates explorations, focus images, and thumbnails. The item kind `concept` below is a written Lab note. It is not the visual concept archived in the Library of Curiosities. Whether that kind should be renamed, so the two meanings do not share a word, is an open decision. Do not rename it in this file until that decision is made.

| Table | Primary key | Owner | Notes |
|---|---|---|---|
| `investigations` | `id` | `user_id` | Title trimmed, 1–120. No status. Unique `(id, user_id)`. |
| `investigation_questions` | `(investigation_id, question_id)` | `user_id` | No relationship note. Zero links allowed. |
| `investigation_items` | `id` | through the investigation | Kind is `concept`, `note`, `hypothesis`, `test`, `observation`, or `discovery`. Body trimmed, 1–2000. Optional `related_item_id`. No image column. |

Composite foreign keys include `user_id`, with the same same-owner rule as `theme_questions`.

`investigation_questions` cascades when either parent is deleted. Deleting a question therefore drops the link and leaves the investigation. Deleting an investigation drops its links and its items, and leaves questions, themes, and question images.

`related_item_id` references another item in the same investigation, must not cycle, and must not nest deeper than 32. Use `ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED` so a single referenced item cannot be removed while something still points at it, and so deleting the investigation can still remove the set. The historical file `v2-initial-schema-related-item-validation.sql` describes that case for the superseded draft. It is not a test for this proposal. Write a new validation file with the later migration.

Item position is unique per investigation. There is no thumbnail path, no storage policy, and no bucket for items.

Row-level security matches section 4: the investigation's `user_id` is `auth.uid()`, and links require both parents to share that owner.

## 9. Local test outline

For when a migration exists. Not a script, and not a reason to start a local stack as part of the design reset.

Image quality is tested first, with the rubric in `PRODUCT_VISION.md`, and can fail a prompt or model while every test below passes.

When the first-release migration is eventually applied on a disposable local stack:

- A new auth user can insert a question with original text only. A second user sees no row.
- Setting `considered_text` leaves `original_text` unchanged.
- Setting `image_path` alone fails. Setting the four image fields with no `considered_text` fails. Setting all four with considered text succeeds.
- `image_title` of three whitespace-separated words fails the single-space check. A 41-character title fails.
- A theme can be empty, can share a question with another theme, and can be deleted without deleting the question.
- A membership whose `user_id` does not match both parents fails the foreign key, including as a role that bypasses row-level security.
- Deleting a question removes its membership. The question's stored path is the one the application must pass to the Storage API.
- `anon` and `service_role` have no privilege on the three tables.
- The bucket list for this release is `question-images` only.
- No table named `explorations`, `investigations`, `investigation_items`, or `visions` exists after the first release.

When the investigation migration is eventually applied:

- One investigation can link to two questions of the same owner, and one question can link to two investigations.
- A cross-owner link fails.
- An item insert with `image_path` fails because the column does not exist.
- Deleting a linked question leaves the investigation and its items.
- Deleting a referenced item while another item points at it fails at commit. Deleting the investigation removes the set.
- No `investigation-thumbnails` bucket exists.

Until those checks have been run against a real migration, the SQL does not exist and is not known to apply. This proposal is not that migration.

## 10. Local workflow, when implementation starts

Do not do this during the design reset.

- Keep the migration out of `E:\Curitopia` and out of any hosted project.
- Use a scratch Supabase directory and `supabase start` / `supabase migration up` so the file runs in one transaction.
- Do not paste the migration into the SQL editor as the deployment method.
- Do not run `supabase link`, `supabase db push`, or `supabase db pull`.
- Ignore any service-role key the CLI prints.
- The commented recovery style of the superseded draft — drop only the objects that file created, and remove bucket files with the Storage API before dropping a non-empty bucket — is the right recovery shape. Write it for the new object names. Do not reuse the old recovery block; it drops different tables and different buckets.

## 11. Historical files

| File | Standing |
|---|---|
| `v2-phase1-migration-proposal.md` and its SQL, seed, test, and rollback | Superseded earlier. Additive V1 plan. Do not run. |
| `v2-initial-schema-proposal.md` | Superseded. Body kept. Not deployable. |
| `v2-revised-schema-proposal.md` | This file. Provisional while the concept-to-question relationship is under review. Not a migration. |
| `v2-initial-schema-draft.sql` | Superseded. Not a migration. Do not run. |
| `v2-initial-schema-related-item-validation.sql` | Superseded with that draft. Do not run. |
| `hosted-catalog.sql` | Historical read-only inventory. Not a V2 setup step. |

## 12. Not in this task

No hosted project was created. No SQL was executed. No environment file was opened. Application code was not changed. V1 was not changed. Nothing was committed or pushed.
