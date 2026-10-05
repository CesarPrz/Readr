import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { MAX_USERNAME_LENGTH } from '../domain/usecases/updateUsername';
import { colors, radius, spacing, typography } from '../theme/theme';

type Props = {
  username: string;
  /** Photo du compte Google une fois lié — jamais d'upload perso, voir `UserProfile.ts`. */
  photoUrl?: string;
  isAnonymous: boolean;
  /**
   * `true` pour SON PROPRE profil (pseudo éditable, bouton Google/déconnexion)
   * — `false` pour le profil d'un AUTRE utilisateur, lecture seule. Aucun
   * écran n'utilise encore `editable={false}` (Phase "Amis", pas encore
   * construite — voir le plan Firebase, section "Profil fusionné"), mais le
   * composant est prêt à l'accueillir sans modification : les callbacks
   * ci-dessous deviennent alors inutiles et peuvent être omis.
   */
  editable: boolean;
  onEditUsername?: (newUsername: string) => void;
  onGoogleSignIn?: () => void;
  onSignOut?: () => void;
  googleLinkStatus?: 'idle' | 'loading' | 'error';
  googleLinkError?: string | null;
};

/**
 * En-tête de profil — "Profil fusionné" (07/10/2026, plan Firebase) :
 * remplace l'ancien écran Profil dédié (voir CLAUDE.md pour l'historique),
 * désormais affiché en haut de l'onglet "Ma bibliothèque" plutôt que dans
 * son propre onglet. Avatar + pseudo + statut de connexion Google, suivis
 * (sur `LibraryScreen`) de la liste des listes de lecture — pas deux écrans
 * séparés à parcourir pour ce qui est, du point de vue de l'utilisateur, une
 * seule et même identité ("mon profil, avec mes livres").
 */
export default function ProfileHeader({
  username,
  photoUrl,
  isAnonymous,
  editable,
  onEditUsername,
  onGoogleSignIn,
  onSignOut,
  googleLinkStatus = 'idle',
  googleLinkError,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(username);

  const startEditing = () => {
    setDraft(username);
    setEditing(true);
  };

  const confirmEditing = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== username) onEditUsername?.(trimmed);
    setEditing(false);
  };

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.avatar} contentFit="cover" transition={150} />
        ) : (
          <Ionicons
            name={isAnonymous ? 'person-circle-outline' : 'person-circle'}
            size={56}
            color={colors.secondaryText}
          />
        )}

        <View style={styles.identity}>
          {editing ? (
            <View style={styles.editRow}>
              <TextInput
                value={draft}
                onChangeText={(text) => setDraft(text.slice(0, MAX_USERNAME_LENGTH))}
                style={styles.editInput}
                placeholderTextColor={colors.placeholder}
                autoFocus
                onSubmitEditing={confirmEditing}
              />
              <Pressable onPress={confirmEditing} hitSlop={8} style={styles.editConfirm}>
                <Ionicons name="checkmark" size={16} color={colors.background} />
              </Pressable>
              <Pressable onPress={() => setEditing(false)} hitSlop={8} style={styles.editCancel}>
                <Ionicons name="close" size={16} color={colors.secondaryText} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={styles.nameRow}
              onPress={editable ? startEditing : undefined}
              disabled={!editable}
              hitSlop={8}
            >
              <Text style={styles.name} numberOfLines={1}>
                {username}
              </Text>
              {editable && <Ionicons name="pencil" size={13} color={colors.secondaryText} />}
            </Pressable>
          )}
          <Text style={styles.caption}>{isAnonymous ? 'Profil local, pas encore connecté' : 'Connecté avec Google'}</Text>
        </View>
      </View>

      {editable &&
        (isAnonymous ? (
          <Pressable style={styles.googleButton} onPress={onGoogleSignIn} disabled={googleLinkStatus === 'loading'}>
            {googleLinkStatus === 'loading' ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <>
                <Ionicons name="logo-google" size={16} color={colors.background} />
                <Text style={styles.googleButtonText}>Se connecter avec Google</Text>
              </>
            )}
          </Pressable>
        ) : (
          <Pressable style={styles.secondaryButton} onPress={onSignOut}>
            <Text style={styles.secondaryButtonText}>Se déconnecter</Text>
          </Pressable>
        ))}

      {editable && googleLinkError ? <Text style={styles.errorText}>{googleLinkError}</Text> : null}
    </View>
  );
}

const AVATAR_SIZE = 56;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.pill,
  },
  identity: {
    flex: 1,
    marginLeft: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    ...typography.title,
    fontSize: 17,
    flexShrink: 1,
  },
  caption: {
    ...typography.label,
    marginTop: 2,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    color: colors.primaryText,
    marginRight: spacing.xs,
  },
  editConfirm: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentOrange,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  editCancel: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryText,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
  },
  googleButtonText: {
    color: colors.background,
    fontWeight: '600',
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  secondaryButtonText: {
    ...typography.body,
    color: colors.danger,
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
  },
});
