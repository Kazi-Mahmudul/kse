import type { Href } from 'expo-router';

import type { BannerArtKey } from '@/features/home/banner-art';

/** Gradient stops for one banner, per color scheme — the same three-stop
 *  shape as the retired single banner's bannerFrom/bannerVia/bannerTo. */
type GradientStops = [string, string, string];

export interface PromoBanner {
  key: string;
  /** Bangla headline. */
  title: string;
  /** Bangla supporting line. */
  subtitle: string;
  /** Bangla pill label. */
  cta: string;
  /** English label for screen readers (app-wide a11y convention). */
  ctaA11y: string;
  href: Href;
  art: BannerArtKey;
  /** Light tint of the slide's hue, reused by the artwork + decor circle. */
  accent: string;
  gradient: { light: GradientStops; dark: GradientStops };
}

/**
 * Home hero carousel slides. Every slide keeps the same structure (Bangla
 * copy + CTA left, artwork right) but shifts along the indigo→sky→cyan→
 * fuchsia range of the brand so the carousel feels varied without leaving
 * the purple/blue identity.
 */
export const PROMO_BANNERS: PromoBanner[] = [
  {
    key: 'internship',
    title: 'স্বপ্নের ইন্টার্নশিপ খুঁজে নাও',
    subtitle: 'তোমার ক্যারিয়ারের প্রথম ধাপ শুরু হোক আজ',
    cta: 'সুযোগগুলো দেখুন',
    ctaA11y: 'Explore internship opportunities',
    href: '/(tabs)/explore/internship',
    art: 'internship-photo',
    accent: '#818CF8', // indigo-400
    gradient: {
      // The original hero banner's stops, kept so slide 1 reads as unchanged.
      light: ['#4F46E5', '#4338CA', '#1D4ED8'],
      dark: ['#4338CA', '#3730A3', '#1E40AF'],
    },
  },
  {
    key: 'scholarship',
    title: 'তোমার জন্য সঠিক স্কলারশিপ খুঁজে নাও',
    subtitle: 'পড়াশোনার নতুন সুযোগ এখন হাতের মুঠোয়',
    cta: 'স্কলারশিপ দেখুন',
    ctaA11y: 'Explore scholarships',
    href: '/(tabs)/explore/scholarship',
    art: 'scholarship',
    accent: '#C4B5FD', // violet-300
    gradient: {
      light: ['#8B5CF6', '#7C3AED', '#6D28D9'],
      dark: ['#7C3AED', '#6D28D9', '#5B21B6'],
    },
  },
  {
    key: 'skills',
    title: 'শুধু ডিগ্রি নয়, দক্ষতাও গড়ে তোলো',
    subtitle: 'শিখো নতুন কিছু, এগিয়ে যাও আরও দূর',
    cta: 'ওয়ার্কশপ দেখুন',
    ctaA11y: 'Explore workshops',
    href: '/(tabs)/explore/workshop',
    art: 'skills',
    accent: '#7DD3FC', // sky-300
    gradient: {
      light: ['#0284C7', '#2563EB', '#4F46E5'],
      dark: ['#075985', '#1D4ED8', '#3730A3'],
    },
  },
  {
    key: 'tuition',
    title: 'পড়াও, শেখো, আয় করো',
    subtitle: 'তোমার জন্য খুঁজে নাও সঠিক টিউশন',
    cta: 'টিউশন খুঁজুন',
    ctaA11y: 'Find tuition opportunities',
    href: '/(tabs)/explore/tuition',
    art: 'tuition',
    accent: '#67E8F9', // cyan-300
    gradient: {
      light: ['#0891B2', '#0284C7', '#1D4ED8'],
      dark: ['#0E7490', '#075985', '#1E40AF'],
    },
  },
  {
    key: 'community',
    title: 'একসাথে শিখি, একসাথে এগিয়ে যাই',
    subtitle: 'তোমার মতো শিক্ষার্থীদের সাথে যুক্ত হও',
    cta: 'কমিউনিটিতে যোগ দিন',
    ctaA11y: 'Browse communities',
    href: '/(tabs)/community',
    art: 'community',
    accent: '#F0ABFC', // fuchsia-300
    gradient: {
      light: ['#C026D3', '#9333EA', '#7E22CE'],
      dark: ['#A21CAF', '#86198F', '#6B21A8'],
    },
  },
  {
    key: 'profile',
    title: 'তোমার পরিচয় শুধু CGPA নয়',
    subtitle: 'Skills, Projects, Certificates দিয়ে তৈরি করো নিজের Portfolio',
    cta: 'প্রোফাইল তৈরি করুন',
    ctaA11y: 'Open your profile',
    href: '/(tabs)/profile',
    art: 'profile',
    accent: '#A5B4FC', // indigo-300
    gradient: {
      light: ['#4338CA', '#3730A3', '#312E81'],
      dark: ['#3730A3', '#312E81', '#1E1B4B'],
    },
  },
];
