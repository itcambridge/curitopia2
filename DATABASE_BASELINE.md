# DATABASE_BASELINE.md

**Project:** Curitopia2\
**Status:** Verified baseline of the hosted Supabase database\
**Purpose:** Record the deployed database state before designing or
applying the Experience capability.\
**Last reviewed:** 13 November 2026

> This document describes the hosted database as inspected during the
> read-only schema audit. It is not a proposed schema, migration plan,
> or approval to change the database.

## 1. Purpose and scope

This document establishes a shared, evidence-based baseline for future
database work.

It distinguishes between objects verified in the hosted database,
migration files recorded by Supabase, changes present in the hosted
database but absent from migration history, repository code or generated
types that refer to objects not present in the hosted database, and
features deliberately not implemented.

The hosted database catalog is the source of truth for what is currently
deployed. Repository migrations and generated types are useful evidence
of intended or historical application structure, but must not be treated
as proof that an object exists in the hosted database.

The inspection was read-only. No database objects, migration history,
application code, or generated types were changed as part of the audit.

## 2. Hosted database inventory

The audit found eight tables in the `public` schema. RLS is enabled on
all eight.

  ------------------------------------------------------------------------------
  Table                       Observed contents                      RLS enabled
  --------------------------- --------------------- ----------------------------
  `ai_rate_policies`          AI endpoint policy                             Yes
                              configuration:        
                              endpoint, maximum     
                              requests and window   
                              duration              

  `ai_request_reservations`   AI request                                     Yes
                              reservation records,  
                              including user,       
                              endpoint and creation 
                              time                  

  `concept_questions`         Links concepts to                              Yes
                              source questions and  
                              stores                
                              original/considered   
                              text snapshots        

  `concepts`                  User-owned concepts,                           Yes
                              titles, considered    
                              wording and image     
                              metadata              

  `curiosities`               User-owned                                     Yes
                              curiosities,          
                              including name, stage 
                              and cover-image path  

  `questions`                 User-owned questions,                          Yes
                              including             
                              original/considered   
                              wording, disposition  
                              and curiosity         
                              membership            

  `theme_questions`           Links themes to                                Yes
                              questions, with user  
                              ownership and         
                              ordering              

  `themes`                    User-owned themes,                             Yes
                              with name and         
                              ordering              
  ------------------------------------------------------------------------------

No views were reported in the inspected `public` schema.

### 2.1 Important observed relationships

The hosted schema uses ownership-aware foreign keys and uniqueness
constraints to keep related records within the same user and, where
applicable, the same curiosity.

-   A curiosity belongs to an authenticated user.
-   Questions belong to a curiosity and user.
-   Concepts belong to a curiosity and user.
-   `concept_questions` links concepts and questions, retaining
    snapshots of the source wording.
-   Themes belong to a user; `theme_questions` links a user's themes to
    that user's questions.
-   A question's `merged_into_id`, when present, refers to another
    question belonging to the same user and curiosity.

The `concept_questions` table preserves source-question wording through
`original_text_snapshot` and optional `considered_text_snapshot`. This
is an existing precedent for retaining provenance when source content
may subsequently change or be removed.

### 2.2 Observed constraints and validation

The audit identified these important constraints:

-   User-owned records reference `auth.users(id)` with cascading
    deletion where reported.
-   Question and concept relationships use composite foreign keys
    incorporating ownership and curiosity membership.
-   Question original and considered text fields have nonblank/length
    validation.
-   Question disposition is restricted to `gathered`, `retained`,
    `parked` or `discarded`.
-   Curiosity stage is restricted to `gather`, `curate`, `visualise`,
    `distil` or `library`.
-   Concept titles are limited to one or two words and 40 characters.
-   Concept image paths are constrained to user-owned storage paths and
    supported image extensions.
-   Curiosity cover-image paths, when present, are constrained to
    user-owned paths and supported image extensions.
-   Theme names and ordering positions are validated.
-   Theme-question ordering positions cannot be negative.

This is a summary of the inspected constraints, not a replacement for
the actual database definitions. Consult the live catalog and migration
SQL before relying on a particular constraint in implementation work.

## 3. Row-level security and ownership

RLS is enabled on all eight `public` tables.

The audit found authenticated-user policies for `SELECT`, `INSERT`,
`UPDATE` and `DELETE` on:

-   `curiosities`
-   `questions`
-   `concepts`
-   `concept_questions`
-   `themes`
-   `theme_questions`

The policies use `auth.uid()` and the row's `user_id` to enforce user
ownership.

Additional restrictive membership policies were found on `questions`,
`concepts` and `concept_questions`. These policies check that the
associated curiosity belongs to the authenticated user. This provides a
second layer of protection beyond the ownership checks on individual
rows.

### 3.1 AI reservation tables

The audit found that:

-   RLS is enabled on `ai_rate_policies` and `ai_request_reservations`.
-   No policies were returned for either table by the `pg_policies`
    inspection.
-   The table ACL was reported as `postgres` only; direct access was not
    granted to `anon`, `authenticated` or `service_role`.
-   The `reserve_ai_request` function is `SECURITY DEFINER`, owned by
    `postgres`, and executable by `authenticated`.
-   RLS is not forced on these tables.

The function could therefore perform privileged writes if called, but
the application audit found no current route calling it. Do not assume
these tables or this function currently enforce application AI usage
limits.

## 4. Hosted migration history

The hosted `supabase_migrations.schema_migrations` table contained
exactly three rows at the time of inspection.

  ---------------------------------------------------------------------------------------------------------------
  Version            Migration name              Repository file                                Hosted history
  ------------------ --------------------------- ---------------------------------------------- -----------------
  `20261026000000`   `initial_v2_schema`         `20261026000000_initial_v2_schema.sql`         Recorded

  `20261028173000`   `curiosities`               `20261028173000_curiosities.sql`               Recorded

  `20261028210000`   `ai_request_reservations`   `20261028210000_ai_request_reservations.sql`   Recorded

  `20261030200000`   `question_branches`         `20261030200000_question_branches.sql`         Not recorded

  `20261102120000`   `curiosity_cover_images`    `20261102120000_curiosity_cover_images.sql`    Not recorded
  ---------------------------------------------------------------------------------------------------------------

The three recorded migrations are the only rows returned by the hosted
migration-history query.

### 4.1 What the recorded migrations establish

**`20261026000000_initial_v2_schema.sql`**

The audit associated this migration with the initial schema objects:
`questions`, `themes`, `theme_questions`, `concepts` and
`concept_questions`. It also includes ownership checks, question merge
and concept provenance protections, authenticated policies, and policies
for the private concept-images storage bucket. The corresponding policy
names were found on the hosted database.

**`20261028173000_curiosities.sql`**

The audit associated this migration with creation of `curiosities`,
addition of `curiosity_id` to questions, concepts and concept-question
links, and restrictive curiosity-membership policies.

**`20261028210000_ai_request_reservations.sql`**

The audit associated this migration with `ai_rate_policies`,
`ai_request_reservations` and the `reserve_ai_request` function. The
migration enables RLS on the two tables but does not create table
policies. It also revokes table access from `anon`, `authenticated` and
`service_role`.

## 5. Migration-history discrepancy: curiosity cover images

The hosted `curiosities` table contains the `cover_image_path` column
and the `curiosities_cover_image_path_shape` check constraint. These
match the changes represented by:

`supabase/migrations/20261102120000_curiosity_cover_images.sql`

However, version `20261102120000` is absent from the hosted migration
history.

The audit therefore establishes that the cover-image change is present
in the hosted schema but is not represented by a migration-history row.

The likely explanation is that the SQL was applied outside the normal
migration runner, for example through the SQL editor. This is an
inference from the catalog and migration-history comparison, not a
directly verified account of how the change was applied.

**Do not apply the cover-image migration as it currently stands.** It
attempts to add an object that already exists in the hosted database and
may fail.

A deliberate migration-history reconciliation is required before
deciding how to manage this migration in future deployments. Do not
manually alter migration history or attempt a repair without first
reviewing the exact migration SQL, hosted definitions and deployment
procedure.

## 6. Question branches: intentionally not implemented

The repository contains:

`supabase/migrations/20261030200000_question_branches.sql`

But the migration version is absent from hosted migration history,
`public.question_branches` does not exist in the hosted database, and
the product decision is not to implement question branches.

This absence is intentional, not an outstanding deployment task.

The audit found that `lib/questions/supabase-branches.ts` still contains
browser-client operations that select, insert and delete from
`question_branches`. The repository's generated `database.types.ts` also
includes the table, despite the table being absent from the hosted
database.

The current code handles missing-table errors (`42P01`, `PGRST205` or
schema-cache errors) by displaying "Branches are not saved yet" and
allowing the workspace to continue.

Treat the branch migration, branch helper and generated type entry as
stale or dormant repository references unless the product decision is
explicitly revisited. Do not deploy the branch migration to make the
current repository types match the hosted database.

## 7. AI usage and cost control

The hosted database contains the AI reservation tables and function
described above. However, the application audit found no calls to:

-   `.from('ai_rate_policies')`
-   `.from('ai_request_reservations')`
-   `.rpc('reserve_ai_request')`

The current image, title and consider routes use `beginAiTurn` in
`lib/ai/policy.ts`. The audit describes this as a lock in the current
application process, rather than a database-backed reservation
mechanism.

The current product/operational decision is to control OpenAI
expenditure by manually adding funds in \$10 increments.
Application-level token or spending limits are not currently part of the
agreed design.

Keep these distinctions clear:

-   The presence of reservation tables does not mean the application
    uses them.
-   The current process-local lock is not a cross-instance or durable
    database reservation mechanism.
-   Manual account top-ups are the chosen financial control; they are
    not equivalent to per-request limits.
-   Do not introduce token limits or wire up the unused reservation
    infrastructure solely because those objects exist.

If the application later runs multiple instances or AI usage patterns
change, review concurrency and cost controls as a separate decision.

## 8. Repository documentation and generated types

The audit found that:

-   `database.types.ts` is ahead of the hosted database because it
    includes `question_branches`.
-   `docs/curiosity-workspace.md` says only the initial schema is
    deployed; this is older than the hosted migration history and live
    schema.
-   The repository has five migration files, while the hosted migration
    history contains three entries.
-   The hosted cover-image change is present but untracked in migration
    history.

These discrepancies should be reflected in repository documentation so
future development work does not mistake intended, stale or untracked
objects for the deployed state.

Generated types should be regenerated from the intended and verified
schema when appropriate. Do not treat generated types as evidence that a
table is deployed.

## 9. Implications for the Experience capability

The Experience capability is a proposed addition. No Experience-specific
database objects were found in the hosted schema during this audit.

In particular, the hosted database currently has no identified tables
for:

-   an Experience associated with a Curiosity;
-   a North Star or its wording history;
-   Concern, Influence or Control circle items;
-   Experience conversation history.

The existing `themes` and `theme_questions` tables are user-owned but
are not curiosity-scoped circles. Do not repurpose them as Experience
circles or North Stars without an explicit design decision.

The existing ownership and curiosity-membership patterns provide useful
precedents for designing new Experience tables. Any new design should
preserve the established user ownership boundary and ensure that
references cannot cross between users or unrelated curiosities.

The current Experience design direction is:

-   one evolving Experience associated with a Curiosity;
-   a North Star representing the user's chosen direction;
-   user-confirmed items in the Concern, Influence and Control circles;
-   optional AI assistance, with suggestions kept separate from adopted
    user content;
-   no permanent conversation transcript unless a separate retention
    decision justifies it.

These are product/design intentions, not deployed database facts. The
Experience schema has not been approved or implemented by this baseline.

## 10. Rules for future database changes

Until the migration discrepancy has been reconciled, use the following
working rules:

1.  **Inspect the hosted database before designing migrations.** Confirm
    the actual live tables, columns, constraints, indexes, functions,
    policies and storage policies relevant to the change.
2.  **Use version-controlled migrations for new database changes.** Do
    not make untracked production changes through ad-hoc SQL unless
    there is an explicitly agreed operational reason and a plan to
    capture the resulting state.
3.  **Do not blindly push pending migration files.** In particular, do
    not push the existing cover-image or question-branches migrations as
    they stand.
4.  **Do not manually edit migration history as a shortcut.** Reconcile
    it deliberately against the exact SQL and live definitions.
5.  **Preserve ownership boundaries.** New user data must be protected
    by appropriate RLS policies and ownership-aware relationships.
6.  **Validate cross-record membership.** Where records belong to a
    Curiosity, ensure references cannot point to another user's
    Curiosity or to a record in a different Curiosity.
7.  **Keep generated types aligned with the intended deployed schema.**
    Regenerate them after approved schema changes; do not use them as a
    substitute for inspecting the host.
8.  **Keep product decisions explicit.** Do not revive deliberately
    excluded features, such as question branches, simply because dormant
    code or a migration file remains in the repository.
9.  **Separate deployed facts from proposals.** Mark proposed Experience
    structures as proposals until approved and migrated.
10. **Verify after deployment.** Inspect the hosted catalog, RLS
    policies and migration history after each migration.

## 11. Outstanding reconciliation work

The following items remain open; this document does not claim they have
been repaired.

-   Decide how to reconcile the unrecorded
    `20261102120000_curiosity_cover_images` change with migration
    history.
-   Review and remove or clearly quarantine the intentionally unused
    question-branch migration, helper and generated type entry,
    according to the repository's normal maintenance approach.
-   Update `docs/curiosity-workspace.md` so it no longer describes an
    obsolete deployment state.
-   Decide whether the unused AI reservation tables and function should
    remain dormant or be removed in a separately planned change. No
    action is required for the Experience MVP.
-   Design and review the Experience data model separately, using this
    verified baseline.

## 12. Audit limitations

This document records the findings supplied by the read-only
hosted-schema and repository audit. It is not a complete database
export.

Before making changes that depend on exact definitions, inspect the live
SQL definitions for the relevant objects. In particular, this document
does not reproduce every policy expression, function body, index
definition, storage policy or grant statement.

The audit established the live table inventory, the reported constraints
and policies, the three migration-history rows, the cover-image
discrepancy, and the absence of `question_branches`. The explanation
that the cover-image SQL was applied outside the migration runner is a
reasoned inference, not a verified execution log.

------------------------------------------------------------------------

**Baseline principle:** The hosted schema tells us what is deployed;
migration history tells us what the migration runner recorded;
repository code and generated types tell us what the application
currently expects. These are related sources of evidence, but they are
not interchangeable.
