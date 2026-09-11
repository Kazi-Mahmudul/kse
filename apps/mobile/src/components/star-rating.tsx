import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface StarRatingProps {
  /** 0–5 rating; halves render as a half star. */
  value: number;
  /** Star diameter in px (design: 14 on cards, 18 on the profile). */
  size?: number;
  /** Numeric label rendered after the stars (design cards: "4.8"). */
  showValue?: boolean;
  /** Count label rendered after the value, e.g. "(12)". */
  count?: number;
  /** Tappable 1–5 star input for the review form. */
  interactive?: boolean;
  onChange?: (value: number) => void;
}

/**
 * Star rating (design 10._tuition_finder_kse_2): amber stars over the slate
 * text stack. Display by default; `interactive` turns it into the review-form
 * input (whole stars only, per the tutor_reviews rating check).
 */
export function StarRating({
  value,
  size = 14,
  showValue = false,
  count,
  interactive = false,
  onChange,
}: StarRatingProps) {
  const colors = useTheme();

  const stars = (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => {
        const name =
          value >= star ? 'star' : value >= star - 0.5 ? 'star-half' : 'star-outline';
        return (
          <Ionicons
            key={star}
            name={name}
            size={size}
            color={colors.warning}
            style={styles.star}
          />
        );
      })}
    </View>
  );

  if (interactive) {
    return (
      <View style={styles.row}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable
            key={star}
            onPress={() => onChange?.(star)}
            accessibilityRole="button"
            accessibilityLabel={`${star} star${star === 1 ? '' : 's'}`}
            hitSlop={6}
            style={({ pressed }) => [styles.tapStar, pressed && styles.pressed]}
          >
            <Ionicons
              name={value >= star ? 'star' : 'star-outline'}
              size={28}
              color={colors.warning}
            />
          </Pressable>
        ))}
      </View>
    );
  }

  if (!showValue && count == null) return stars;

  return (
    <View style={styles.row}>
      {stars}
      {showValue && (
        <ThemedText themeColor="bodyStrong" style={styles.value}>
          {value > 0 ? value.toFixed(1) : 'New'}
        </ThemedText>
      )}
      {count != null && (
        <ThemedText themeColor="textSecondary" style={styles.count}>
          {value > 0 ? `(${count})` : 'No reviews yet'}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginRight: 1,
  },
  tapStar: {
    padding: 4,
    marginLeft: -4,
  },
  pressed: {
    opacity: 0.7,
  },
  value: {
    fontFamily: FontFamilies.bold,
    fontSize: 12,
    lineHeight: 15,
    marginLeft: 4,
  },
  count: {
    fontFamily: FontFamilies.regular,
    fontSize: 11,
    lineHeight: 14,
    marginLeft: 4,
  },
});
