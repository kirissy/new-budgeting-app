-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (base currency + display preferences)
create table if not exists profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  base_currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

-- Pay profiles (income + frequency)
create table if not exists pay_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  income_amount numeric(20, 4) not null,
  currency text not null default 'USD',
  frequency text not null check (frequency in ('daily','weekly','biweekly','semi-monthly','monthly','quarterly','annually')),
  effective_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique(user_id)
);

-- Budgeted expenses (recurring costs & subscriptions, each with their own frequency)
create table if not exists budgeted_expenses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric(20, 4) not null,
  currency text not null default 'USD',
  frequency text not null check (frequency in ('daily','weekly','biweekly','semi-monthly','monthly','quarterly','annually')),
  category text not null default 'other' check (category in (
    'food_dining','groceries','transport','housing','utilities',
    'shopping','entertainment','health','travel','other'
  )),
  next_due_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Expenses (transaction log of individual, actually-incurred expenses)
create table if not exists expenses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric(20, 4) not null,
  currency text not null default 'USD',
  category text not null check (category in (
    'food_dining','groceries','transport','housing','utilities',
    'shopping','entertainment','health','travel','other'
  )),
  spent_on date not null default current_date,
  created_at timestamptz not null default now()
);

-- Goals (holiday, emergency, custom)
create table if not exists goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('holiday','emergency','custom')),
  name text not null,
  target_amount numeric(20, 4) not null,
  currency text not null default 'USD',
  target_date date,
  current_saved numeric(20, 4) not null default 0,
  last_deposit_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Goal contributions ledger (both scheduled auto-deposits and manual top-ups)
create table if not exists goal_contributions (
  id uuid primary key default uuid_generate_v4(),
  goal_id uuid not null references goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(20, 4) not null,
  source text not null check (source in ('scheduled','manual')),
  contributed_on date not null default current_date,
  created_at timestamptz not null default now()
);

-- Exchange rates (fetched periodically, used for multi-currency conversion)
create table if not exists exchange_rates (
  id uuid primary key default uuid_generate_v4(),
  base_currency text not null,
  target_currency text not null,
  rate numeric(20, 8) not null,
  fetched_at timestamptz not null default now(),
  unique(base_currency, target_currency)
);

-- Row Level Security: only owners can see/edit their own data
alter table profiles enable row level security;
alter table pay_profiles enable row level security;
alter table budgeted_expenses enable row level security;
alter table expenses enable row level security;
alter table goals enable row level security;
alter table goal_contributions enable row level security;

create policy "Users can manage their own profile"
  on profiles for all using (auth.uid() = user_id);

create policy "Users can manage their own pay profile"
  on pay_profiles for all using (auth.uid() = user_id);

create policy "Users can manage their own budgeted expenses"
  on budgeted_expenses for all using (auth.uid() = user_id);

create policy "Users can manage their own expense logs"
  on expenses for all using (auth.uid() = user_id);

create policy "Users can manage their own goals"
  on goals for all using (auth.uid() = user_id);

create policy "Users can manage their own goal contributions"
  on goal_contributions for all using (auth.uid() = user_id);

-- Exchange rates are public read (no user-scoped data)
alter table exchange_rates enable row level security;
create policy "Exchange rates are publicly readable"
  on exchange_rates for select using (true);
