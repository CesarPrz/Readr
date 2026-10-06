import React, { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ListPlaylistRow from '../components/ListPlaylistRow';
import ProfileHeader from '../components/ProfileHeader';
import { bookRepository } from '../composition/repositories';
import { DEFAULT_LIST_IDS, type ReadingList } from '../domain/entities/ReadingList';
import { buildReadingYear } from '../domain/usecases/buildReadingYear';
import { generateAnonymousPseudonym } from '../utils/anonymousPseudonym';
import { useLibrarySync } from '../hooks/useLibrarySync';
import type { LibraryStackParamList } from '../navigation/types';
import { linkGoogleAccount, signOutUser, updateBio, updateUsername } from '../store/authSlice';
import { createList, deleteList } from '../store/listsSlice';
import { loadFollowGraph } from '../store/socialSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { colors, radius, spacing, typography } from '../theme/theme';

type Props = NativeStackScreenProps<LibraryStackParamList, 'LibraryHome'>;

// Ordre d'affichage fixe pour les 4 listes par défaut, comme avant le passage
// aux listes de lecture génériques ; les listes perso suivent, dans leur
// ordre de création (voir ReadingList.ts).
const DEFAULT_ORDER = [DEFAULT_LIST_IDS.toRead, DEFAULT_LIST_IDS.reading, DEFAULT_LIST_IDS.read, DEFAULT_LIST_IDS.liked];

/**
 * Écran d'accueil de l'onglet Bibliothèque — "Profil fusionné" (07/10/2026,
 * plan Firebase) : en-tête de profil (`ProfileHeader` — avatar, pseudo
 * éditable, connexion Google, voir ce composant et son historique) suivi
 * d'une colonne de lignes "playlist" façon Spotify (une par liste de
 * lecture, voir `ListPlaylistRow`), chacune ouvrant le contenu de la liste
 * (`ListDetailScreen`) au tap. Avant cette fusion, le profil vivait dans son
 * propre onglet (`ProfilScreen`, désormais obsolète — voir CLAUDE.md) :
 * rassemblé ici pour que "mon profil" et "mes livres" soient une seule et
 * même chose du point de vue de l'utilisateur, et pour uniformiser la mise
 * en page avec ce que montrera plus tard le profil d'un AUTRE utilisateur
 * (Phase "Amis", pas encore construite — `ProfileHeader` est déjà prêt pour
 * un mode lecture seule, voir `editable`). Depuis "Profil façon Instagram"
 * (08/10/2026), `ProfileHeader` affiche aussi une bio éditable (`user.bio`)
 * et des compteurs Abonnés/Abonnements purement visuels — voir la doc de ce
 * composant.
 */
export default function LibraryScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const entries = useAppSelector((state) => state.library.entries);
  const lists = useAppSelector((state) => state.lists.lists);
  const { user, googleLinkStatus, googleLinkError } = useAppSelector((state) => state.auth);
  const { followingIds, followerIds } = useAppSelector((state) => state.social);
  const [creating, setCreating] = useState(false);
  const [newListName, setNewListName] = useState('');

  // Le serveur fait foi (voir le plan Firebase, doc Claude du projet) :
  // push puis pull à chaque focus de cet écran, avec garde-fou anti-course.
  // `ListDetailScreen` fait de même (voir `useLibrarySync`) puisqu'on peut
  // tout aussi bien revenir directement là après un ajout/like.
  useLibrarySync();

  // Compteurs Abonnés/Abonnements réels ("Fil d'amis") : relus à chaque focus, au cas où un abonné est arrivé depuis.
  useFocusEffect(
    useCallback(() => {
      dispatch(loadFollowGraph());
    }, [dispatch]),
  );

  // "Mon année de lecture" (06/10/2026) : nombre de livres terminés cette année, pour la carte d'accès au bilan.
  const currentYear = new Date().getFullYear();
  const readThisYear = useMemo(() => buildReadingYear(entries, currentYear).books.length, [entries, currentYear]);

  const orderedLists = useMemo(() => {
    const defaults = DEFAULT_ORDER.map((id) => lists.find((l) => l.id === id)).filter((l): l is ReadingList => !!l);
    const customs = [...lists.filter((l) => !l.isDefault)].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return [...defaults, ...customs];
  }, [lists]);

  const handleCreateList = () => {
    const name = newListName.trim();
    if (!name) {
      setCreating(false);
      return;
    }
    dispatch(createList(name));
    setNewListName('');
    setCreating(false);
  };

  const handleDeleteList = (listId: string, name: string) => {
    Alert.alert(
      'Supprimer cette liste ?',
      `"${name}" sera supprimée. Les livres qu'elle contient resteront dans ta bibliothèque.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => dispatch(deleteList(listId)) },
      ],
    );
  };

  // Repris tel quel de l'ancien `ProfilScreen` (voir CLAUDE.md pour
  // l'historique de "Bascule vers un compte existant").
  const handleGoogleSignIn = async () => {
    const result = await dispatch(linkGoogleAccount());
    if (linkGoogleAccount.rejected.match(result)) {
      Alert.alert('Connexion impossible', result.error.message ?? 'Réessaie plus tard.');
      return;
    }
    if (linkGoogleAccount.fulfilled.match(result) && result.payload.status === 'switched') {
      Alert.alert(
        'Compte retrouvé',
        'Ce compte Google était déjà utilisé par un autre profil Readr. Tu es maintenant connecté à ce compte, et sa bibliothèque a été restaurée sur cet appareil.',
      );
    }
  };

  const handleSignOut = () => {
    Alert.alert('Se déconnecter ?', 'Tu pourras te reconnecter avec le même compte Google à tout moment.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: () => dispatch(signOutUser()) },
    ]);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={orderedLists}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listRows}
        ListHeaderComponent={
          <>
            {/*
              `user` peut très brièvement valoir `null` juste après le
              démarrage (avant que `ensureSignedIn` ne résolve, voir
              App.tsx) — pas de repli affiché pendant cette fenêtre, comme
              l'ancien `ProfilScreen` le faisait déjà pour son pseudonyme.
            */}
            {user && (
              <ProfileHeader
                username={user.username ?? generateAnonymousPseudonym(user.uid)}
                photoUrl={user.photoUrl}
                bio={user.bio}
                followersCount={followerIds.length}
                followingCount={followingIds.length}
                isAnonymous={user.isAnonymous}
                editable
                onEditUsername={(newUsername) => dispatch(updateUsername(newUsername))}
                onEditBio={(newBio) => dispatch(updateBio(newBio))}
                onGoogleSignIn={handleGoogleSignIn}
                onSignOut={handleSignOut}
                googleLinkStatus={googleLinkStatus}
                googleLinkError={googleLinkError}
              />
            )}

            {/* Séparateur pleine largeur (annule le padding horizontal du conteneur) : une bande d'une nuance légèrement différente du fond, à la place de l'ancienne carte autour du profil. */}
            <View style={styles.profileSeparator} />

            <Pressable
              style={({ pressed }) => [styles.yearCard, pressed && styles.yearCardPressed]}
              onPress={() => navigation.navigate('ReadingYear')}
            >
              <View style={styles.yearIcon}>
                <Ionicons name="calendar" size={22} color={colors.background} />
              </View>
              <View style={styles.yearInfo}>
                <Text style={styles.yearTitle}>Mon année de lecture {currentYear}</Text>
                <Text style={styles.yearSubtitle}>
                  {readThisYear === 0 ? 'Aucun livre terminé pour l\'instant' : `${readThisYear} ${readThisYear > 1 ? 'livres lus' : 'livre lu'} cette année`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
            </Pressable>

            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>Mes listes</Text>
              <Pressable style={styles.addButton} onPress={() => setCreating(true)} hitSlop={8}>
                <Ionicons name="add" size={20} color={colors.primaryText} />
              </Pressable>
            </View>

            {creating && (
              <View style={styles.createRow}>
                <TextInput
                  value={newListName}
                  onChangeText={setNewListName}
                  placeholder="Nom de la nouvelle liste"
                  placeholderTextColor={colors.placeholder}
                  style={styles.createInput}
                  autoFocus
                  onSubmitEditing={handleCreateList}
                />
                <Pressable style={styles.createConfirm} onPress={handleCreateList}>
                  <Ionicons name="checkmark" size={18} color={colors.background} />
                </Pressable>
                <Pressable
                  style={styles.createCancel}
                  onPress={() => {
                    setCreating(false);
                    setNewListName('');
                  }}
                >
                  <Ionicons name="close" size={18} color={colors.secondaryText} />
                </Pressable>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => {
          const inList = entries.filter((e) => e.listIds.includes(item.id));
          const mostRecent = [...inList].sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())[0];
          const coverUrl = mostRecent ? mostRecent.coverUrl ?? bookRepository.coverUrl(mostRecent.coverId, 'S') : undefined;

          return (
            <ListPlaylistRow
              name={item.name}
              count={inList.length}
              listId={item.id}
              isDefault={item.isDefault}
              coverUrl={coverUrl}
              onPress={() => navigation.navigate('ListDetail', { listId: item.id, listName: item.name, isDefault: item.isDefault })}
              onDelete={item.isDefault ? undefined : () => handleDeleteList(item.id, item.name)}
            />
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  profileSeparator: {
    height: 8,
    backgroundColor: colors.surface,
    marginHorizontal: -spacing.lg,
    marginBottom: spacing.md,
  },
  yearCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  yearCardPressed: {
    opacity: 0.7,
  },
  yearIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearInfo: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  yearTitle: {
    ...typography.title,
    fontSize: 16,
  },
  yearSubtitle: {
    ...typography.body,
    marginTop: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerTitle: {
    ...typography.title,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  createInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.primaryText,
    marginRight: spacing.xs,
  },
  createConfirm: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accentOrange,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  createCancel: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listRows: {
    paddingBottom: spacing.xl,
  },
});
