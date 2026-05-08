# Whoopie Pie University

A Next.js and Supabase starter for Whoopie Pie University operations.

The implemented stories include authentication as a student, staff member, or administrator; staff/faculty course creation; student course catalog search/filtering; student study planning; admin student records; room/lab availability and reservations; course material upload/download; admin course-staff assignment; assigned-course views; and university-wide announcements/events. Supabase Auth handles the email/password session, while the `profiles` table stores the user's university role.

## Modules

- Facilities: classrooms, laboratories, student records, admissions, and resource allocation.
- Curriculum: courses, catalog access, study planning, learning materials, and assessments.
- Staff: staff profiles, course assignments, office hours, and HR functions.
- Community: messaging, announcements, events, and collaboration.

## Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local` and fill in the Supabase values.
4. Install dependencies and start the app:

```bash
npm install
npm run dev
```

Open `http://localhost:3000/login`.

For production, staff accounts should be invitation or admin provisioned instead of open signup.

## Current Pages

- `/login`: student or staff login and signup.
- `/dashboard/student`: student dashboard with catalog and study plan entry points.
- `/dashboard/staff`: faculty/staff dashboard with course creation entry points.
- `/dashboard/admin`: administrator dashboard with assignment and community publishing entry points.
- `/courses`: course catalog with search, filters, and student add-to-plan actions.
- `/courses/create`: staff/faculty course creation form.
- `/study-plan`: student saved study plan with remove actions.
- `/admin/student-records`: admin search and view for student records.
- `/admin/student-records/create`: admin student record creation form.
- `/admin/student-records/[id]`: student record detail view.
- `/rooms`: classroom and lab availability by selected time period.
- `/reservations`: schedule, view, and cancel room reservations.
- `/reservations/[id]`: modify an existing reservation.
- `/course-materials`: upload/manage course materials for staff/admin; download for students.
- `/admin/course-assignments`: admin form for assigning professors and TAs to courses.
- `/assigned-courses`: professor/TA assigned courses list for the logged-in staff member.
- `/announcements`: centralized announcements and events hub.
- `/announcements/create`: staff/admin publishing form.
- `/announcements/[id]`: full announcement or event details.

## Notes

- Staff users represent the faculty/professor/TA workflow in this slice. Professor vs TA is stored per course assignment.
- Administrator accounts can assign staff to courses and publish community updates.
- Administrator accounts can create and view student records.
- Staff/admin users can schedule rooms; cancellation asks for confirmation before submitting.
- Course material files are stored in the private `course-materials` Supabase Storage bucket.
- Duplicate study plan entries are blocked by both the UI and the database unique constraint.
- Prerequisites can be stored in `course_prerequisites`; adding a course checks completed courses in `student_completed_courses`.
