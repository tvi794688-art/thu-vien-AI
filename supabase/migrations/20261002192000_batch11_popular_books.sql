create or replace function public.get_popular_books(limit_count integer default 10)
returns table (
  book_id uuid,
  borrow_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    l.book_id,
    count(*) as borrow_count
  from public.loans l
  join public.books b on b.id = l.book_id
  where b.status <> 'archived'
  group by l.book_id
  order by borrow_count desc, l.book_id
  limit greatest(limit_count, 1);
$$;

revoke all on function public.get_popular_books(integer) from public;
grant execute on function public.get_popular_books(integer) to authenticated;