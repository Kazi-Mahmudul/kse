-- Nusrat Jahan (mentor seed aaaaaaa1-…-02) is fully remote: her mode chip
-- already says "Remote", so a location of 'Remote' rendered the same chip
-- twice on her card. Clear the location — mode carries the meaning.

update public.opportunities
set location = null, updated_at = now()
where id = 'aaaaaaa1-0000-4000-8000-000000000002'
  and location = 'Remote';
