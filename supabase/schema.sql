-- FitTrack: ระบบสมาชิก อันดับ การแข่งขัน (P2–P5)
-- รันซ้ำได้ (idempotent) · ทุกการเขียนข้อมูลผ่าน api/social.js ด้วย service role
-- เบราว์เซอร์ไม่เข้าถึงตารางตรง ๆ: เปิด RLS ทุกตารางและไม่มี policy ให้ anon/authenticated

-- ── ตาราง ──
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 2 and 24),
  sex text check (sex in ('male', 'female', 'other')),
  age_group text check (age_group in ('u18', '18-24', '25-34', '35-44', '45+')),
  friend_code text not null unique default substr(md5(random()::text || clock_timestamp()::text), 1, 8),
  is_admin boolean not null default false,
  banned boolean not null default false,
  consent_at timestamptz not null default now(),
  guardian_consent boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id bigint generated always as identity primary key,
  name text not null unique check (char_length(name) between 2 and 30),
  invite_code text not null unique default substr(md5(random()::text || clock_timestamp()::text), 1, 8),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id bigint not null references public.teams (id) on delete cascade,
  user_id uuid not null unique references public.profiles (id) on delete cascade,   -- 1 คน 1 ทีม
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table if not exists public.friends (
  user_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

-- การแข่งขัน: event (ผู้ดูแลสร้าง) / duel (ท้าดวล 1:1) / team (ทีม vs ทีม)
create table if not exists public.challenges (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('event', 'duel', 'team')),
  title text not null check (char_length(title) between 2 and 80),
  exercise text not null check (exercise in ('pushup', 'squat', 'plank')),
  mode text not null check (mode in ('timed60', 'max', 'hold')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_by uuid references public.profiles (id) on delete set null,
  opponent uuid references public.profiles (id) on delete set null,
  team_a bigint references public.teams (id) on delete cascade,
  team_b bigint references public.teams (id) on delete cascade,
  invite_code text not null unique default substr(md5(random()::text || clock_timestamp()::text), 1, 8),
  status text not null default 'open' check (status in ('open', 'active', 'closed', 'declined')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.challenge_members (
  challenge_id bigint not null references public.challenges (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

create table if not exists public.entries (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  exercise text not null check (exercise in ('pushup', 'squat', 'plank', 'cardio_min', 'distance_km')),
  mode text not null check (mode in ('timed60', 'max', 'hold', 'week')),
  value numeric not null check (value >= 0 and value <= 100000),
  seconds integer not null default 0 check (seconds >= 0),
  source text not null default 'camera' check (source in ('camera', 'strava')),
  status text not null default 'ok' check (status in ('ok', 'review', 'rejected')),
  flags text[] not null default '{}',
  trace smallint[],
  proof_path text,
  strava_id text,
  created_at timestamptz not null default now(),
  unique (user_id, strava_id)
);
create index if not exists entries_board on public.entries (exercise, mode, status, created_at);
create index if not exists entries_user on public.entries (user_id, created_at);

-- ผลที่นับเข้าการแข่งขัน (หนึ่ง entry นับได้หลายรายการ)
create table if not exists public.challenge_entries (
  challenge_id bigint not null references public.challenges (id) on delete cascade,
  entry_id bigint not null references public.entries (id) on delete cascade,
  primary key (challenge_id, entry_id)
);

create table if not exists public.reports (
  id bigint generated always as identity primary key,
  entry_id bigint not null references public.entries (id) on delete cascade,
  reporter uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (char_length(reason) between 2 and 300),
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (entry_id, reporter)
);

create table if not exists public.badges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  code text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, code)
);

-- จำกัดการสมัครต่อ IP (กันสแปม)
create table if not exists public.signup_log (
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists signup_log_ip on public.signup_log (ip_hash, created_at);

-- ── RLS: ปิดการเข้าถึงตรงจากเบราว์เซอร์ทั้งหมด (service role ข้าม RLS) ──
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.friends enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_members enable row level security;
alter table public.entries enable row level security;
alter table public.challenge_entries enable row level security;
alter table public.reports enable row level security;
alter table public.badges enable row level security;
alter table public.signup_log enable row level security;

-- ── อันดับ: ค่าดีที่สุดต่อคน (max) หรือผลรวม (sum) เฉพาะผลที่ผ่านการตรวจ ──
drop function if exists public.leaderboard(text, text, timestamptz, timestamptz, text, text, uuid[], bigint, text, int);
create or replace function public.leaderboard(
  p_exercise text, p_mode text, p_since timestamptz default '-infinity', p_until timestamptz default 'infinity',
  p_sex text default null, p_age text default null, p_users uuid[] default null,
  p_challenge bigint default null, p_agg text default 'max', p_limit int default 50
) returns table (rank bigint, user_id uuid, display_name text, team text, value numeric, at timestamptz, proof boolean, entry_id bigint)
language sql stable security definer set search_path = public as $$
  with e as (
    select en.* from entries en
    join profiles p on p.id = en.user_id and not p.banned
    where en.exercise = p_exercise and en.mode = p_mode and en.status = 'ok'
      and en.created_at >= p_since and en.created_at < p_until
      and (p_sex is null or p.sex = p_sex) and (p_age is null or p.age_group = p_age)
      and (p_users is null or en.user_id = any (p_users))
      and (p_challenge is null or exists (select 1 from challenge_entries ce where ce.entry_id = en.id and ce.challenge_id = p_challenge))
  ), best as (   -- ผลที่ดีที่สุดของแต่ละคน (ใช้แสดง/รายงาน)
    select distinct on (e.user_id) e.user_id, e.id, e.value, e.created_at, e.proof_path
    from e order by e.user_id, e.value desc, e.created_at asc
  ), per_user as (
    select b.user_id,
      case when p_agg = 'sum' then (select sum(x.value) from e x where x.user_id = b.user_id) else b.value end as value,
      b.created_at as at, b.proof_path is not null as proof,
      case when p_agg = 'sum' then null else b.id end as entry_id
    from best b
  )
  select rank() over (order by pu.value desc), pu.user_id, p.display_name,
    (select t.name from team_members tm join teams t on t.id = tm.team_id where tm.user_id = pu.user_id),
    pu.value, pu.at, pu.proof, pu.entry_id
  from per_user pu join profiles p on p.id = pu.user_id
  order by pu.value desc, pu.at asc
  limit least(greatest(p_limit, 1), 200);
$$;
revoke all on function public.leaderboard from public, anon, authenticated;
grant execute on function public.leaderboard to service_role;

-- คะแนนทีมในการแข่ง team: ผลรวมค่าดีที่สุดของสมาชิกแต่ละคน
create or replace function public.team_scores(p_challenge bigint)
returns table (team_id bigint, team text, score numeric, members bigint)
language sql stable security definer set search_path = public as $$
  with c as (select * from challenges where id = p_challenge),
  best as (
    select tm.team_id, en.user_id, max(en.value) as v
    from challenge_entries ce join entries en on en.id = ce.entry_id and en.status = 'ok'
    join team_members tm on tm.user_id = en.user_id
    where ce.challenge_id = p_challenge and tm.team_id in ((select team_a from c), (select team_b from c))
    group by tm.team_id, en.user_id
  )
  select t.id, t.name, coalesce(sum(b.v), 0), count(b.user_id)
  from teams t left join best b on b.team_id = t.id
  where t.id in ((select team_a from c), (select team_b from c))
  group by t.id, t.name;
$$;
revoke all on function public.team_scores from public, anon, authenticated;
grant execute on function public.team_scores to service_role;

-- ── ที่เก็บวิดีโอหลักฐาน (ส่วนตัว อ่านได้ผ่าน signed URL จาก server เท่านั้น) ──
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('proofs', 'proofs', false, 26214400, array['video/webm', 'video/mp4'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
