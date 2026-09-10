import { OpportunityCard } from '@/components/opportunity-card';
import { EventCard } from '@/features/opportunities/components/event-card';
import { InternshipCard } from '@/features/opportunities/components/internship-card';
import { ScholarshipCard } from '@/features/opportunities/components/scholarship-card';
import type { OpportunitySummary } from '@kse/types';

interface LatestOpportunityCardProps {
  opportunity: OpportunitySummary;
}

/**
 * Type-aware switcher for the Home "Latest Opportunities" section.
 *
 * Renders the dedicated hub card for each opportunity type so the Home
 * list reads as a preview of the same surface the user lands on in
 * `/(tabs)/explore/<type>`:
 *   - `internship`         → InternshipCard   (stipend + deadline row)
 *   - `scholarship`        → ScholarshipCard  (degree-level + funding chip + deadline)
 *   - `event` / `workshop` → EventCard        (84×84 themed thumbnail + Register pill)
 *   - `mentorship` (and unknown types) → OpportunityCard (generic fallback)
 *
 * No DOM wrapping here — each hub card already carries its own chrome
 * (border, radius, shadow). Stacking with the surrounding `gap: 10` keeps
 * the visual rhythm identical to the previous single-card rendering.
 */
export function LatestOpportunityCard({ opportunity }: LatestOpportunityCardProps) {
  switch (opportunity.type) {
    case 'internship':
      return <InternshipCard opportunity={opportunity} />;
    case 'scholarship':
      return <ScholarshipCard opportunity={opportunity} />;
    case 'event':
    case 'workshop':
      return <EventCard opportunity={opportunity} />;
    case 'mentorship':
    default:
      return <OpportunityCard opportunity={opportunity} />;
  }
}
