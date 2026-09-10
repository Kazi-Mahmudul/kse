import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

interface ProgressRingProps {
  /** Percentage 0–100; values outside the range are clamped. */
  progress: number;
  size?: number;
  strokeWidth?: number;
  /** Arc color; defaults to the success token (docs/design/tokens.md). */
  color?: string;
  trackColor?: string;
  /** Centered label, e.g. `<ThemedText>75%</ThemedText>`. */
  children?: ReactNode;
  /**
   * Where the arc begins. `'left'` (default) is what the design's
   * `transform -rotate-90` produces; `'top'` starts at 12 o'clock.
   */
  startAt?: 'left' | 'top';
}

/**
 * Circular progress ring (docs/design/tokens.md "Patterns"), used for profile
 * score / completion.
 *
 * The arc geometry is the design's own: a 36×36 viewBox with r = 15.9155 makes
 * the circumference ≈ 100, so `strokeDasharray` can take the percentage
 * directly instead of needing a 2πr conversion. Both variants sweep clockwise;
 * the start point is baked into the path rather than applied as a `<G>`
 * rotation, which would emit an invalid `transform-origin` DOM prop on web.
 */
const ARCS = {
  // Starts at 9 o'clock (2.0845, 18), sweeping clockwise via 12 → 3 → 6.
  left: 'M2.0845 18 a 15.9155 15.9155 0 0 1 31.831 0 a 15.9155 15.9155 0 0 1 -31.831 0',
  // Starts at 12 o'clock (18, 2.0845), sweeping clockwise via 3 → 6 → 9.
  top: 'M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831',
} as const;

export function ProgressRing({
  progress,
  size = 48,
  strokeWidth = 3,
  color,
  trackColor,
  children,
  startAt = 'left',
}: ProgressRingProps) {
  const colors = useTheme();
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  const arc = ARCS[startAt];

  return (
    <View
      style={[styles.wrap, { width: size, height: size }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
    >
      <Svg width={size} height={size} viewBox="0 0 36 36">
        <Path
          d={arc}
          fill="none"
          stroke={trackColor ?? colors.border}
          strokeWidth={strokeWidth}
        />
        {pct > 0 && (
          <Path
            d={arc}
            fill="none"
            stroke={color ?? colors.success}
            strokeWidth={strokeWidth}
            strokeDasharray={`${pct}, 100`}
            strokeLinecap="round"
          />
        )}
      </Svg>
      {children ? <View style={styles.label}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
