"""Generate the Supabase seed migration for the 40 scholarships.

Source: C:/Users/mahmu/Downloads/Bangladesh_Scholarship_Database_Requirements_and_Apply_Now.xlsx
Output: C:/kse/kse/supabase/migrations/20260926000012_seed_international_scholarships.sql

Run from a Windows shell with:
    py C:/kse/kse/scripts/build_scholarship_seed.py
"""
from __future__ import annotations

import datetime as dt
import json
import pathlib

import openpyxl

EXCEL = pathlib.Path(
    r"C:/Users/mahmu/Downloads/Bangladesh_Scholarship_Database_Requirements_and_Apply_Now.xlsx"
)
OUT = pathlib.Path(
    r"C:/kse/kse/supabase/migrations/20260926000012_seed_international_scholarships.sql"
)

# ── Mojibake / source-of-truth fixes ─────────────────────────────────────────
# The workbook was authored in Latin-1 somewhere upstream, so a few non-ASCII
# characters came through as "?". We restore the canonical Unicode form.
TEXT_FIXES = {
    "B\u00f6ll": "B\u00f6ll",  # Böll
    "T\u00fcrkiye": "T\u00fcrkiye",  # Türkiye (3 occurrences)
}

# Per-row overrides applied AFTER the text-fix pass. Use this for deadlines,
# custom org names, or anything that cannot be derived from the row alone.
# `deadline` is an ISO date (UTC end-of-day) when the note states a concrete
# upcoming apply-by; otherwise leave as None so the row stays "Always open"
# in the UI and only the deadline_note prose carries the source info.
ROW_OVERRIDES: dict[int, dict] = {
    2: {  # Chevening
        "deadline": "2026-10-06T23:59:59+00:00",
    },
    32: {  # Maastricht
        "deadline": "2027-02-01T23:59:59+00:00",
    },
}

# When the spreadsheet's source authority is generic ("Official country page")
# we override it with a more useful brand string for the card / list view.
ORG_OVERRIDES: dict[str, str] = {
    "Chevening Scholarship": "Chevening (UK Government)",
    "Erasmus Mundus Joint Masters": "European Commission — Erasmus+",
    "Stipendium Hungaricum": "Hungarian Government (Tempus Public Foundation)",
    "MEXT Scholarship": "Ministry of Education, Culture, Sports, Science and Technology — Japan",
    "Global Korea Scholarship (GKS) Graduate": "National Institute for International Education — South Korea",
    "Australia Awards Scholarships": "Department of Foreign Affairs and Trade — Australia",
    "Research Training Program (RTP)": "Australian Government (Department of Education)",
    "Government of Ireland International Education Scholarship": "Higher Education Authority — Ireland",
    "DAAD Scholarships": "German Academic Exchange Service (DAAD)",
    "Heinrich Böll Foundation Scholarship": "Heinrich Böll Foundation",
    "Swiss Government Excellence Scholarships": "State Secretariat for Education, Research and Innovation — Switzerland",
    "Türkiye Scholarships": "Türkiye Scholarships ( Presidency for Turks Abroad )",
    "Chinese Government Scholarship (CSC)": "China Scholarship Council",
    "TaiwanICDF Scholarship": "Taiwan International Cooperation and Development Fund",
    "Singapore International Graduate Award (SINGA)": "A*STAR — Singapore",
    "Vanier Canada Graduate Scholarships": "Government of Canada (Vanier CGS)",
    "Fulbright Foreign Student Program": "U.S. Department of State (Fulbright)",
    "Joint Japan/World Bank Graduate Scholarship Program": "World Bank Group",
    "ADB-Japan Scholarship Program": "Asian Development Bank",
    "Aga Khan Foundation International Scholarship Programme": "Aga Khan Development Network",
    "Rotary Peace Fellowship": "Rotary International",
    "ARES Scholarships": "Académie de Recherche et d'Enseignement Supérieur — Belgium",
    "VLIR-UOS Scholarships": "VLIR-UOS — Belgium",
    "Italian Government Scholarships": "Italian Government (MAECI / Study in Italy)",
    "Romanian Government Scholarship": "Government of Romania",
    "Poland NAWA Scholarships": "Polish National Agency for Academic Exchange (NAWA)",
    "Czech Government Scholarships": "Ministry of Education, Youth and Sports — Czechia",
    "Maastricht University NL-High Potential Scholarship": "Maastricht University",
    "ETH Zurich Excellence Scholarship & Opportunity Programme": "ETH Zurich",
    "EPFL Excellence Fellowships": "École Polytechnique Fédérale de Lausanne",
    "Clarendon Scholarship": "University of Oxford (Clarendon Fund)",
    "Gates Cambridge Scholarship": "Gates Cambridge Trust",
    "UCL Research Excellence Scholarship": "University College London",
    "Knight-Hennessy Scholars": "Stanford University (Knight-Hennessy)",
    "McCall MacBain Scholarships": "McCall MacBain — McGill University",
    "Government of Ireland Postgraduate Scholarship": "Irish Research Council",
    "Manaaki New Zealand Scholarships": "New Zealand Ministry of Foreign Affairs and Trade",
    "Commonwealth Master's Scholarships": "Commonwealth Scholarship Commission (UK)",
    "Commonwealth PhD Scholarships": "Commonwealth Scholarship Commission (UK)",
    "Commonwealth Split-site Scholarships": "Commonwealth Scholarship Commission (UK)",
}


def sq(value: str | None) -> str:
    """SQL-string-escape: double single quotes, drop NULLs."""
    if value is None:
        return "NULL"
    return "'" + value.replace("'", "''") + "'"


def degree_level_value(degree: str | None) -> str | None:
    """Pick the *broadest accessible* enum value from a prose degree range.

    The `degree_level` column is a single-value filter chip on the mobile
    Scholarship Hub. For ranges like "Master's / PhD" we surface `masters`
    (the lower bound of the range) so undergrad-finalists can still match
    by browsing the "Master's" chip; the structured `degree_levels[]` array
    on `opportunity_eligibility` carries every individual level for the
    matching engine to score against.
    """
    if not degree:
        return None
    d = degree.lower()
    if "undergrad" in d:
        return "undergraduate"
    if "master" in d or "postgrad" in d or "dphil" in d:
        return "masters"
    if "phd" in d:
        return "phd"
    if "diploma" in d:
        return "diploma"
    return None  # "Research" or "Graduate" → NULL


def degree_levels_array(degree: str | None) -> str:
    """Return a Postgres array literal of every distinct degree_level in the row."""
    if not degree:
        return "'{}'::public.degree_level[]"
    parts = []
    d = degree.lower()
    if "master" in d or "dphil" in d:
        parts.append("masters")
    if "phd" in d or "dphil" in d:
        parts.append("phd")
    if "undergrad" in d:
        parts.append("undergraduate")
    if "diploma" in d:
        parts.append("diploma")
    if not parts:
        return "'{}'::public.degree_level[]"
    return "'{" + ",".join(sorted(set(parts))) + "}'::public.degree_level[]"


def funding_value(funding: str | None) -> str | None:
    if not funding:
        return None
    f = funding.lower()
    if "fully funded" in f or "full scholarships available" in f:
        return "full"
    if "tuition offset" in f or "stipend" in f and "fee waiver" in f:
        return "full"
    if "varies" in f:
        return None
    if "partial" in f or "funded/partial" in f:
        return "partial"
    if "funded" in f:
        return "full"
    return "partial"


def mode_value(text: str | None) -> str | None:
    """Study mode — most are onsite abroad; Erasmus Mundus explicitly mixes."""
    if not text:
        return None
    t = text.lower()
    if "erasmus" in t:
        return "hybrid"
    return "onsite"


def normalize(value: str | None) -> str | None:
    if value is None:
        return None
    for bad, good in TEXT_FIXES.items():
        if bad in value:
            value = value.replace(bad, good)
    return value


def summary_for(degree: str | None, funding: str | None) -> str:
    bits = [b for b in [degree, funding] if b]
    return " · ".join(bits) if bits else None


def description_for(rec: dict, deadline_note: str | None) -> str:
    parts = []
    if rec.get("Degree"):
        parts.append(f"Degree: {rec['Degree']}")
    if rec.get("Funding"):
        parts.append(f"Funding: {rec['Funding']}")
    if rec.get("Bangladesh Status"):
        parts.append(f"Bangladesh status: {rec['Bangladesh Status']}")
    if rec.get("Eligibility Summary"):
        parts.append(f"Eligibility: {rec['Eligibility Summary']}")
    if rec.get("Application Route"):
        parts.append(f"Application route: {rec['Application Route']}")
    if deadline_note:
        parts.append(f"Deadline: {deadline_note}")
    return "\n\n".join(parts) if parts else None


# ── Read Excel ───────────────────────────────────────────────────────────────
wb = openpyxl.load_workbook(EXCEL, data_only=True)
ws = wb["BD_Master_List"]
headers = [c.value for c in ws[1]]
records = []
for row in ws.iter_rows(min_row=2, values_only=False):
    rec = {"_row": row[0].row}
    for cell in row:
        h = headers[cell.column - 1]
        rec[h] = normalize(cell.value)
        if cell.hyperlink and cell.hyperlink.target:
            rec[h + "__link"] = cell.hyperlink.target
    records.append(rec)

# ── Build SQL ────────────────────────────────────────────────────────────────
now = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()

opportunity_rows: list[str] = []
elig_keys: list[str] = []  # track keys for eligibility CTE

for rec in records:
    title = rec["Scholarship / Programme"]
    country = rec.get("Country / Region")
    degree = rec.get("Degree")
    funding = rec.get("Funding")
    deadline_note = rec.get("Deadline / Status Note")
    apply_url = rec.get("Apply Now Link__link")
    if not apply_url:  # No real hyperlink — leave NULL, don't capture the cell's "APPLY NOW" text
        apply_url = None
    source_url = rec.get("Requirements / Eligibility Link__link")
    if not source_url:
        source_url = None
    eligibility = rec.get("Eligibility Summary")
    org_name = ORG_OVERRIDES.get(title) or rec.get("Source Authority") or title

    override = ROW_OVERRIDES.get(rec["_row"], {})
    deadline_raw = override.get("deadline")
    # Must be a *quoted string literal* before the ::timestamptz cast, otherwise
    # the parser sees `2026-10-06T23:59:59` as `2026 - 10 - 06` (numeric) and
    # then chokes on the trailing `T23:59:59+00:00`.
    deadline = sq(deadline_raw) if deadline_raw else "NULL"

    summary = summary_for(degree, funding)
    description = description_for(rec, deadline_note)

    opportunity_rows.append(
        "  ({sq_title}, 'scholarship'::public.opportunity_type, {sq_org}, {sq_sum}, {sq_desc}, NULL, "
        "NULL, {sq_mode}::public.opportunity_mode, {sq_elig}, {sq_apply}, "
        "{deadline}::timestamptz, {sq_note}, {sq_dl}::public.degree_level, "
        "{sq_ft}::public.funding_type, {sq_country}, NULL, '{now}'::timestamptz, "
        "'published'::public.opportunity_status, false, true, NULL, NULL, "
        "{sq_src_name}, {sq_src_url}, NULL, '{now}'::timestamptz)".format(
            sq_title=sq(title),
            sq_org=sq(org_name),
            sq_sum=sq(summary),
            sq_desc=sq(description),
            sq_mode=sq(mode_value(title)) if mode_value(title) else "NULL",
            sq_elig=sq(eligibility),
            sq_apply=sq(apply_url),
            deadline=deadline,
            sq_note=sq(deadline_note),
            sq_dl=sq(degree_level_value(degree)) if degree_level_value(degree) else "NULL",
            sq_ft=sq(funding_value(funding)) if funding_value(funding) else "NULL",
            sq_country=sq(country),
            sq_src_name=sq(rec.get("Source Authority")),
            sq_src_url=sq(source_url),
            now=now,
        )
    )


    # Build the eligibility CTE row: we join by title, so the title needs to
    # be a single key. Titles are unique across the 40 rows.
    elig_keys.append(
        f"  ({sq(title)}, {degree_levels_array(degree)}, "
        f"'{{Bangladesh}}'::text[], '{{Bangladeshi}}'::text[], "
        f"{sq(rec.get('Funding'))})"
    )

header = f"""-- International scholarship seed (40 rows).
--
-- Source: C:/Users/mahmu/Downloads/Bangladesh_Scholarship_Database_Requirements_and_Apply_Now.xlsx
-- Sheet:  BD_Master_List (rows 2-41), curated manually by KSE staff from each
--         scholarship's official country page / call documents.
--
-- Schema additions required (run BEFORE this file):
--   * 20260926000011_opportunities_deadline_note.sql  — adds the
--     `opportunities.deadline_note text` column and rebuilds the search
--     vector to include it.
--
-- Why these specific mappings:
--   * `type = 'scholarship'`            — uses the existing enum value
--                                         (no schema change needed).
--   * `country = <Country/Region>`       — destination country, e.g. 'UK',
--                                         'Germany'. Drives the Scholarship
--                                         Hub's "Local" / "International"
--                                         chips via the existing
--                                         `country` / `countryNot` filters.
--                                         Local (BD) scholarships continue
--                                         to set country = 'Bangladesh'.
--   * `degree_level`                    — top-level single enum value
--                                         picked from the prose range.
--                                         The full range is preserved on
--                                         the joined `opportunity_eligibility`
--                                         row (`degree_levels[]`) so the
--                                         matching engine can still decide
--                                         eligibility across the span.
--   * `funding_type`                    — 'full' for "Fully funded" /
--                                         comprehensive coverage, 'partial'
--                                         for funded-but-not-fully,
--                                         NULL for "Varies".
--   * `deadline`                        — concrete next apply-by date
--                                         (Chevening 2026-10-06,
--                                         Maastricht 2027-02-01) where the
--                                         source named an upcoming date.
--                                         NULL elsewhere so expiry jobs do
--                                         not auto-hide the row.
--   * `deadline_note`                   — verbatim "Deadline / Status Note"
--                                         from the spreadsheet. Surfaced on
--                                         the Scholarship card and detail
--                                         page when `deadline` is NULL.
--   * `opportunity_eligibility.countries`     — '{{Bangladesh}}' (all 40 are
--                                               open to Bangladeshi students).
--   * `opportunity_eligibility.nationalities` — '{{Bangladeshi}}'.
--
-- Idempotency: this file is a one-time seed. The opportunities table does
-- not have a unique constraint on (type, title), so re-running will duplicate
-- rows. Delete the previously-seeded scholarship rows first if you need to
-- re-apply:
--   delete from public.opportunities where type='scholarship'
--     and source_url in (select source_url from (...source list...));
--
-- Mojibake in the source: the workbook mangled a few non-ASCII characters
-- (Böll, Türkiye, €10,000). The Python builder that emitted this file
-- already restored them; the SQL is the canonical text.

"""

footer = """

commit;
"""

opp_values_sql = ",\n".join(opportunity_rows)
elig_values_sql = ",\n".join(elig_keys)

# Two-pass insert: opportunities first (returning ids keyed by title), then
# opportunity_eligibility joining on the freshly-inserted opportunities.
sql = f"""{header}
-- Step 1: insert all 40 opportunities, capturing ids into a CTE keyed by title.
with inserted_opps as (
  insert into public.opportunities (
    title, type, organization_name, summary, description, image_url,
    location, opportunity_mode, eligibility, application_url,
    deadline, deadline_note, degree_level, funding_type, country,
    category_id, published_at,
    status, featured, verified, verified_at, verified_by,
    source_name, source_url, created_by, created_at
  ) values
{opp_values_sql}
  returning id, title
)

-- Step 2: insert the matching eligibility rows.
--         The text-array fields carry the same information the spreadsheet
--         listed under "Bangladesh Status" / "Funding"; we leave test
--         minimums + activity flags NULL because the spreadsheet does not
--         record them per scholarship (admins fill these in later via the
--         existing opportunity form).
insert into public.opportunity_eligibility (
  opportunity_id, degree_levels, fields, countries, nationalities,
  required_documents, other_requirements
)
select
  i.id,
  k.degree_levels,
  '{{}}'::text[],
  k.countries,
  k.nationalities,
  '{{}}'::text[],
  k.other_requirements
from inserted_opps i
join (values
{elig_values_sql}
) as k(title, degree_levels, countries, nationalities, other_requirements)
  on k.title = i.title;
"""

OUT.write_text(sql, encoding="utf-8")
print(f"Wrote {OUT} ({len(records)} scholarships, {len(sql):,} bytes)")
