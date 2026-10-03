import type { Href } from 'expo-router';

/** Gradient stops for one banner, per color scheme. */
type GradientStops = [string, string, string];

export interface PromoBanner {
  key: string;
  /** Small uppercase category chip above the headline. */
  kicker: string;
  /** Bangla headline. */
  title: string;
  /** Bangla supporting line. */
  subtitle: string;
  /** Bangla pill label. */
  cta: string;
  /** English label for screen readers (app-wide a11y convention). */
  ctaA11y: string;
  href: Href;
  /**
   * Hero photograph (Unsplash), anchored to the right of the slide and
   * blended into the brand gradient by the slide's overlay — the
   * bKash-style composition (photo emerges from the brand colour).
   */
  photo: string;
  gradient: { light: GradientStops; dark: GradientStops };
}

/**
 * Home hero carousel slides. Every slide keeps the same structure (kicker
 * chip + Bangla copy + CTA left, blended photograph right) but shifts along
 * the indigo→sky→cyan→fuchsia range of the brand so the carousel feels varied
 * without leaving the purple/blue identity. Photos are verified live
 * (HTTP 200) and subject-checked Unsplash images.
 */
export const PROMO_BANNERS: PromoBanner[] = [
  {
    key: 'internship',
    kicker: 'Internship',
    title: 'স্বপ্নের ইন্টারনশিপ খুঁজে নাও',
    subtitle: 'তোমার ক্যারিয়ারের প্রথম ধাপ শুরু হোক আজ',
    cta: 'সুযোগগুলো দেখুন',
    ctaA11y: 'Explore internship opportunities',
    href: '/(tabs)/explore/internship',
    photo: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80',
    gradient: {
      // The original hero banner's stops, kept so slide 1 reads as unchanged.
      light: ['#4F46E5', '#4338CA', '#1D4ED8'],
      dark: ['#4338CA', '#3730A3', '#1E40AF'],
    },
  },
  {
    key: 'scholarship',
    kicker: 'Scholarship',
    title: 'তোমার জন্য সঠিক স্কলারশিপ খুঁজে নাও',
    subtitle: 'পড়াশোনার নতুন সুযোগ এখন হাতের মুঠোয়',
    cta: 'স্কলারশিপ দেখুন',
    ctaA11y: 'Explore scholarships',
    href: '/(tabs)/explore/scholarship',
    photo: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&q=80',
    gradient: {
      light: ['#8B5CF6', '#7C3AED', '#6D28D9'],
      dark: ['#7C3AED', '#6D28D9', '#5B21B6'],
    },
  },
  {
    key: 'skills',
    kicker: 'Workshop',
    title: 'শুধু ডিগ্রি নয়, দক্ষতাও গড়ে তোলো',
    subtitle: 'শিখো নতুন কিছু, এগিয়ে যাও আরও দূর',
    cta: 'ওয়ার্কশপ দেখুন',
    ctaA11y: 'Explore workshops',
    href: '/(tabs)/explore/workshop',
    photo: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80',
    gradient: {
      light: ['#0284C7', '#2563EB', '#4F46E5'],
      dark: ['#075985', '#1D4ED8', '#3730A3'],
    },
  },
  {
    key: 'tuition',
    kicker: 'Tuition',
    title: 'পড়াও, শেখো, আয় করো',
    subtitle: 'তোমার জন্য খুঁজে নাও সঠিক টিউশন',
    cta: 'টিউশন খুঁজুন',
    ctaA11y: 'Find tuition opportunities',
    href: '/(tabs)/explore/tuition',
    photo: 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=800&q=80',
    gradient: {
      light: ['#0891B2', '#0284C7', '#1D4ED8'],
      dark: ['#0E7490', '#075985', '#1E40AF'],
    },
  },
  {
    key: 'community',
    kicker: 'Community',
    title: 'একসাথে শিখি, একসাথে এগিয়ে যাই',
    subtitle: 'তোমার মতো শিক্ষার্থীদের সাথে যুক্ত হও',
    cta: 'কমিউনিটিতে যোগ দিন',
    ctaA11y: 'Browse communities',
    href: '/(tabs)/community',
    photo: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&q=80',
    gradient: {
      light: ['#C026D3', '#9333EA', '#7E22CE'],
      dark: ['#A21CAF', '#86198F', '#6B21A8'],
    },
  },
  {
    key: 'profile',
    kicker: 'Portfolio',
    title: 'তোমার পরিচয় শুধু CGPA নয়',
    subtitle: 'Skills, Projects, Certificates দিয়ে তৈরি করো নিজের Portfolio',
    cta: 'প্রোফাইল তৈরি করুন',
    ctaA11y: 'Open your profile',
    href: '/(tabs)/profile',
    photo: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80',
    gradient: {
      light: ['#4338CA', '#3730A3', '#312E81'],
      dark: ['#3730A3', '#312E81', '#1E1B4B'],
    },
  },
];
