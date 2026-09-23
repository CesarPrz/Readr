import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import FormatBadge from '../components/FormatBadge';
import RatingStars from '../components/RatingStars';
import StatusSegmented from '../components/StatusSegmented';
import { bookRepository } from '../composition/repositories';
import type { DiscoverStackParamList, LibraryStackParamList, SearchStackParamList } from '../navigation/types';
import { fetchBookDetail } from '../store/bookDetailSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addBook, patchLibraryEntry, removeBook } from '../store/librarySlice';
import { colors, radius, spacing, typography } from '../theme/theme';

type Props = NativeStackScreenProps<
  SearchStackParamList | DiscoverStackParamList | LibraryStackParamList,
  'BookDetail'
>;

// Display-only labels for Open Library's language codes — purely a formatting
// concern for this screen, not a domain rule. Falls back to the raw code.
const LANGUAGE_LABELS: Record<string, string> = {
  eng: 'Anglais',
  fre: 'Français',
  fra: 'Français',
  spa: 'Espagnol',
  ger: 'Allemand',
  deu: 'Allemand',
  ita: 'Italien',
  por: 'Portugais',
  dut: 'Néerlandais',
  nld: 'Néerlandais',
  jpn: 'Japonais',
  chi: 'Chinois',
  zho: 'Chinois',
  rus: 'Russe',
  ara: 'Arabe',
  kor: 'Coréen',
};

function languageLabel(code: string): string {
  return LANGUAGE_LABELS[code] ?? code.toUpperCase();
}

export default function BookDetailScreen({ route }: Props) {
  const { workKey, presetWorkKeys, presetTitle, presetAuthors, presetCoverId, presetLanguages } = route.params;
  const dispatch = useAppDispatch();
  const entry = useAppSelector((state) => state.library.entries.find((e) => e.id === workKey));
  const { detail, status: detailStatus, currentId } = useAppSelector((state) => state.bookDetail);
  const [noteDraft, setNoteDraft] = useState('');

  const inLibrary = !!entry;
  const isCurrent = currentId === workKey;
  const loading = !isCurrent || detailStatus === 'loading';

  useEffect(() => {
    dispatch(fetchBookDetail(presetWorkKeys));
  }, [presetWorkKeys, dispatch]);

  useEffect(() => {
    setNoteDraft(entry?.note ?? '');
  }, [entry?.note]);

  const uri = bookRepository.coverUrl(presetCoverId, 'L');
  const audioAvailable = isCurrent && !!detail?.hasAudioEdition;
  const editions = isCurrent ? (detail?.editions ?? []) : [];
  const description = isCurrent ? detail?.description : undefined;
  // The detail fetch (from editions) is the authoritative source once it lands;
  // until then, fall back to what search already told us about this book.
  const languages = isCurrent && detail?.languages.length ? detail.languages : presetLanguages;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.coverRow}>
        {uri ? (
          <Image source={{ uri }} style={styles.cover} contentFit="cover" transition={150} />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]}>
            <Text style={styles.title} numberOfLines={4}>
              {presetTitle}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.title}>{presetTitle}</Text>
      <Text style={styles.author}>{presetAuthors.join(', ') || 'Auteur inconnu'}</Text>

      {audioAvailable && (
        <View style={styles.audioTag}>
          <Ionicons name="headset" size={14} color={colors.accentBlue} />
          <Text style={styles.audioTagText}>Disponible en édition audio</Text>
        </View>
      )}

      {inLibrary ? (
        <Pressable style={styles.removeButton} onPress={() => dispatch(removeBook(workKey))}>
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
          <Text style={styles.removeButtonText}>Retirer de ma bibliothèque</Text>
        </Pressable>
      ) : (
        <Pressable
          style={styles.addButton}
          onPress={() =>
            dispatch(
              addBook({
                book: {
                  id: workKey,
                  workKeys: presetWorkKeys,
                  title: presetTitle,
                  authors: presetAuthors,
                  coverId: presetCoverId,
                  languages: presetLanguages,
                },
              }),
            )
          }
        >
          <Ionicons name="add" size={18} color={colors.background} />
          <Text style={styles.addButtonText}>Ajouter à ma bibliothèque</Text>
        </Pressable>
      )}

      {inLibrary && entry && (
        <View style={styles.libraryControls}>
          <Text style={styles.sectionLabel}>Statut de lecture</Text>
          <StatusSegmented
            value={entry.status}
            onChange={(next) => dispatch(patchLibraryEntry({ id: workKey, patch: { status: next } }))}
          />

          <Text style={[styles.sectionLabel, styles.spacedLabel]}>Ma note</Text>
          <RatingStars
            rating={entry.rating}
            onChange={(rating) => dispatch(patchLibraryEntry({ id: workKey, patch: { rating } }))}
          />

          <Text style={[styles.sectionLabel, styles.spacedLabel]}>Notes personnelles</Text>
          <TextInput
            value={noteDraft}
            onChangeText={setNoteDraft}
            onBlur={() => dispatch(patchLibraryEntry({ id: workKey, patch: { note: noteDraft } }))}
            placeholder="Ce que tu veux retenir de ce livre..."
            placeholderTextColor={colors.placeholder}
            style={styles.noteInput}
            multiline
          />
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.accentOrange} />
      ) : (
        <>
          {description && (
            <>
              <Text style={styles.sectionLabel}>Résumé</Text>
              <Text style={styles.description}>{description}</Text>
            </>
          )}

          <Text style={[styles.sectionLabel, styles.spacedLabel]}>Éditions disponibles</Text>
          {editions.length === 0 ? (
            <Text style={styles.description}>Aucune édition référencée pour ce livre.</Text>
          ) : (
            <View style={styles.editionsWrap}>
              {editions.map((edition) => (
                <FormatBadge key={edition.id} label={edition.formatLabel} />
              ))}
            </View>
          )}

          {languages.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, styles.spacedLabel]}>Langues disponibles</Text>
              <Text style={styles.description}>{languages.map(languageLabel).join(', ')}</Text>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  coverRow: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  cover: {
    width: 180,
    aspectRatio: 2 / 3,
    borderRadius: radius.lg,
  },
  coverPlaceholder: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  title: {
    ...typography.title,
    fontSize: 22,
  },
  author: {
    ...typography.body,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  audioTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  audioTagText: {
    color: colors.accentBlue,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentOrange,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.lg,
  },
  addButtonText: {
    color: colors.background,
    fontWeight: '700',
    marginLeft: spacing.xs,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.lg,
  },
  removeButtonText: {
    color: colors.danger,
    fontWeight: '700',
    marginLeft: spacing.xs,
  },
  libraryControls: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.label,
  },
  spacedLabel: {
    marginTop: spacing.md,
  },
  noteInput: {
    marginTop: spacing.sm,
    minHeight: 80,
    color: colors.primaryText,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  description: {
    ...typography.body,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  editionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  loader: {
    marginTop: spacing.lg,
  },
});
