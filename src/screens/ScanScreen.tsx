import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Image } from 'expo-image';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { bookRepository } from '../composition/repositories';
import type { ReadingStatus } from '../domain/entities/LibraryEntry';
import type { ScanStackParamList } from '../navigation/types';
import { addBook } from '../store/librarySlice';
import { lookupIsbn, resetScan } from '../store/scanSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { colors, radius, spacing, typography } from '../theme/theme';

type Props = NativeStackScreenProps<ScanStackParamList, 'ScanHome'>;

export default function ScanScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const [permission, requestPermission] = useCameraPermissions();
  const { status, result } = useAppSelector((state) => state.scan);
  const alreadyInLibrary = useAppSelector((state) =>
    result ? state.library.entries.some((e) => e.id === result.id) : false,
  );
  const [justAdded, setJustAdded] = useState(false);

  const handleBarcodeScanned = useCallback(
    ({ data }: BarcodeScanningResult) => {
      const isbn = data.replace(/\D/g, '');
      if (isbn.length !== 13) return; // book barcodes are EAN-13 (Bookland), numerically the ISBN-13
      dispatch(lookupIsbn(isbn));
    },
    [dispatch],
  );

  const handleAdd = useCallback(
    (readingStatus: ReadingStatus) => {
      if (!result) return;
      dispatch(addBook({ book: result, status: readingStatus }));
      setJustAdded(true);
      setTimeout(() => {
        setJustAdded(false);
        dispatch(resetScan());
      }, 1200);
    },
    [dispatch, result],
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
        <Text style={styles.hero}>Scanner</Text>
        <Text style={styles.message}>
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
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13'] }}
        onBarcodeScanned={status === 'idle' ? handleBarcodeScanned : undefined}
      />

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
            <Text style={[styles.message, styles.centeredMessage]}>Ajouté à ta bibliothèque ✓</Text>
          ) : alreadyInLibrary ? (
            <Text style={[styles.message, styles.centeredMessage]}>Déjà dans ta bibliothèque.</Text>
          ) : (
            <View style={styles.actionsRow}>
              <Pressable style={styles.actionButton} onPress={() => handleAdd('to_read')}>
                <Text style={styles.actionButtonText}>À lire</Text>
              </Pressable>
              <Pressable style={styles.actionButton} onPress={() => handleAdd('read')}>
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
  hero: {
    ...typography.hero,
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
  addButtonText: {
    color: colors.background,
    fontWeight: '700',
  },
  frameOverlay: {
    ...StyleSheet.absoluteFillObject,
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
