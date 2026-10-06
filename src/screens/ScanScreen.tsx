import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Image } from 'expo-image';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { bookRepository } from '../composition/repositories';
import { DEFAULT_LIST_IDS } from '../domain/entities/ReadingList';
import type { ScannableStackParamList } from '../navigation/types';
import { addBook, toggleBookList } from '../store/librarySlice';
import { lookupIsbn, resetScan } from '../store/scanSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { colors, radius, spacing, typography } from '../theme/theme';

type Props = NativeStackScreenProps<ScannableStackParamList, 'Scan'>;

/**
 * Scan d'un code-barres EAN-13 → recherche du livre → ajout à la
 * bibliothèque. Écran de pile (plus un onglet depuis "Scanner dans Recherche
 * et listes", 08/10/2026), ouvert de deux façons :
 * - depuis la Recherche (icône discrète) : sans paramètre, le livre trouvé
 *   s'ajoute à "À lire" ou "Lu" au choix ;
 * - depuis une liste (bouton "Scanner un livre") : `listId`/`listName` en
 *   paramètres, le livre s'ajoute directement à CETTE liste — un seul bouton,
 *   et on peut enchaîner les scans pour remplir une liste d'un coup.
 */

export default function ScanScreen({ navigation, route }: Props) {
  const dispatch = useAppDispatch();
  const { listId, listName } = route.params ?? {};
  // La caméra n'est montée que tant que l'écran est au premier plan : empilé sous la fiche livre, il ne doit pas la garder allumée.
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const { status, result } = useAppSelector((state) => state.scan);
  const existingEntry = useAppSelector((state) =>
    result ? state.library.entries.find((e) => e.id === result.id) : undefined,
  );
  // Sans liste cible : "déjà là" dès que le livre est dans la bibliothèque. Avec une liste cible : seulement s'il est déjà dans CETTE liste.
  const alreadyInLibrary = listId ? !!existingEntry?.listIds.includes(listId) : !!existingEntry;
  const [justAdded, setJustAdded] = useState(false);

  // Un résultat de scan laissé par une visite précédente ne doit jamais réapparaître à l'ouverture, ni survivre à la fermeture.
  useEffect(() => {
    dispatch(resetScan());
    return () => {
      dispatch(resetScan());
    };
  }, [dispatch]);

  const handleBarcodeScanned = useCallback(
    ({ data }: BarcodeScanningResult) => {
      const isbn = data.replace(/\D/g, '');
      if (isbn.length !== 13) return; // book barcodes are EAN-13 (Bookland), numerically the ISBN-13
      dispatch(lookupIsbn(isbn));
    },
    [dispatch],
  );

  const handleAdd = useCallback(
    (listId: string) => {
      if (!result) return;
      // `addBook` ne fait rien si le livre est déjà en bibliothèque : dans ce cas (liste cible), on l'ajoute à la liste par un toggle.
      if (existingEntry) dispatch(toggleBookList({ bookId: result.id, listId, add: true }));
      else dispatch(addBook({ book: result, listId }));
      setJustAdded(true);
      setTimeout(() => {
        setJustAdded(false);
        dispatch(resetScan());
      }, 1200);
    },
    [dispatch, result, existingEntry],
  );

  const openDetail = useCallback(() => {
    if (!result) return;
    navigation.navigate('BookDetail', {
      workKey: result.id,
      presetWorkKeys: result.workKeys,
      presetTitle: result.title,
      presetAuthors: result.authors,
      presetCoverId: result.coverId,
      presetCoverUrl: result.coverUrl,
      presetDescription: result.description,
      presetLanguages: result.languages,
    });
    dispatch(resetScan());
  }, [navigation, result, dispatch]);

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator style={styles.loader} color={colors.accentOrange} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={[styles.message, styles.permissionMessage]}>
          Autorise l'accès à l'appareil photo pour scanner le code-barres d'un livre et l'ajouter directement à ta
          bibliothèque.
        </Text>
        <Pressable style={styles.addButton} onPress={requestPermission}>
          <Text style={styles.addButtonText}>Autoriser la caméra</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isFocused && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13'] }}
          onBarcodeScanned={status === 'idle' ? handleBarcodeScanned : undefined}
        />
      )}

      <View style={styles.frameOverlay} pointerEvents="none">
        <View style={styles.frame} />
        {status === 'idle' && (
          <Text style={styles.frameHint}>Vise le code-barres au dos du livre</Text>
        )}
      </View>

      {status === 'looking_up' && (
        <View style={styles.resultCard}>
          <ActivityIndicator color={colors.accentOrange} />
          <Text style={[styles.message, styles.centeredMessage]}>Recherche du livre...</Text>
        </View>
      )}

      {status === 'not_found' && (
        <View style={styles.resultCard}>
          <Text style={[styles.message, styles.centeredMessage]}>Aucun livre trouvé pour ce code-barres.</Text>
          <Pressable style={styles.secondaryButton} onPress={() => dispatch(resetScan())}>
            <Text style={styles.secondaryButtonText}>Réessayer</Text>
          </Pressable>
        </View>
      )}

      {status === 'error' && (
        <View style={styles.resultCard}>
          <Text style={[styles.message, styles.centeredMessage]}>
            La recherche a échoué. Vérifie ta connexion et réessaie.
          </Text>
          <Pressable style={styles.secondaryButton} onPress={() => dispatch(resetScan())}>
            <Text style={styles.secondaryButtonText}>Réessayer</Text>
          </Pressable>
        </View>
      )}

      {status === 'found' && result && (
        <View style={styles.resultCard}>
          <View style={styles.resultRow}>
            <View style={styles.resultCoverWrap}>
              {result.coverUrl ?? bookRepository.coverUrl(result.coverId, 'M') ? (
                <Image
                  source={{ uri: result.coverUrl ?? bookRepository.coverUrl(result.coverId, 'M') }}
                  style={styles.resultCover}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.resultCover, styles.resultCoverPlaceholder]} />
              )}
            </View>
            <View style={styles.resultInfo}>
              <Text style={styles.resultTitle} numberOfLines={2}>
                {result.title}
              </Text>
              <Text style={styles.resultAuthor} numberOfLines={1}>
                {result.authors.join(', ') || 'Auteur inconnu'}
              </Text>
            </View>
          </View>

          {justAdded ? (
            <Text style={[styles.message, styles.centeredMessage]}>
              {listId ? `Ajouté à « ${listName ?? 'cette liste'} » ✓` : 'Ajouté à ta bibliothèque ✓'}
            </Text>
          ) : alreadyInLibrary ? (
            <Text style={[styles.message, styles.centeredMessage]}>
              {listId ? 'Déjà dans cette liste.' : 'Déjà dans ta bibliothèque.'}
            </Text>
          ) : listId ? (
            <Pressable style={[styles.addButton, styles.cardAddButton]} onPress={() => handleAdd(listId)}>
              <Text style={styles.addButtonText}>Ajouter à « {listName ?? 'cette liste'} »</Text>
            </Pressable>
          ) : (
            <View style={styles.actionsRow}>
              <Pressable style={styles.actionButton} onPress={() => handleAdd(DEFAULT_LIST_IDS.toRead)}>
                <Text style={styles.actionButtonText}>À lire</Text>
              </Pressable>
              <Pressable style={styles.actionButton} onPress={() => handleAdd(DEFAULT_LIST_IDS.read)}>
                <Text style={styles.actionButtonText}>Lu</Text>
              </Pressable>
            </View>
          )}

          <Pressable onPress={openDetail}>
            <Text style={styles.linkText}>Voir la fiche</Text>
          </Pressable>
          <Pressable onPress={() => dispatch(resetScan())}>
            <Text style={styles.linkText}>Scanner un autre livre</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  permissionMessage: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  loader: {
    marginTop: spacing.xl,
  },
  message: {
    ...typography.body,
  },
  centeredMessage: {
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  addButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentOrange,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm + 2,
    marginHorizontal: spacing.lg,
  },
  cardAddButton: {
    marginHorizontal: 0,
  },
  addButtonText: {
    color: colors.background,
    fontWeight: '700',
  },
  frameOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: '75%',
    aspectRatio: 16 / 9,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.accentOrange,
  },
  frameHint: {
    ...typography.body,
    color: colors.primaryText,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  resultCard: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  resultRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  resultCoverWrap: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  resultCover: {
    width: 56,
    aspectRatio: 2 / 3,
  },
  resultCoverPlaceholder: {
    backgroundColor: colors.surfaceAlt,
  },
  resultInfo: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  resultTitle: {
    ...typography.title,
    fontSize: 16,
  },
  resultAuthor: {
    ...typography.body,
    marginTop: spacing.xs,
  },
  actionsRow: {
    flexDirection: 'row',
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentOrange,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm + 2,
    marginHorizontal: spacing.xs,
  },
  actionButtonText: {
    color: colors.background,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm + 2,
    marginTop: spacing.md,
  },
  secondaryButtonText: {
    color: colors.primaryText,
    fontWeight: '700',
  },
  linkText: {
    ...typography.body,
    color: colors.accentBlue,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
