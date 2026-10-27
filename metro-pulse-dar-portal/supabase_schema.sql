-- Metro Group DAR Portal
-- Supabase schema mapped to the current app logic.
-- Note: `password_plaintext` is kept only to mirror the current portal's
-- admin recovery screen and legacy employee-id/password login flow.
-- For production, replace it with Supabase Auth only and remove this column.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Core employee directory
-- ---------------------------------------------------------------------------
create table if not exists public.metro_profiles (
  employee_id text primary key,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  password_plaintext text not null default '',
  role_level text not null check (role_level in ('admin', '1', '2', '3')),
  department text not null default 'General',
  manager_employee_id text references public.metro_profiles(employee_id) on delete set null,
  manager_name text,
  email text,
  phone text,
  location text,
  date_of_birth date,
  bio text not null default '',
  profile_img_url text not null default '',
  last_dar_date date,
  created_by_employee_id text,
  is_seed boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists metro_profiles_role_level_idx on public.metro_profiles (role_level);
create index if not exists metro_profiles_manager_idx on public.metro_profiles (manager_employee_id);
create index if not exists metro_profiles_department_idx on public.metro_profiles (department);

-- Admin-managed holiday overrides used by the DAR heatmap/compliance screens.
create table if not exists public.metro_holidays (
  holiday_date date primary key,
  holiday_name text not null,
  day_name text,
  created_by text references public.metro_profiles(employee_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Leave applications
-- Level 2 and 3 employees submit their own applications.  Level 1 and the
-- master admin can see the live dashboard and export all leave records.
-- ---------------------------------------------------------------------------
create table if not exists public.metro_leaves (
  id text primary key,
  employee_id text not null references public.metro_profiles(employee_id) on delete cascade,
  leave_type text not null check (leave_type in ('single', 'multi', 'half')),
  start_date date not null,
  end_date date not null,
  half_type text check (half_type in ('first', 'second') or half_type is null),
  remarks text not null,
  submitted_at timestamptz not null default now()
);

-- Safe for existing cloud deployments that predate the migration.
alter table public.metro_leaves add column if not exists half_type text;
alter table public.metro_leaves add column if not exists submitted_at timestamptz not null default now();
create index if not exists metro_leaves_dates_idx on public.metro_leaves (start_date, end_date);
create index if not exists metro_leaves_employee_idx on public.metro_leaves (employee_id, submitted_at desc);

-- Existing deployments may have been created before DOB was added.
-- Keep it nullable so admin-created/imported employees can fill it later.
alter table public.metro_profiles add column if not exists date_of_birth date;

-- Keep the manager snapshot aligned with the reporting hierarchy.
create or replace function public.metro_sync_profile_manager_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.manager_employee_id is null or new.manager_employee_id = '' then
    new.manager_name := null;
  else
    select p.full_name
      into new.manager_name
    from public.metro_profiles p
    where p.employee_id = new.manager_employee_id
    limit 1;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_metro_profiles_sync_manager on public.metro_profiles;
create trigger trg_metro_profiles_sync_manager
before insert or update on public.metro_profiles
for each row execute function public.metro_sync_profile_manager_snapshot();

-- ---------------------------------------------------------------------------
-- Helper functions for RLS
-- ---------------------------------------------------------------------------
create or replace function public.current_employee_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.employee_id
  from public.metro_profiles p
  where p.auth_user_id = auth.uid()
     or lower(p.employee_id) = lower(split_part(coalesce(auth.email(), ''), '@', 1))
  limit 1
$$;

create or replace function public.current_role_level()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role_level
  from public.metro_profiles p
  where p.auth_user_id = auth.uid()
     or lower(p.employee_id) = lower(split_part(coalesce(auth.email(), ''), '@', 1))
  limit 1
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role_level() = 'admin', false)
$$;

create or replace function public.is_direct_manager_of(target_employee_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.metro_profiles target
    where target.employee_id = target_employee_id
      and target.manager_employee_id = public.current_employee_id()
  )
$$;

create or replace function public.can_view_employee(target_employee_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_admin() then true
    when public.current_role_level() = '1' then exists (
      select 1
      from public.metro_profiles target
      where target.employee_id = target_employee_id
        and target.role_level <> 'admin'
    )
    when public.current_role_level() = '2' then
      target_employee_id = public.current_employee_id() or public.is_direct_manager_of(target_employee_id)
    when public.current_role_level() = '3' then
      target_employee_id = public.current_employee_id()
    else false
  end
$$;

create or replace function public.can_view_report(report_employee_id text, report_manager_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_admin() then true
    when public.current_role_level() = '1' then true
    when public.current_role_level() = '2' then
      report_employee_id = public.current_employee_id()
      or report_manager_id = public.current_employee_id()
    when public.current_role_level() = '3' then
      report_employee_id = public.current_employee_id()
    else false
  end
$$;

create or replace function public.can_review_report(report_employee_id text, report_manager_id text, report_date date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when timezone('Asia/Kolkata', now()) > (report_date::timestamp + interval '1 day 23 hours') then false
    when public.current_role_level() = '1' then true
    when public.current_role_level() = '2' then report_manager_id = public.current_employee_id()
    else false
  end
$$;

create or replace function public.can_manage_task(target_employee_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_admin() then true
    when public.current_role_level() = '1' then true
    when public.current_role_level() = '2' then public.is_direct_manager_of(target_employee_id)
    else false
  end
$$;

create or replace function public.calculate_report_minutes(points jsonb)
returns integer
language plpgsql
immutable
as $$
declare
  item jsonb;
  raw_time text;
  match text[];
  total integer := 0;
begin
  if points is null then
    return 0;
  end if;

  for item in
    select * from jsonb_array_elements(points)
  loop
    raw_time := coalesce(item->>'totalTime', '');

    if raw_time ~* '(\d+)\s*h' then
      match := regexp_match(raw_time, '(\d+)\s*h', 'i');
      total := total + coalesce(match[1]::integer, 0) * 60;
    end if;

    if raw_time ~* '(\d+)\s*m' then
      match := regexp_match(raw_time, '(\d+)\s*m', 'i');
      total := total + coalesce(match[1]::integer, 0);
    end if;

    if raw_time ~* '(\d+)\s*s' then
      match := regexp_match(raw_time, '(\d+)\s*s', 'i');
      total := total + ceil(coalesce(match[1]::numeric, 0) / 60.0)::integer;
    end if;
  end loop;

  return total;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------
create table if not exists public.metro_tasks (
  id text primary key,
  target_employee_id text not null references public.metro_profiles(employee_id) on delete cascade,
  target_name text not null default '',
  assigned_by_employee_id text not null references public.metro_profiles(employee_id) on delete cascade,
  assigned_by_name text not null default '',
  title text not null,
  notes text not null default '',
  task_type text not null check (task_type in ('internal', 'project')),
  due_date date,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists metro_tasks_target_idx on public.metro_tasks (target_employee_id);
create index if not exists metro_tasks_assigned_by_idx on public.metro_tasks (assigned_by_employee_id);
create index if not exists metro_tasks_created_at_idx on public.metro_tasks (created_at desc);

create or replace function public.metro_sync_task_snapshots()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select p.full_name into new.target_name
  from public.metro_profiles p
  where p.employee_id = new.target_employee_id
  limit 1;

  select p.full_name into new.assigned_by_name
  from public.metro_profiles p
  where p.employee_id = new.assigned_by_employee_id
  limit 1;

  if new.id is null or new.id = '' then
    new.id := 'TSK-' || replace(gen_random_uuid()::text, '-', '');
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_metro_tasks_sync_snapshots on public.metro_tasks;
create trigger trg_metro_tasks_sync_snapshots
before insert or update on public.metro_tasks
for each row execute function public.metro_sync_task_snapshots();

create or replace function public.metro_sync_task_completion_timestamp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.completed then
    if tg_op = 'INSERT' or not coalesce(old.completed, false) or new.completed_at is null then
      new.completed_at := coalesce(new.completed_at, now());
    end if;
  else
    new.completed_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_metro_tasks_sync_completion on public.metro_tasks;
create trigger trg_metro_tasks_sync_completion
before insert or update on public.metro_tasks
for each row execute function public.metro_sync_task_completion_timestamp();

-- ---------------------------------------------------------------------------
-- DAR Reports
-- ---------------------------------------------------------------------------
create table if not exists public.metro_reports (
  id text primary key,
  employee_id text not null references public.metro_profiles(employee_id) on delete cascade,
  employee_name text not null default '',
  manager_id text references public.metro_profiles(employee_id) on delete set null,
  manager_name text default '',
  report_date date not null default current_date,
  report_type text not null default 'internal' check (report_type in ('internal', 'project')),
  title text not null default 'DAR',
  project_name text not null default '',
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'declined')),
  reviewed_by text references public.metro_profiles(employee_id) on delete set null,
  reviewed_by_name text default '',
  reviewed_at timestamptz,
  review_comment text not null default '',
  submitted_at timestamptz not null default now(),
  reminder_sent_at timestamptz,
  reminder_count integer not null default 0,
  total_minutes integer not null default 0,
  points jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, report_date)
);

create index if not exists metro_reports_employee_idx on public.metro_reports (employee_id);
create index if not exists metro_reports_manager_idx on public.metro_reports (manager_id);
create index if not exists metro_reports_date_idx on public.metro_reports (report_date desc);
create index if not exists metro_reports_status_idx on public.metro_reports (approval_status);
create index if not exists metro_reports_submitted_idx on public.metro_reports (submitted_at desc);

create or replace function public.metro_sync_report_snapshots()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  employee_snapshot text;
  manager_snapshot text;
  reviewer_snapshot text;
  manager_snapshot_id text;
begin
  select p.full_name, p.manager_employee_id
    into employee_snapshot, manager_snapshot_id
  from public.metro_profiles p
  where p.employee_id = new.employee_id
  limit 1;

  new.employee_name := coalesce(employee_snapshot, new.employee_name, '');

  if new.manager_id is null or new.manager_id = '' then
    new.manager_id := manager_snapshot_id;
  end if;

  if new.manager_id is not null and new.manager_id <> '' then
    select p.full_name into manager_snapshot
    from public.metro_profiles p
    where p.employee_id = new.manager_id
    limit 1;
    new.manager_name := coalesce(manager_snapshot, new.manager_name, '');
  else
    new.manager_name := coalesce(new.manager_name, '');
  end if;

  if new.reviewed_by is not null and new.reviewed_by <> '' then
    select p.full_name into reviewer_snapshot
    from public.metro_profiles p
    where p.employee_id = new.reviewed_by
    limit 1;
    new.reviewed_by_name := coalesce(reviewer_snapshot, new.reviewed_by_name, '');
  else
    new.reviewed_by_name := coalesce(new.reviewed_by_name, '');
  end if;

  if new.id is null or new.id = '' then
    new.id := 'RPT-' || new.employee_id || '-' || to_char(coalesce(new.report_date, current_date), 'YYYY-MM-DD');
  end if;

  new.total_minutes := public.calculate_report_minutes(new.points);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_metro_reports_sync_snapshots on public.metro_reports;
create trigger trg_metro_reports_sync_snapshots
before insert or update on public.metro_reports
for each row execute function public.metro_sync_report_snapshots();

-- ---------------------------------------------------------------------------
-- Drafts
-- ---------------------------------------------------------------------------
create table if not exists public.metro_drafts (
  id text primary key,
  employee_id text not null references public.metro_profiles(employee_id) on delete cascade,
  report_date date not null default current_date,
  report_type text not null default 'internal' check (report_type in ('internal', 'project')),
  location text not null default '',
  mobile_report_date date,
  mobile_report_type text not null default 'internal' check (mobile_report_type in ('internal', 'project')),
  mobile_location text not null default '',
  current_point text not null default '',
  point_hours text not null default '',
  point_minutes text not null default '',
  attachment_name text not null default '',
  attachment_data text not null default '',
  attachment_size text not null default '',
  points jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, report_date)
);

create index if not exists metro_drafts_employee_idx on public.metro_drafts (employee_id);

alter table public.metro_drafts add column if not exists location text not null default '';
alter table public.metro_drafts add column if not exists mobile_report_date date;
alter table public.metro_drafts add column if not exists mobile_report_type text not null default 'internal';
alter table public.metro_drafts add column if not exists mobile_location text not null default '';

create or replace function public.metro_sync_draft_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id is null or new.id = '' then
    new.id := 'DRAFT-' || new.employee_id || '-' || to_char(coalesce(new.report_date, current_date), 'YYYY-MM-DD');
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_metro_drafts_sync_snapshot on public.metro_drafts;
create trigger trg_metro_drafts_sync_snapshot
before insert or update on public.metro_drafts
for each row execute function public.metro_sync_draft_snapshot();

-- ---------------------------------------------------------------------------
-- Notifications and announcements
-- ---------------------------------------------------------------------------
create table if not exists public.metro_notifications (
  id text primary key,
  target_id text not null references public.metro_profiles(employee_id) on delete cascade,
  actor_id text references public.metro_profiles(employee_id) on delete set null,
  actor_name text not null default '',
  report_id text references public.metro_reports(id) on delete cascade,
  kind text not null default 'notice',
  title text not null default 'Alert',
  message text not null,
  action_type text not null default '',
  action_payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists metro_notifications_target_idx on public.metro_notifications (target_id, created_at desc);
create index if not exists metro_notifications_unread_idx on public.metro_notifications (target_id, read_at);

create or replace function public.metro_sync_notification_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_snapshot text;
begin
  if new.actor_id is not null and new.actor_id <> '' then
    select p.full_name into actor_snapshot
    from public.metro_profiles p
    where p.employee_id = new.actor_id
    limit 1;
    new.actor_name := coalesce(actor_snapshot, new.actor_name, '');
  else
    new.actor_name := coalesce(new.actor_name, '');
  end if;

  if new.id is null or new.id = '' then
    new.id := 'NTF-' || replace(gen_random_uuid()::text, '-', '');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_metro_notifications_sync_snapshot on public.metro_notifications;
create trigger trg_metro_notifications_sync_snapshot
before insert or update on public.metro_notifications
for each row execute function public.metro_sync_notification_snapshot();

create table if not exists public.metro_email_reminder_logs (
  id text primary key,
  sent_by text not null references public.metro_profiles(employee_id) on delete cascade,
  sent_by_name text not null default '',
  employee_id text not null references public.metro_profiles(employee_id) on delete cascade,
  employee_name text not null default '',
  employee_email text not null default '',
  reminder_date date not null default current_date,
  subject text not null default '',
  mode text not null default 'single' check (mode in ('single', 'bulk-pending', 'bulk-all')),
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists metro_email_reminder_logs_sent_by_idx on public.metro_email_reminder_logs (sent_by, sent_at desc);
create index if not exists metro_email_reminder_logs_employee_idx on public.metro_email_reminder_logs (employee_id, sent_at desc);
create index if not exists metro_email_reminder_logs_date_idx on public.metro_email_reminder_logs (reminder_date desc);

create or replace function public.metro_sync_email_reminder_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_snapshot text;
  employee_snapshot text;
  employee_mail text;
begin
  select p.full_name into sender_snapshot
  from public.metro_profiles p
  where p.employee_id = new.sent_by
  limit 1;
  new.sent_by_name := coalesce(sender_snapshot, new.sent_by_name, '');

  select p.full_name, p.email
    into employee_snapshot, employee_mail
  from public.metro_profiles p
  where p.employee_id = new.employee_id
  limit 1;
  new.employee_name := coalesce(employee_snapshot, new.employee_name, '');
  new.employee_email := coalesce(nullif(new.employee_email, ''), employee_mail, '');

  if new.id is null or new.id = '' then
    new.id := 'RMD-' || replace(gen_random_uuid()::text, '-', '');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_metro_email_reminder_logs_sync_snapshot on public.metro_email_reminder_logs;
create trigger trg_metro_email_reminder_logs_sync_snapshot
before insert or update on public.metro_email_reminder_logs
for each row execute function public.metro_sync_email_reminder_snapshot();

-- ---------------------------------------------------------------------------
-- Automatic DAR draft submission
-- Runs server-side so drafts submit even when the employee has closed the app.
-- 11:59 PM India time is 18:29 UTC, so the pg_cron schedule below uses 29 18.
-- ---------------------------------------------------------------------------
create or replace function public.metro_auto_submit_due_drafts()
returns table(submitted_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  local_date date := timezone('Asia/Kolkata', now())::date;
  local_clock time := timezone('Asia/Kolkata', now())::time;
begin
  with due_drafts as (
    select
      d.employee_id,
      p.full_name as employee_name,
      p.manager_employee_id as manager_id,
      m.full_name as manager_name,
      d.report_date,
      coalesce(nullif(d.report_type, ''), 'internal') as report_type,
      coalesce(nullif(d.location, ''), nullif(d.mobile_location, ''), '') as project_name,
      prepared.points_for_submit as points
    from public.metro_drafts d
    join public.metro_profiles p on p.employee_id = d.employee_id
    left join public.metro_profiles m on m.employee_id = p.manager_employee_id
    cross join lateral (
      select
        coalesce(d.points, '[]'::jsonb) ||
        case
          when nullif(trim(d.current_point), '') is null then '[]'::jsonb
          else jsonb_build_array(jsonb_build_object(
            'id', 'PT-AUTO-' || replace(gen_random_uuid()::text, '-', ''),
            'text', (jsonb_array_length(coalesce(d.points, '[]'::jsonb)) + 1)::text || '. ' || trim(d.current_point),
            'rawText', trim(d.current_point),
            'totalTime',
              case
                when nullif(trim(d.point_hours), '') is null and nullif(trim(d.point_minutes), '') is null then '0m'
                else trim(
                  coalesce(nullif(trim(d.point_hours), '') || 'h ', '') ||
                  coalesce(nullif(trim(d.point_minutes), '') || 'm', '')
                )
              end,
            'attachmentName', coalesce(d.attachment_name, ''),
            'attachmentData', coalesce(d.attachment_data, ''),
            'attachmentSize', coalesce(d.attachment_size, ''),
            'createdAt', now(),
            'updatedAt', now()
          ))
        end as points_for_submit
    ) prepared
    where jsonb_array_length(prepared.points_for_submit) > 0
      and (
        d.report_date < local_date
        or (d.report_date = local_date and local_clock >= time '23:59')
      )
  ),
  upserted_reports as (
    insert into public.metro_reports (
      id,
      employee_id,
      employee_name,
      manager_id,
      manager_name,
      report_date,
      report_type,
      title,
      project_name,
      approval_status,
      reviewed_by,
      reviewed_at,
      review_comment,
      submitted_at,
      points
    )
    select
      'RPT-' || employee_id || '-' || to_char(report_date, 'YYYY-MM-DD'),
      employee_id,
      employee_name,
      manager_id,
      coalesce(manager_name, ''),
      report_date,
      report_type,
      case when report_type = 'project' then 'Project-Specific DAR' else 'DAR' end,
      project_name,
      'pending',
      null,
      null,
      '',
      now(),
      points
    from due_drafts
    on conflict (employee_id, report_date) do update set
      approval_status = 'pending',
      reviewed_by = null,
      reviewed_at = null,
      review_comment = '',
      submitted_at = now(),
      points = public.metro_reports.points || excluded.points,
      project_name = coalesce(nullif(public.metro_reports.project_name, ''), excluded.project_name),
      updated_at = now()
    returning id, employee_id, employee_name, manager_id, report_date
  ),
  manager_notifications as (
    insert into public.metro_notifications (
      id,
      target_id,
      actor_id,
      report_id,
      kind,
      title,
      message
    )
    select
      'NTF-' || replace(gen_random_uuid()::text, '-', ''),
      manager_id,
      employee_id,
      id,
      'submission',
      'DAR Auto-Submitted',
      employee_name || ' auto-submitted DAR at 11:59 PM for ' || to_char(report_date, 'YYYY-MM-DD') || '.'
    from upserted_reports
    where manager_id is not null and manager_id <> ''
    returning 1
  ),
  cleared_empty_drafts as (
    delete from public.metro_drafts d
    where jsonb_array_length(coalesce(d.points, '[]'::jsonb)) = 0
      and nullif(trim(d.current_point), '') is null
      and (
        d.report_date < local_date
        or (d.report_date = local_date and local_clock >= time '23:59')
      )
    returning d.employee_id
  ),
  cleared_drafts as (
    delete from public.metro_drafts d
    using upserted_reports r
    where d.employee_id = r.employee_id
      and d.report_date = r.report_date
    returning d.employee_id
  )
  select count(*)::integer into submitted_count from cleared_drafts;

  return next;
end;
$$;

create extension if not exists pg_cron with schema extensions;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'metro-auto-submit-drafts-9pm-ist') then
    perform cron.unschedule('metro-auto-submit-drafts-9pm-ist');
  end if;
  if exists (select 1 from cron.job where jobname = 'metro-auto-submit-drafts-1159pm-ist') then
    perform cron.unschedule('metro-auto-submit-drafts-1159pm-ist');
  end if;

  perform cron.schedule(
    'metro-auto-submit-drafts-1159pm-ist',
    '29 18 * * *',
    'select public.metro_auto_submit_due_drafts();'
  );
end $$;

create table if not exists public.metro_announcements (
  id text primary key,
  created_by text references public.metro_profiles(employee_id) on delete set null,
  created_by_name text not null default '',
  title text not null default 'Metro Daily Broadcast',
  message text not null,
  audience text not null default 'all' check (audience in ('all', 'level23', 'level2', 'level3', 'admin')),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists metro_announcements_created_at_idx on public.metro_announcements (created_at desc);

create or replace function public.metro_sync_announcement_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  creator_snapshot text;
begin
  if new.created_by is not null and new.created_by <> '' then
    select p.full_name into creator_snapshot
    from public.metro_profiles p
    where p.employee_id = new.created_by
    limit 1;
    new.created_by_name := coalesce(creator_snapshot, new.created_by_name, '');
  else
    new.created_by_name := coalesce(new.created_by_name, '');
  end if;

  if new.id is null or new.id = '' then
    new.id := 'ANN-' || replace(gen_random_uuid()::text, '-', '');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_metro_announcements_sync_snapshot on public.metro_announcements;
create trigger trg_metro_announcements_sync_snapshot
before insert or update on public.metro_announcements
for each row execute function public.metro_sync_announcement_snapshot();

-- ---------------------------------------------------------------------------
-- Issues / feedback
-- ---------------------------------------------------------------------------
create table if not exists public.metro_issues (
  id text primary key,
  raised_by text not null references public.metro_profiles(employee_id) on delete cascade,
  raised_by_name text not null default '',
  title text not null,
  description text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  response text,
  reviewed_by text references public.metro_profiles(employee_id) on delete set null,
  reviewed_by_name text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists metro_issues_raised_by_idx on public.metro_issues (raised_by);
create index if not exists metro_issues_status_idx on public.metro_issues (status);

create or replace function public.metro_sync_issue_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raiser_snapshot text;
  reviewer_snapshot text;
begin
  select p.full_name into raiser_snapshot
  from public.metro_profiles p
  where p.employee_id = new.raised_by
  limit 1;
  new.raised_by_name := coalesce(raiser_snapshot, new.raised_by_name, '');

  if new.reviewed_by is not null and new.reviewed_by <> '' then
    select p.full_name into reviewer_snapshot
    from public.metro_profiles p
    where p.employee_id = new.reviewed_by
    limit 1;
    new.reviewed_by_name := coalesce(reviewer_snapshot, new.reviewed_by_name, '');
  end if;

  if new.id is null or new.id = '' then
    new.id := 'ISS-' || replace(gen_random_uuid()::text, '-', '');
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_metro_issues_sync_snapshot on public.metro_issues;
create trigger trg_metro_issues_sync_snapshot
before insert or update on public.metro_issues
for each row execute function public.metro_sync_issue_snapshot();

-- ---------------------------------------------------------------------------
-- Deleted users audit
-- ---------------------------------------------------------------------------
create table if not exists public.metro_deleted_users (
  id text primary key,
  employee_id text not null,
  full_name text not null,
  password_plaintext text not null default '',
  role_level text not null check (role_level in ('admin', '1', '2', '3')),
  department text not null default 'General',
  manager_employee_id text,
  manager_name text,
  deleted_by text references public.metro_profiles(employee_id) on delete set null,
  deleted_by_name text not null default '',
  reason text,
  deleted_at timestamptz not null default now()
);

create index if not exists metro_deleted_users_employee_idx on public.metro_deleted_users (employee_id);
create index if not exists metro_deleted_users_deleted_at_idx on public.metro_deleted_users (deleted_at desc);

create or replace function public.metro_sync_deleted_user_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  deleter_snapshot text;
begin
  if new.deleted_by is not null and new.deleted_by <> '' then
    select p.full_name into deleter_snapshot
    from public.metro_profiles p
    where p.employee_id = new.deleted_by
    limit 1;
    new.deleted_by_name := coalesce(deleter_snapshot, new.deleted_by_name, '');
  end if;

  if new.id is null or new.id = '' then
    new.id := 'DEL-' || replace(gen_random_uuid()::text, '-', '');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_metro_deleted_users_sync_snapshot on public.metro_deleted_users;
create trigger trg_metro_deleted_users_sync_snapshot
before insert or update on public.metro_deleted_users
for each row execute function public.metro_sync_deleted_user_snapshot();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.metro_profiles enable row level security;
alter table public.metro_tasks enable row level security;
alter table public.metro_reports enable row level security;
alter table public.metro_drafts enable row level security;
alter table public.metro_notifications enable row level security;
alter table public.metro_email_reminder_logs enable row level security;
alter table public.metro_announcements enable row level security;
alter table public.metro_issues enable row level security;
alter table public.metro_deleted_users enable row level security;
alter table public.metro_holidays enable row level security;
alter table public.metro_leaves enable row level security;

-- metro_leaves
drop policy if exists "leaves_select" on public.metro_leaves;
create policy "leaves_select"
on public.metro_leaves
for select
using (
  public.is_admin()
  or public.current_role_level() = '1'
  or employee_id = public.current_employee_id()
);

drop policy if exists "leaves_insert_own" on public.metro_leaves;
create policy "leaves_insert_own"
on public.metro_leaves
for insert
with check (
  employee_id = public.current_employee_id()
  and public.current_role_level() in ('2', '3')
);

-- metro_holidays
drop policy if exists "holidays_select_all" on public.metro_holidays;
create policy "holidays_select_all"
on public.metro_holidays
for select
using (true);

drop policy if exists "holidays_write_admin" on public.metro_holidays;
create policy "holidays_write_admin"
on public.metro_holidays
for all
using (public.is_admin())
with check (public.is_admin());

-- metro_profiles
drop policy if exists "profiles_select" on public.metro_profiles;
create policy "profiles_select"
on public.metro_profiles
for select
using (public.can_view_employee(employee_id));

drop policy if exists "profiles_insert_admin_or_l1" on public.metro_profiles;
create policy "profiles_insert_admin_or_l1"
on public.metro_profiles
for insert
with check (public.current_role_level() in ('admin', '1'));

drop policy if exists "profiles_update_self_or_admin" on public.metro_profiles;
create policy "profiles_update_self_or_admin"
on public.metro_profiles
for update
using (
  public.is_admin()
  or (employee_id = public.current_employee_id() and public.current_role_level() in ('2', '3'))
)
with check (
  public.is_admin()
  or (employee_id = public.current_employee_id() and public.current_role_level() in ('2', '3'))
);

drop policy if exists "profiles_delete_admin" on public.metro_profiles;
create policy "profiles_delete_admin"
on public.metro_profiles
for delete
using (public.is_admin());

-- metro_tasks
drop policy if exists "tasks_select" on public.metro_tasks;
create policy "tasks_select"
on public.metro_tasks
for select
using (
  public.is_admin()
  or public.current_role_level() = '1'
  or target_employee_id = public.current_employee_id()
  or public.is_direct_manager_of(target_employee_id)
);

drop policy if exists "tasks_insert" on public.metro_tasks;
create policy "tasks_insert"
on public.metro_tasks
for insert
with check (
  public.is_admin()
  or public.current_role_level() = '1'
  or (public.current_role_level() = '2' and public.is_direct_manager_of(target_employee_id))
);

drop policy if exists "tasks_update" on public.metro_tasks;
create policy "tasks_update"
on public.metro_tasks
for update
using (
  public.is_admin()
  or public.current_role_level() = '1'
  or target_employee_id = public.current_employee_id()
  or assigned_by_employee_id = public.current_employee_id()
  or (public.current_role_level() = '2' and public.is_direct_manager_of(target_employee_id))
)
with check (
  public.is_admin()
  or public.current_role_level() = '1'
  or target_employee_id = public.current_employee_id()
  or assigned_by_employee_id = public.current_employee_id()
  or (public.current_role_level() = '2' and public.is_direct_manager_of(target_employee_id))
);

drop policy if exists "tasks_delete_admin" on public.metro_tasks;
create policy "tasks_delete_admin"
on public.metro_tasks
for delete
using (public.is_admin());

-- metro_reports
drop policy if exists "reports_select" on public.metro_reports;
create policy "reports_select"
on public.metro_reports
for select
using (public.can_view_report(employee_id, manager_id));

drop policy if exists "reports_insert_self" on public.metro_reports;
create policy "reports_insert_self"
on public.metro_reports
for insert
with check (
  public.is_admin()
  or employee_id = public.current_employee_id()
);

drop policy if exists "reports_owner_update" on public.metro_reports;
create policy "reports_owner_update"
on public.metro_reports
for update
using (
  employee_id = public.current_employee_id()
  and approval_status <> 'approved'
)
with check (
  employee_id = public.current_employee_id()
  and approval_status in ('pending', 'declined')
);

drop policy if exists "reports_reviewer_update" on public.metro_reports;
create policy "reports_reviewer_update"
on public.metro_reports
for update
using (
  approval_status = 'pending'
  and public.can_review_report(employee_id, manager_id, report_date)
)
with check (
  public.can_review_report(employee_id, manager_id, report_date)
  and approval_status in ('pending', 'approved', 'declined')
);

drop policy if exists "reports_delete_admin" on public.metro_reports;
create policy "reports_delete_admin"
on public.metro_reports
for delete
using (public.is_admin());

-- metro_drafts
drop policy if exists "drafts_select_own" on public.metro_drafts;
create policy "drafts_select_own"
on public.metro_drafts
for select
using (employee_id = public.current_employee_id());

drop policy if exists "drafts_upsert_own" on public.metro_drafts;
create policy "drafts_upsert_own"
on public.metro_drafts
for insert
with check (employee_id = public.current_employee_id());

drop policy if exists "drafts_update_own" on public.metro_drafts;
create policy "drafts_update_own"
on public.metro_drafts
for update
using (employee_id = public.current_employee_id())
with check (employee_id = public.current_employee_id());

drop policy if exists "drafts_delete_own" on public.metro_drafts;
create policy "drafts_delete_own"
on public.metro_drafts
for delete
using (employee_id = public.current_employee_id());

-- metro_notifications
drop policy if exists "notifications_select_own" on public.metro_notifications;
create policy "notifications_select_own"
on public.metro_notifications
for select
using (target_id = public.current_employee_id());

drop policy if exists "notifications_insert_allowed" on public.metro_notifications;
create policy "notifications_insert_allowed"
on public.metro_notifications
for insert
with check (
  public.is_admin()
  or public.current_role_level() = '1'
  or target_id = public.current_employee_id()
  or (public.current_role_level() = '2' and (target_id = public.current_employee_id() or public.is_direct_manager_of(target_id)))
  or (public.current_role_level() = '3' and (
    target_id = public.current_employee_id()
    or exists (
      select 1
      from public.metro_profiles me
      where me.employee_id = public.current_employee_id()
        and me.manager_employee_id = target_id
    )
  ))
);

drop policy if exists "notifications_update_own" on public.metro_notifications;
create policy "notifications_update_own"
on public.metro_notifications
for update
using (target_id = public.current_employee_id())
with check (target_id = public.current_employee_id());

drop policy if exists "notifications_delete_admin" on public.metro_notifications;
create policy "notifications_delete_admin"
on public.metro_notifications
for delete
using (public.is_admin());

-- metro_email_reminder_logs
drop policy if exists "email_reminder_logs_select_l1_or_admin" on public.metro_email_reminder_logs;
create policy "email_reminder_logs_select_l1_or_admin"
on public.metro_email_reminder_logs
for select
using (
  public.is_admin()
  or (public.current_role_level() = '1' and sent_by = public.current_employee_id())
);

drop policy if exists "email_reminder_logs_insert_l1" on public.metro_email_reminder_logs;
create policy "email_reminder_logs_insert_l1"
on public.metro_email_reminder_logs
for insert
with check (
  public.current_role_level() = '1'
  and sent_by = public.current_employee_id()
  and exists (
    select 1
    from public.metro_profiles p
    where p.employee_id = employee_id
      and p.role_level in ('2', '3')
  )
);

drop policy if exists "email_reminder_logs_delete_admin" on public.metro_email_reminder_logs;
create policy "email_reminder_logs_delete_admin"
on public.metro_email_reminder_logs
for delete
using (public.is_admin());

-- metro_announcements
drop policy if exists "announcements_select_visible" on public.metro_announcements;
create policy "announcements_select_visible"
on public.metro_announcements
for select
using (
  audience = 'all'
  or (audience = 'level23' and public.current_role_level() in ('2', '3'))
  or (audience = 'level2' and public.current_role_level() = '2')
  or (audience = 'level3' and public.current_role_level() = '3')
  or (audience = 'admin' and public.is_admin())
  or created_by = public.current_employee_id()
);

drop policy if exists "announcements_insert_admin_or_l1" on public.metro_announcements;
create policy "announcements_insert_admin_or_l1"
on public.metro_announcements
for insert
with check (public.current_role_level() in ('admin', '1'));

drop policy if exists "announcements_update_creator_or_admin" on public.metro_announcements;
create policy "announcements_update_creator_or_admin"
on public.metro_announcements
for update
using (created_by = public.current_employee_id() or public.is_admin())
with check (created_by = public.current_employee_id() or public.is_admin());

drop policy if exists "announcements_delete_creator_or_admin" on public.metro_announcements;
create policy "announcements_delete_creator_or_admin"
on public.metro_announcements
for delete
using (created_by = public.current_employee_id() or public.is_admin());

-- metro_issues
drop policy if exists "issues_select_own_or_admin" on public.metro_issues;
create policy "issues_select_own_or_admin"
on public.metro_issues
for select
using (raised_by = public.current_employee_id() or public.is_admin());

drop policy if exists "issues_insert_own" on public.metro_issues;
create policy "issues_insert_own"
on public.metro_issues
for insert
with check (raised_by = public.current_employee_id());

drop policy if exists "issues_update_admin" on public.metro_issues;
create policy "issues_update_admin"
on public.metro_issues
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "issues_delete_admin" on public.metro_issues;
create policy "issues_delete_admin"
on public.metro_issues
for delete
using (public.is_admin());

-- metro_deleted_users
drop policy if exists "deleted_users_admin_only" on public.metro_deleted_users;
create policy "deleted_users_admin_only"
on public.metro_deleted_users
for all
using (public.is_admin())
with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Updated-at triggers
-- ---------------------------------------------------------------------------
create or replace function public.metro_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_metro_tasks_updated_at on public.metro_tasks;
create trigger trg_metro_tasks_updated_at
before update on public.metro_tasks
for each row execute function public.metro_set_updated_at();

drop trigger if exists trg_metro_reports_updated_at on public.metro_reports;
create trigger trg_metro_reports_updated_at
before update on public.metro_reports
for each row execute function public.metro_set_updated_at();

drop trigger if exists trg_metro_drafts_updated_at on public.metro_drafts;
create trigger trg_metro_drafts_updated_at
before update on public.metro_drafts
for each row execute function public.metro_set_updated_at();

drop trigger if exists trg_metro_issues_updated_at on public.metro_issues;
create trigger trg_metro_issues_updated_at
before update on public.metro_issues
for each row execute function public.metro_set_updated_at();

-- ---------------------------------------------------------------------------
-- Optional seed data for the current demo portal
-- ---------------------------------------------------------------------------
insert into public.metro_profiles (
  employee_id,
  full_name,
  password_plaintext,
  role_level,
  department,
  manager_employee_id,
  email,
  location,
  bio,
  profile_img_url,
  last_dar_date,
  created_by_employee_id,
  is_seed
)
values
  (
    'METRO-000',
    'Master Admin',
    'Master@123',
    'admin',
    'Administration',
    null,
    'admin@metrogroup.local',
    'HQ',
    'Master administrator for Metro Group.',
    '',
    null,
    0,
    0,
    '{}'::text[],
    'METRO-000',
    true
  ),
  (
    'METRO-001',
    'Ananya Rao',
    'metro123',
    '1',
    'Executive',
    null,
    'ananya.rao@metrogroup.local',
    'Mumbai',
    'Leads the Metro Group executive workflow.',
    '',
    null,
    0,
    0,
    '{}'::text[],
    'METRO-000',
    true
  ),
  (
    'METRO-101',
    'Ritika Verma',
    'metro123',
    '2',
    'Operations',
    'METRO-001',
    'ritika.verma@metrogroup.local',
    'Delhi',
    'Coordinates operations and reviews the DAR flow for the assigned team.',
    '',
    null,
    0,
    0,
    '{}'::text[],
    'METRO-001',
    true
  ),
  (
    'METRO-201',
    'Aarav Sharma',
    'metro123',
    '3',
    'Operations',
    'METRO-101',
    'aarav.sharma@metrogroup.local',
    'Bengaluru',
    'Handles daily operational execution with steady reporting discipline.',
    '',
    null,
    0,
    0,
    '{}'::text[],
    'METRO-001',
    true
  )
on conflict (employee_id) do nothing;

insert into public.metro_tasks (
  id,
  target_employee_id,
  assigned_by_employee_id,
  title,
  notes,
  task_type,
  due_date,
  completed
)
values
  (
    'TSK-1',
    'METRO-101',
    'METRO-001',
    'Review branch collection summary and assign follow-up work.',
    'Split this into team actions after your review.',
    'project',
    current_date,
    false
  ),
  (
    'TSK-2',
    'METRO-201',
    'METRO-101',
    'Complete invoice generation and upload proof.',
    'Add all completed points in today''s DAR.',
    'internal',
    current_date,
    false
  )
on conflict (id) do nothing;
