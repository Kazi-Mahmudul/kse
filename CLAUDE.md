# KSE Mobile App — CLAUDE.md

## 1. Project Overview

**KSE (Khulna Student Ecosystem)** is a mobile-first student platform for discovering and managing opportunities in one place.

Core areas:

- Internships
- Scholarships
- Events
- Workshops
- Tuition / Tutor discovery
- Mentorship
- Communities
- Student profile
- Skills, certificates, projects, research and resume
- Personalized recommendations
- Deadline tracking and notifications

The first version should be **simple, fast, secure and easy to maintain**. Avoid unnecessary microservices, Kubernetes, Kafka, Elasticsearch, complicated event systems, or custom infrastructure until real scale requires them.

---

## 2. Product Strategy

### MVP Goal

Build one reliable mobile app where a student can:

1. Register/login
2. Complete profile
3. Browse opportunities
4. Search/filter opportunities
5. Save/bookmark opportunities
6. View deadlines
7. Join communities
8. Find tutors
9. Maintain portfolio/profile
10. Receive useful notifications

### Start Manual First

For the first release, **do not build heavy automation or scraping pipelines**.

Use an **Admin Content Management Portal** where admins manually create and verify:

- internships
- scholarships
- events
- workshops
- tuition/tutors
- mentors
- communities
- announcements

Reason:

- faster MVP
- easier quality control
- avoids bad scraped data
- avoids scraping/legal issues
- easier debugging
- validates whether students actually use the platform

### Automation Later

After MVP usage is proven, automate selected workflows:

- scheduled opportunity import
- deadline expiry
- notification scheduling
- duplicate detection
- recommendation scoring
- email parsing
- partner feeds/APIs
- approved web scraping where appropriate

Automation should be added **module by module**, not as a platform-wide dependency.

---

## 3. Recommended Tech Stack

## Mobile App

**React Native + Expo + TypeScript**

Use:

- Expo
- Expo Router
- TypeScript
- TanStack Query
- Zustand
- React Hook Form
- Zod
- NativeWind
- Expo Notifications
- Expo SecureStore

Why:

- fast development
- excellent Claude Code compatibility
- one codebase for Android + iOS
- large ecosystem
- easy push notification support
- easy deployment through EAS

---

## Backend

**Supabase**

Use Supabase for:

- PostgreSQL database
- Authentication
- Row Level Security
- Storage
- Realtime when needed
- Edge Functions
- Database migrations
- scheduled jobs where appropriate

Avoid creating a separate backend server initially unless a feature genuinely requires it.

The mobile app should access safe CRUD operations through Supabase using **RLS**.

Sensitive or privileged business logic should go through **Supabase Edge Functions**.

---

## Admin Panel

**Next.js + TypeScript + Tailwind CSS + shadcn/ui**

Use:

- Next.js App Router
- Supabase Auth
- Supabase JS client
- TanStack Table
- React Hook Form
- Zod
- shadcn/ui
- Tailwind CSS

Deploy admin panel to **Vercel**.

---

## Infrastructure

| Area | Choice |
|---|---|
| Mobile | Expo / EAS |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth |
| File Storage | Supabase Storage |
| Backend Logic | Supabase Edge Functions |
| Admin | Next.js |
| Admin Hosting | Vercel |
| CDN / Load Balancing | Managed by Supabase / Vercel |
| Rate Limiting | Edge Function + Upstash Redis |
| Monitoring | Sentry |
| Analytics | PostHog |
| Email | Resend |
| Push Notifications | Expo Notifications |
| CI/CD | GitHub Actions |
| Source Control | GitHub |

This architecture is intentionally managed-service heavy so the team can focus on product development.

---

## 4. High-Level Architecture

```text
                         ┌──────────────────────┐
                         │      Student         │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ Expo React Native App│
                         └──────────┬───────────┘
                                    │ HTTPS
                 ┌──────────────────┴──────────────────┐
                 │                                     │
                 ▼                                     ▼
       ┌───────────────────┐                ┌────────────────────┐
       │ Supabase API/Auth │                │ Supabase Edge Func │
       └─────────┬─────────┘                └──────────┬─────────┘
                 │                                     │
                 └──────────────────┬──────────────────┘
                                    ▼
                          ┌──────────────────┐
                          │ PostgreSQL + RLS │
                          └─────────┬────────┘
                                    │
                        ┌───────────┴───────────┐
                        ▼                       ▼
               ┌─────────────────┐     ┌─────────────────┐
               │ Supabase Storage│     │ Background Jobs │
               └─────────────────┘     └─────────────────┘


                    ADMIN SIDE

          ┌────────────────────────────┐
          │ Next.js Admin Panel        │
          └─────────────┬──────────────┘
                        │
                        ▼
             Supabase Auth / API / DB
```

---

## 5. User Roles

Keep roles simple.

### Student

Can:

- manage own profile
- browse opportunities
- bookmark
- join communities
- submit tuition/tutor requests where applicable
- follow deadlines
- manage portfolio

### Tutor / Mentor

Optional role in MVP.

Can:

- maintain professional profile
- specify subjects/skills
- manage availability
- respond to approved requests

### Content Manager

Can:

- create/edit opportunity content
- manage categories
- review submissions
- manage universities
- manage communities

### Admin

Can manage all content and users.

### Super Admin

Can additionally manage:

- admin roles
- permissions
- platform settings
- audit logs

Use database roles plus RLS. Never trust role values supplied by the mobile client.

---

## 6. Main Mobile Screens

### Authentication

- Splash
- Onboarding
- Login
- Registration
- Forgot password
- OTP/email verification

### Home

- greeting
- search
- opportunity banner
- quick access
- personalized recommendations
- upcoming deadlines
- latest opportunities

### Dashboard

Show:

- profile completion
- saved opportunities
- applications / actions
- upcoming deadlines
- joined communities
- achievements

### Internship

Filters:

- category
- location
- remote/on-site
- company
- internship type
- deadline

### Scholarship

Filters:

- local
- international
- university
- degree level
- funding type
- country
- deadline

### Events / Workshops

Filters:

- event type
- online/offline
- date
- organizer
- location

### Tuition

Initially use **discovery + contact/request workflow**, not complicated marketplace payments.

Students can:

- search tutor
- filter by subject
- university
- location
- expected fee
- rating later

### Community

MVP:

- community list
- membership
- announcements
- basic posts/discussions

Avoid building a full social network initially.

### Profile

Include:

- personal info
- university
- department
- academic level
- skills
- interests
- projects
- certificates
- achievements
- research
- resume
- portfolio links

---

## 7. Admin Panel

Admin panel is essential for MVP.

### Dashboard

Show:

- total users
- active students
- new registrations
- active opportunities
- expiring opportunities
- total tutors
- events
- communities
- content pending review

### Opportunity Management

Admins should manage:

- title
- organization
- description
- category
- tags
- location
- eligibility
- deadline
- application URL
- image/logo
- source
- verification status
- published status
- featured status

Supported content types:

- Internship
- Scholarship
- Event
- Workshop
- Mentorship opportunity

### Tuition Management

Admin manages:

- tutor profiles
- tutor verification
- subjects
- universities
- locations
- tuition requests
- reported tutors

### Community Management

Admin manages:

- communities
- categories
- memberships
- posts
- reports
- moderation

### User Management

Admin can:

- search users
- view status
- suspend/reactivate
- verify selected users
- view reports
- assign roles

Never allow admin to see user passwords.

### Notification Management

Admin can create:

- global notification
- targeted notification
- university-specific notification
- opportunity reminder
- campaign announcement

### Master Data

Manage:

- universities
- departments
- subjects
- skills
- opportunity categories
- scholarship types
- event types
- locations
- tags

### Platform Settings

Manage:

- support contact
- social links
- feature flags
- maintenance mode
- terms/privacy URLs
- minimum supported app version

### Audit Logs

Record important admin actions:

- create
- update
- delete
- approve
- suspend
- role change

---

## 8. Core Database Design

Use UUID primary keys.

Every major table should normally have:

```text
id
created_at
updated_at
created_by
status
```

Important tables:

```text
profiles
user_roles

universities
departments
subjects
skills

opportunities
opportunity_categories
opportunity_tags
saved_opportunities

events
event_registrations

tutors
tutor_subjects
tuition_requests

mentors
mentor_skills
mentorship_requests

communities
community_members
community_posts

user_skills
user_projects
user_certificates
user_achievements
user_research
user_resumes

notifications
notification_deliveries

reports
audit_logs
app_settings
```

Avoid creating separate tables for every opportunity subtype unless their fields become significantly different.

A practical design:

```text
opportunities
- id
- type
- title
- organization_name
- summary
- description
- image_url
- location
- opportunity_mode
- eligibility
- application_url
- deadline
- published_at
- status
- featured
- verified
- source_name
- source_url
```

Where `type` can be:

```text
internship
scholarship
workshop
event
mentorship
```

---

## 9. Authentication

For MVP support:

- email + password
- Google login

Phone OTP can be added later if required.

Session handling:

- Supabase Auth
- access tokens
- refresh tokens
- SecureStore on mobile

Never store:

- raw passwords
- service-role keys
- private secrets

inside the mobile app.

---

## 10. Authorization & RLS

**RLS must be enabled for user-facing tables.**

Examples:

Student can:

```text
SELECT own profile
UPDATE own profile
SELECT published opportunities
INSERT own saved opportunity
DELETE own saved opportunity
SELECT communities
INSERT own community membership
```

Admin-only operations should run through:

- server-side Next.js
- trusted Edge Functions
- privileged Supabase server client

The Supabase `service_role` key must never be shipped to the mobile app.

---

## 11. API Strategy

Do not create dozens of custom endpoints for normal CRUD.

Use Supabase client for simple read operations.

Examples:

```text
GET published opportunities
GET opportunity detail
GET own profile
GET communities
GET tutors
```

Use Edge Functions for:

- notification sending
- admin bulk actions
- protected application workflows
- recommendation generation
- file validation
- rate-limited public actions
- external API integrations
- future scraping/import jobs

---

## 12. Rate Limiting

Rate limit sensitive actions.

Examples:

```text
login attempts
password reset
OTP requests
contact requests
report submission
community posting
search abuse
Edge Function calls
```

Recommended:

**Upstash Redis + Supabase Edge Functions**

Example limits:

```text
Login:        10 attempts / 10 min / IP
Password reset: 5 / hour / account
Post create:  20 / hour / user
Reports:      10 / day / user
Search API:   60 / minute / user
```

Rate limit values should be configurable later.

Do not depend only on client-side throttling.

---

## 13. Load Balancing & Scalability

Do not manually build a load balancer.

Use managed infrastructure:

- Vercel handles admin web traffic
- Supabase handles API/database infrastructure
- CDN handles static assets
- Supabase Storage serves media

Scale vertically/managed first.

Only introduce dedicated backend instances or custom load balancers after monitoring proves they are necessary.

---

## 14. Security Rules

Required:

- HTTPS only
- Supabase RLS
- schema validation using Zod
- secure token storage
- server-side admin authorization
- rate limiting
- database indexes
- input sanitization
- file type validation
- file size restrictions
- audit logs
- environment variables
- secret rotation
- error monitoring
- dependency updates

Never:

- trust client role
- expose service-role keys
- build SQL strings manually
- allow unrestricted file uploads
- return sensitive user fields unnecessarily
- log access tokens or passwords

---

## 15. File Upload Rules

Use Supabase Storage.

Buckets:

```text
avatars
organization-logos
opportunity-images
certificates
resumes
community-media
```

Rules:

- private bucket for resumes/certificates
- signed URLs for private files
- public bucket only for intended public assets
- enforce allowed extensions
- enforce max file size
- randomize stored filename

Suggested maximums:

```text
Avatar:        2 MB
Image:         5 MB
Resume PDF:    10 MB
Certificate:   10 MB
```

---

## 16. Search

MVP:

Use PostgreSQL full-text search + indexed filters.

Do not add Elasticsearch/Algolia initially.

Search:

- internships
- scholarships
- events
- tutors
- communities

Common filters should have database indexes.

---

## 17. Recommendation System

Do not use AI initially.

Start with a simple rule-based score.

Example:

```text
same university             +2
matching department         +3
matching skills             +3
matching interests          +2
matching opportunity type   +2
location match              +1
deadline still active       required
```

Return highest scores.

Later this can be replaced with:

- behavioral scoring
- embeddings
- ML recommendations

without changing the mobile UI significantly.

---

## 18. Notifications

Use:

**Expo Push Notifications**

Notification examples:

- scholarship deadline approaching
- saved internship deadline
- new matching opportunity
- upcoming event
- community announcement
- platform announcement

Store notifications in database so users have an in-app notification inbox too.

---

## 19. Scheduled Jobs

Use Supabase scheduled functions / cron for:

```text
mark expired opportunities
send deadline reminders
send scheduled notifications
cleanup temporary data
generate daily platform metrics
```

Avoid creating a dedicated queue system in MVP.

---

## 20. Observability

Use:

### Sentry

For:

- React Native crashes
- Next.js errors
- Edge Function errors

### PostHog

For product analytics:

- signup completed
- profile completed
- opportunity viewed
- opportunity saved
- apply button clicked
- tutor viewed
- community joined

Do not store highly sensitive user data in analytics events.

---

## 21. Admin Content Workflow

Use statuses:

```text
draft
pending_review
published
rejected
expired
archived
```

Recommended workflow:

```text
Admin/Content Manager
        ↓
Create Draft
        ↓
Review
        ↓
Publish
        ↓
Visible in Mobile App
        ↓
Automatically Expired After Deadline
```

This gives better data quality than uncontrolled automated imports.

---

## 22. Opportunity Source Strategy

For every imported/manual opportunity store:

```text
source_name
source_url
verified_at
verified_by
```

The application should preferably send the student to the official application link rather than trying to recreate every third-party application workflow inside KSE.

---

## 23. Automation Roadmap

### Phase 1

Manual admin portal.

### Phase 2

Automatically:

- expire opportunities
- send reminders
- schedule notifications

### Phase 3

Partner submissions:

```text
Partner → Submission Form → Admin Review → Publish
```

### Phase 4

External feeds/APIs.

### Phase 5

Approved scraping/import jobs.

Each imported record must still have:

```text
source
import timestamp
duplicate check
validation status
```

---

## 24. Repository Structure

Recommended monorepo:

```text
kse/
├── apps/
│   ├── mobile/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── services/
│   │   ├── store/
│   │   ├── types/
│   │   └── assets/
│   │
│   └── admin/
│       ├── app/
│       ├── components/
│       ├── features/
│       ├── lib/
│       └── types/
│
├── packages/
│   ├── shared/
│   ├── validation/
│   └── types/
│
├── supabase/
│   ├── migrations/
│   ├── functions/
│   ├── seed.sql
│   └── config.toml
│
├── docs/
├── .github/
│   └── workflows/
├── .env.example
├── README.md
└── CLAUDE.md
```

Use shared TypeScript types where practical.

---

## 25. Development Rules for Claude Code

Claude Code must follow these rules:

1. Do not introduce a new dependency unless necessary.
2. Prefer existing project utilities.
3. Use TypeScript strict mode.
4. Never hard-code secrets.
5. Validate all form inputs with Zod.
6. All Supabase schema changes must use migrations.
7. RLS policies must be included with new user-facing tables.
8. Never use `service_role` in the mobile app.
9. Keep components small and reusable.
10. Put business logic in services/features, not UI components.
11. Use TanStack Query for server state.
12. Use Zustand only for simple local/global UI state.
13. Use React Hook Form for forms.
14. Add loading, empty and error states.
15. Add basic tests for critical business logic.
16. Avoid premature optimization.
17. Avoid microservices.
18. Avoid duplicate data models.
19. Keep database queries paginated.
20. Use database indexes for frequent filters.
21. Update this CLAUDE.md when architecture decisions change.

---

## 26. Environment Variables

Example:

```env
# Mobile
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_SENTRY_DSN=

# Admin
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Backend / Edge
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
RESEND_API_KEY=
SENTRY_DSN=
```

Never commit real secrets.

Provide `.env.example` only.

---

## 27. CI/CD

GitHub Actions should run on Pull Requests:

```text
install
lint
typecheck
test
build
```

Deployment:

```text
main branch
    ├── Admin → Vercel
    ├── Supabase migrations/functions → Supabase
    └── Mobile → Expo EAS workflow
```

Production database migrations should be controlled and reviewed.

---

## 28. Git Strategy

Keep it simple:

```text
main
develop
feature/*
fix/*
```

Example:

```text
feature/auth
feature/opportunity-list
feature/profile
feature/admin-scholarships
```

Use Pull Requests even if only one developer is working on the project.

---

## 29. Testing

MVP testing stack:

### Mobile

- Jest
- React Native Testing Library

### Admin

- Vitest
- React Testing Library

### End-to-End

Use Maestro for core mobile flows later.

Must test at least:

```text
registration
login
profile update
opportunity listing
bookmark
admin publish
RLS permissions
expired opportunity behavior
```

---

## 30. MVP Implementation Order

Build in this exact general order:

```text
1. Repository + Supabase setup
2. Database schema
3. Authentication
4. Mobile navigation/design system
5. Student profile
6. Admin authentication
7. Admin opportunity CRUD
8. Mobile opportunity list/detail
9. Search/filter
10. Bookmark
11. Dashboard
12. Events
13. Scholarship
14. Internship
15. Tuition/tutors
16. Community basic version
17. Notifications
18. Portfolio
19. Analytics
20. Security review
21. Testing
22. Production release
```

Do not start with every module simultaneously.

---

## 31. MVP Release Scope

### Must Have

- authentication
- onboarding
- student profile
- home
- internship
- scholarship
- event/workshop
- tuition/tutor discovery
- opportunity detail
- search/filter
- bookmark
- notifications
- admin portal
- content management
- user management
- basic community
- portfolio
- deadline expiry

### Later

- messaging
- payments
- AI assistant
- complex recommendation engine
- automated scraping
- video calls
- full LMS
- advanced mentor booking
- advanced social feed
- job application tracking
- microservices

---

## 32. UI Implementation Guidance

The provided UI should be treated as the visual direction.

Maintain:

- white/light backgrounds
- purple primary brand
- rounded cards
- clean typography
- compact dashboard cards
- clear bottom navigation
- simple illustrations
- consistent icon style

Suggested navigation:

```text
Home
Explore
Create/Action
Community
Profile
```

Explore can contain:

```text
Internships
Scholarships
Events
Workshops
Tuition
Mentorship
```

Avoid placing too many independent items in bottom navigation.

---

## 33. Performance Rules

Required:

- pagination
- lazy image loading
- optimized image sizes
- query caching
- avoid unnecessary realtime listeners
- use database indexes
- debounce search
- limit list payloads
- do not fetch full descriptions for card lists
- use CDN-hosted media

Target:

```text
normal API response: < 500 ms where practical
screen first render: < 2 sec on normal network
```

---

## 34. Data Privacy

Keep minimum necessary student data.

Important fields should be private by default.

Examples:

- email
- phone
- resume
- certificates

Public profile fields should be explicitly defined.

Provide:

- Privacy Policy
- Terms of Service
- Account deletion
- Data export later if required

---

## 35. Backup & Recovery

Use Supabase managed backups appropriate to the selected plan.

Before major schema releases:

- verify migration
- take/confirm backup
- test rollback strategy

Do not treat the production database as a development environment.

---

## 36. Scaling Path

### Stage 1

```text
Expo + Supabase + Next.js
```

### Stage 2

If usage grows:

- improve database indexes
- add caching
- move expensive operations to Edge Functions
- introduce queues only where required

### Stage 3

Only if proven necessary:

- dedicated API service
- background worker service
- dedicated Redis
- search service
- custom load balancing

Do not design Stage 3 infrastructure during MVP unless measurements justify it.

---

## 37. Definition of Done

A feature is complete when:

- UI matches the design system
- loading state exists
- empty state exists
- error state exists
- validation exists
- authorization is correct
- RLS is correct
- errors are monitored
- mobile works on Android
- no secrets are exposed
- lint/typecheck pass
- critical business logic is tested

---

## 38. Final Architecture Decision

Use:

```text
Mobile:
React Native + Expo + TypeScript

Admin:
Next.js + Tailwind + shadcn/ui

Backend:
Supabase

Database:
PostgreSQL

Authentication:
Supabase Auth

Storage:
Supabase Storage

Protected APIs:
Supabase Edge Functions

Rate Limit:
Upstash Redis

Push:
Expo Notifications

Email:
Resend

Monitoring:
Sentry

Analytics:
PostHog

Hosting:
Vercel + Supabase + Expo EAS
```

This is the preferred architecture because it provides a production-capable system while staying simple enough for one developer using Claude Code to build and maintain.

---

## 39. Key Principle

> **Build a useful student product first, not a complicated technology platform.**

Start with high-quality manually managed content and strong admin tooling.

Automate only after the manual workflow is understood and repeated often enough to justify automation.
