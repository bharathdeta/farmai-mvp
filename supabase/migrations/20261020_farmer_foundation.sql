-- FarmAI Farmer Foundation
-- Apply with the Supabase CLI or SQL editor only after creating the project.
-- All user-facing tables are owner-scoped and protected with Row Level Security.

create extension if not exists pgcrypto;

create table if not exists public.farmers (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  district text check (char_length(district) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.farms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  district text check (char_length(district) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fields (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  area numeric(12, 2) check (area is null or area > 0),
  area_unit text check (area_unit in ('acres', 'guntas', 'hectares')),
  irrigation_type text check (char_length(irrigation_type) <= 80),
  soil_type text check (char_length(soil_type) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crop_cycles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  field_id uuid not null references public.fields(id) on delete cascade,
  crop text not null check (char_length(crop) between 1 and 80),
  variety text check (char_length(variety) <= 80),
  stage text check (char_length(stage) <= 80),
  sowing_date date,
  expected_harvest_date date,
  ended_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expected_harvest_date is null or sowing_date is null or expected_harvest_date >= sowing_date),
  check (ended_at is null or sowing_date is null or ended_at >= sowing_date)
);

create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  field_id uuid references public.fields(id) on delete set null,
  crop_cycle_id uuid references public.crop_cycles(id) on delete set null,
  entry_type text not null check (entry_type in ('sowing', 'irrigation', 'fertilizer', 'plant_protection', 'scouting', 'labour', 'expense', 'harvest', 'note')),
  occurred_on date not null default current_date,
  details text not null check (char_length(details) between 1 and 500),
  amount numeric(12, 2) check (amount is null or amount >= 0),
  quantity numeric(12, 2) check (quantity is null or quantity >= 0),
  quantity_unit text check (char_length(quantity_unit) <= 40),
  vendor text check (char_length(vendor) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.photo_cases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  farm_id uuid references public.farms(id) on delete set null,
  field_id uuid references public.fields(id) on delete set null,
  crop_cycle_id uuid references public.crop_cycles(id) on delete set null,
  symptom text not null check (char_length(symptom) between 1 and 1000),
  onset text check (char_length(onset) <= 120),
  spread text check (char_length(spread) <= 120),
  recent_inputs text check (char_length(recent_inputs) <= 500),
  status text not null default 'open' check (status in ('open', 'needs_expert', 'resolved', 'closed')),
  ai_result jsonb,
  safety_policy_version text check (char_length(safety_policy_version) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.photo_case_images (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  photo_case_id uuid not null references public.photo_cases(id) on delete cascade,
  storage_path text not null unique check (char_length(storage_path) between 1 and 500),
  created_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  farm_id uuid references public.farms(id) on delete set null,
  field_id uuid references public.fields(id) on delete set null,
  crop_cycle_id uuid references public.crop_cycles(id) on delete set null,
  photo_case_id uuid references public.photo_cases(id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  category text check (char_length(category) <= 80),
  due_at timestamptz not null,
  recurrence_rule text check (char_length(recurrence_rule) <= 200),
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.weather_alerts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  farm_id uuid references public.farms(id) on delete set null,
  field_id uuid references public.fields(id) on delete set null,
  crop_cycle_id uuid references public.crop_cycles(id) on delete set null,
  alert_type text not null check (alert_type in ('rain', 'heat', 'wind', 'humidity', 'irrigation')),
  condition_window_start timestamptz not null,
  condition_window_end timestamptz,
  summary text not null check (char_length(summary) between 1 and 500),
  recommended_action text not null check (char_length(recommended_action) between 1 and 500),
  source text not null check (char_length(source) <= 100),
  source_updated_at timestamptz not null,
  read_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (condition_window_end is null or condition_window_end >= condition_window_start)
);

create index if not exists fields_owner_farm_idx on public.fields (owner_id, farm_id);
create index if not exists crop_cycles_owner_field_idx on public.crop_cycles (owner_id, field_id, sowing_date desc);
create index if not exists diary_entries_owner_field_date_idx on public.diary_entries (owner_id, field_id, occurred_on desc);
create index if not exists photo_cases_owner_status_idx on public.photo_cases (owner_id, status, created_at desc);
create index if not exists reminders_owner_due_idx on public.reminders (owner_id, due_at) where completed_at is null and cancelled_at is null;
create index if not exists weather_alerts_owner_window_idx on public.weather_alerts (owner_id, condition_window_start desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.reference_is_owned(reference_table regclass, reference_id uuid, expected_owner uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  is_owned boolean;
begin
  if reference_id is null then return true; end if;
  execute format('select exists (select 1 from %s where id = $1 and owner_id = $2)', reference_table)
    into is_owned using reference_id, expected_owner;
  return is_owned;
end;
$$;

create or replace function public.assert_owned_references()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'fields' and not public.reference_is_owned('public.farms', new.farm_id, new.owner_id) then
    raise exception 'farm must belong to the record owner';
  end if;
  if tg_table_name = 'crop_cycles' and not public.reference_is_owned('public.fields', new.field_id, new.owner_id) then
    raise exception 'field must belong to the record owner';
  end if;
  if tg_table_name in ('diary_entries', 'photo_cases', 'reminders', 'weather_alerts') then
    if not public.reference_is_owned('public.farms', new.farm_id, new.owner_id)
       or not public.reference_is_owned('public.fields', new.field_id, new.owner_id)
       or not public.reference_is_owned('public.crop_cycles', new.crop_cycle_id, new.owner_id) then
      raise exception 'farm, field, and crop cycle must belong to the record owner';
    end if;
  end if;
  if tg_table_name = 'reminders' and not public.reference_is_owned('public.photo_cases', new.photo_case_id, new.owner_id) then
    raise exception 'photo case must belong to the record owner';
  end if;
  if tg_table_name = 'photo_case_images' and not public.reference_is_owned('public.photo_cases', new.photo_case_id, new.owner_id) then
    raise exception 'photo case must belong to the record owner';
  end if;
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['farmers', 'farms', 'fields', 'crop_cycles', 'diary_entries', 'photo_cases', 'reminders', 'weather_alerts'] loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

create trigger assert_fields_references before insert or update on public.fields for each row execute function public.assert_owned_references();
create trigger assert_crop_cycles_references before insert or update on public.crop_cycles for each row execute function public.assert_owned_references();
create trigger assert_diary_entries_references before insert or update on public.diary_entries for each row execute function public.assert_owned_references();
create trigger assert_photo_cases_references before insert or update on public.photo_cases for each row execute function public.assert_owned_references();
create trigger assert_photo_case_images_references before insert or update on public.photo_case_images for each row execute function public.assert_owned_references();
create trigger assert_reminders_references before insert or update on public.reminders for each row execute function public.assert_owned_references();
create trigger assert_weather_alerts_references before insert or update on public.weather_alerts for each row execute function public.assert_owned_references();

alter table public.farmers enable row level security;
alter table public.farms enable row level security;
alter table public.fields enable row level security;
alter table public.crop_cycles enable row level security;
alter table public.diary_entries enable row level security;
alter table public.photo_cases enable row level security;
alter table public.photo_case_images enable row level security;
alter table public.reminders enable row level security;
alter table public.weather_alerts enable row level security;

create policy "farmers manage their own profile" on public.farmers for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "owners manage farms" on public.farms for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners manage fields" on public.fields for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners manage crop cycles" on public.crop_cycles for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners manage diary entries" on public.diary_entries for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners manage photo cases" on public.photo_cases for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners manage case images" on public.photo_case_images for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners manage reminders" on public.reminders for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners manage weather alerts" on public.weather_alerts for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
