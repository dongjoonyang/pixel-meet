-- 익명 인증(auth.users)에 1:1로 붙는 프로필 테이블.
-- 소켓 서버의 실시간 상태(x,y,dir,state...)는 여기 저장하지 않는다 — 그건 휘발성이라 인메모리가 맞고,
-- 여기는 "다시 켰을 때도 남아있어야 하는 것"(캐릭터/닉네임/관심사)만 담당한다.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nick text not null default '',
  age int not null default 27,
  gender text not null default 'X' check (gender in ('M', 'F', 'X')),
  tagline text not null default '',
  interests text[] not null default '{}',
  look jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 지금은 "본인 프로필만 읽고 쓴다"만 필요하다 (매칭 대상 프로필은 아직 socket.io 인메모리로 도는 중).
-- 나중에 상대 프로필을 Supabase에서 직접 읽어야 하면 select 정책을 완화하면 된다.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();
