import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import CoverCarousel from '../components/CoverCarousel';
import RatingStars from '../components/RatingStars';
import StatusSegmented from '../components/StatusSegmented';
import { bookRepository } from '../composition/repositories';
import type { Book } from '../domain/entities/Book';
import { DEFAULT_LIST_IDS, EXCLUSIVE_STATUS_LIST_IDS } from '../domain/entities/ReadingList';
import type {
  DiscoverStackParamList,
  FeedStackParamList,
  LibraryStackParamList,
  SearchStackParamList,
} from '../navigation/types';
import { fetchBookDetail } from '../store/bookDetailSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addBook, patchLibraryEntry, removeBook, toggleBookList } from '../store/librarySlice';
import { colors, radius, spacing, typography } from '../theme/theme';
import { languageLabel } from '../utils/languageLabels';

type Props = NativeStackScreenProps<
  SearchStackParamList | DiscoverStackParamList | LibraryStackParamList | FeedStackParamList,
  'BookDetail'
>;

export default function BookDetailScreen({ route }: Props) {
  const {
    workKey,
    presetWorkKeys,
    presetTitle,
    presetAuthors,
    presetCoverId,
    presetCoverUrl,
    presetDescription,
    presetLanguages,
  } = route.params;
  const dispatch = useAppDispatch();
  const entry = useAppSelector((state) => state.library.entries.find((e) => e.id === workKey));
  const customLists = useAppSelector((state) => state.lists.lists.filter((l) => !l.isDefault));
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

  const audioAvailable = isCurrent && !!detail?.hasAudioEdition;
  const editions = isCurrent ? (detail?.editions ?? []) : [];
  // Le résumé Open Library (une fois la fiche détail chargée) reste
  // prioritaire quand il existe ; `presetDescription` (ex. Google Books) sert
  // de repli pour les livres sans fiche "œuvre" Open Library à interroger —
  // sinon jamais aucun résumé pour ces livres-là (voir Book.description).
  const description = (isCurrent ? detail?.description : undefined) ?? presetDescription;
  // The detail fetch (from editions) is the authoritative source once it lands;
  // until then, fall back to what search already told us about this book.
  const languages = isCurrent && detail?.languages.length ? detail.languages : presetLanguages;

  // Plusieurs éditions fusionnées peuvent chacune référencer une couverture
  // différente — on les propose toutes plutôt que d'en imposer une seule
  // (voir CoverCarousel). presetCoverId en premier : dispo dès l'ouverture de
  // l'écran, avant même que la fiche détail (et ses éditions) ait chargé.
  const coverIds = useMemo(() => {
    const ids = [presetCoverId, ...editions.map((edition) => edition.coverId)];
    return Array.from(new Set(ids.filter((id): id is number => id !== undefined)));
  }, [presetCoverId, editions]);

  // presetCoverUrl est une URL déjà résolue (livres venus d'une source sans
  // coverId Open Library, ex. Google Books) — elle est placée en premier
  // puisqu'elle est dispo immédiatement, avant même les éditions détaillées.
  const coverUrls = useMemo(() => {
    const fromIds = coverIds.map((id) => bookRepository.coverUrl(id, 'L')).filter((url): url is string => !!url);
    const all = presetCoverUrl ? [presetCoverUrl, ...fromIds] : fromIds;
    return Array.from(new Set(all));
  }, [presetCoverUrl, coverIds]);

  // Pas tous les éditeurs ne sont renseignés côté Open Library (`Edition.publisher`
  // est optionnel) — on ne garde que ceux qu'on connaît, dédupliqués.
  const publishers = useMemo(
    () => Array.from(new Set(editions.map((edition) => edition.publisher).filter((p): p is string => !!p))),
    [editions],
  );

  // Reconstruit à partir des presets de navigation — utilisé aussi bien par le
  // bouton "Ajouter à ma bibliothèque" que par la bulle cœur (qui peut ajouter
  // le livre elle-même s'il n'y est pas encore, voir `toggleLiked`).
  const presetBook: Book = useMemo(
    () => ({
      id: workKey,
      workKeys: presetWorkKeys,
      title: presetTitle,
      authors: presetAuthors,
      coverId: presetCoverId,
      coverUrl: presetCoverUrl,
      description: presetDescription,
      languages: presetLanguages,
    }),
    [workKey, presetWorkKeys, presetTitle, presetAuthors, presetCoverId, presetCoverUrl, presetDescription, presetLanguages],
  );

  const liked = entry?.listIds.includes(DEFAULT_LIST_IDS.liked) ?? false;
  // La liste de statut actuelle (À lire/En cours/Lu) — "À lire" par défaut
  // tant que le livre n'est pas encore dans la bibliothèque, cohérent avec
  // `addBookToLibrary` (voir sa doc).
  const currentStatusListId =
    entry?.listIds.find((id) => EXCLUSIVE_STATUS_LIST_IDS.includes(id)) ?? DEFAULT_LIST_IDS.toRead;

  // Si le livre n'est pas encore dans la bibliothèque, aimer l'ajoute directement
  // (statut "à lire" par défaut, en plus d'"Aimés") plutôt que d'obliger à d'abord
  // appuyer sur "Ajouter à ma bibliothèque" — "Aimés" reste malgré tout une des
  // listes de la bibliothèque (voir LibraryScreen), un livre non ajouté ne peut
  // pas y figurer.
  const toggleLiked = useCallback(() => {
    if (entry) {
      dispatch(toggleBookList({ bookId: workKey, listId: DEFAULT_LIST_IDS.liked, add: !liked }));
    } else {
      dispatch(addBook({ book: presetBook, listId: DEFAULT_LIST_IDS.liked }));
    }
  }, [dispatch, entry, liked, workKey, presetBook]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.coverRow}>
        <View style={styles.coverFrame}>
          {coverUrls.length > 0 ? (
            <CoverCarousel coverUrls={coverUrls} />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder]}>
              <Text style={styles.title} numberOfLines={4}>
                {presetTitle}
              </Text>
            </View>
          )}

          <Pressable
            style={[styles.likeBubble, liked && styles.likeBubbleActive]}
            onPress={toggleLiked}
            hitSlop={8}
          >
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? colors.background : colors.accentPink} />
          </Pressable>
        </View>
      </View>

      <Text style={styles.title}>{presetTitle}</Text>
      <Text style={styles.author}>{presetAuthors.join(', ') || 'Auteur inconnu'}</Text>

      {audioAvailable && (
        <View style={styles.audioTag}>
          <Ionicons name="headset" size={14} color={colors.accentBlue} />
          <Text style={styles.audioTagText}>Disponible en édition audio</Text>
        </View>
      )}

      {/* Résumé placé avant l'ajout aux listes, pour aider à décider avant de choisir un statut de lecture. */}
      <Text style={styles.sectionLabel}>Résumé</Text>
      {loading ? (
        <ActivityIndicator style={[styles.loader, styles.summarySpacer]} color={colors.accentOrange} />
      ) : (
        <Text style={[styles.description, styles.summarySpacer]}>
          {description ?? 'Pas de résumé disponible pour ce livre.'}
        </Text>
      )}

      {inLibrary ? (
        <Pressable style={styles.removeButton} onPress={() => dispatch(removeBook(workKey))}>
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
          <Text style={styles.removeButtonText}>Retirer de ma bibliothèque</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.addButton} onPress={() => dispatch(addBook({ book: presetBook }))}>
          <Ionicons name="add" size={18} color={colors.background} />
          <Text style={styles.addButtonText}>Ajouter à ma bibliothèque</Text>
        </Pressable>
      )}

      {inLibrary && entry && (
        <View style={styles.libraryControls}>
          <Text style={styles.sectionLabel}>Statut de lecture</Text>
          <StatusSegmented
            value={currentStatusListId}
            onChange={(next) => dispatch(toggleBookList({ bookId: workKey, listId: next, add: true }))}
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

          <Text style={[styles.sectionLabel, styles.spacedLabel]}>Mes listes</Text>
          {customLists.length > 0 ? (
            <View style={styles.customListsRow}>
              {customLists.map((list) => {
                const inThisList = entry.listIds.includes(list.id);
                return (
                  <Pressable
                    key={list.id}
                    style={[styles.listChip, inThisList && styles.listChipActive]}
                    onPress={() => dispatch(toggleBookList({ bookId: workKey, listId: list.id, add: !inThisList }))}
                  >
                    <Text style={[styles.listChipText, inThisList && styles.listChipTextActive]}>{list.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={styles.description}>
              Crée des listes perso depuis l'onglet Ma bibliothèque pour organiser tes livres.
            </Text>
          )}
        </View>
      )}

      {!loading && (
        <>
          <Text style={styles.sectionLabel}>Éditeurs</Text>
          <Text style={styles.description}>
            {publishers.length > 0 ? publishers.join(', ') : 'Aucun éditeur référencé pour ce livre.'}
          </Text>

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
  // Largeur fixe correspondant à la couverture elle-même (simple ou carrousel),
  // pour que la bulle cœur se positionne sur son coin plutôt que sur toute la
  // largeur centrée de `coverRow`.
  coverFrame: {
    width: 180,
  },
  cover: {
    width: 180,
    aspectRatio: 2 / 3,
    borderRadius: radius.lg,
  },
  likeBubble: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accentPink,
  },
  likeBubbleActive: {
    backgroundColor: colors.accentPink,
    borderColor: colors.accentPink,
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
  summarySpacer: {
    marginBottom: spacing.lg,
  },
  loader: {
    marginTop: spacing.lg,
  },
  customListsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  listChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  listChipActive: {
    backgroundColor: colors.accentOrange,
    borderColor: colors.accentOrange,
  },
  listChipText: {
    ...typography.body,
    fontSize: 12,
  },
  listChipTextActive: {
    color: colors.background,
  },
});
