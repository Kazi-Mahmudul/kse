/* eslint-disable react-hooks/immutability -- Reanimated shared values are an
   intentionally mutable channel between the JS and UI threads (the documented
   way to drive `useAnimatedStyle`); the rule reads their `.value` writes as
   unsafe render-scope mutations. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  useAnimatedReaction,
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
  /** Display slot (including guard clones) whose index is currently
   *  `activeIndex`. Drives slide virtualisation — we only render the
   *  slide at this slot + its two neighbours. */
  const [currentDisplay, setCurrentDisplay] = useState(FIRST_DISPLAY);
  const [interacting, setInteracting] = useState(false);
  const [appActive, setAppActive] = useState(true);

  const translateX = useSharedValue(0);
  const position = useSharedValue(FIRST_DISPLAY);
  const widthSv = useSharedValue(0);
  const dragStartX = useSharedValue(0);

  /** Mirror of `position` on the JS side. Reading `.value` from JS while a
   *  worklet might be writing it is a known source of release-build crashes
   *  in Reanimated 4; `useAnimatedReaction` is the documented way to bridge
   *  the value across the thread boundary, and the JS timer reads from the
   *  ref instead of from the shared value. */
  const positionRef = useRef(FIRST_DISPLAY);
  useAnimatedReaction(
    () => position.value,
    (current) => {
      // This runs on the UI thread — keep it trivial.
      positionRef.current = current;
    },
    [],
  );

  /** After an animated snap (autoplay, fling or dot tap): publish the real
   *  index, and if a guard clone was reached, jump without animating to the
   *  identical real slide so the loop can keep going the same way. */
  const settle = useCallback(
    (display: number) => {
      // Guard against width-0 transitions (NaN would otherwise poison the
      // track offset and on the next render cause a layout crash on Android
      // release builds).
      const w = widthSv.value;
      if (!(w > 0)) return;
      const real = realIndex(display);
      setActiveIndex(real);
      setCurrentDisplay(display);
      if (display === 0) {
        translateX.value = -COUNT * w;
        position.value = COUNT;
      } else if (display === LAST_DISPLAY) {
        translateX.value = -FIRST_DISPLAY * w;
        position.value = FIRST_DISPLAY;
      }
    },
    [position, translateX, widthSv],
  );

  const goTo = useCallback(
    (display: number) => {
      cancelAnimation(translateX);
      setCurrentDisplay(display);
      position.value = display;
      translateX.value = withTiming(
        -display * widthSv.value,
        { duration: SLIDE_DURATION_MS, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(settle)(display);
        },
      );
    },
    [position, setCurrentDisplay, settle, translateX, widthSv],
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
          const raw = dragStartX.value + event.translationX;
          const min = -LAST_DISPLAY * widthSv.value;
          // Inline clamp — calling a JS helper from a worklet triggers
          // Reanimated 4's "Tried to synchronously call a Remote Function"
          // and crashes the app. (Same reason constants here must stay
          // primitive numbers; function references don't survive the
          // worklet boundary.)
          translateX.value = Math.min(Math.max(raw, min), 0);
        })
        .onEnd((event) => {
          // Guard against divide-by-zero / NaN if the gesture ends before
          // onLayout has reported a width (can happen on first mount when a
          // swipe is faster than the layout pass).
          const w = widthSv.value;
          if (!(w > 0)) return;
          const base = -translateX.value / w;
          const chosen =
            event.velocityX < -FLING_VELOCITY
              ? Math.ceil(base)
              : event.velocityX > FLING_VELOCITY
                ? Math.floor(base)
                : Math.round(base);
          const target = Math.min(Math.max(chosen, 0), LAST_DISPLAY);
          // Update the virtualisation window eagerly so the destination slide
          // mounts BEFORE the snap-spring fires (prevents ~400ms of an empty
          // background visible mid-spring while we wait for `settle` to run).
          // Must wrap in runOnJS — calling a React state setter from a
          // gesture worklet synchronously hits a "Remote Function" error in
          // Reanimated 4 / Worklets and crashes the entire app (FATAL:
          // "Tried to synchronously call a Remote Function. Called 'anonymous'
          // on the UI Runtime").
          runOnJS(setCurrentDisplay)(target);
          position.value = target;
          translateX.value = withSpring(
            -target * w,
            { velocity: event.velocityX, damping: 30, stiffness: 280, overshootClamping: true },
            (finished) => {
              if (finished) runOnJS(settle)(target);
            },
          );
        })
        .onFinalize(() => {
          runOnJS(setInteracting)(false);
        }),
    [dragStartX, position, settle, setCurrentDisplay, translateX, widthSv],
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
  // Reads from `positionRef` (JS-side mirror) instead of `position.value`
  // — the latter crosses threads and races with worklets writing the same
  // value, which has been seen to terminate the app on Android release.
  useEffect(() => {
    if (!width || interacting || !appActive) return;
    const id = setInterval(() => {
      goTo((positionRef.current + 1) % LOOP_BANNERS.length);
    }, AUTOPLAY_INTERVAL_MS);
    return () => clearInterval(id);
  }, [width, interacting, appActive, activeIndex, goTo]);

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
              {LOOP_BANNERS.map((banner, display) => {
                // Virtualise: only render the slide at the current display
                // position + its neighbours. The other 5 slots become empty
                // Views of the same width so the row geometry is preserved
                // for the looping math but no native views are kept alive.
                // Each banner contains a LinearGradient + ~30 react-native-svg
                // elements (~200 native views); keeping all 8 alive was
                // pushing the native view tree past a budget device's limit
                // and crashing during gesture updates on Android.
                const visible = Math.abs(display - currentDisplay) <= 1;
                return (
                  <View key={`${banner.key}-${display}`} style={{ width }}>
                    {visible ? <PromoSlide banner={banner} /> : null}
                  </View>
                );
              })}
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
