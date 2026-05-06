-- Add spouse and appointment fields to leads table
alter table leads add column if not exists spouse_first_name text;
alter table leads add column if not exists spouse_last_name  text;
alter table leads add column if not exists spouse_phone      text;
alter table leads add column if not exists spouse_email      text;
alter table leads add column if not exists is_married        boolean default false;
alter table leads add column if not exists appointment_date  date;
alter table leads add column if not exists lead_source       text;

-- Ensure RLS grants for authenticated reps
grant select, insert, update, delete on leads         to authenticated;
grant select, insert, update, delete on proposals     to authenticated;
grant select, insert, update, delete on api_usage_log to authenticated;
grant select, insert, update, delete on reps          to authenticated;

-- RLS policies (run once; skip if already exist)
alter table leads         enable row level security;
alter table proposals     enable row level security;
alter table api_usage_log enable row level security;
alter table reps          enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='leads' and policyname='leads_rep_policy') then
    create policy leads_rep_policy on leads
      for all using (rep_id = auth.uid()) with check (rep_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where tablename='proposals' and policyname='proposals_rep_policy') then
    create policy proposals_rep_policy on proposals
      for all using (rep_id = auth.uid()) with check (rep_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where tablename='api_usage_log' and policyname='api_usage_log_rep_policy') then
    create policy api_usage_log_rep_policy on api_usage_log
      for all using (rep_id = auth.uid()) with check (rep_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where tablename='reps' and policyname='reps_rep_policy') then
    create policy reps_rep_policy on reps
      for all using (id = auth.uid()) with check (id = auth.uid());
  end if;
end $$;
