import { Image } from 'expo-image';
import type { ReactElement } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

/** Hero cutout (students around a laptop) — carried over from the retired
 *  single `promo-banner`; see `assets/images/hero-students.png`. */
const HERO_ART = require('@/assets/images/hero-students.png');
/** Native pixel size of the asset — keeps the aspect ratio in sync with the file. */
const HERO_ART_ASPECT = 480 / 412;

export type BannerArtKey =
  | 'internship-photo'
  | 'scholarship'
  | 'skills'
  | 'tuition'
  | 'community'
  | 'profile';

const WHITE = '#FFFFFF';

/** Illustrations share a square viewBox; the slide renders them at 128×128. */
const ART_SIZE = 128;

interface BannerArtProps {
  art: BannerArtKey;
  /** Light tint of the slide's hue (`PROMO_BANNERS[].accent`). */
  accent: string;
}

/**
 * Right-hand artwork for the hero carousel slides. The internship slide keeps
 * the original student photo cutout; the others are flat monochrome-white
 * spot illustrations with one accent tint each, so every banner is visibly
 * different while reading as one family. Purely decorative — the slide
 * container hides it from touches.
 */
export function BannerArt({ art, accent }: BannerArtProps): ReactElement {
  if (art === 'internship-photo') {
    return (
      <Image
        source={HERO_ART}
        style={styles.photo}
        contentFit="contain"
        transition={200}
      />
    );
  }

  const illustration = ILLUSTRATIONS[art];
  return (
    <Svg width={ART_SIZE} height={ART_SIZE} viewBox="0 0 120 120">
      {illustration({ accent })}
    </Svg>
  );
}

type Illustration = (props: { accent: string }) => ReactElement;

const ILLUSTRATIONS: Record<Exclude<BannerArtKey, 'internship-photo'>, Illustration> = {
  scholarship: ScholarshipArt,
  skills: SkillsArt,
  tuition: TuitionArt,
  community: CommunityArt,
  profile: ProfileArt,
};

/** Four-point sparkle used as the family-wide confetti motif. */
function Sparkle({ x, y, s = 1, opacity = 0.8 }: { x: number; y: number; s?: number; opacity?: number }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`}>
      <Path
        d="M0 -6 C0.8 -1.2 1.2 -0.8 6 0 C1.2 0.8 0.8 1.2 0 6 C-0.8 1.2 -1.2 0.8 -6 0 C-1.2 -0.8 -0.8 -1.2 0 -6 Z"
        fill={WHITE}
        fillOpacity={opacity}
      />
    </G>
  );
}

/** Graduate in mortarboard holding a diploma. */
function ScholarshipArt({ accent }: { accent: string }): ReactElement {
  return (
    <G>
      <Circle cx={63} cy={64} r={43} fill={WHITE} fillOpacity={0.1} />
      <Circle cx={63} cy={64} r={51} fill="none" stroke={WHITE} strokeOpacity={0.18} strokeWidth={1.5} />
      <Sparkle x={16} y={28} s={0.9} />
      <Sparkle x={106} y={88} s={0.7} opacity={0.65} />
      {/* gown + collar */}
      <Path d="M63 66 C50 66 43 76 41 92 L85 92 C83 76 76 66 63 66 Z" fill={WHITE} fillOpacity={0.95} />
      <Path d="M63 66 L57 76 L63 84 L69 76 Z" fill={accent} />
      <Circle cx={63} cy={55} r={11} fill={WHITE} />
      {/* mortarboard + tassel */}
      <Rect x={53} y={42} width={20} height={7} rx={3} fill={WHITE} fillOpacity={0.95} />
      <Path d="M43 44 L63 35 L83 44 L63 53 Z" fill={accent} />
      <Circle cx={63} cy={44} r={1.8} fill={WHITE} />
      <Path d="M81 45 C83 50 83.5 54 82.5 58" stroke={accent} strokeWidth={1.6} fill="none" />
      <Circle cx={82.5} cy={60} r={2.4} fill={accent} />
      {/* rolled diploma */}
      <G transform="rotate(-14 33 91)">
        <Rect x={18} y={85} width={30} height={12} rx={2.5} fill={WHITE} />
        <Rect x={31} y={85} width={4} height={12} fill={accent} />
        <Circle cx={33} cy={91} r={3.2} fill={accent} />
      </G>
    </G>
  );
}

/** Learner at a laptop with an idea bulb and a skill badge. */
function SkillsArt({ accent }: { accent: string }): ReactElement {
  return (
    <G>
      <Circle cx={58} cy={68} r={42} fill={WHITE} fillOpacity={0.1} />
      <Circle cx={24} cy={32} r={5} fill="none" stroke={WHITE} strokeOpacity={0.25} strokeWidth={1.4} />
      <Sparkle x={102} y={20} s={0.8} opacity={0.7} />
      {/* learner + laptop */}
      <Circle cx={58} cy={47} r={10.5} fill={WHITE} />
      <Path d="M58 58 C47 58 41 65 39 78 L39 96 L77 96 L77 78 C75 65 69 58 58 58 Z" fill={WHITE} fillOpacity={0.95} />
      <Rect x={45} y={63} width={26} height={15} rx={2} fill={accent} />
      <Rect x={48} y={66} width={13} height={2.6} rx={1.3} fill={WHITE} fillOpacity={0.75} />
      <Rect x={48} y={70.5} width={19} height={2.6} rx={1.3} fill={WHITE} fillOpacity={0.5} />
      <Path d="M41 79 L75 79 L79 86 L37 86 Z" fill={WHITE} fillOpacity={0.9} />
      {/* idea bulb */}
      <Circle cx={94} cy={27} r={13} fill={WHITE} fillOpacity={0.12} />
      <Circle cx={94} cy={26} r={7.5} fill={accent} />
      <Rect x={90.8} y={33} width={6.4} height={4} rx={1.4} fill={WHITE} />
      <G stroke={WHITE} strokeOpacity={0.85} strokeWidth={1.6} strokeLinecap="round">
        <Path d="M94 11 L94 7" />
        <Path d="M106 22 L109.5 19.5" />
        <Path d="M82 22 L78.5 19.5" />
      </G>
      {/* skill badge */}
      <Circle cx={26} cy={58} r={8} fill={accent} />
      <Path
        d="M22.6 58 L25 60.6 L29.4 55.8"
        stroke={WHITE}
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </G>
  );
}

/** Tutor behind an open book, with earnings coins and a rising arrow. */
function TuitionArt({ accent }: { accent: string }): ReactElement {
  return (
    <G>
      <Circle cx={58} cy={64} r={42} fill={WHITE} fillOpacity={0.1} />
      <Circle cx={101} cy={56} r={6} fill="none" stroke={WHITE} strokeOpacity={0.22} strokeWidth={1.4} />
      <Sparkle x={14} y={80} s={0.7} opacity={0.65} />
      {/* tutor */}
      <Circle cx={58} cy={44} r={10} fill={WHITE} />
      <Path d="M58 56 C48 56 42 63 40 76 L40 96 L76 96 L76 76 C74 63 68 56 58 56 Z" fill={WHITE} fillOpacity={0.9} />
      {/* open book */}
      <Path d="M30 74 C38 68 48 66 56 70 L56 92 C48 88 38 89 30 94 Z" fill={WHITE} />
      <Path d="M82 74 C74 68 64 66 56 70 L56 92 C64 88 74 89 82 94 Z" fill={WHITE} fillOpacity={0.96} />
      <Path d="M56 70 L56 92" stroke={accent} strokeWidth={1.5} strokeLinecap="round" />
      <G stroke={accent} strokeOpacity={0.55} strokeWidth={1.3} fill="none" strokeLinecap="round">
        <Path d="M36 78 C42 74.5 48 73.5 52 76" />
        <Path d="M36 84 C42 80.5 48 79.5 52 82" />
        <Path d="M80 78 C74 74.5 68 73.5 64 76" />
        <Path d="M80 84 C74 80.5 68 79.5 64 82" />
      </G>
      {/* earnings */}
      <Path
        d="M98 60 L98 48 M93.5 52.5 L98 48 L102.5 52.5"
        stroke={WHITE}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={98} cy={72} r={7} fill={accent} fillOpacity={0.75} />
      <Circle cx={98} cy={84} r={7} fill={accent} />
      <Sparkle x={98} y={72} s={0.5} opacity={0.95} />
    </G>
  );
}

/** Three members around a highlighted lead, with chat bubbles. */
function CommunityArt({ accent }: { accent: string }): ReactElement {
  return (
    <G>
      <Circle cx={60} cy={62} r={42} fill={WHITE} fillOpacity={0.1} />
      <Sparkle x={103} y={64} s={0.6} opacity={0.6} />
      {/* side members */}
      <Circle cx={38} cy={58} r={8} fill={WHITE} fillOpacity={0.45} />
      <Path d="M38 66 C31 66 26 71 24 80 L23 94 L53 94 L52 80 C50 71 45 66 38 66 Z" fill={WHITE} fillOpacity={0.45} />
      <Circle cx={82} cy={58} r={8} fill={WHITE} fillOpacity={0.45} />
      <Path d="M82 66 C89 66 94 71 96 80 L97 94 L67 94 L68 80 C70 71 75 66 82 66 Z" fill={WHITE} fillOpacity={0.45} />
      {/* lead member */}
      <Circle cx={60} cy={52} r={10.5} fill={WHITE} />
      <Path d="M60 64 C51 64 45 70 43 80 L42 94 L78 94 L77 80 C75 70 69 64 60 64 Z" fill={WHITE} fillOpacity={0.95} />
      <Path d="M60 64 L55.5 70 L60 76 L64.5 70 Z" fill={accent} />
      {/* chat bubbles */}
      <Rect x={76} y={20} width={28} height={17} rx={8.5} fill={accent} />
      <Path d="M82 36 L78 43 L88 37 Z" fill={accent} />
      <Circle cx={84} cy={28.5} r={1.6} fill={WHITE} />
      <Circle cx={90} cy={28.5} r={1.6} fill={WHITE} />
      <Circle cx={96} cy={28.5} r={1.6} fill={WHITE} />
      <Circle cx={24} cy={34} r={8.5} fill={WHITE} fillOpacity={0.9} />
      <Path d="M24 38.5 C19.2 34.6 21 30 24 32.6 C27 30 28.8 34.6 24 38.5 Z" fill={accent} />
    </G>
  );
}

/** Student behind a portfolio card with a verified badge. */
function ProfileArt({ accent }: { accent: string }): ReactElement {
  return (
    <G>
      <Circle cx={62} cy={62} r={42} fill={WHITE} fillOpacity={0.1} />
      <Circle cx={16} cy={52} r={5} fill="none" stroke={WHITE} strokeOpacity={0.25} strokeWidth={1.4} />
      <Sparkle x={104} y={30} s={0.8} opacity={0.7} />
      {/* student peeking over the card */}
      <Circle cx={52} cy={46} r={9.5} fill={WHITE} fillOpacity={0.9} />
      <Path d="M52 56 C44 56 39 62 37 72 L36 84 L68 84 L67 72 C65 62 60 56 52 56 Z" fill={WHITE} fillOpacity={0.9} />
      {/* portfolio card */}
      <Rect x={36} y={62} width={50} height={38} rx={8} fill={WHITE} />
      <Circle cx={52} cy={75} r={7} fill={accent} />
      <Rect x={63} y={69} width={17} height={4} rx={2} fill={accent} fillOpacity={0.55} />
      <Rect x={63} y={76} width={12} height={4} rx={2} fill={accent} fillOpacity={0.35} />
      <Rect x={42} y={87} width={12} height={5} rx={2.5} fill={accent} fillOpacity={0.5} />
      <Rect x={56} y={87} width={12} height={5} rx={2.5} fill={accent} fillOpacity={0.35} />
      <Rect x={70} y={87} width={10} height={5} rx={2.5} fill={accent} fillOpacity={0.25} />
      {/* verified badge */}
      <Circle cx={89} cy={64} r={9} fill={accent} />
      <Path
        d="M85.4 64 L87.8 66.6 L92.4 61.8"
        stroke={WHITE}
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </G>
  );
}

const styles = StyleSheet.create({
  photo: {
    width: '100%',
    aspectRatio: HERO_ART_ASPECT,
    // In style, not as a prop — react-native-web deprecates props.pointerEvents.
    pointerEvents: 'none',
  },
});
