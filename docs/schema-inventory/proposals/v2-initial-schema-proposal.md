# V2 initial schema proposal

**Status:** Proposed migration. It has not been applied. Do not run it against a hosted project, a local stack, or V1.  
**Migration:** `supabase/migrations/20261026000000_initial_v2_schema.sql`  
**Product:** `Curitopia_Garden_Experience_Framework.md`, `PRODUCT_VISION.md`  
**Entities:** `ENTITY_RELATIONSHIP_MODEL.md`  
**This file replaces** the exploration-centred text that previously used this name. That older shape remains only in `v2-initial-schema-draft.sql` and `v2-initial-schema-related-item-validation.sql`. Those files are history. Do not apply them.  
**Withdrawn:** `v2-revised-schema-proposal.md` stored one image on `questions`. Do not apply that sketch.

No SQL in this proposal has been executed. PostgreSQL has not parsed the migration.

## 1. What the first release stores

V2 starts empty, in its own Supabase project. V1 is not a source and not a target.

| Table | Role |
|---|---|
| `questions` | Gather and Curate. Live original text, optional considered text, curation, and an optional merge pointer. |
| `themes` | Optional names. An empty theme is valid. |
| `theme_questions` | Optional membership. A question can be in many themes. A theme can hold many questions. |
| `concepts` | One open Library record: selected image, one- or two-word title, the considered wording that image was made for. |
| `concept_questions` | Many-to-many provenance, including text snapshots that survive deletion of the source question. |

There is no `completed` column, no `explorations` table, no investigation tables, no story table, no thumbnail bucket, and no questions-per-minute storage. Candidate images are not rows.

The browser prototype still keeps workspace stage, focus ids, and candidate drafts in `localStorage`. Those are not tables. Connecting this schema does not, by itself, change that prototype.

## 2. Questions and merges

Columns follow `QuestionRecord` in `lib/questions/types.ts`.

| Column | Rule |
|---|---|
| `id` | uuid, supplied by the application. |
| `user_id` | `auth.users` in the V2 project. Immutable. |
| `original_text` | Required. Trimmed, 1–2000 characters. A merge does not write this column. |
| `considered_text` | Null, or trimmed, 1–2000 characters. |
| `disposition` | `gathered` (default), `retained`, `parked`, or `discarded`. |
| `merged_into_id` | Null, or another question owned by the same person. |
| `created_at`, `updated_at` | `timestamptz`. Updates set `updated_at`. |

**Discrepancy with the words "merged state".** The application type `Disposition` does not include `merged`. A merged question keeps its disposition and sets `mergedIntoId`. Restore clears that pointer and sets disposition back to `gathered`. The migration matches that model. It does not add a fifth disposition. The database does not force disposition back to `gathered` when the pointer is cleared; the application already does both in `restoreQuestion`.

Self-merge is rejected by a check and by the merge trigger. A merge that points at another person's question is rejected by the composite foreign key `(merged_into_id, user_id)`. Changing an existing pointer to a different question is rejected; the application restores first. Before the cycle walk, a non-null merge takes a transaction-scoped advisory lock keyed by `user_id`. The same lock is taken at the start of the statement, before row locks, so two merges for one person wait in one order instead of both passing the walk. The guard is volatile, so the walk sees a merge that committed while it waited. It rejects a cycle, with a depth limit of 64.

**Deleting a question that other questions are merged into.** The foreign key is `ON DELETE NO ACTION` and is `deferrable initially deferred`. PostgreSQL checks it at transaction commit, not at the end of the statement that deleted the survivor. If a source still points at that question when the transaction commits, the commit fails and the whole transaction is rolled back, so those source rows stay, with their original wording. A later statement in the same transaction can still clear those pointers before commit. Deleting a merged source is allowed. That row is then gone and cannot be restored. Its theme memberships go with it. Any concept link detaches, as section 5 describes.

**Account removal** deletes every question for that person in one cascade from `auth.users`. Because the merge constraint is deferred, that whole-set delete can commit. A one-row delete of a survivor cannot. The migration does not install account removal. When it is built, it is a server operation: remove the person's `concept-images` objects through the Storage API, then delete the auth user. It must not `DELETE FROM storage.objects`.

The application does not hard-delete questions today. Park and discard are the reversible actions. Permanent delete should stay an explicit later action.

## 3. Themes

`themes` has `id`, `user_id`, `name` (trimmed, 1–120), `position` (integer, default 0, not negative), and timestamps. There is no description. The current interface has no theme screen, so a description would be unused. An empty theme is a theme with no membership rows. The name itself cannot be blank.

**Name uniqueness:** one name per owner. The unique index is `(user_id, lower(btrim(name)))`. `Garden` and `garden` conflict. `Garden` and ` Garden ` also conflict, and the shape check rejects the untrimmed value before it can be stored. `Night Garden` and `Night  Garden` stay different: the rule ignores surrounding spaces, not spaces inside the name. Names of two different people may match.

The prototype has no theme field and no theme validation. When a theme screen is added, it should trim the name before insert, keep the 1–120 limit, and leave internal spaces as the person typed them. A unique violation is SQLSTATE `23505` on `themes_name_per_user_idx`. The screen should say: **You already have a theme with this name.** It should not show the index name.

Deleting a theme deletes `theme_questions` rows and leaves questions and concepts. Deleting a question deletes its theme memberships and leaves the theme.

Both foreign keys include `user_id`, so a membership cannot join a theme and a question of two different people.

## 4. Concepts

`concepts` is the Library record. It has no parent question and no completed flag.

| Column | Rule |
|---|---|
| `title` | Required. One or two words, at most 40 characters. Two words are separated by exactly one ordinary space, U+0020. A tab, a newline, or a second space does not match. This is the stored form from `cleanTitle` in `lib/questions/title.ts`, which trims and collapses internal whitespace to one ordinary space before save. JavaScript counts UTF-16 code units and `char_length` counts characters, so a title made of characters outside the basic plane can pass the database and still be rejected by the application. |
| `for_considered_text` | Required snapshot of the considered wording the selected image was made for. Maps to `ConceptRecord.forConsideredText`. Editing the live question does not update it. |
| `image_path` | Required. `{user_id}/{concept_id}/{filename}` with a `png`, `jpeg`, `jpg`, or `webp` suffix. UUID text is lowercase, as `uuid::text` produces it. |
| `image_model` | Required. Trimmed, 1–80 characters. |
| `prompt_version` | Required. Trimmed, 1–40 characters. A label, not the prompt body. |

**Prototype discrepancies, left in the application on purpose:**

- The prototype stores one concept per `anchorQuestionId` and can replace that concept's image. The schema does not have an anchor column and does not limit how many concepts cite a question. One question informing many concepts is the adopted product rule. The prototype is narrower until a later code change.
- The prototype keeps `imageLabel` and `imageSource` (`openai` or `demo`) and may leave `model` and `promptVersion` null on a demo fixture. The database requires a model and a prompt version, and it stores a storage path rather than a data URL. Demo fixtures are not rows in this schema.
- Candidate drafts stay in the browser until one image is chosen. They are not inserted.

Retitling updates `title` and `updated_at` only. Replacing an image updates `image_path`, and should update `image_model`, `prompt_version`, and `for_considered_text` together when the new image was made for a new wording.

## 5. Concept provenance

`concept_questions` is many-to-many.

| Column | Rule |
|---|---|
| `id` | uuid primary key, because a detached row has no question id. |
| `concept_id`, `user_id` | Composite foreign key to `concepts`. Deleting the concept deletes these rows. |
| `question_id` | Nullable. With `user_id`, it references `questions (id, user_id)`. `ON DELETE SET NULL (question_id)` clears only that column. |
| `original_text_snapshot` | Required copy of the source question's original wording at link time. |
| `considered_text_snapshot` | Null, or a copy of the considered wording at link time. |

A partial unique index on `(concept_id, question_id)` applies only while `question_id` is not null. The same question can inform many concepts through separate rows. One concept can have many source rows.

The concept side uses a composite foreign key on `(concept_id, user_id)`. The question side uses a composite foreign key on `(question_id, user_id)` with `ON DELETE SET NULL (question_id)`. That column list was added in PostgreSQL 15 and is rejected by PostgreSQL 14 and earlier. This schema's minimum version is PostgreSQL 15. No hosted project has been created or inspected, so the version still has to be read on the new project before the file is applied. Only `question_id` becomes null. `user_id` stays, and so do both snapshots. The default match rule, `MATCH SIMPLE`, treats a foreign key as satisfied when any of its columns is null, so a detached row does not need a live question. `MATCH FULL` would reject that row and must not be used. A composite foreign key without the column list would null `user_id` as well. That form is not used.

The trigger does not decide ownership. It rejects changes to the snapshots, the concept id, and the owner. A live `question_id` may become null. It may not be pointed at a different question, and a detached row may not be reattached. Editing or parking the live question does not run this trigger, so the snapshots stay put. Parking does not detach the link.

**Deleting a source question** nulls `question_id` and leaves the concept, the image path, the title, `for_considered_text`, and both snapshots. The owner can still select that row: the select policy is `user_id = auth.uid()`, and it does not require `question_id`.

A live link cannot name another person's question, because `(question_id, user_id)` has to exist in `questions`. That check applies to every role. It does not depend on which rows row-level security lets the session see.

## 6. Image storage

One private bucket, `concept-images`. There is no `exploration-images` bucket and no `investigation-thumbnails` bucket. The migration has not created a bucket.

| Setting | Value |
|---|---|
| Public | no |
| File size | 8 MiB (`8388608` bytes) |
| MIME types | `image/png`, `image/jpeg`, `image/webp` |
| Path | `{user_id}/{concept_id}/{filename}` |

The concept check and the storage path use the same shape. The filename ends in `.png`, `.jpeg`, `.jpg`, or `.webp`. `.jpg` and `.jpeg` are both JPEG names; the MIME type for either file is `image/jpeg`. UUID segments are lowercase.

The prototype stores a selected image as a data URL in this browser. It has no Storage path. When the application is connected, the smallest correction is to save one object at `{user_id}/{concept_id}/{filename}` and store that path. Do not add a second path shape.

Storage policies allow `authenticated` to select, insert, update, and delete an object only when the first folder is `auth.uid()`. They do not require the concept row to exist. That is the same prefix, and it is what lets the owner remove an object through the Storage API after the row is gone. A path that will be stored on a concept must still match that concept's id, or the row check fails.

The application must not `DELETE FROM storage.objects`. Cleanup uses the Storage API as the signed-in person. The bucket limit and MIME list are enforced by the Storage API. The SQL policies enforce the bucket and the owner prefix.

**Replace an image**

1. Upload the new file under the same concept prefix, with a new filename. Leave the current object in place.
2. Update `concepts.image_path` (and the model, prompt version, and considered snapshot if they changed) in one database update.
3. If that update fails, remove the new object through the Storage API and return the database error. Do not report success.
4. If the update commits, remove the previous object through the Storage API. If that call fails, the row already names the new file. Return a cleanup failure, not success, and retry the same remove. The old file stays private under the owner's prefix until the remove succeeds.

**Delete a concept**

1. Read `image_path`.
2. Delete the concept row. Links cascade.
3. Remove that object through the Storage API. If the call fails, return a cleanup failure and retry the same path. Do not report that the file is gone.

A failed cleanup never flips the user-visible result to success.

## 7. Ownership and policies

`user_id` on every top-level row references `auth.users` in the V2 project and is immutable. Join rows repeat `user_id` and foreign-key it with each parent that must share that owner.

Row level security is enabled on all five tables. Policies are `to authenticated` and use `(select auth.uid()) = user_id` for select, insert, update, and delete. Update policies repeat that check in `WITH CHECK`.

Row level security is enabled and not forced. Forcing it is not what makes provenance survive. PostgreSQL runs the `ON DELETE SET NULL` update as the owner of `concept_questions`, with referential-integrity context that does not apply forced row-level security. Enabling row-level security is what constrains `authenticated`: there is no policy for any other role, and every policy for `authenticated` requires `auth.uid() = user_id` on select, insert, update, and delete. `anon` has no policies and no table grants. Roles with `BYPASSRLS`, including Supabase `service_role`, bypass these policies whether or not row-level security is forced. The application still must not use that role for routine CRUD.

The foreign-key update can change rows the session user cannot see. Its predicate is the deleted question's key. The composite foreign key means those rows already have that question's `user_id`, so the update nulls `question_id` on the same owner's provenance. It is not a path for one person to edit another person's snapshots, concept, or owner. Direct updates still pass the owner's update policy and the immutability trigger.

`authenticated` can select, insert, update, and delete the five tables, and can execute the four trigger functions. PostgreSQL requires that execute privilege for a signed-in write to fire the trigger. The functions are security invoker. They set `updated_at` or reject a bad merge or a bad link. They do not bypass row level security. `anon`, `public`, and `service_role` are revoked, including a grant Supabase may attach from default privileges when the table is created. The browser must use the signed-in JWT. No service-role credential belongs in the client. The dashboard connection may still be a platform role with `BYPASSRLS`. That key is not an application credential, and this file does not copy it.

No privileged routine is defined in the migration. Image generation stays a server route with the provider credential, separate from database ownership. Later account removal is the only anticipated privileged sequence, and it is not in this file.

## 8. Applying the migration, and recovering an empty project

The file is for a new, empty V2 project. It contains no `BEGIN` or `COMMIT`, no `CREATE INDEX CONCURRENTLY`, and no other statement that PostgreSQL refuses inside a transaction. The Supabase migration runner applies one migration file in one transaction unless the file forces that off. This file does not. A failure in that mode rolls the whole file back, including the bucket insert and the function definitions.

Static reading cannot prove that a particular dashboard session will do the same. Some SQL editors commit each statement. Do not paste this file into a session that commits statement by statement. Do not apply it to V1.

**If execution fails inside the runner's transaction**

- The migration version is not recorded as applied.
- `public.questions`, `public.themes`, `public.theme_questions`, `public.concepts`, and `public.concept_questions` are absent.
- The bucket `concept-images` is absent.
- The empty project can receive the same file again.

**How to see that it applied fully**

Read these on the new project after the runner reports success. They are checks, not part of the migration.

- `select current_setting('server_version_num')` is at least `150000`.
- The five tables exist in `public`, and each has row-level security enabled.
- `themes_name_per_user_idx` exists.
- `concept_questions_question_owner` uses `ON DELETE SET NULL (question_id)`.
- `storage.buckets` has `concept-images` with `public = false`, `file_size_limit = 8388608`, and MIME types `image/png`, `image/jpeg`, and `image/webp`.
- Grants on the five tables give `authenticated` select, insert, update, and delete. `anon` and `service_role` do not have those grants.
- No table named `explorations`, `investigations`, `investigation_items`, `stories`, or `visions` exists. No bucket named `exploration-images` or `investigation-thumbnails` exists.

**If a non-transactional run stops halfway**

Use this only on the new V2 project, and only after confirming it has no Curitopia rows and no `auth.users` rows. If any of those exist, stop. Do not invent a down migration, and do not run a drop as part of the forward file. There is no automatic rollback in this repository.

1. Remove any objects already uploaded to `concept-images` through the Storage API. If the bucket has no objects, there is nothing to remove.
2. As a separate explicit action, drop only the objects this file creates: the five tables, the four functions, and their policies. Policies on those tables go away with the tables. Drop storage policies named `concept_images_select`, `concept_images_insert`, `concept_images_update`, and `concept_images_delete` if they remain.
3. Delete the `concept-images` row from `storage.buckets` only after the Storage API shows that the bucket has no objects. Do not `DELETE FROM storage.objects`.
4. Confirm the checks above now show the objects absent.
5. Apply the file again through the migration runner.

**Why a rerun over real data is not recovery**

The file starts with `CREATE OR REPLACE FUNCTION` and then `CREATE TABLE`. On a database that already has people, questions, or concepts, a non-transactional rerun would replace the trigger functions and then fail on the existing tables, leaving new function bodies on live data. A transactional rerun would roll back, but it is still the wrong operation: the version is already applied, and later changes belong in a new migration. This file is not an upsert.

## 9. What static review has and has not shown

The SQL was read. PostgreSQL has not parsed it, and row-level security has not been tested. No V2 database exists.

Static review checked primary keys, foreign keys, the theme-name index, merge guards, title and curation checks, snapshot immutability, grants, the five row-level security policies, and the private bucket settings. It also checked that deleting a question nulls only `concept_questions.question_id`, and that the partial unique index allows more than one detached link on the same concept.

These still require the hosted project:

- The runner's transaction actually rolls a failed attempt back, including the bucket insert.
- `themes_name_per_user_idx` is accepted on that database's collation.
- `storage.buckets` accepts this insert on that project's Storage catalog.
- `select current_setting('server_version_num')` is at least `150000`.
- The smoke tests in section 10, run as two signed-in users through the anon key and their JWTs, not as a database owner.

## 10. Smoke tests after a future apply

Run these as two authenticated users on the new project only, through the same access an application client will have. Do not point the tests at V1. Do not use a service-role key.

1. User A creates a question with original text only and reloads it. The text is unchanged. Empty text and 2001 characters fail.
2. User A adds considered text without changing the original. User A sets disposition to `retained`, then `parked`, then `discarded`, then back to `gathered`.
3. User A merges question B into question A. B's original text is unchanged. Restoring B clears `merged_into_id`. A self-merge fails. A merge into the other user fails. A cycle fails. Merging B into a question that is already merged fails until that question is restored.
4. User A creates a theme with no questions, renames it, links two questions, and deletes the theme. The questions remain. Deleting a question removes its membership and leaves the other theme.
5. User A cannot create `Garden` and then `garden`, or `Garden` and ` Garden `. The duplicate failure is reported as "You already have a theme with this name."
6. User A creates one concept linked to two questions, and a second concept linked to the first question. Both directions exist.
7. User A edits the live original text and considered text. `concepts.for_considered_text` and both link snapshots stay on the earlier wording.
8. User A deletes one source question. The concept, its image path, its title, and the link snapshots remain. `question_id` on that link is null. User A can still read the link. There is no completed column to set.
9. User B cannot read or write User A's questions, themes, memberships, concepts, links, or objects. User B cannot insert a link that names User A's question or concept.
10. User A uploads a PNG, a JPEG, and a WebP at `{user_id}/{concept_id}/{filename}` within 8 MiB, reads each with the user session, replaces one using the sequence in section 6, and deletes one. User B cannot read that prefix. After the concept row is deleted, User A can still delete the remaining object through the Storage API.
11. After a committed path change, a failed remove of the previous object is returned as a cleanup failure. Retrying that same remove is possible. The concept still points at the new path. Success is not reported while the old object remains.
12. A three-word title fails. `Quiet distance` and `Threshold` succeed.
13. No concept row has a completed status. The table has no such column. Saving a concept does not create one.

Until section 10 has been run, this proposal is not evidence that the migration applies.
