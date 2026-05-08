create extension if not exists pgcrypto;

do $$
begin
  create type public.app_role as enum ('student', 'staff', 'admin');
exception
  when duplicate_object then null;
end $$;

alter type public.app_role add value if not exists 'admin';

do $$
begin
  create type public.course_type as enum ('core', 'elective', 'lab', 'seminar');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.teaching_assignment_role as enum ('professor', 'ta');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.community_post_type as enum ('announcement', 'event');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.student_record_status as enum ('active', 'inactive', 'graduated');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.room_type as enum ('classroom', 'lab');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.reservation_status as enum ('scheduled', 'cancelled');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'student',
  full_name text,
  university_id text,
  department text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.app_role := 'student';
begin
  if new.raw_user_meta_data ->> 'role' in ('student', 'staff', 'admin') then
    requested_role := (new.raw_user_meta_data ->> 'role')::public.app_role;
  end if;

  insert into public.profiles (
    id,
    role,
    full_name,
    university_id,
    department
  )
  values (
    new.id,
    requested_role,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'university_id', ''),
    nullif(new.raw_user_meta_data ->> 'department', '')
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    university_id = excluded.university_id,
    department = excluded.department,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.current_app_role()
returns public.app_role
language sql
security definer
set search_path = public
stable
as $$
  select role
  from public.profiles
  where id = auth.uid()
$$;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
drop policy if exists "Profiles are viewable by admin" on public.profiles;
drop policy if exists "Profiles are insertable by owner" on public.profiles;
drop policy if exists "Profiles are updatable by owner" on public.profiles;

create policy "Profiles are viewable by owner"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Profiles are viewable by admin"
on public.profiles
for select
to authenticated
using (public.current_app_role() = 'admin');

create policy "Profiles are updatable by owner"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

revoke all on public.profiles from anon;
revoke all on public.profiles from authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, university_id, department) on public.profiles to authenticated;

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  department text not null,
  semester text not null,
  type public.course_type not null,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.courses enable row level security;

drop trigger if exists courses_set_updated_at on public.courses;

create trigger courses_set_updated_at
before update on public.courses
for each row
execute function public.set_updated_at();

create table if not exists public.course_prerequisites (
  course_id uuid not null references public.courses(id) on delete cascade,
  prerequisite_course_id uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (course_id, prerequisite_course_id),
  constraint course_prerequisites_no_self_reference
    check (course_id <> prerequisite_course_id)
);

alter table public.course_prerequisites enable row level security;

create table if not exists public.student_completed_courses (
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (student_id, course_id)
);

alter table public.student_completed_courses enable row level security;

create table if not exists public.study_plan_courses (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (student_id, course_id)
);

alter table public.study_plan_courses enable row level security;

create table if not exists public.course_staff_assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  staff_id uuid not null references public.profiles(id) on delete cascade,
  assignment_role public.teaching_assignment_role not null,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (course_id, staff_id)
);

alter table public.course_staff_assignments enable row level security;

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category text not null,
  post_type public.community_post_type not null,
  post_date date not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.community_posts enable row level security;

drop trigger if exists community_posts_set_updated_at on public.community_posts;

create trigger community_posts_set_updated_at
before update on public.community_posts
for each row
execute function public.set_updated_at();

create table if not exists public.student_records (
  id uuid primary key default gen_random_uuid(),
  student_id text not null unique,
  full_name text not null,
  email text not null,
  phone text not null,
  address text not null,
  department text not null,
  program text not null,
  academic_level text not null,
  enrollment_year integer not null,
  status public.student_record_status not null default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_records enable row level security;

drop trigger if exists student_records_set_updated_at on public.student_records;

create trigger student_records_set_updated_at
before update on public.student_records
for each row
execute function public.set_updated_at();

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type public.room_type not null,
  capacity integer not null check (capacity > 0),
  location text not null,
  equipment text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rooms enable row level security;

drop trigger if exists rooms_set_updated_at on public.rooms;

create trigger rooms_set_updated_at
before update on public.rooms
for each row
execute function public.set_updated_at();

create table if not exists public.room_reservations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  session_name text not null,
  instructor_id uuid not null references public.profiles(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  expected_attendance integer not null check (expected_attendance > 0),
  required_equipment text[] not null default '{}',
  status public.reservation_status not null default 'scheduled',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint room_reservations_valid_time check (start_at < end_at)
);

alter table public.room_reservations enable row level security;

drop trigger if exists room_reservations_set_updated_at on public.room_reservations;

create trigger room_reservations_set_updated_at
before update on public.room_reservations
for each row
execute function public.set_updated_at();

create table if not exists public.course_materials (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  file_name text not null,
  file_path text not null unique,
  file_type text not null,
  file_size integer not null check (file_size > 0),
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.course_materials enable row level security;

drop trigger if exists course_materials_set_updated_at on public.course_materials;

create trigger course_materials_set_updated_at
before update on public.course_materials
for each row
execute function public.set_updated_at();

drop policy if exists "Courses are viewable by authenticated users" on public.courses;
drop policy if exists "Staff can create courses" on public.courses;
drop policy if exists "Course prerequisites are viewable by authenticated users" on public.course_prerequisites;
drop policy if exists "Staff can manage course prerequisites" on public.course_prerequisites;
drop policy if exists "Students can view their completed courses" on public.student_completed_courses;
drop policy if exists "Staff can add completed courses" on public.student_completed_courses;
drop policy if exists "Students can view their study plan" on public.study_plan_courses;
drop policy if exists "Students can add to their study plan" on public.study_plan_courses;
drop policy if exists "Students can remove from their study plan" on public.study_plan_courses;
drop policy if exists "Admins can manage course staff assignments" on public.course_staff_assignments;
drop policy if exists "Assigned staff can view their assignments" on public.course_staff_assignments;
drop policy if exists "Community posts are viewable by authenticated users" on public.community_posts;
drop policy if exists "Staff and admins can publish community posts" on public.community_posts;
drop policy if exists "Admins can manage student records" on public.student_records;
drop policy if exists "Staff and admins can view rooms" on public.rooms;
drop policy if exists "Admins can manage rooms" on public.rooms;
drop policy if exists "Staff and admins can manage reservations" on public.room_reservations;
drop policy if exists "Course materials visible to permitted users" on public.course_materials;
drop policy if exists "Staff and admins can add course materials" on public.course_materials;
drop policy if exists "Staff and admins can update course materials" on public.course_materials;
drop policy if exists "Staff and admins can delete course materials" on public.course_materials;

create policy "Courses are viewable by authenticated users"
on public.courses
for select
to authenticated
using (true);

create policy "Staff can create courses"
on public.courses
for insert
to authenticated
with check (
  auth.uid() = created_by
  and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'staff'
  )
);

create policy "Course prerequisites are viewable by authenticated users"
on public.course_prerequisites
for select
to authenticated
using (true);

create policy "Staff can manage course prerequisites"
on public.course_prerequisites
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'staff'
  )
);

create policy "Students can view their completed courses"
on public.student_completed_courses
for select
to authenticated
using (auth.uid() = student_id);

create policy "Staff can add completed courses"
on public.student_completed_courses
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'staff'
  )
);

create policy "Students can view their study plan"
on public.study_plan_courses
for select
to authenticated
using (auth.uid() = student_id);

create policy "Students can add to their study plan"
on public.study_plan_courses
for insert
to authenticated
with check (
  auth.uid() = student_id
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'student'
  )
);

create policy "Students can remove from their study plan"
on public.study_plan_courses
for delete
to authenticated
using (auth.uid() = student_id);

create policy "Admins can manage course staff assignments"
on public.course_staff_assignments
for all
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create policy "Assigned staff can view their assignments"
on public.course_staff_assignments
for select
to authenticated
using (auth.uid() = staff_id);

create policy "Community posts are viewable by authenticated users"
on public.community_posts
for select
to authenticated
using (true);

create policy "Staff and admins can publish community posts"
on public.community_posts
for insert
to authenticated
with check (public.current_app_role() in ('staff', 'admin'));

create policy "Admins can manage student records"
on public.student_records
for all
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create policy "Staff and admins can view rooms"
on public.rooms
for select
to authenticated
using (public.current_app_role() in ('staff', 'admin'));

create policy "Admins can manage rooms"
on public.rooms
for all
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create policy "Staff and admins can manage reservations"
on public.room_reservations
for all
to authenticated
using (public.current_app_role() in ('staff', 'admin'))
with check (public.current_app_role() in ('staff', 'admin'));

create policy "Course materials visible to permitted users"
on public.course_materials
for select
to authenticated
using (
  public.current_app_role() = 'admin'
  or (
    public.current_app_role() = 'staff'
    and (
      exists (
        select 1
        from public.courses
        where courses.id = course_materials.course_id
          and courses.created_by = auth.uid()
      )
      or exists (
        select 1
        from public.course_staff_assignments
        where course_staff_assignments.course_id = course_materials.course_id
          and course_staff_assignments.staff_id = auth.uid()
      )
    )
  )
  or (
    public.current_app_role() = 'student'
    and exists (
      select 1
      from public.study_plan_courses
      where study_plan_courses.course_id = course_materials.course_id
        and study_plan_courses.student_id = auth.uid()
    )
  )
);

create policy "Staff and admins can add course materials"
on public.course_materials
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and (
    public.current_app_role() = 'admin'
    or (
      public.current_app_role() = 'staff'
      and (
        exists (
          select 1
          from public.courses
          where courses.id = course_materials.course_id
            and courses.created_by = auth.uid()
        )
        or exists (
          select 1
          from public.course_staff_assignments
          where course_staff_assignments.course_id = course_materials.course_id
            and course_staff_assignments.staff_id = auth.uid()
        )
      )
    )
  )
);

create policy "Staff and admins can update course materials"
on public.course_materials
for update
to authenticated
using (
  public.current_app_role() = 'admin'
  or (
    public.current_app_role() = 'staff'
    and (
      exists (
        select 1
        from public.courses
        where courses.id = course_materials.course_id
          and courses.created_by = auth.uid()
      )
      or exists (
        select 1
        from public.course_staff_assignments
        where course_staff_assignments.course_id = course_materials.course_id
          and course_staff_assignments.staff_id = auth.uid()
      )
    )
  )
)
with check (
  public.current_app_role() = 'admin'
  or (
    public.current_app_role() = 'staff'
    and (
      exists (
        select 1
        from public.courses
        where courses.id = course_materials.course_id
          and courses.created_by = auth.uid()
      )
      or exists (
        select 1
        from public.course_staff_assignments
        where course_staff_assignments.course_id = course_materials.course_id
          and course_staff_assignments.staff_id = auth.uid()
      )
    )
  )
);

create policy "Staff and admins can delete course materials"
on public.course_materials
for delete
to authenticated
using (
  public.current_app_role() = 'admin'
  or (
    public.current_app_role() = 'staff'
    and (
      exists (
        select 1
        from public.courses
        where courses.id = course_materials.course_id
          and courses.created_by = auth.uid()
      )
      or exists (
        select 1
        from public.course_staff_assignments
        where course_staff_assignments.course_id = course_materials.course_id
          and course_staff_assignments.staff_id = auth.uid()
      )
    )
  )
);

revoke all on public.courses from anon;
revoke all on public.courses from authenticated;
revoke all on public.course_prerequisites from anon;
revoke all on public.course_prerequisites from authenticated;
revoke all on public.student_completed_courses from anon;
revoke all on public.student_completed_courses from authenticated;
revoke all on public.study_plan_courses from anon;
revoke all on public.study_plan_courses from authenticated;
revoke all on public.course_staff_assignments from anon;
revoke all on public.course_staff_assignments from authenticated;
revoke all on public.community_posts from anon;
revoke all on public.community_posts from authenticated;
revoke all on public.student_records from anon;
revoke all on public.student_records from authenticated;
revoke all on public.rooms from anon;
revoke all on public.rooms from authenticated;
revoke all on public.room_reservations from anon;
revoke all on public.room_reservations from authenticated;
revoke all on public.course_materials from anon;
revoke all on public.course_materials from authenticated;

grant select, insert on public.courses to authenticated;
grant select, insert on public.course_prerequisites to authenticated;
grant select, insert on public.student_completed_courses to authenticated;
grant select, insert, delete on public.study_plan_courses to authenticated;
grant select, insert, update, delete on public.course_staff_assignments to authenticated;
grant select, insert on public.community_posts to authenticated;
grant select, insert, update, delete on public.student_records to authenticated;
grant select, insert, update, delete on public.rooms to authenticated;
grant select, insert, update, delete on public.room_reservations to authenticated;
grant select, insert, update, delete on public.course_materials to authenticated;

insert into public.rooms (name, type, capacity, location, equipment)
values
  ('Maroon Hall 101', 'classroom', 60, 'Maroon Hall', array['Projector', 'Whiteboard']),
  ('Cranberry Lab A', 'lab', 28, 'Science Wing', array['Lab benches', 'Projector', 'Safety equipment']),
  ('Burgundy Lecture Theater', 'classroom', 140, 'Main Quad', array['Projector', 'Microphone', 'Recording']),
  ('Ganache Computing Lab', 'lab', 36, 'Technology Center', array['Computers', 'Projector', 'Whiteboard'])
on conflict (name) do update
set
  type = excluded.type,
  capacity = excluded.capacity,
  location = excluded.location,
  equipment = excluded.equipment,
  updated_at = now();

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'course-materials',
  'course-materials',
  false,
  20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Course materials objects are readable by authenticated users" on storage.objects;
drop policy if exists "Staff and admins can upload material objects" on storage.objects;
drop policy if exists "Staff and admins can update material objects" on storage.objects;
drop policy if exists "Staff and admins can delete material objects" on storage.objects;

create policy "Course materials objects are readable by authenticated users"
on storage.objects
for select
to authenticated
using (bucket_id = 'course-materials');

create policy "Staff and admins can upload material objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'course-materials'
  and public.current_app_role() in ('staff', 'admin')
);

create policy "Staff and admins can update material objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'course-materials'
  and public.current_app_role() in ('staff', 'admin')
)
with check (
  bucket_id = 'course-materials'
  and public.current_app_role() in ('staff', 'admin')
);

create policy "Staff and admins can delete material objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'course-materials'
  and public.current_app_role() in ('staff', 'admin')
);
