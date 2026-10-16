-- ── Seed Cover Photos for Mentors ──────────────────────────────────────────────
-- Provide realistic, high-resolution professional cover photos for existing seed mentors.

update public.opportunities
set cover_image_url = 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80'
where id = 'aaaaaaa1-0000-4000-8000-000000000002'; -- Nusrat Jahan (Product Designer)

update public.opportunities
set cover_image_url = 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&q=80'
where id = 'aaaaaaa1-0000-4000-8000-000000000001'; -- Rezaul Karim (Senior Software Engineer)

update public.opportunities
set cover_image_url = 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200&q=80'
where id = 'aaaaaaa1-0000-4000-8000-000000000003'; -- Tanvir Ahmed (Lecturer, CSE)

update public.opportunities
set cover_image_url = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80'
where id = 'aaaaaaa1-0000-4000-8000-000000000004'; -- Farhana Rahman (Data Scientist)

update public.opportunities
set cover_image_url = 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1200&q=80'
where id = 'aaaaaaa1-0000-4000-8000-000000000005'; -- Mahmudul Hasan (Founder & CEO)

update public.opportunities
set cover_image_url = 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1200&q=80'
where id = 'aaaaaaa1-0000-4000-8000-000000000006'; -- Shahida Akter (HR Manager)

update public.opportunities
set cover_image_url = 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&q=80'
where id = 'aaaaaaa1-0000-4000-8000-000000000007'; -- Arif Chowdhury (Mobile Engineer)

update public.opportunities
set cover_image_url = 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=1200&q=80'
where id = 'aaaaaaa1-0000-4000-8000-000000000008'; -- Sadia Afrin (English Teacher)

update public.opportunities
set cover_image_url = 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1200&q=80'
where id in ('ad9e3834-21a0-4a41-844a-ae394a19647e', 'd43ab9b4-17e3-45a0-9378-f77ad31c16f7'); -- Dr. Raihan Kabir
