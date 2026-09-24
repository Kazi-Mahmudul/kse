# Scholarship System — Manual Test Guide

A short walkthrough of the scholarship flows you can test by hand.

> **Before you start:** apply the four new migrations against your
> Supabase project (in this order):
> 1. `20260924171616_opportunity_eligibility.sql`
> 2. `20260924171617_user_test_scores.sql`
> 3. `20260924171618_user_activities.sql`
> 4. `20260924171619_scholarship_applications.sql`
>
> The schema migration adds eligibility to existing scholarships; the
> three other migrations are additive (no destructive changes).

---

## 1. Admin — give a scholarship real eligibility rules

1. Sign in to the admin panel (`/login`) with a staff account.
2. Go to **Opportunities → Scholarships** in the sidebar (or filter
   the opportunities list with `?type=scholarship`).
3. Click any scholarship title to open its edit page.
4. Scroll past the existing **Opportunity form** to the new
   **Scholarship eligibility** section.
5. Fill in some rules — for example:
   - Min CGPA: `3.50`, Scale: `4.00`
   - Eligible degree levels: tick `Bachelor`, `Masters`
   - Eligible countries: `Bangladesh, India, Nepal`
   - IELTS min: `6.5`
   - Tick **Leadership** under Required signals
   - Documents: `Motivation letter, Recommendation letter`
6. Click **Save eligibility**.
7. Refresh the page — the values should still be there. Click **Reset**
   to delete the eligibility row.

---

## 2. Mobile — discover a scholarship

1. Sign in to the mobile app as a student.
2. Open the **Explore** tab → tap **Scholarships**.
3. You should see a **Recommended for you** rail at the top with
   coloured badges (Highly Matched / Eligible / Potential / Not
   Eligible). If your profile is empty you'll see a "Complete your
   profile" link instead.
4. Use the search bar, the **All / Local / International** chips and
   the filter button (degree, funding, deadline) — the list should
   react instantly.

---

## 3. Mobile — match + tracker on the detail page

1. Tap any scholarship card.
2. Scroll to the **Your match** section — you should see the verdict
   badge and a list of pass/fail reasons for each rule (e.g. *"Minimum
   CGPA is 3.50; your latest CGPA is 3.20."*).
3. Tap **Add to application tracker** → pick a status (Interested,
   Preparing, Applied…) and an optional note → tap **Save**.
4. Open the same scholarship again — the button now reads
   **Update tracker**.
5. Tap **Apply now** — it should open the scholarship's external URL
   in the in-app browser.

---

## 4. Mobile — view your application tracker

1. Open the **Profile** tab.
2. In the menu list, tap **Scholarship applications** (it shows
   "N applications tracked" once you add some).
3. You should see your entries grouped by status (Interested,
   Preparing, Applied…), each card showing title, provider, status
   chip and deadline.
4. Tap any card — it opens the scholarship's detail page so you can
   update the status.

---

## 5. Mobile — manage test scores (when the form lands)

The data model and queries for **IELTS / TOEFL / PTE / GRE / etc.**
are already in place, but the mobile edit form is part of the next
phase. As a quick sanity check:

1. Insert a row directly in the Supabase dashboard → table editor →
   `user_test_scores` (with your `user_id`, `test_type = 'ielts'`,
   `score = '7.0'`).
2. Re-open the Scholarship Hub and any scholarship detail page.
3. The match panel should now report IELTS as either passed or
   failed depending on the rule.

---

## 6. Mobile — manage activities

Same idea as test scores — the data model and matcher are live.

1. In Supabase dashboard → `user_activities`, insert a row
   (`activity_type = 'leadership'`, `title = 'Club president'`,
   `is_ongoing = true`).
2. Open a scholarship whose eligibility has **Leadership** ticked.
3. The match panel should now report the leadership requirement as
   satisfied.

---

## 7. Regression — make sure existing flows still work

- Sign in / sign out
- Edit profile basics
- Add an education entry (use the new searchable institution picker)
- Add a project / certificate / achievement
- Upload a CV
- Browse internships / events / workshops / tuition
- Save an opportunity
- Check the notification inbox

Everything should behave exactly as before; the scholarship work is
additive on top of the existing app.

---

## Quick checklist

- [ ] Migrations applied in order
- [ ] Admin can edit eligibility on a scholarship
- [ ] Mobile Scholarship Hub shows the Recommended rail
- [ ] Detail page shows the Your match panel with reasons
- [ ] "Add to application tracker" saves + appears under Profile → Scholarship applications
- [ ] No regressions on the existing tabs
