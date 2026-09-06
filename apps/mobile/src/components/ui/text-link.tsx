import { Link, type Href } from 'expo-router';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

interface TextLinkProps extends TextProps {
  href: Href;
}

/**
 * Router link styled as text. Styles are flattened because expo-router's
 * web renderer cannot extract style arrays on Link children.
 */
export function TextLink({ href, style, ...textProps }: TextLinkProps) {
  const colors = useTheme();
  return (
    <Link href={href} asChild>
      <Text
        {...textProps}
        style={StyleSheet.flatten([styles.link, { color: colors.primary }, style])}
      />
    </Link>
  );
}

const styles = StyleSheet.create({
  link: {
    fontSize: 15,
    fontWeight: '600',
  },
});
