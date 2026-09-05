-- ============================================================================
-- 0002 — Repartiment 50/50 de les despeses compartides
--
-- balance_cents POSITIU  -> aquesta persona ha posat de més, li deuen
-- balance_cents NEGATIU  -> aquesta persona ha posat de menys, deu
-- La suma dels dos balanços de cada mes dona zero.
-- ============================================================================

create or replace view public.monthly_settlement
with (security_invoker = true) as
with months as (
  -- tots els mesos amb activitat compartida a cada llar
  select distinct
    household_id,
    date_trunc('month', occurred_on)::date as month
  from public.transactions
  where shared and amount_cents < 0
),
grid as (
  -- cada membre x cada mes, perquè qui no ha pagat res també hi surti
  select m.household_id, m.month, hm.user_id
  from months m
  join public.household_members hm on hm.household_id = m.household_id
),
paid as (
  select
    t.household_id,
    date_trunc('month', t.occurred_on)::date as month,
    t.paid_by as user_id,
    -sum(t.amount_cents) as paid_cents
  from public.transactions t
  where t.shared and t.amount_cents < 0 and t.paid_by is not null
  group by 1, 2, 3
),
totals as (
  select
    household_id,
    month,
    sum(paid_cents) as total_cents
  from paid
  group by 1, 2
),
counts as (
  select household_id, count(*)::int as member_count
  from public.household_members
  group by 1
)
select
  g.household_id,
  g.month,
  g.user_id,
  coalesce(p.paid_cents, 0)                                          as paid_cents,
  t.total_cents,
  c.member_count,
  round(t.total_cents::numeric / c.member_count)::bigint             as fair_share_cents,
  coalesce(p.paid_cents, 0)
    - round(t.total_cents::numeric / c.member_count)::bigint         as balance_cents
from grid g
join totals t  on t.household_id = g.household_id and t.month = g.month
join counts c  on c.household_id = g.household_id
left join paid p on p.household_id = g.household_id
                and p.month = g.month
                and p.user_id = g.user_id;

grant select on public.monthly_settlement to authenticated;


-- Balanç acumulat de tota la història (el que us deveu ara mateix,
-- si no aneu liquidant mes a mes).
create or replace view public.current_settlement
with (security_invoker = true) as
select
  household_id,
  user_id,
  sum(paid_cents)    as paid_cents,
  sum(balance_cents) as balance_cents
from public.monthly_settlement
group by 1, 2;

grant select on public.current_settlement to authenticated;
