import { Screen } from '@/components/ui/screen';
import { DashboardHeader } from '@/features/dashboard/components/dashboard-header';
import { OpportunityOverviewGrid } from '@/features/dashboard/components/opportunity-overview-grid';
import { ProfileScoreHero } from '@/features/dashboard/components/profile-score-hero';
import { UpcomingDeadlinesList } from '@/features/dashboard/components/upcoming-deadlines-list';

/**
 * Dashboard (design 04._dashboard_kse): indigo gradient hero with a live
 * profile-score gauge, an Opportunity Overview 2×2 of published counts, and
 * the student's next three saved deadlines. Each block owns its own data
 * hooks so the screen file is just composition.
 */
export default function DashboardScreen() {
  return (
    <Screen>
      <DashboardHeader />
      <ProfileScoreHero />
      <OpportunityOverviewGrid />
      <UpcomingDeadlinesList />
    </Screen>
  );
}
