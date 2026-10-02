create extension if not exists vector
with schema extensions;

alter table public.books
add column if not exists embedding extensions.vector(768);