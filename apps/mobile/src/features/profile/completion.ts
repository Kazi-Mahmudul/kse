interface CompletionProfile {
  full_name: string | null;
  bio: string | null;
  university_id: string | null;
  department_id: string | null;
  academic_level: string | null;
  phone: string | null;
  interests: string[];
}

/** Simple completion score shown on the profile card (mockup "Profile Score"). */
export function profileCompletion(profile: CompletionProfile, skillCount: number): number {
  const checks = [
    Boolean(profile.full_name?.trim()),
    Boolean(profile.bio?.trim()),
    Boolean(profile.university_id),
    Boolean(profile.department_id),
    Boolean(profile.academic_level),
    Boolean(profile.phone?.trim()),
    profile.interests.length > 0,
    skillCount > 0,
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}
