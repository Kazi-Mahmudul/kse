-- Populate `universities` (the institute FK used by profiles, tutors and
-- the tuition institute filter) with the higher-ed subset of the
-- education_institutions directory — the real Khulna-region list
-- (universities, medical colleges, colleges, arts colleges, polytechnics).
--
-- Until now `universities` only held the 4 master-data seed rows, so every
-- institute picker in the app offered a near-empty list while the actual
-- 1000-row directory lived in education_institutions.
--
-- Dedupe rule: names are compared after normalization (& → and, strip
-- punctuation) so the existing KUET row ("…Engineering & Technology")
-- absorbs the directory's "…Engineering and Technology" instead of
-- duplicating it — tutors keep pointing at the surviving row.

with normalized_src as (
  select
    ei.name,
    ei.city,
    lower(regexp_replace(replace(ei.name, '&', ' and '), '[^a-zA-Z0-9]', '', 'g')) as key
  from public.education_institutions ei
  where ei.is_active
    and ei.type in ('university', 'medical_college', 'college', 'arts_college', 'polytechnic')
),
deduped as (
  select distinct on (key) name, city, key
  from normalized_src
  order by key, name
)
insert into public.universities (name, short_name, location)
select d.name, null, d.city
from deduped d
where not exists (
  select 1 from public.universities u
  where lower(regexp_replace(replace(u.name, '&', ' and '), '[^a-zA-Z0-9]', '', 'g')) = d.key
);
