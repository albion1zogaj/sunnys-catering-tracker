-- profiles table (extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  role text default 'staff',
  created_at timestamptz default now()
);

-- catering leads
create table catering_leads (
  id uuid default gen_random_uuid() primary key,
  client_company_name text,
  contact_name text,
  phone text,
  email text,
  event_date date,
  event_time text,
  guest_count integer,
  estimated_amount numeric(10,2),
  final_amount numeric(10,2),
  status text not null default 'New Lead',
  follow_up_date date,
  event_type text,
  source text,
  notes text,
  lost_reason text,
  created_by uuid references auth.users,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- lead notes
create table lead_notes (
  id uuid default gen_random_uuid() primary key,
  lead_id uuid references catering_leads on delete cascade,
  note text not null,
  created_by uuid references auth.users,
  created_at timestamptz default now()
);

-- activity log
create table activity_log (
  id uuid default gen_random_uuid() primary key,
  lead_id uuid references catering_leads on delete set null,
  action text not null,
  field_changed text,
  old_value text,
  new_value text,
  created_by uuid references auth.users,
  created_at timestamptz default now()
);

-- RLS policies
alter table profiles enable row level security;
alter table catering_leads enable row level security;
alter table lead_notes enable row level security;
alter table activity_log enable row level security;

create policy "Users can read all profiles" on profiles for select using (auth.role() = 'authenticated');
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

create policy "Authenticated users can read leads" on catering_leads for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert leads" on catering_leads for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update leads" on catering_leads for update using (auth.role() = 'authenticated');

create policy "Authenticated users can read notes" on lead_notes for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert notes" on lead_notes for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can read activity" on activity_log for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert activity" on activity_log for insert with check (auth.role() = 'authenticated');

-- trigger to auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_catering_leads_updated_at
  before update on catering_leads
  for each row execute function update_updated_at();

-- trigger to auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
