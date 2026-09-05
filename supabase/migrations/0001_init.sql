-- ============================================================================
-- FinApp — esquema inicial
-- Next.js + Supabase · app de finances per a una parella
--
-- Convencions:
--   · Tots els imports en CÈNTIMS (bigint). Mai floats per a diners.
--   · amount_cents SIGNAT: positiu = ingrés, negatiu = despesa.
--   · Tot penja de "household". Els dos usuaris són membres de la mateixa.
-- ============================================================================

create extension if not exists pgcrypto;


-- ============================================================================
-- 1. TAULES
-- ============================================================================

-- La "llar": l'entitat compartida. Vosaltres dos en sereu membres.
create table public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  currency    text not null default 'EUR',
  -- codi curt perquè la segona persona s'uneixi sense muntar un sistema d'invitacions
  join_code   text not null unique default encode(gen_random_bytes(4), 'hex'),
  created_at  timestamptz not null default now()
);

create table public.household_members (
  household_id  uuid not null references public.households(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  display_name  text,
  role          text not null default 'member' check (role in ('owner', 'member')),
  joined_at     timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- Comptes: banc, targeta, efectiu...
--   owner_id null  -> compte CONJUNT
--   owner_id set   -> compte PERSONAL d'aquesta persona
--   is_private     -> a més de personal, l'altra persona ni el veu
create table public.accounts (
  id                     uuid primary key default gen_random_uuid(),
  household_id           uuid not null references public.households(id) on delete cascade,
  name                   text not null,
  type                   text not null default 'checking'
                           check (type in ('checking', 'savings', 'card', 'cash', 'investment')),
  owner_id               uuid references auth.users(id) on delete set null,
  is_private             boolean not null default false,
  opening_balance_cents  bigint not null default 0,
  color                  text,
  archived               boolean not null default false,
  created_at             timestamptz not null default now(),
  -- un compte privat ha de tenir propietari, si no no se sap de qui s'amaga
  constraint private_needs_owner check (not is_private or owner_id is not null)
);

create table public.categories (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  name          text not null,
  kind          text not null check (kind in ('income', 'expense')),
  color         text not null default '#94a3b8',
  icon          text,
  archived      boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (household_id, name, kind)
);

-- Despeses/ingressos FIXOS. Són PLANTILLES, no moviments.
-- Es converteixen en transactions reals cada mes (veure materialize_recurring).
create table public.recurring_rules (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references public.households(id) on delete cascade,
  account_id     uuid not null references public.accounts(id) on delete cascade,
  category_id    uuid references public.categories(id) on delete set null,
  description    text not null,
  amount_cents   bigint not null check (amount_cents <> 0),
  day_of_month   smallint not null check (day_of_month between 1 and 31),
  paid_by        uuid references auth.users(id) on delete set null,
  shared         boolean not null default true,
  start_date     date not null default date_trunc('month', now())::date,
  end_date       date,
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

-- Moviments reals. Una sola taula per a ingressos i despeses.
create table public.transactions (
  id                  uuid primary key default gen_random_uuid(),
  household_id        uuid not null references public.households(id) on delete cascade,
  account_id          uuid not null references public.accounts(id) on delete cascade,
  category_id         uuid references public.categories(id) on delete set null,
  amount_cents        bigint not null check (amount_cents <> 0),
  occurred_on         date not null default current_date,
  description         text,
  notes               text,
  -- qui ha posat els diners (per al balanç entre vosaltres)
  paid_by             uuid references auth.users(id) on delete set null,
  -- si compta com a despesa compartida o és estrictament personal
  shared              boolean not null default true,
  -- si ve d'una regla fixa, quina
  recurring_rule_id   uuid references public.recurring_rules(id) on delete set null,
  -- per aparellar les dues potes d'un traspàs entre comptes propis
  transfer_group_id   uuid,
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);


-- ============================================================================
-- 2. ÍNDEXS
-- ============================================================================

create index accounts_household_idx        on public.accounts (household_id) where not archived;
create index categories_household_idx      on public.categories (household_id) where not archived;
create index recurring_household_idx       on public.recurring_rules (household_id) where active;
create index transactions_household_date   on public.transactions (household_id, occurred_on desc);
create index transactions_account_idx      on public.transactions (account_id);
create index transactions_category_idx     on public.transactions (category_id);
create index transactions_paid_by_idx      on public.transactions (paid_by);
create index transactions_transfer_idx     on public.transactions (transfer_group_id)
                                              where transfer_group_id is not null;

-- Evita generar dos cops la mateixa despesa fixa el mateix mes, encara que
-- després n'hagis editat el dia concret.
create unique index transactions_recurring_month_uniq
  on public.transactions (recurring_rule_id, (date_trunc('month', occurred_on::timestamp)))
  where recurring_rule_id is not null;


-- ============================================================================
-- 3. FUNCIONS AUXILIARS
--    SECURITY DEFINER a propòsit: sense això, una policy sobre
--    household_members que consulti household_members entra en recursió
--    infinita. És el clàssic error de RLS a Supabase.
-- ============================================================================

create or replace function public.is_household_member(hid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from household_members
    where household_id = hid and user_id = auth.uid()
  );
$$;

-- Un compte és accessible si ets de la llar i (no és privat o és teu).
create or replace function public.can_access_account(aid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from accounts a
    where a.id = aid
      and public.is_household_member(a.household_id)
      and (a.is_private = false or a.owner_id = auth.uid())
  );
$$;

-- updated_at automàtic
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger transactions_touch
  before update on public.transactions
  for each row execute function public.touch_updated_at();


-- ============================================================================
-- 4. RLS
-- ============================================================================

alter table public.households        enable row level security;
alter table public.household_members enable row level security;
alter table public.accounts          enable row level security;
alter table public.categories        enable row level security;
alter table public.recurring_rules   enable row level security;
alter table public.transactions      enable row level security;

-- households ----------------------------------------------------------------
create policy households_select on public.households
  for select using (public.is_household_member(id));

create policy households_update on public.households
  for update using (public.is_household_member(id));

-- household_members ---------------------------------------------------------
create policy members_select on public.household_members
  for select using (user_id = auth.uid() or public.is_household_member(household_id));

create policy members_delete on public.household_members
  for delete using (user_id = auth.uid());

-- accounts ------------------------------------------------------------------
create policy accounts_select on public.accounts
  for select using (
    public.is_household_member(household_id)
    and (is_private = false or owner_id = auth.uid())
  );

create policy accounts_insert on public.accounts
  for insert with check (public.is_household_member(household_id));

create policy accounts_update on public.accounts
  for update using (
    public.is_household_member(household_id)
    and (is_private = false or owner_id = auth.uid())
  );

create policy accounts_delete on public.accounts
  for delete using (
    public.is_household_member(household_id)
    and (is_private = false or owner_id = auth.uid())
  );

-- categories ----------------------------------------------------------------
create policy categories_all on public.categories
  for all using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- recurring_rules -----------------------------------------------------------
create policy recurring_all on public.recurring_rules
  for all using (public.can_access_account(account_id))
  with check (public.can_access_account(account_id));

-- transactions --------------------------------------------------------------
create policy transactions_select on public.transactions
  for select using (public.can_access_account(account_id));

create policy transactions_insert on public.transactions
  for insert with check (
    public.can_access_account(account_id)
    and public.is_household_member(household_id)
  );

create policy transactions_update on public.transactions
  for update using (public.can_access_account(account_id))
  with check (public.can_access_account(account_id));

create policy transactions_delete on public.transactions
  for delete using (public.can_access_account(account_id));


-- ============================================================================
-- 5. VISTES
--    security_invoker = true perquè la RLS de l'usuari s'apliqui a la vista.
--    Sense això les vistes s'executen amb els permisos del creador i
--    filtren tota la seguretat. Requereix Postgres 15+ (Supabase ja hi és).
-- ============================================================================

-- Saldo actual de cada compte
create or replace view public.account_balances
with (security_invoker = true) as
select
  a.id            as account_id,
  a.household_id,
  a.name,
  a.type,
  a.owner_id,
  a.is_private,
  a.archived,
  a.opening_balance_cents
    + coalesce(sum(t.amount_cents), 0) as balance_cents
from public.accounts a
left join public.transactions t on t.account_id = a.id
group by a.id;

-- Resum mensual de la llar
create or replace view public.monthly_summary
with (security_invoker = true) as
select
  household_id,
  date_trunc('month', occurred_on)::date as month,
  coalesce(sum(amount_cents) filter (where amount_cents > 0), 0)  as income_cents,
  coalesce(-sum(amount_cents) filter (where amount_cents < 0), 0) as expense_cents,
  sum(amount_cents)                                              as net_cents
from public.transactions
group by 1, 2;

-- Despesa per categoria i mes
create or replace view public.monthly_by_category
with (security_invoker = true) as
select
  t.household_id,
  date_trunc('month', t.occurred_on)::date as month,
  t.category_id,
  c.name  as category_name,
  c.kind  as category_kind,
  c.color as category_color,
  sum(t.amount_cents) as total_cents
from public.transactions t
left join public.categories c on c.id = t.category_id
group by 1, 2, 3, 4, 5, 6;

-- Quant ha posat cadascú en despeses COMPARTIDES, per mes.
-- La diferència entre els dos és el que us deveu.
create or replace view public.shared_contributions
with (security_invoker = true) as
select
  t.household_id,
  date_trunc('month', t.occurred_on)::date as month,
  t.paid_by,
  -sum(t.amount_cents) as paid_cents
from public.transactions t
where t.shared
  and t.amount_cents < 0
  and t.paid_by is not null
group by 1, 2, 3;


-- ============================================================================
-- 6. RPCs
-- ============================================================================

-- Crea la llar, t'hi apunta com a owner i sembra categories per defecte.
create or replace function public.create_household(
  p_name          text,
  p_display_name  text default null
)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household public.households;
begin
  if auth.uid() is null then
    raise exception 'No autenticat';
  end if;

  insert into households (name) values (p_name) returning * into v_household;

  insert into household_members (household_id, user_id, display_name, role)
  values (v_household.id, auth.uid(), p_display_name, 'owner');

  insert into categories (household_id, name, kind, color) values
    (v_household.id, 'Nòmina',           'income',  '#22c55e'),
    (v_household.id, 'Altres ingressos', 'income',  '#4ade80'),
    (v_household.id, 'Habitatge',        'expense', '#6366f1'),
    (v_household.id, 'Subministraments', 'expense', '#0ea5e9'),
    (v_household.id, 'Supermercat',      'expense', '#f59e0b'),
    (v_household.id, 'Restaurants',      'expense', '#f97316'),
    (v_household.id, 'Transport',        'expense', '#14b8a6'),
    (v_household.id, 'Salut',            'expense', '#ef4444'),
    (v_household.id, 'Oci',              'expense', '#a855f7'),
    (v_household.id, 'Subscripcions',    'expense', '#ec4899'),
    (v_household.id, 'Compres',          'expense', '#8b5cf6'),
    (v_household.id, 'Altres',           'expense', '#94a3b8');

  return v_household;
end;
$$;

-- La segona persona s'uneix amb el join_code.
create or replace function public.join_household(
  p_code          text,
  p_display_name  text default null
)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household public.households;
begin
  if auth.uid() is null then
    raise exception 'No autenticat';
  end if;

  select * into v_household from households where join_code = lower(trim(p_code));

  if v_household.id is null then
    raise exception 'Codi no vàlid';
  end if;

  insert into household_members (household_id, user_id, display_name)
  values (v_household.id, auth.uid(), p_display_name)
  on conflict (household_id, user_id) do nothing;

  return v_household;
end;
$$;

-- Converteix les regles fixes en moviments reals per al mes indicat.
-- Idempotent: pots cridar-la cada cop que entris al mes sense duplicar res.
create or replace function public.materialize_recurring(
  p_household_id  uuid,
  p_month         date default current_date
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer := 0;
  v_start date := date_trunc('month', p_month)::date;
  v_end   date := (date_trunc('month', p_month) + interval '1 month - 1 day')::date;
begin
  if not public.is_household_member(p_household_id) then
    raise exception 'Sense permisos sobre aquesta llar';
  end if;

  insert into transactions (
    household_id, account_id, category_id, amount_cents, occurred_on,
    description, paid_by, shared, recurring_rule_id, created_by
  )
  select
    r.household_id,
    r.account_id,
    r.category_id,
    r.amount_cents,
    -- si el dia no existeix al mes (31 de febrer), cau a l'últim dia
    least(v_start + (r.day_of_month - 1), v_end),
    r.description,
    r.paid_by,
    r.shared,
    r.id,
    auth.uid()
  from recurring_rules r
  where r.household_id = p_household_id
    and r.active
    and r.start_date <= v_end
    and (r.end_date is null or r.end_date >= v_start)
  on conflict do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

-- Registra un traspàs entre dos comptes com a dos moviments aparellats.
create or replace function public.create_transfer(
  p_from_account  uuid,
  p_to_account    uuid,
  p_amount_cents  bigint,
  p_occurred_on   date default current_date,
  p_description   text default 'Traspàs'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group uuid := gen_random_uuid();
  v_household uuid;
begin
  if p_amount_cents <= 0 then
    raise exception 'L''import ha de ser positiu';
  end if;
  if p_from_account = p_to_account then
    raise exception 'Els comptes han de ser diferents';
  end if;
  if not (public.can_access_account(p_from_account) and public.can_access_account(p_to_account)) then
    raise exception 'Sense permisos sobre algun dels comptes';
  end if;

  select household_id into v_household from accounts where id = p_from_account;

  insert into transactions (household_id, account_id, amount_cents, occurred_on, description, shared, transfer_group_id, created_by)
  values
    (v_household, p_from_account, -p_amount_cents, p_occurred_on, p_description, false, v_group, auth.uid()),
    (v_household, p_to_account,    p_amount_cents, p_occurred_on, p_description, false, v_group, auth.uid());

  return v_group;
end;
$$;


-- ============================================================================
-- 7. PERMISOS
-- ============================================================================

grant execute on function public.create_household(text, text)            to authenticated;
grant execute on function public.join_household(text, text)              to authenticated;
grant execute on function public.materialize_recurring(uuid, date)       to authenticated;
grant execute on function public.create_transfer(uuid, uuid, bigint, date, text) to authenticated;
grant execute on function public.is_household_member(uuid)               to authenticated;
grant execute on function public.can_access_account(uuid)                to authenticated;

grant select on public.account_balances      to authenticated;
grant select on public.monthly_summary       to authenticated;
grant select on public.monthly_by_category   to authenticated;
grant select on public.shared_contributions  to authenticated;
