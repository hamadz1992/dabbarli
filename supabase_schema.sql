-- دليل خدماتنا V6
-- نفّذ هذا الملف داخل Supabase > SQL Editor

create extension if not exists pgcrypto;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  specialty text not null,
  phone text not null,
  whatsapp text,
  facebook text,
  image_url text,
  area text,
  details text,
  link text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  fingerprint text not null,
  created_at timestamptz not null default now(),
  unique(service_id, fingerprint)
);

create table if not exists public.category_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(select 1 from public.admins where user_id = auth.uid());
$$;

alter table public.services enable row level security;
alter table public.ratings enable row level security;
alter table public.category_requests enable row level security;
alter table public.news enable row level security;
alter table public.admins enable row level security;

drop policy if exists "public read approved services" on public.services;
create policy "public read approved services"
on public.services for select
using (status = 'approved' or public.is_admin());

drop policy if exists "public submit service" on public.services;
create policy "public submit service"
on public.services for insert
with check (status = 'pending');

drop policy if exists "admins update services" on public.services;
create policy "admins update services"
on public.services for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins delete services" on public.services;
create policy "admins delete services"
on public.services for delete
using (public.is_admin());

drop policy if exists "public read ratings" on public.ratings;
create policy "public read ratings"
on public.ratings for select
using (true);

drop policy if exists "public add rating" on public.ratings;
create policy "public add rating"
on public.ratings for insert
with check (rating between 1 and 5);

drop policy if exists "public submit category request" on public.category_requests;
create policy "public submit category request"
on public.category_requests for insert
with check (status = 'pending');

drop policy if exists "admins read category requests" on public.category_requests;
create policy "admins read category requests"
on public.category_requests for select
using (public.is_admin());

drop policy if exists "admins update category requests" on public.category_requests;
create policy "admins update category requests"
on public.category_requests for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "public read active news" on public.news;
create policy "public read active news"
on public.news for select
using (active = true or public.is_admin());

drop policy if exists "admins insert news" on public.news;
create policy "admins insert news"
on public.news for insert
with check (public.is_admin());

drop policy if exists "admins update news" on public.news;
create policy "admins update news"
on public.news for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins read own admin row" on public.admins;
create policy "admins read own admin row"
on public.admins for select
using (user_id = auth.uid());

-- Storage bucket للصور، عام للعرض فقط.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'service-images',
  'service-images',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = true, file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "public view service images" on storage.objects;
create policy "public view service images"
on storage.objects for select
using (bucket_id = 'service-images');

drop policy if exists "public upload service images" on storage.objects;
create policy "public upload service images"
on storage.objects for insert
with check (bucket_id = 'service-images');

drop policy if exists "admins delete service images" on storage.objects;
create policy "admins delete service images"
on storage.objects for delete
using (bucket_id = 'service-images' and public.is_admin());

-- بعد إنشاء حساب المدير من Authentication > Users،
-- ضع UUID الخاص به في هذا الجدول:
-- insert into public.admins(user_id) values ('UUID-هنا');

insert into public.news(text, active)
select 'تمت إضافة خدمات جديدة إلى دليل خدماتنا', true
where not exists (select 1 from public.news);
