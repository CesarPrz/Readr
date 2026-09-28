import React, { useMemo } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { linkGoogleAccount, signOutUser } from '../store/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { colors, radius, spacing, typography } from '../theme/theme';
import { generateAnonymousPseudonym } from '../utils/anonymousPseudonym';

/**
 * Écran Profil (Phase 3 du plan Firebase, doc Claude du projet,
 * "firebase-social-plan") : seul point d'entrée de l'app vers une connexion
 * Google. Volontairement son propre onglet plutôt qu'une bannière ou un
 * gate au démarrage — conforme au principe UX de connexion non intrusive
 * (aucune fonctionnalité de base ne dépend d'être connecté ; se connecter
 * est une action que l'utilisateur va chercher, pas qu'on lui impose).
 */
export default function ProfilScreen() {
  const dispatch = useAppDispatch();
  const { user, googleLinkStatus, googleLinkError } = useAppSelector((state) => state.auth);

  const isLinked = Boolean(user && !user.isAnonymous);
  // Pseudonyme d'affichage tant que le compte reste anonyme (voir
  // `anonymousPseudonym.ts`) — purement cosmétique, jamais écrit dans
  // Firebase ni dans `UserProfile.displayName`, qui reste réservé au vrai
  // nom Google une fois lié. `null` le temps très bref où `ensureSignedIn`
  // n'a pas encore résolu au tout premier rendu.
  const pseudonym = useMemo(() => (user ? generateAnonymousPseudonym(user.uid) : null), [user]);

  const handleGoogleSignIn = async () => {
    const result = await dispatch(linkGoogleAccount());
    if (linkGoogleAccount.rejected.match(result)) {
      Alert.alert('Connexion impossible', result.error.message ?? 'Réessaie plus tard.');
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
      <View style={styles.card}>
        {user?.photoUrl ? (
          <Image source={{ uri: user.photoUrl }} style={styles.avatar} />
        ) : (
          <Ionicons
            name={isLinked ? 'person-circle' : 'person-circle-outline'}
            size={72}
            color={colors.secondaryText}
          />
        )}

        {isLinked ? (
          <>
            <Text style={styles.name}>{user?.displayName ?? 'Compte Google lié'}</Text>
            <Text style={styles.description}>
              Ta bibliothèque est sauvegardée sur ce compte et accessible depuis un autre appareil.
            </Text>
            <Pressable style={styles.secondaryButton} onPress={handleSignOut}>
              <Text style={styles.secondaryButtonText}>Se déconnecter</Text>
            </Pressable>
          </>
        ) : (
          <>
            {pseudonym ? <Text style={styles.name}>{pseudonym}</Text> : null}
            <Text style={styles.caption}>Profil local, pas encore connecté</Text>
            <Text style={styles.description}>
              Connecte-toi avec Google pour sauvegarder ta bibliothèque et la retrouver sur un autre appareil, ou
              après une réinstallation.
            </Text>
            <Pressable
              style={styles.googleButton}
              onPress={handleGoogleSignIn}
              disabled={googleLinkStatus === 'loading'}
            >
              {googleLinkStatus === 'loading' ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <>
                  <Ionicons name="logo-google" size={18} color={colors.background} />
                  <Text style={styles.googleButtonText}>Se connecter avec Google</Text>
                </>
              )}
            </Pressable>
            {googleLinkError ? <Text style={styles.errorText}>{googleLinkError}</Text> : null}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
  },
  name: {
    ...typography.title,
  },
  caption: {
    ...typography.label,
  },
  description: {
    ...typography.body,
    textAlign: 'center',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryText,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    minWidth: 220,
  },
  googleButtonText: {
    color: colors.background,
    fontWeight: '600',
  },
  secondaryButton: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  secondaryButtonText: {
    ...typography.body,
    color: colors.danger,
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
    textAlign: 'center',
  },
});
