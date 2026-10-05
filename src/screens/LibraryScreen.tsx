import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ListPlaylistRow from '../components/ListPlaylistRow';
import { bookRepository } from '../composition/repositories';
import { DEFAULT_LIST_IDS, type ReadingList } from '../domain/entities/ReadingList';
import { useLibrarySync } from '../hooks/useLibrarySync';
import type { LibraryStackParamList } from '../navigation/types';
import { createList, deleteList } from '../store/listsSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { colors, radius, spacing, typography } from '../theme/theme';

type Props = NativeStackScreenProps<LibraryStackParamList, 'LibraryHome'>;

// Ordre d'affichage fixe pour les 4 listes par défaut, comme avant le passage
// aux listes de lecture génériques ; les listes perso suivent, dans leur
// ordre de création (voir ReadingList.ts).
const DEFAULT_ORDER = [DEFAULT_LIST_IDS.toRead, DEFAULT_LIST_IDS.reading, DEFAULT_LIST_IDS.read, DEFAULT_LIST_IDS.liked];

/**
 * Écran d'accueil de l'onglet Bibliothèque — style "Ta bibliothèque"
 * Spotify : une colonne de lignes "playlist" (une par liste de lecture),
 * chacune avec sa vignette, son nom et son nombre de livres, qui ouvre le
 * contenu de la liste (`ListDetailScreen`) au tap. Remplace l'ancienne
 * disposition à onglets horizontaux + grille inline, dont l'espacement ne
 * se comportait pas bien à l'usage. Prépare aussi naturellement les listes
 * personnalisées : en ajouter une, c'est simplement ajouter une ligne de
 * plus ici, sans rien à adapter dans la mise en page.
 */
export default function LibraryScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const entries = useAppSelector((state) => state.library.entries);
  const lists = useAppSelector((state) => state.lists.lists);
  const [creating, setCreating] = useState(false);
  const [newListName, setNewListName] = useState('');

  // Le serveur fait foi (voir le plan Firebase, doc Claude du projet) :
  // push puis pull à chaque focus de cet écran, avec garde-fou anti-course.
  // `ListDetailScreen` fait de même (voir `useLibrarySync`) puisqu'on peut
  // tout aussi bien revenir directement là après un ajout/like.
  useLibrarySync();

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

  return (
    <View style={styles.container}>
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

      <FlatList
        data={orderedLists}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listRows}
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
