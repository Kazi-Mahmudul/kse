# KSE — User & Testing Manual

This manual explains how to test every feature of KSE by hand. It is written in
simple English so anyone can follow it, even without developer knowledge.

KSE (Khulna Student Ecosystem) is a mobile app for students. It helps students
find **internships, scholarships, events, workshops, tutors, mentors and
communities** in one place. Students can also build a **profile and portfolio**,
save opportunities, track deadlines, and get notifications.

The project has two parts:

1. **Mobile app** — used by students (on a phone or in a web browser).
2. **Admin panel** — used by staff to create and manage content (in a web browser).

---

## 1. Before you start

### What you need

- A running **Supabase** database (local or cloud).
- The **mobile app** running.
- The **admin panel** running.

### How to start everything (for developers)

From the project root:

```bash
# 1. Start the local database (if using local Supabase)
supabase start

# 2. Start the mobile app (choose one)
pnpm --filter mobile start          # Expo dev server (scan QR code)
pnpm --filter mobile web            # run in the browser

# 3. Start the admin panel (in a second terminal)
pnpm --filter admin dev             # then open http://localhost:3000
```

> Tip: The easiest way to test everything is to run the **mobile app in the
> web browser** (`pnpm --filter mobile web`) and the **admin panel** at
> `http://localhost:3000` side by side.

---

## 2. Test accounts

These demo accounts are already in the database (from `supabase/seed.sql`).

| Role | Email | Password | Notes |
|---|---|---|---|
| Admin | `admin@kse.local` | `admin12345` | Staff account; also has demo portfolio data |
| Tutor 1 | `tutor1@kse.local` | `tutor12345` | Verified tutor demo |
| Tutor 2 | `tutor2@kse.local` | `tutor12345` | Verified tutor demo |
| Tutor 3 | `tutor3@kse.local` | `tutor12345` | Verified tutor demo |

> You can also **register a new student account** from the mobile app
> (see section 3.1). Use any email and a password of at least 8 characters.

---

## 3. The mobile app (Student side)

### 3.0 How to move around

The app has a **bottom bar** with these buttons:

| Button | What it does |
|---|---|
| **Home** | Welcome screen with search, latest opportunities and recommendations |
| **Explore** | All discovery categories (internships, scholarships, etc.) |
| **＋ (middle)** | Quick actions — a small popup with shortcuts |
| **Community** | Student clubs and groups |
| **Profile** | Your profile, portfolio and settings |

Other screens (Dashboard, Saved, Search, Notifications) are reached by tapping
buttons inside the app — each one is explained below.

---

### 3.1 Register and login

**Register a new account**

1. Open the app. You see the **Login** screen.
2. Tap **"Create an account"**.
3. Fill in:
   - **Full name** — your name.
   - **Email** — any email.
   - **Password** — at least 8 characters.
4. Tap **Create account**.
5. In the local setup, email confirmation is off, so you are signed in
   immediately and taken to Home. (On a setup with email confirmation enabled,
   the app instead asks you to check your email before signing in.)

**Login**

1. On the Login screen, enter your **email** and **password**.
2. Tap **Sign in**.

**Forgot password**

1. On the Login screen, tap **"Forgot password?"**.
2. Enter your email and submit. A reset email is sent (in local development,
   check the Supabase mail inbox).

> ✅ **Test checklist (auth)**
> - [ ] Register a new account and land on Home.
> - [ ] Sign out (Profile → Sign out), then sign back in.
> - [ ] Try a wrong password — you should see a friendly error.
> - [ ] Try a short password (under 8) at register — the form should stop you.

---

### 3.2 Home

The Home screen shows:

- A **greeting** — "Hi {your name} 👋".
- A **search bar** — type and press enter to search all opportunities.
- A **bell icon** (top-right) — opens Notifications. A red dot shows when there
  are unread notifications.
- A **grid icon** (top-right) — opens your Dashboard.
- A **purple promo banner**.
- **Latest opportunities** — the 4 most recent published opportunities.

Tap any opportunity card to open its detail.

> ✅ **Test checklist (Home)**
> - [ ] Your first name appears in the greeting.
> - [ ] Latest opportunities are listed.
> - [ ] The bell icon opens Notifications.
> - [ ] The grid icon opens Dashboard.

---

### 3.3 Explore (discovery categories)

Tap the **Explore** tab. You see a search bar and a grid of 6 categories:

| Category | What you can do |
|---|---|
| **Internships** | Browse and filter internships |
| **Scholarships** | Browse and filter scholarships |
| **Events** | Browse events and register |
| **Workshops** | Browse workshops and register |
| **Tuition** | Find a tutor |
| **Mentorship** | *Coming in a later release* |

Tap a category to open its list.

**The list screen (Internships / Scholarships / Events / Workshops)**

- Shows a list of opportunity cards.
- A **filter bar** at the top lets you filter by:
  - **Type** (on the search screen).
  - **Mode** — remote / on-site / hybrid.
  - **Deadline** — e.g. "next 7 days".
  - **Category / degree level / funding type** (depends on the type).
- Tap a card to see the full details.

> ✅ **Test checklist (Explore)**
> - [ ] All 6 categories show on the Explore screen.
> - [ ] Opening Internships shows a list.
> - [ ] Changing a filter (e.g. mode = remote) changes the results.
> - [ ] Mentorship shows a friendly "coming soon" message.

---

### 3.4 Opportunity detail

Open any opportunity. You see:

- **Title, organization, type, deadline.**
- **Full description**, location, mode, eligibility.
- A **bookmark** button — saves the opportunity to your Saved list.
- An **"Apply now"** button — opens the official application link (in a browser).
- For **events and workshops**, a **"Register"** button to register for the event.
- If the deadline has passed, the button reads **"Deadline passed"** and is disabled.

> ✅ **Test checklist (opportunity detail)**
> - [ ] Details show correctly.
> - [ ] Bookmark toggles between "Save" and "Saved".
> - [ ] "Apply now" opens the official link.
> - [ ] An event shows a "Register" button.
> - [ ] An expired opportunity shows "Deadline passed".

---

### 3.5 Tuition (find a tutor)

From Explore → **Tuition**.

- You see a list of **tutors** with their subjects, university, location and
  expected fee.
- You can **filter** by subject, university, location, and fee.
- Tap a tutor to see their **profile**: subjects, availability, fee and bio.
- Tap **"Request tuition"** to send a request:
  1. Choose a **subject** (if not already chosen).
  2. Write a short **message**.
  3. Optionally add a **preferred time**.
  4. Submit.

**View your tuition requests**: the requests you sent appear under
**"My tuition requests"** (reached from the tuition area). Each request shows a
status: **pending**, **accepted**, **rejected**, or **closed**.

> ✅ **Test checklist (tuition)**
> - [ ] Tutor list loads with subjects and fees.
> - [ ] Subject filter narrows the list.
> - [ ] Opening a tutor shows their profile.
> - [ ] Sending a request works.
> - [ ] Your request appears under "My tuition requests" with status "pending".

---

### 3.6 Community

Tap the **Community** tab.

- You see a list of **communities** (clubs and groups).
- Tap a community to open it. You see:
  - The community **name, university, description and member count**.
  - A **"Join community"** button (or "Leave" if you already joined).
  - The **posts feed**.
  - If you are a member, a **post composer** to write a message.
  - Moderators/owners can mark a post as an **announcement**.

> ✅ **Test checklist (community)**
> - [ ] Community list loads.
> - [ ] You can join and leave a community.
> - [ ] After joining, you can write a post.
> - [ ] Your post appears in the feed.

---

### 3.7 Dashboard

Open Dashboard from the **grid icon** on Home, from Profile → Quick links, or
from the **＋** menu.

The Dashboard shows:

- **Profile completion %** — how complete your profile is.
- **Saved opportunities** — your bookmarks.
- **Upcoming deadlines** — bookmarks with a deadline soon.
- **Joined communities**.
- **Registrations** — events/workshops you registered for.

> ✅ **Test checklist (dashboard)**
> - [ ] Profile completion % is shown.
> - [ ] Saved opportunities and deadlines appear.
> - [ ] Communities you joined appear.

---

### 3.8 Saved (bookmarks)

Open from Profile → Quick links → **Saved**.

- Shows every opportunity you bookmarked, newest first.
- Tap a card to open it.
- Remove a bookmark by tapping the bookmark icon again (on the card or detail).

> ✅ **Test checklist (saved)**
> - [ ] Bookmarked items appear here.
> - [ ] Un-bookmarking removes it from the list.

---

### 3.9 Search

Open by typing in a search bar (Home or Explore) and pressing enter, or from the
search screen.

- Type to search by **title, company or keyword** (results update as you type).
- Use the **filter bar** to narrow by type, mode and deadline.
- Tap **Clear all** to reset.

> ✅ **Test checklist (search)**
> - [ ] Searching a known title returns it.
> - [ ] Filters narrow the results.
> - [ ] Clearing returns all results.

---

### 3.10 Notifications

Open from the **bell icon** on Home.

- Shows your notification **inbox**.
- Unread notifications have a purple dot.
- Tap a notification to mark it read and open the related opportunity.
- **"Mark all read"** marks everything read.

> ✅ **Test checklist (notifications)**
> - [ ] Notifications appear.
> - [ ] Tapping one marks it read and opens the opportunity.
> - [ ] "Mark all read" clears the unread dot.

---

### 3.11 Profile

Tap the **Profile** tab. You see:

- Your **name and avatar** with a "Student" badge.
- **Profile completion %** and an **"Edit profile"** / **"Complete my profile"** button.
- **About** — university, department, academic level, phone, bio.
- **Skills** — your skills as chips.
- **Quick links** — Dashboard and Saved.
- **My portfolio** — opens your portfolio (section 3.12).
- **Sign out**.

**Edit profile** (tap "Edit profile")

- Change your **full name, university, department, academic level, bio,
  interests, phone and skills**.
- Save to update.

> ✅ **Test checklist (profile)**
> - [ ] Your details show correctly.
> - [ ] Editing your name/bio/phone updates the profile.
> - [ ] Adding skills shows them as chips.
> - [ ] Sign out works.

---

### 3.12 Portfolio

Open from Profile → **My portfolio**. You can manage 6 sections:

| Section | What you add |
|---|---|
| **Projects** | Title, description, link, tech stack, dates |
| **Certificates** | Title, issuer, date, file link |
| **Achievements** | Title, description, date |
| **Research** | Title, abstract, role, collaborators, link, date |
| **Resume** | A link to your PDF resume (mark one as primary) |
| **Links** | Portfolio/social links (label + URL) |

For each section you can **add, edit and delete** items.

> ✅ **Test checklist (portfolio)**
> - [ ] Add a project, certificate, achievement, research item, resume and link.
> - [ ] Each new item appears in its section.
> - [ ] Edit an item and see the change.
> - [ ] Delete an item and see it disappear.

---

## 4. The admin panel (Staff side)

Open the admin panel in a browser at `http://localhost:3000`.

### 4.1 Login

1. Open `http://localhost:3000`.
2. Log in with **`admin@kse.local`** / **`admin12345`**.

> Note: if you are not logged in, the admin panel redirects you to the login
> page automatically.

### 4.2 Dashboard

The first page after login. It shows:

- **9 KPI tiles** — total users, active students, new registrations (7 days),
  active opportunities, expiring (14 days), tutors, events, communities,
  pending review.
- **Recent registrations** — newest profiles.
- **Expiring opportunities** — published items with a deadline soon (colored by
  urgency).
- **Recent announcements** — the latest notifications sent by staff.
- Buttons: **"Review queue (N)"** and **"Send announcement"**.

> ✅ **Test checklist (dashboard)**
> - [ ] KPI numbers are not empty.
> - [ ] Recent registrations and expiring opportunities show real data.

### 4.3 Opportunities

Menu: **Opportunities**.

- **List** — all opportunities with their status (draft, pending_review,
  published, rejected, expired, archived).
- **Create new** — add an opportunity (title, organization, description,
  category, tags, location, eligibility, deadline, application URL, image, etc.).
- **Edit / detail** — open an opportunity to edit it and change its status
  (e.g. publish it).

**Content workflow:** create a draft → review → publish → (auto-expire after
the deadline).

> ✅ **Test checklist (opportunities)**
> - [ ] Create a new internship and save it as draft.
> - [ ] Publish it.
> - [ ] Open the mobile app and confirm the new opportunity appears under Internships.
> - [ ] Edit the opportunity and see the change on mobile.

### 4.4 Tuition & Tutors

Menu: **Tuition & Tutors**.

- **Tutors** — a table of tutors (name, university, subjects, fee, verification).
  You can **verify / unverify** a tutor.
- **Requests** — the tuition requests students have sent, with their status.

> ✅ **Test checklist (tuition admin)**
> - [ ] Tutor list loads.
> - [ ] Verify/unverify a tutor and confirm the badge changes.
> - [ ] View tuition requests and change a request's status.

### 4.5 Communities

Menu: **Communities**.

- **List** — all communities.
- **Detail** — open a community to **moderate** it (hide/restore), and see its
  members and posts.

> ✅ **Test checklist (communities admin)**
> - [ ] Community list loads.
> - [ ] Open a community and hide it, then restore it.

### 4.6 Notifications

Menu: **Notifications**.

- **Composer** — write and send a notification. You can target:
  - **Global** (everyone)
  - **Targeted** (specific users)
  - **University-specific**
  - **Opportunity reminder**
  - **Campaign announcement**
- **Recent deliveries** — a table of sent notifications with recipient counts.

> ✅ **Test checklist (notifications admin)**
> - [ ] Send a global announcement.
> - [ ] Confirm it appears in the mobile app's Notifications screen.

### 4.7 Not built yet (placeholders)

These admin menu items currently show a "coming soon" placeholder:

- **Users** — search users, suspend/reactivate, assign roles.
- **Master Data** — universities, departments, subjects, skills, tags.
- **Platform Settings** — support contact, feature flags, maintenance mode.

---

## 5. End-to-end test scenarios

These are complete flows that touch several features at once. Try them from
start to finish.

### Scenario A — A new student joins and saves an opportunity

1. Register a new student account.
2. Complete your profile (add university, department, skills).
3. Go to Explore → Internships and open one.
4. Bookmark it.
5. Check Profile → Saved — the internship is there.
6. Check Dashboard — the internship shows under "Saved" and "Upcoming deadlines".

### Scenario B — Find and request a tutor

1. Go to Explore → Tuition.
2. Filter by a subject.
3. Open a tutor and tap "Request tuition".
4. Send a request.
5. Open "My tuition requests" — your request shows "pending".

### Scenario C — Join a community and post

1. Go to Community.
2. Join a community.
3. Write a post.
4. Confirm the post appears in the feed.

### Scenario D — Admin publishes content, student sees it

1. In the **admin panel**, create a new scholarship.
2. Set it to **published**.
3. In the **mobile app**, go to Explore → Scholarships.
4. Confirm the new scholarship appears.
5. Open it and tap "Apply now" — the official link opens.

### Scenario E — Notification flow

1. In the **admin panel**, send a global announcement.
2. In the **mobile app**, open Notifications (bell icon).
3. Confirm the announcement appears.
4. Tap it to mark it read.

### Scenario F — Deadline / expiry

1. In the admin panel, create an opportunity with a deadline in the next few days.
2. Check the admin Dashboard — it appears under "Expiring opportunities".
3. (Optional) Set a past deadline and confirm the mobile app shows
   "Deadline passed".

---

## 6. What is NOT built yet

This is an MVP, so some things are intentionally missing. Do not report these
as bugs:

- **Mentorship** discovery (mobile) — shows "coming soon".
- **Personalized recommendations** on Home — planned but not shown yet.
- **Admin: Users, Master Data, Platform Settings** — placeholders.
- **Messaging / chat** between students and tutors.
- **Payments**.
- **Resume file upload** — for now you paste a link to your resume; uploading a
  PDF file is planned for a later release.
- **Automated scraping / imports** — all content is added manually by admin.
- **Rate limiting / analytics services (PostHog, Sentry)** — the code is
  prepared but the services are not wired in yet.

---

## 7. Quick reference — where everything lives

| Feature | Mobile app | Admin panel |
|---|---|---|
| Register / login | Login screen | Login page |
| Browse opportunities | Explore → category | Opportunities |
| Create/edit opportunities | — | Opportunities → new / detail |
| Bookmark / saved | Bookmark icon → Profile → Saved | — |
| Search & filter | Home/Explore search | — |
| Dashboard (student) | Grid icon on Home | — |
| Dashboard (admin) | — | Dashboard |
| Tuition / tutors | Explore → Tuition | Tuition & Tutors |
| Communities | Community tab | Communities |
| Notifications | Bell icon on Home | Notifications |
| Profile + skills | Profile tab | — |
| Portfolio | Profile → My portfolio | — |
| Event registration | Opportunity detail → Register | — |

---

*End of manual.*
