create or replace function public.match_books(
  query_embedding extensions.vector(768),
  match_count integer default 10,
  match_threshold double precision default 0.50
)
returns table (
  id uuid,
  book_code text,
  title text,
  author text,
  category text,
  publisher text,
  publish_year integer,
  available integer,
  quantity integer,
  description text,
  similarity double precision
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.id,
    b.book_code,
    b.title,
    b.author,
    b.category,
    b.publisher,
    b.publish_year,
    b.available,
    b.quantity,
    b.description,
    1 - (b.embedding OPERATOR(extensions.<=>) query_embedding) as similarity
  from public.books b
  where b.status <> 'archived'
    and b.embedding is not null
    and 1 - (b.embedding OPERATOR(extensions.<=>) query_embedding) >= match_threshold
  order by b.embedding OPERATOR(extensions.<=>) query_embedding
  limit greatest(match_count, 1);
$$;

revoke all on function public.match_books(
  extensions.vector,
  integer,
  double precision
) from public;

grant execute on function public.match_books(
  extensions.vector,
  integer,
  double precision
) to authenticated;