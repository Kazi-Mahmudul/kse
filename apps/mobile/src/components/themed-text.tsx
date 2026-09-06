import { StyleSheet, Text, type TextProps } from 'react-native';

import { FontFamilies, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'title'
    | 'subtitle'
    | 'small'
    | 'smallBold'
    | 'link'
    | 'linkPrimary'
    | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'subtitle' && styles.subtitle,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  smallBold: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 13,
    lineHeight: 18,
  },
  default: {
    fontFamily: FontFamilies.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  title: {
    fontFamily: FontFamilies.bold,
    fontSize: 30,
    lineHeight: 38,
  },
  subtitle: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 20,
    lineHeight: 28,
  },
  link: {
    fontFamily: FontFamilies.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  linkPrimary: {
    fontFamily: FontFamilies.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  code: {
    fontFamily: 'monospace',
    fontSize: 13,
  },
});
