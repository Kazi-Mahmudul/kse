import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ToletDetailHeroProps {
  imageUrls: string[];
  title: string;
}

/**
 * Horizontal image gallery for the Bachelor To-Let detail page.
 *
 * - One image at a time with snap-to-interval paging.
 * - Pagination dots + counter ("3 / 6").
 * - Tap → full-screen lightbox (Modal) with pinch-friendly single image.
 * - Falls back to a single hero box with the title when no images exist.
 *
 * The hero is intentionally tall (320 px) — listing cards are dense and the
 * detail page should give photos room to breathe (spec bachelor-to-let §UI).
 */
export function ToletDetailHero({ imageUrls, title }: ToletDetailHeroProps) {
  const colors = useTheme();
  const screenWidth = Dimensions.get('window').width;
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const listRef = useRef<FlatList<string>>(null);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
      setActiveIndex(index);
    },
    [screenWidth],
  );

  if (imageUrls.length === 0) {
    return (
      <View
        style={[
          styles.heroFallback,
          { backgroundColor: colors.backgroundElement },
        ]}
      >
        <Ionicons name="home" size={48} color={colors.textSecondary} />
        <Text style={[styles.heroFallbackText, { color: colors.textSecondary }]}>
          {title}
        </Text>
      </View>
    );
  }

  return (
    <>
      <Pressable
        onPress={() => setLightboxOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="View photos full-screen"
      >
        <FlatList
          ref={listRef}
          data={imageUrls}
          keyExtractor={(url) => url}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
          renderItem={({ item }) => (
            <Image
              source={{ uri: item }}
              style={[styles.heroImage, { width: screenWidth }]}
              contentFit="cover"
              transition={150}
            />
          )}
        />
        <View style={styles.paginationWrap} pointerEvents="none">
          <View style={styles.counter}>
            <Text style={styles.counterText}>
              {activeIndex + 1} / {imageUrls.length}
            </Text>
          </View>
          <View style={styles.dotsRow}>
            {imageUrls.map((url, index) => (
              <View
                key={url}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      index === activeIndex ? colors.onPrimary : `${colors.onPrimary}55`,
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </Pressable>

      <Modal
        visible={lightboxOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxOpen(false)}
        statusBarTranslucent
      >
        <Pressable
          style={[styles.lightbox, { backgroundColor: colors.scrim }]}
          onPress={() => setLightboxOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <FlatList
            data={imageUrls}
            keyExtractor={(url) => url}
            horizontal
            pagingEnabled
            initialScrollIndex={activeIndex}
            getItemLayout={(_, index) => ({
              length: screenWidth,
              offset: screenWidth * index,
              index,
            })}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item }}
                style={[styles.lightboxImage, { width: screenWidth }]}
                contentFit="contain"
              />
            )}
          />
          <Pressable
            style={[styles.lightboxClose, { backgroundColor: `${colors.background}CC` }]}
            onPress={() => setLightboxOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  heroFallback: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  heroFallbackText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  heroImage: {
    height: 320,
  },
  paginationWrap: {
    position: 'absolute',
    bottom: Spacing.two,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: Spacing.one,
  },
  counter: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 999,
  },
  counterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  lightbox: {
    flex: 1,
    justifyContent: 'center',
  },
  lightboxImage: {
    height: '100%',
  },
  lightboxClose: {
    position: 'absolute',
    top: 50,
    right: Spacing.three,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
