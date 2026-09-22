/* eslint-disable react-hooks/immutability -- Reanimated shared values are an
   intentionally mutable channel between the JS and UI threads (the documented
   way to drive `useAnimatedStyle`); the rule reads their `.value` writes as
   unsafe render-scope mutations. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppState,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { PROMO_BANNERS } from '@/features/home/promo-banners';
import { PromoSlide } from '@/features/home/promo-slide';
import { useTheme } from '@/hooks/use-theme';

/** Slide interval + animation tuning. */
const AUTOPLAY_INTERVAL_MS = 4500;
const SLIDE_DURATION_MS = 420;
/** A swipe becomes a fling above this horizontal velocity (px/s). */
const FLING_VELOCITY = 500;

const COUNT = PROMO_BANNERS.length;
/** Display position of the first real slide (after the leading clone). */
const FIRST_DISPLAY = 1;
/** [last, …all, first] — the two guard clones make the loop seamless: every
 *  real slide has a neighbour to animate to, and the clone the track lands on
 *  is pixel-identical to the real slide we silently teleport back to. */
const LOOP_BANNERS = [PROMO_BANNERS[COUNT - 1], ...PROMO_BANNERS, PROMO_BANNERS[0]];
const LAST_DISPLAY = LOOP_BANNERS.length - 1;

/** Map a display position (including guard clones) to the real slide index. */
const realIndex = (display: number) =>
  (((display - FIRST_DISPLAY) % COUNT) + COUNT) % COUNT;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Pagination dot that stretches into a pill while active. */
function PromoDot({
  active,
  onPress,
  label,
}: {
  active: boolean;
  onPress: () => void;
  label: string;
}) {
  const width = useSharedValue(6);
  const style = useAnimatedStyle(() => ({ width: width.value }));

  useEffect(() => {
    width.value = withTiming(active ? 18 : 6, { duration: 180 });
  }, [active, width]);

  return (
    <AnimatedPressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={[styles.dot, style, active ? styles.dotActive : styles.dotIdle]}
    />
  );
}

/**
 * Home hero promo slider (design 03._home_kse): auto-playing horizontal
 * carousel of Bangla promo banners. Loops infinitely via guard clones, can
 * be swiped manually (autoplay pauses on touch and resumes afterwards), and
 * paginates with stretching dots. Slide content lives in `promo-banners.ts`.
 */
export function PromoCarousel() {
  const colors = useTheme();
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [interacting, setInteracting] = useState(false);
  const [appActive, setAppActive] = useState(true);

  const translateX = useSharedValue(0);
  const position = useSharedValue(FIRST_DISPLAY);
  const widthSv = useSharedValue(0);
  const dragStartX = useSharedValue(0);

  /** After an animated snap (autoplay, fling or dot tap): publish the real
   *  index, and if a guard clone was reached, jump without animating to the
   *  identical real slide so the loop can keep going the same way. */
  const settle = useCallback(
    (display: number) => {
      setActiveIndex(realIndex(display));
      if (display === 0) {
        translateX.value = -COUNT * widthSv.value;
        position.value = COUNT;
      } else if (display === LAST_DISPLAY) {
        translateX.value = -FIRST_DISPLAY * widthSv.value;
        position.value = FIRST_DISPLAY;
      }
    },
    [position, translateX, widthSv],
  );

  const goTo = useCallback(
    (display: number) => {
      cancelAnimation(translateX);
      position.value = display;
      translateX.value = withTiming(
        -display * widthSv.value,
        { duration: SLIDE_DURATION_MS, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(settle)(display);
        },
      );
    },
    [position, settle, translateX, widthSv],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        // Only claim (mostly) horizontal drags; vertical ones belong to the
        // surrounding ScrollView.
        .activeOffsetX([-14, 14])
        .failOffsetY([-16, 16])
        .onBegin(() => {
          dragStartX.value = translateX.value;
          runOnJS(setInteracting)(true);
        })
        .onUpdate((event) => {
          translateX.value = clamp(
            dragStartX.value + event.translationX,
            -LAST_DISPLAY * widthSv.value,
            0,
          );
        })
        .onEnd((event) => {
          const base = -translateX.value / widthSv.value;
          const target = clamp(
            event.velocityX < -FLING_VELOCITY
              ? Math.ceil(base)
              : event.velocityX > FLING_VELOCITY
                ? Math.floor(base)
                : Math.round(base),
            0,
            LAST_DISPLAY,
          );
          position.value = target;
          translateX.value = withSpring(
            -target * widthSv.value,
            { velocity: event.velocityX, damping: 30, stiffness: 280, overshootClamping: true },
            (finished) => {
              if (finished) runOnJS(settle)(target);
            },
          );
        })
        .onFinalize(() => {
          runOnJS(setInteracting)(false);
        }),
    [dragStartX, position, settle, translateX, widthSv],
  );

  // Pause autoplay while the app is backgrounded.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setAppActive(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  // Autoplay: every 4.5s, pausing while the user is touching the banner.
  // `activeIndex` in the deps resets the countdown after each slide change
  // (so a manual swipe buys a full interval before the next auto-advance).
  useEffect(() => {
    if (!width || interacting || !appActive) return;
    const id = setInterval(() => {
      goTo((position.value + 1) % LOOP_BANNERS.length);
    }, AUTOPLAY_INTERVAL_MS);
    return () => clearInterval(id);
  }, [width, interacting, appActive, activeIndex, goTo, position]);

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    setWidth(next);
    widthSv.value = next;
    // Re-anchor the current slide instantly (first layout + rotations/resize).
    translateX.value = -position.value * next;
  };

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={[styles.shadow, { boxShadow: `0px 6px 12px ${colors.primary}2E` }]}>
      <GestureDetector gesture={pan}>
        <View style={styles.frame} onLayout={onLayout}>
          {width > 0 && (
            <Animated.View style={[styles.track, trackStyle]}>
              {LOOP_BANNERS.map((banner, display) => (
                <View key={`${banner.key}-${display}`} style={{ width }}>
                  <PromoSlide banner={banner} />
                </View>
              ))}
            </Animated.View>
          )}
          <View style={styles.dots}>
            {PROMO_BANNERS.map((banner, index) => (
              <PromoDot
                key={banner.key}
                active={index === activeIndex}
                onPress={() => goTo(index + FIRST_DISPLAY)}
                label={`Show banner ${index + 1} of ${COUNT}: ${banner.ctaA11y}`}
              />
            ))}
          </View>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: 24,
    elevation: 5,
  },
  frame: {
    height: 172,
    borderRadius: 24,
    overflow: 'hidden',
  },
  track: {
    height: '100%',
    flexDirection: 'row',
  },
  dots: {
    position: 'absolute',
    left: 16,
    bottom: 10,
    flexDirection: 'row',
    gap: 5,
    // In style, not as a prop — react-native-web deprecates props.pointerEvents.
    // `box-none` lets swipes started between dots reach the banner.
    pointerEvents: 'box-none',
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: '#ffffff',
  },
  dotIdle: {
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
});
