-- ── FEATURE 1: proposal_number on proposals ──────────────────────────────────
create sequence if not exists proposal_number_seq start 1;

alter table proposals add column if not exists proposal_number text;

create or replace function assign_proposal_number()
returns trigger language plpgsql as $$
begin
  if new.proposal_number is null then
    new.proposal_number := 'SP-' || lpad(nextval('proposal_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proposal_number on proposals;
create trigger trg_proposal_number
  before insert on proposals
  for each row execute function assign_proposal_number();

-- Backfill existing proposals without a number
do $$
declare
  r record;
begin
  for r in select id from proposals where proposal_number is null order by created_at asc loop
    update proposals set proposal_number = 'SP-' || lpad(nextval('proposal_number_seq')::text, 4, '0') where id = r.id;
  end loop;
end;
$$;

-- ── FEATURE 2: lead_files table ───────────────────────────────────────────────
create table if not exists lead_files (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid references leads(id) on delete cascade,
  rep_id      uuid references auth.users(id),
  file_name   text not null,
  file_url    text not null,
  file_type   text default 'document',
  file_size   integer,
  description text,
  created_at  timestamptz default now()
);

alter table lead_files enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'lead_files' and policyname = 'own_lead_files'
  ) then
    create policy own_lead_files on lead_files for all using (rep_id = auth.uid());
  end if;
end $$;

-- Grant runs manually per instructions
-- grant select, insert, delete on lead_files to authenticated;
