-- 사진 해석(LLM API) 하루 사용량 제한. Edge Function이 service role로만 호출한다.
create table if not exists public.analyze_usage (
  day date primary key,
  count integer not null default 0
);

alter table public.analyze_usage enable row level security; -- 정책 없음: anon/authenticated 접근 불가

create or replace function public.try_use_analyze(daily_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  used integer;
begin
  insert into analyze_usage (day, count)
  values ((now() at time zone 'Asia/Seoul')::date, 1)
  on conflict (day) do update set count = analyze_usage.count + 1
  returning count into used;
  return used <= daily_limit;
end;
$$;

revoke execute on function public.try_use_analyze(integer) from public, anon, authenticated;
grant execute on function public.try_use_analyze(integer) to service_role;
