-- Additive optional cover image for a curiosity.
-- Do not edit earlier migrations. Do not apply this file until it has been reviewed.
-- Existing curiosity rows stay in place. The new column is null for every current row.
-- This file does not delete questions, concepts, concept_questions, curiosities, or storage.objects.
-- It does not change concepts.image_path and it does not create a second bucket.
-- Cover files, when uploaded by the app, use the existing private concept-images bucket:
--   {user_id}/covers/{curiosity_id}/{object}.{jpg|png|webp}
-- The column may later hold a concept image path owned by the same user:
--   {user_id}/{concept_id}/kept.{png|jpeg|jpg|webp}
-- Removing a cover in the application must not delete an object still used by a concept
-- or by another curiosity. This migration does not delete any object.

alter table public.curiosities
  add column cover_image_path text;

comment on column public.curiosities.cover_image_path is
  'Optional private object path in the concept-images bucket. Null when the curiosity has no cover. Upload paths are {user_id}/covers/{curiosity_id}/{file}. A later cover may instead reference that user''s concept image path. Do not delete the object while a concept or another curiosity still references it.';

alter table public.curiosities
  add constraint curiosities_cover_image_path_shape check (
    cover_image_path is null
    or (
      char_length(cover_image_path) between 1 and 300
      and cover_image_path = btrim(cover_image_path)
      and cover_image_path !~ '\.\.'
      and cover_image_path ~ (
        '^' || user_id::text || '/([^/]+/)+[^/]+\.(png|jpeg|jpg|webp)$'
      )
    )
  );
