import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  openPortfolioFile,
  useUploadPortfolioDocument,
} from '@/features/portfolio/queries';
import {
  deletePortfolioDocument,
  FILE_LIMITS,
  isStoragePath,
  type PortfolioBucket,
} from '@/features/portfolio/service';
import { blurActiveElement } from '@/lib/focus';
import { useTheme } from '@/hooks/use-theme';
import type { IconName } from '@/types/icon';

/**
 * Upload field for portfolio documents (certificate files, marksheets,
 * transcripts, resumes). Picks a JPG/PNG/PDF via the system document picker
 * (PDF only for the `resumes` bucket), uploads it into the matching private
 * bucket and writes the resulting storage path into the bound form field.
 * External https links stay supported as a no-upload alternative (and
 * remain how pre-upload rows were stored).
 */

const ALLOWED_MIME = ['application/pdf', 'image/png', 'image/jpeg'] as const;

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

function resolveMime(name: string | null, mimeType: string | null): string | null {
  if (mimeType && (ALLOWED_MIME as readonly string[]).includes(mimeType)) return mimeType;
  const ext = name?.split('.').pop()?.toLowerCase();
  return (ext && MIME_BY_EXTENSION[ext]) || null;
}

/** HEIC/WebP images are coerced to JPEG so the bucket whitelist accepts them. */
async function coerceImageToJpeg(localUri: string): Promise<{ uri: string; mimeType: string }> {
  const imageRef = await ImageManipulator.manipulate(localUri).renderAsync();
  const result = await imageRef.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
  return { uri: result.uri, mimeType: 'image/jpeg' };
}

type FileKind = 'image' | 'pdf' | 'link';

function fileKindOf(value: string): FileKind {
  const clean = value.split('?')[0].toLowerCase();
  if (clean.endsWith('.pdf')) return 'pdf';
  if (/\.(jpe?g|png)$/u.test(clean)) return 'image';
  return 'link';
}

const KIND_SPEC: Record<FileKind, { icon: IconName; label: string }> = {
  image: { icon: 'image-outline', label: 'Image' },
  pdf: { icon: 'document-text-outline', label: 'PDF document' },
  link: { icon: 'link-outline', label: 'Attached link' },
};

interface FileFieldProps {
  label: string;
  /** '' | storage path (`<bucket>/<uid>/<file>.<ext>`) | https URL. */
  value: string;
  onChange(value: string): void;
  /** Extra guidance under the label. */
  hint?: string;
  /** Destination bucket — `resumes` restricts the picker to PDF. */
  bucket?: PortfolioBucket;
  /** Reports the picked file's original name (null when cleared / linked). */
  onFileName?(name: string | null): void;
}

export function FileField({
  label,
  value,
  onChange,
  hint,
  bucket,
  onFileName,
}: FileFieldProps) {
  const colors = useTheme();
  const [busy, setBusy] = useState(false);
  const [linkDraft, setLinkDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const upload = useUploadPortfolioDocument();
  const pdfOnly = bucket === 'resumes';

  const pick = useCallback(async () => {
    if (busy || upload.isPending) return;
    setError(null);
    setBusy(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: pdfOnly ? ['application/pdf'] : [...ALLOWED_MIME],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      let mimeType = resolveMime(asset.name ?? null, asset.mimeType ?? null);
      let uri = asset.uri;

      if (!pdfOnly && !mimeType && (asset.mimeType ?? '').startsWith('image/')) {
        // Unknown image containers (HEIC on iOS, some Android pickers) are
        // re-encoded; anything else unsupported is rejected up front.
        const coerced = await coerceImageToJpeg(asset.uri);
        uri = coerced.uri;
        mimeType = coerced.mimeType;
      }
      if (!mimeType || (pdfOnly && mimeType !== 'application/pdf')) {
        setError(
          pdfOnly
            ? 'Resume must be a PDF file.'
            : 'Unsupported file type. Use JPG, PNG or PDF.',
        );
        return;
      }
      if (asset.size != null) {
        const limit =
          mimeType === 'application/pdf' ? FILE_LIMITS.pdfMaxBytes : FILE_LIMITS.imageMaxBytes;
        if (asset.size > limit) {
          setError(
            mimeType === 'application/pdf'
              ? 'PDF must be under 10 MB.'
              : 'Images must be under 5 MB.',
          );
          return;
        }
      }

      const previous = value;
      const path = await upload.mutateAsync({ localUri: uri, mimeType, bucket });
      onChange(path);
      onFileName?.(asset.name ?? null);
      // Best-effort cleanup so replacing a file doesn't orphan the old object.
      if (isStoragePath(previous)) {
        void deletePortfolioDocument(previous).catch(() => undefined);
      }
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Could not upload the file. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }, [busy, upload, value, onChange, bucket, onFileName, pdfOnly]);

  const working = busy || upload.isPending;
  const kind = value ? fileKindOf(value) : null;

  const submitLink = () => {
    const trimmed = linkDraft.trim();
    if (!trimmed) return;
    if (!/^https?:\/\/\S+$/iu.test(trimmed)) {
      setError('Enter a valid https link, or upload a file instead.');
      return;
    }
    setError(null);
    setLinkDraft('');
    onFileName?.(null);
    onChange(trimmed);
  };

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      {hint ? (
        <Text style={[styles.hint, { color: colors.textSecondary }]}>{hint}</Text>
      ) : null}

      {value && kind ? (
        <View
          style={[
            styles.attachment,
            { backgroundColor: colors.backgroundElement, borderColor: colors.border },
          ]}
        >
          <View style={[styles.attachmentIcon, { backgroundColor: colors.background }]}>
            <Ionicons name={KIND_SPEC[kind].icon} size={18} color={colors.primary} />
          </View>
          <View style={styles.attachmentText}>
            <ThemedText type="smallBold">{KIND_SPEC[kind].label}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {isStoragePath(value) ? 'Uploaded to your private storage' : value}
            </ThemedText>
          </View>
          <AttachmentAction
            icon="eye-outline"
            label="View"
            onPress={() => {
              void openPortfolioFile(value);
            }}
          />
          <AttachmentAction icon="refresh-outline" label="Replace" onPress={pick} disabled={working} />
          <AttachmentAction
            icon="trash-outline"
            label="Remove"
            danger
            disabled={working}
            onPress={() => {
              if (isStoragePath(value)) {
                void deletePortfolioDocument(value).catch(() => undefined);
              }
              onFileName?.(null);
              onChange('');
            }}
          />
        </View>
      ) : (
        <View>
          <Pressable
            onPress={pick}
            disabled={working}
            accessibilityRole="button"
            accessibilityLabel={`${label}: upload a file`}
            style={({ pressed }) => [
              styles.uploadButton,
              { borderColor: colors.border, backgroundColor: colors.surfaceMuted },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name={working ? 'hourglass-outline' : 'cloud-upload-outline'}
              size={20}
              color={colors.primary}
            />
            <View style={styles.uploadText}>
              <ThemedText type="smallBold">
                {working ? 'Uploading…' : 'Upload file'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {pdfOnly ? 'PDF' : 'JPG, PNG or PDF'}
              </ThemedText>
            </View>
          </Pressable>

          <View style={styles.orRow}>
            <View style={[styles.orLine, { backgroundColor: colors.border }]} />
            <ThemedText type="small" themeColor="textMuted" style={styles.orText}>
              or paste a link
            </ThemedText>
            <View style={[styles.orLine, { backgroundColor: colors.border }]} />
          </View>

          <TextInput
            value={linkDraft}
            onChangeText={setLinkDraft}
            placeholder="https://drive.google.com/…"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            keyboardType="url"
            onSubmitEditing={submitLink}
            onEndEditing={submitLink}
            blurOnSubmit
            style={[
              styles.input,
              { backgroundColor: colors.backgroundElement, color: colors.text },
            ]}
          />
        </View>
      )}

      {error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : null}
    </View>
  );
}

function AttachmentAction({
  icon,
  label,
  onPress,
  danger,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress(): void;
  danger?: boolean;
  disabled?: boolean;
}) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={() => {
        blurActiveElement();
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={16} color={danger ? colors.danger : colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 6,
    marginBottom: Spacing.three,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
  },
  uploadButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  uploadText: {
    gap: 1,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 8,
  },
  orLine: {
    flex: 1,
    height: 1,
  },
  orText: {
    fontSize: 11,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  attachment: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  attachmentIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentText: {
    flex: 1,
    gap: 1,
  },
  action: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    fontSize: 13,
  },
  pressed: {
    opacity: 0.7,
  },
});
