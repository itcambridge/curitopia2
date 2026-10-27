# V2 phase 1 database proposal

**Status:** Superseded. Not for V2 deployment. Retained as historical context.  
**Superseded by:** Originally `v2-initial-schema-proposal.md` and `v2-initial-schema-draft.sql`. That clean-schema draft is also superseded. The current persistence design is `v2-revised-schema-proposal.md`.  
**Do not apply** this proposal, `v2-phase1-migration-draft.sql`, or the later clean-schema SQL to the V1 database or to a V2 database.

V2 will use a separate Supabase project and a clean schema. This document proposed additive tables on the V1 database, a backfill from `experiments.question_id`, and keeping `experiments_one_question`. That compatibility plan is withdrawn. The text below is unchanged so the review history remains readable.

**Original status:** Draft for review. Not approved for deployment. The SQL was not executed.  
**Original scope:** `public.themes`, `public.theme_questions`, and `public.investigation_questions` on the existing exploration and experiment tables.  
**Companion:** `v2-phase1-migration-draft.sql` in this folder. That file is not a migration.

Themes are in this release. `theme_investigations` and a `stories` table are not.

## 1. Evidence

### Confirmed from the hosted catalog

The result grid was not stored in the repository. This proposal uses only the live findings stated with the inventory:

- `public.experiments.question_id` exists.
- Unique constraint `experiments_one_question` exists.

The inventory's three ABSENT function signatures are not evidence that those functions are missing. The catalog query compared each function with a type-only identity string. Functions declared with parameter names can fail that comparison while still being present. The V1 migrations declare exactly three such functions:

- `public.create_exploration_with_first_question(uuid, uuid, text, text, text, text, text)`
- `public.exploration_image_owner(text)`
- `public.experiment_thumbnail_owner(text)`

Their presence is unknown. The draft does not alter them.

### V1 source definitions

These are repository facts from `E:\Curitopia\supabase\migrations`, not a second reading of the live catalog.

| Object | Source rule that this release relies on |
|---|---|
| `explorations` | Owner is `user_id`. Delete cascades to questions. Row-level security is enabled and forced in the migration. `user_id` cannot change. A completed exploration stays completed. |
| `questions` | One exploration. `question_text` is the column name, not `body`. Delete cascades from the exploration. The non-empty exploration rule is a deferred constraint trigger. |
| `experiments` | One `user_id`, one `exploration_id`, one `question_id`. `experiments_one_question` is `unique (question_id)`. User, exploration, and question deletes are `ON DELETE RESTRICT`. A trigger rejects changes to those three ids and requires the question to belong to the same exploration as the experiment. |
| `experiment_items` | Belong to one experiment. Delete cascades from the experiment. Kinds, position, body, and the same-experiment item tree stay as they are. |
| Policies | Authenticated owner checks. Questions and items reach the owner through the parent row. `(select auth.uid())` is the form used by the migrations. |
| Stories | No story table. Drafts stay in the browser. |

### Proposed decisions

Decisions below are recommendations in the draft. Section 8 lists the ones that still need an explicit yes before any apply.

- Keep the table name `experiments`. A shared investigation is many rows in `investigation_questions`, not a renamed table.
- Call the link column `experiment_id`.
- Enforce "same exploration" with composite foreign keys.
- Enforce "every experiment keeps a link to `experiments.question_id`" with deferred constraint triggers.
- Backfill one link per existing experiment. Do not create themes from old data.
- Leave `experiments.question_id` and `experiments_one_question` unchanged.
- Keep new writes by the current V1 application working through a sync trigger, without an application release in this phase.

### Outstanding unknowns

The draft's preflight stops if any of these are false. They are not assumed from the decision log.

- Row-level security is enabled and forced on `explorations`, `questions`, and `experiments`.
- `experiments.question_id` and `experiments.exploration_id` are non-null uuids.
- `experiments.created_at` exists.
- No `themes`, `theme_questions`, `investigation_questions`, `theme_investigations`, or `stories` table is already present.
- No experiment points at a question from another exploration.
- Whether `is_hidden`, `focus_image_path`, or `image_path` exist. This release does not read those columns.
- Which body of `validate_question_rules` or `experiment_thumbnail_owner` is installed.
- Whether the hosted migration-history table contains these versions.
- How many experiments exist. The draft counts them and does not select question text, titles, or user records.

## 2. Schema

`questions.id`, `themes.id`, and `experiments.id` are already or will be primary keys. A composite foreign key can only reference columns covered by a primary key or unique constraint, so the draft adds:

- `questions_id_exploration_key` unique `(id, exploration_id)`
- `experiments_id_exploration_key` unique `(id, exploration_id)`
- `themes_id_exploration_key` unique `(id, exploration_id)`

These constraints do not replace `experiments_one_question`. They make the same-exploration foreign keys possible. `questions.id` and `experiments.id` are already unique, so the new constraints do not reject any current row.

### `themes`

| Column | Rule |
|---|---|
| `id` | uuid primary key. The application supplies it, as it does for explorations and questions. |
| `exploration_id` | Not null. Foreign key to `explorations.id` `ON DELETE CASCADE`. |
| `name` | Not null, trimmed, 1 to 120 characters. Same limit as an exploration title. The draft does not add a uniqueness constraint. That is not a product approval; see section 8. |
| `position` | Integer `>= 0`. Unique per exploration. A before-insert trigger assigns `max(position) + 1` and locks the exploration row, matching questions. Later updates may reorder. |
| `created_at`, `updated_at` | `timestamptz`, default `now()`. Updates set `updated_at`. |

A theme has no `user_id`. Ownership is the parent exploration's `user_id`. `exploration_id` cannot be changed after insert.

An empty theme is allowed. Organisation can start with a name before any question is grouped.

### `theme_questions`

| Column | Rule |
|---|---|
| `theme_id`, `question_id` | Composite primary key. A question appears at most once in a theme. |
| `exploration_id` | Not null. Must match both parents. |
| `position` | Integer `>= 0`. Unique per theme. Assigned on insert by the same kind of trigger, which locks the theme row. |
| `created_at` | `timestamptz`, default `now()`. |

Foreign keys:

- `(theme_id, exploration_id)` references `themes (id, exploration_id)` `ON DELETE CASCADE`
- `(question_id, exploration_id)` references `questions (id, exploration_id)` `ON DELETE CASCADE`

The key columns cannot be updated. Reordering updates `position`. Removing a membership deletes the row.

There is no link row when a question has no theme. Several rows, in different themes, are how one question belongs to several themes.

### `investigation_questions`

| Column | Rule |
|---|---|
| `experiment_id`, `question_id` | Composite primary key. |
| `exploration_id` | Not null. Must match the experiment and the question. |
| `created_at` | `timestamptz`, default `now()`. |

Foreign keys:

- `(experiment_id, exploration_id)` references `experiments (id, exploration_id)` `ON DELETE CASCADE`
- `(question_id, exploration_id)` references `questions (id, exploration_id)` `ON DELETE CASCADE`

`experiment_id`, `question_id`, and `exploration_id` cannot be updated.

`ON DELETE CASCADE` on the question side does not replace `experiments.question_id ON DELETE RESTRICT`. Section 6 explains why both are required.

This table does not reference `themes`. A theme is not required to start or keep an investigation.

### Columns omitted from this release

`themes.description` and `investigation_questions.relationship_note` are not in the draft.

The entity diagram includes both. `USER_JOURNEYS.md` still asks whether a theme needs a description or only a name, and the first V2 interface has no theme editor and no investigation-link form. The journey line "users can see why an investigation relates to each question" can be met by showing the linked question. It does not require a stored note. Either column can be added later without rewriting existing rows. Omitting them is a schema choice for this draft, not a decision that the product will never store those fields.

### Names and hidden questions

Theme-name uniqueness is not specified by the entity model or the journeys. The draft allows repeated names inside one exploration. That is the draft's behaviour, not an approval.

`ENTITY_RELATIONSHIP_MODEL.md` says hiding or unprioritising a question must not delete theme links or investigation links. This draft follows that sentence. Hide is an update of `is_hidden`, when that column exists. No foreign key deletes a link on update. The draft does not decide whether a later screen shows those links.

### Same-exploration enforcement

A trigger can compare the two parents' `exploration_id` values. That is what `experiments_match_origin` already does for the single legacy question. A trigger is easier to omit during a later import, and `session_replication_role = replica` skips ordinary triggers.

A composite foreign key stays in force for those cases. The link stores `exploration_id`, and each parent reference includes that same column. The question side and the theme or experiment side then have to be the same exploration. The extra unique constraints above are the cost.

Do not add a foreign key from `investigation_questions (experiment_id, question_id)` to `experiments (id, question_id)`. That key would force every link to equal the legacy `question_id` and would make the many-question relationship impossible.

The legacy "original question remains linked" rule is not a foreign key for that reason. The draft uses two deferred constraint triggers:

- After an experiment insert, a link for `experiments.question_id` and the same `exploration_id` must exist at commit.
- After a link delete, if that experiment still exists and its `question_id` is the deleted question, the link must still exist at commit.

The sync trigger inserts that original link. The deferred checks reject a commit that lost it. Deleting the experiment itself still works: by commit the experiment row is gone, so the delete check has nothing left to protect. Additional links are not protected by that check and can be removed.

### Indexes

Unique constraints create indexes for primary keys, `(exploration_id, position)` on themes, and `(theme_id, position)` on theme memberships. The draft also adds:

- `theme_questions_question_idx` on `(question_id)`
- `investigation_questions_question_idx` on `(question_id)`
- `investigation_questions_exploration_idx` on `(exploration_id)`

PostgreSQL does not index the referencing side of a foreign key automatically. Those three indexes are the lookups "which themes include this question" and "which investigations include this question or exploration".

### What `experiments_one_question` still means

`unique (question_id)` remains. A question is still the legacy question of at most one experiment.

The new table can still record a many-to-many relationship:

- Experiment A has `question_id = Q1` and links to Q1 and Q2.
- Experiment B cannot use `question_id = Q1`, because of the old unique constraint.
- Experiment B can use `question_id = Q3` and also link to Q1.

Q1 then belongs to two investigations. V1 still opens Q1 through experiment A only, because V1 reads `experiments.question_id`. Removing that limitation is a later migration.

## 3. Backfill and inconsistencies

The backfill inserts one `investigation_questions` row per experiment:

- `experiment_id = experiments.id`
- `question_id = experiments.question_id`
- `exploration_id = experiments.exploration_id`
- `created_at = experiments.created_at`

It uses `ON CONFLICT (experiment_id, question_id) DO NOTHING`, so a retried insert does not duplicate the link. It does not update or delete experiments, questions, or items. It does not invent themes.

Before any new table is created, the draft counts experiments whose question belongs to a different exploration. The count must be zero. The exception message contains that count and no question text.

| Condition | What the draft does |
|---|---|
| Count of cross-exploration experiment questions is greater than zero | Raises and rolls the transaction back. Leaves the rows for a separate review. Does not delete or rewrite them. |
| `question_id` is nullable or not uuid | Preflight raises before the backfill. |
| An experiment's `question_id` has no question row | Preflight counts those rows and raises before creating tables. The existing foreign key should already make this count zero. |
| A second experiment already uses the same `question_id` | `experiments_one_question` already rejects that row. No extra handling. |
| The new tables already exist | Preflight raises. Re-applying requires the reviewed rollback first. |
| Backfill inserts fewer legacy links than there are experiments | Post-check raises. Expected cause: a row the composite key rejected. |
| Extra links whose question differs from `experiments.question_id` | Post-check raises. The backfill does not create those. |
| Zero experiments | Valid. The post-check expects zero legacy links. |

After a failure, the next step is the count query in the draft, then a separately approved repair. This draft has no repair branch.

## 4. V1 write path and compatibility

### What the application does

Experiment creation is `openExperiment` in `E:\Curitopia\lib\experiments\actions.ts`. After checking the signed-in claims, it inserts with the server Supabase client:

- `id`
- `user_id` from the session subject
- `exploration_id`
- `question_id`

That client is `createClient` in `lib/supabase/server.ts`. It uses `lib/supabase/env.ts`, which reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, plus the request cookies. The browser client uses the same two variables. No module builds a service-role client. `docs/ARCHITECTURE.md` says `SUPABASE_SERVICE_ROLE_KEY` is not required for this phase. A test asserts the focus-image route source does not mention that name.

The V1 experiment migration revokes `service_role` from `experiments` and `experiment_items`. This draft does the same for the three new tables.

### Trigger privileges

PostgreSQL requires `EXECUTE` on a trigger function in order to create or replace the trigger. That check is not repeated when the trigger fires. Firing runs the function as the role that queued the event, unless the function is `SECURITY DEFINER`, in which case it runs as the function owner. Statements inside the function are then checked with that role's table privileges and row-level security.

The V1 script revokes `EXECUTE` on `experiments_match_origin()` from `authenticated` after the trigger already exists. That revoke does not stop the existing trigger from firing. It stops a later `CREATE TRIGGER` by `authenticated`, and it stops an ordinary call. The call would fail anyway because the function returns `trigger`. This draft does not change that revoke, and it does not grant `service_role` because of it.

### Sync trigger

`experiments_sync_question_link()` stays `security invoker`. The signed-in user inserts the experiment. The trigger then inserts the original link as that same user. `authenticated` has `INSERT` on `investigation_questions`. The insert policy accepts the row when the new experiment's `user_id` is `auth.uid()`, the link's `exploration_id` matches that experiment, and the question's exploration belongs to the same user. `openExperiment` sets `user_id` from the session subject, and the question it sends is already in that exploration, so this is the row the policy allows.

The draft also grants `EXECUTE` on the function to `authenticated`. That grant matters for creating the trigger. It is not what allows the trigger to fire. The local test revokes it and inserts again. `service_role` receives neither table privileges nor `EXECUTE`.

An invoker trigger fails closed when `auth.uid()` is null: the link insert fails the experiment insert. A definer trigger would write the link even when the session could not. That is more privilege than V1 uses. The required privilege is the `INSERT` grant, which V2 also needs for additional links.

### Deferred checks

`experiments_require_question_link()` and `investigation_questions_keep_legacy_link()` are `security invoker` as well. They only select and raise. The role that can insert an experiment or delete a link can also select those rows: the policies use the same owner predicate for select, insert, and delete. Under that visibility the checks still see a missing original link and still reject its removal.

`SECURITY DEFINER` is not required for that result. It would only change the outcome if a later policy allowed a change by a role that cannot select the parent. The current policies do not do that. Keeping the checks as invoker avoids a definer read of every owner's rows. The checks themselves are unchanged. The local deletion cases are what show they still reject the original link.

### Readers during the transition

V1 reads `explorations`, `questions`, `experiments.question_id`, and `experiment_items`. None of those columns or policies change. Old queries do not mention the new tables.

V1 writes keep using the same tables:

- Creating an exploration and its first question is unchanged.
- Creating an experiment still inserts `question_id`. The sync trigger adds the matching link. The experiment insert fails if that link cannot be stored.
- V1 cannot change `question_id`, `exploration_id`, or `user_id`. `experiments_match_origin` remains the reason.
- Deleting an experiment deletes its items and its investigation links. Questions and themes remain.
- Deleting a question that is some experiment's `question_id` is still rejected by the old foreign key.
- V1 never writes themes.

V1 will not show additional links or theme memberships. A V2 client reads the join tables and must treat `experiments.question_id` as the original link, not as the full set. The sync trigger only inserts that original link. Additional links are inserted by the V2 client.

## 5. Security

Row-level security is enabled and forced on all three new tables.

Privileges match the exploration migration: `select`, `insert`, `update`, and `delete` for `authenticated`; those privileges revoked from `public`, `anon`, and `service_role`. Trigger functions are granted to `authenticated` and revoked from `public`, `anon`, and `service_role`. A trigger function cannot be called as a normal query. That execute grant is for creating a trigger. Firing uses the queuing role's table privileges, described in section 4.

Policies use `(select auth.uid())` and the parent owner.

| Table | Rule |
|---|---|
| `themes` | The parent exploration's `user_id` is the current user, on select, insert, update, and delete. |
| `theme_questions` | The theme's exploration is owned by the current user, and the question's exploration is owned by the current user. Insert and update check both. |
| `investigation_questions` | The experiment is owned by the current user, its `exploration_id` matches the link, and the question's exploration is owned by the current user. |

The composite foreign keys remain the constraint that stops a cross-exploration pair even for a role that bypasses row-level security. The policies stop a normal signed-in user from reading or writing another owner's rows. Both are required. Catalog output that shows the policy text does not prove either one.

The privilege split is in section 4. The sync trigger and the deferred checks are `security invoker`.

## 6. Deletion

Existing foreign keys are not altered. `experiments.question_id` remains `ON DELETE RESTRICT`. `experiments_one_question` is not changed.

`ON DELETE CASCADE` from `questions` to `investigation_questions` is the right action for an additional association. It is not sufficient by itself, and it does not weaken the legacy key.

PostgreSQL applies every foreign-key action for the deleted row in that statement. `experiments.question_id` and `investigation_questions.question_id` are different references:

- The original question is referenced by `experiments.question_id`. `RESTRICT` rejects the delete while that experiment exists. The investigation stays. If a cascade removed a link earlier in the same statement, the statement error rolls that change back. That rollback behaviour is standard and still untested here.
- A question that is only an additional link is not referenced by `experiments.question_id`. `CASCADE` deletes those link rows and leaves the experiment. Theme memberships also cascade, so a theme link does not block that delete.
- A question that is both the original question of one experiment and an additional link of another is still blocked, because the legacy `RESTRICT` sees the first experiment.

`ON DELETE RESTRICT` on `investigation_questions.question_id` would not do this. It would also block deletion of a question that is only an additional link.

The deferred trigger still protects the original link row. Deleting that row, while the experiment and its `question_id` remain, fails at commit. Deleting an additional link row is allowed. Deleting the experiment cascades its links; by commit the experiment is gone, so the trigger has nothing to protect.

Unlinking in the journey is broader than this compatibility rule. During this phase the original `question_id` link cannot be removed. Additional questions can be unlinked without deleting the experiment or its items. A confirmation dialog is application behaviour and is not in this release.

| Delete | Result |
|---|---|
| Theme | Theme and its memberships go. Questions, experiments, items, and investigation links stay. |
| Theme membership | That row goes. Theme and question stay. |
| Experiment | Experiment, items, and investigation links go. Questions and themes stay. |
| Additional investigation link | That row goes. The experiment stays. |
| Original investigation link | Rejected while `experiments.question_id` still points at that question. |
| Question used only as an additional link, including one that also has theme memberships | Question, memberships, and those links go. Each investigation stays. The non-empty exploration rule still applies. |
| Original question | Rejected by `experiments.question_id ON DELETE RESTRICT`. Links stay because the statement does not commit. |
| Exploration | Themes would cascade. An exploration that still has an experiment cannot be deleted, because `experiments.exploration_id` is `ON DELETE RESTRICT`. |
| User | Unchanged. Experiments still restrict deletion of `auth.users` while an experiment exists. |

## 7. Local test plan

This plan has not passed. Passing it is required before the draft can be called valid SQL or approved for the hosted project. Do not run it against hosted Supabase.

An attempt on 24 October 2026 prepared the scratch project and copied the seven V1 migration files, then ran `npx supabase start`. Docker Desktop was not running at first; starting it brought the client up (29.1.2). The Postgres image then failed to commit: Docker reported an input/output error and a read-only filesystem. The system drive had about 0.19 GB free at that point. No seed, draft, rollback, or behaviour file was executed. The scratch stack was not left running.

### Prerequisites

Use a scratch Supabase project, not `E:\Curitopia` and not the hosted project. Docker runs the database locally. The CLI is `npx --yes supabase@latest`. No service-role key is required.

```text
scratch = a new empty directory
npx supabase init
copy E:\Curitopia\supabase\migrations\*.sql into scratch\supabase\migrations
npx supabase start
```

`supabase start` applies those V1 files to the local database and prints a local API URL. Ignore any service-role key it prints. Do not run `supabase link`, `supabase db push`, or `supabase db pull`.

Then, with `npx supabase db query --local -f <file>` from the scratch directory, in this order:

1. `v2-phase1-local-seed.sql` creates two experiments and no themes.
2. `v2-phase1-migration-draft.sql` backfills those experiments.
3. `v2-phase1-local-rollback.sql` checks the backfill, drops the phase-1 objects, and checks that the experiments and `experiments_one_question` remain.
4. `v2-phase1-migration-draft.sql` again.
5. `v2-phase1-local-test.sql` runs the authenticated cases inside one transaction and rolls them back.

Stop the scratch project with `npx supabase stop` when finished. Do not point the V1 app at it.

The behaviour test sets `request.jwt.claims`, `request.jwt.claim.sub`, and the role `authenticated`, as `tests.authenticate_as` does in `E:\Curitopia\supabase\tests\experiments_rls.test.sql`. It does not use `service_role`. Assertions use ids and counts.

### Cases

1. **Backfill before any V2 rows.** Seed one exploration, two questions, and two experiments whose `question_id` values differ. Apply the draft. Every experiment has one link with the same `question_id` and `exploration_id`. Theme and membership counts are zero. `experiments_one_question` is still unique on `question_id`.
2. **Rollback before V2 data.** Run the commented rollback on that database, still before any theme or extra link. The three new tables and their functions are gone. The added unique constraints are gone. Experiments, questions, and `experiments_one_question` remain. A second apply of the draft succeeds.
3. **V1-style insert.** As `authenticated`, insert an experiment the way `openExperiment` does: client uuid, `user_id` equal to the session subject, `exploration_id`, `question_id`. One original link exists. `authenticated` has no `execute` on `experiments_match_origin`, which is the V1 revoke, and the insert still fires that trigger. Revoke `execute` on `experiments_sync_question_link` from `authenticated` and insert another experiment for a different question. The link is still created. Grant that execute privilege back inside the same transaction; the final rollback also restores it. A second experiment for the same `question_id` fails on `experiments_one_question`. The behaviour file catches that failure and continues. Deferred checks are made immediate before the file rolls back, so they run rather than being discarded.
4. **Several questions, one investigation.** As the owner, insert a second link on the experiment from case 3, using another question in the same exploration. The experiment still has its original `question_id`. Both links are present. Items inserted into `experiment_items` stay one copy.
5. **Same exploration.** Inserting a link whose question belongs to another exploration fails on the composite foreign key. Repeat as the table owner, not only as `authenticated`. A theme membership with mismatched `exploration_id` fails the same way.
6. **Two-user isolation.** A second authenticated user selects no rows from the first user's themes, memberships, or investigation links. Insert, update, and delete against those ids write nothing. `anon` has no privileges on the three tables. `service_role` has none either.
7. **Cross-user writes.** The second user cannot insert a theme into the first user's exploration, cannot attach the first user's question, and cannot add a link on the first user's experiment.
8. **Deletion.** Delete a theme: questions and the experiment remain. Delete an additional link row: the experiment and its original link remain. Delete the original link row: the transaction fails and the link remains. Delete a question that is only an additional link and also a theme member: the question, membership, and extra link go; the experiment and its items remain. Delete the original question: the delete fails and every link remains. Delete the experiment: items and links go; questions remain.
9. **Hide.** If `is_hidden` exists, set it on a linked question. The theme membership and investigation link counts stay the same.
10. **Legacy constraint after every case.** `experiments_one_question` is still a unique constraint whose definition contains `question_id`.

Catalog output from the draft's own checks is not a substitute for cases 6 through 8. A superuser session bypasses row-level security.

## 8. Decisions still requiring approval

The draft now has one deletion design and omits the two optional text columns. These choices are still part of an unapproved draft. They are not a request to apply SQL.

1. Apply this release to the hosted project only after the local plan passes and the hosted preflight passes.
2. Theme names may repeat inside an exploration. Nothing in the entity model or the journeys agrees that rule. The draft simply has no uniqueness constraint.
3. The link column is `experiment_id`, not `investigation_id`.
4. Empty themes are allowed, in both Quickfire and Focus.
5. Hidden questions keep their links, because the entity model already says hiding must not delete them. How a screen displays those links is not decided here.
6. `themes.description` and `relationship_note` stay out until a screen needs them. The journey question about a theme description remains open.
7. `theme_investigations` and `stories` stay out of this release.
8. `experiments.question_id` and `experiments_one_question` stay through the compatibility period.
9. During this phase, the original question link cannot be unlinked. The journey's broader unlink behaviour waits until that column is no longer the compatibility key.

## 9. Risks

- The SQL has not been executed. A local start on 24 October 2026 stopped while Docker was committing the Postgres image; the system drive had about 0.19 GB free and the container filesystem was read-only. Statement order inside one PostgreSQL delete, including `RESTRICT` after a cascade in the same statement, is untested.
- The Supabase SQL Editor can commit statement by statement. The draft starts with `begin` and ends with `commit`. A partial run can leave objects behind. The rollback comments are the recovery, and they are not part of the forward run.
- The backfill runs with the migration role's privileges and bypasses row-level security if that role is a superuser. The foreign keys still apply. Cases 6 and 7 are the isolation evidence.
- Adding unique constraints locks `questions` and `experiments` while PostgreSQL builds the indexes.
- V2 can attach questions that V1 will not display.
- `experiments_one_question` still blocks a second experiment from using a question as its legacy `question_id`.
- The deferred checks are security invoker. They depend on the acting owner being able to select the rows the policies already let that owner change. A later policy that splits those privileges would make a missing-link check fail open.
- `EXECUTE` is a create-trigger privilege. The local test still has to show that the V1 revoke does not block an authenticated experiment insert.
- The three function-signature inventory rows must not be used to decide that create, image-owner, or thumbnail-owner functions are absent.

## 10. Rollback

Rollback is commented at the bottom of the SQL draft. It drops the experiment triggers that this draft adds, then the three new tables, then their functions, then `questions_id_exploration_key` and `experiments_id_exploration_key`. It does not drop `explorations`, `questions`, `experiments`, or `experiment_items`, and it does not drop `experiments_one_question`.

Rollback deletes backfilled links and any themes created after apply. Case 2 runs it before V2 data exists. Using it after real themes or extra links is a separate reviewed operation.
