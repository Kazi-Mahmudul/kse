-- To-Let gender preference: any / male / female / family
--
-- The original enum (20260926000021) used male_only / female_only, which
-- read awkwardly next to the new "Family" option. Rename the two existing
-- values (existing rows follow automatically) and add 'family' for
-- family-friendly listings. App labels: Any gender / Male / Female / Family.
-- Note: ALTER TYPE ... ADD VALUE is safe inside a transaction on PG 12+
-- as long as the new value is not used later in the same transaction.

do $do$ begin
  if exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'tolet_gender_preference' and e.enumlabel = 'male_only'
  ) then
    alter type public.tolet_gender_preference rename value 'male_only' to 'male';
  end if;

  if exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'tolet_gender_preference' and e.enumlabel = 'female_only'
  ) then
    alter type public.tolet_gender_preference rename value 'female_only' to 'female';
  end if;

  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'tolet_gender_preference' and e.enumlabel = 'family'
  ) then
    alter type public.tolet_gender_preference add value 'family';
  end if;
end $do$;

comment on type public.tolet_gender_preference is
  'To-Let gender preference for tenants (any/male/female/family)';
