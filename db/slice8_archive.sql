-- Slice 8 — archive support
-- Adds an "archived" state to pages so unpublished pages can be moved to an
-- archive (and later permanently deleted from the admin UI).
--
-- Run this in the Supabase SQL editor. `add value if not exists` is idempotent.

alter type public.page_status add value if not exists 'archived';
