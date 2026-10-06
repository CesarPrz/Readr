import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { MAX_BIO_LENGTH } from '../domain/usecases/updateBio';
import { MAX_USERNAME_LENGTH } from '../domain/usecases/updateUsername';
import { colors, radius, spacing, typography } from '../theme/theme';

type Props = {
  username: string;
  /** Photo du compte Google une fois lié — jamais d'upload perso, voir `UserProfile.ts`. */
  photoUrl?: string;
  /** Description libre façon Instagram (08/10/2026) — voir `UserProfile.bio`. `undefined`/vide : pas de repli textuel, juste une invite à en écrire une quand `editable`. */
  bio?: string;
  /**
   * Compteurs façon Instagram. PUREMENT VISUELS à l'origine ("Profil façon
   * Instagram", 08/10/2026 — aucun système de followers n'existait alors, 0
   * en dur) ; RÉELS depuis "Fil d'amis" (même jour, voir le plan Firebase) :
   * l'écran appelant passe le nombre d'abonnés et d'abonnements issus de
   * `FollowRepository` (voir `socialSlice`/`usersSlice`). Valeur par défaut
   * 0 conservée pour un appelant qui n'a pas encore l'information. Toujours
   * non tappables (pas de `Pressable`) : aucun écran "liste des abonnés"
   * n'existe encore.
   */
  followersCount?: number;
  followingCount?: number;
  isAnonymous: boolean;
  /**
   * `true` pour SON PROPRE profil (pseudo/bio éditables, bouton
   * Google/déconnexion) — `false` pour le profil d'un AUTRE utilisateur,
   * lecture seule. Aucun écran n'utilise encore `editable={false}` (Phase
   * "Amis", pas encore construite — voir le plan Firebase, section "Profil
   * fusionné"), mais le composant est prêt à l'accueillir sans
   * modification : les callbacks ci-dessous deviennent alors inutiles et
   * peuvent être omis.
   */
  editable: boolean;
  onEditUsername?: (newUsername: string) => void;
  onEditBio?: (newBio: string) => void;
  onGoogleSignIn?: () => void;
  onSignOut?: () => void;
  /**
   * Profil d'un AUTRE utilisateur (`editable={false}`) : bouton Suivre/Abonné
   * ("Fil d'amis", 08/10/2026). `onToggleFollow` absent = pas de bouton.
   */
  isFollowing?: boolean;
  followPending?: boolean;
  onToggleFollow?: () => void;
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
 *
 * **Mise en page façon Instagram (08/10/2026, "Profil façon Instagram",
 * demande explicite du porteur du projet)** : avatar plus grand accompagné
 * d'une rangée de compteurs Abonnés/Abonnements (voir leur doc ci-dessus —
 * purement visuels pour l'instant), pseudo, puis bio — reprend l'ordre de
 * lecture d'un profil Instagram (photo+stats, nom, description), sans en
 * reprendre l'onglet grille de publications (ce concept n'existe pas ici,
 * les listes de lecture jouent déjà ce rôle juste en dessous sur
 * `LibraryScreen`).
 */
export default function ProfileHeader({
  username,
  photoUrl,
  bio,
  followersCount = 0,
  followingCount = 0,
  isAnonymous,
  editable,
  onEditUsername,
  onEditBio,
  onGoogleSignIn,
  onSignOut,
  isFollowing = false,
  followPending = false,
  onToggleFollow,
  googleLinkStatus = 'idle',
  googleLinkError,
}: Props) {
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState(username);
  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState(bio ?? '');

  const startEditingUsername = () => {
    setUsernameDraft(username);
    setEditingUsername(true);
  };

  const confirmUsernameEditing = () => {
    const trimmed = usernameDraft.trim();
    if (trimmed && trimmed !== username) onEditUsername?.(trimmed);
    setEditingUsername(false);
  };

  const startEditingBio = () => {
    setBioDraft(bio ?? '');
    setEditingBio(true);
  };

  const confirmBioEditing = () => {
    const trimmed = bioDraft.trim();
    if (trimmed !== (bio ?? '')) onEditBio?.(trimmed);
    setEditingBio(false);
  };

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.avatar} contentFit="cover" transition={150} />
        ) : (
          <Ionicons
            name={isAnonymous ? 'person-circle-outline' : 'person-circle'}
            size={AVATAR_SIZE}
            color={colors.secondaryText}
          />
        )}

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{followersCount}</Text>
            <Text style={styles.statLabel}>Abonnés</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{followingCount}</Text>
            <Text style={styles.statLabel}>Abonnements</Text>
          </View>
        </View>
      </View>

      {editingUsername ? (
        <View style={styles.editRow}>
          <TextInput
            value={usernameDraft}
            onChangeText={(text) => setUsernameDraft(text.slice(0, MAX_USERNAME_LENGTH))}
            style={styles.editInput}
            placeholderTextColor={colors.placeholder}
            autoFocus
            onSubmitEditing={confirmUsernameEditing}
          />
          <Pressable onPress={confirmUsernameEditing} hitSlop={8} style={styles.editConfirm}>
            <Ionicons name="checkmark" size={16} color={colors.background} />
          </Pressable>
          <Pressable onPress={() => setEditingUsername(false)} hitSlop={8} style={styles.editCancel}>
            <Ionicons name="close" size={16} color={colors.secondaryText} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={styles.nameRow}
          onPress={editable ? startEditingUsername : undefined}
          disabled={!editable}
          hitSlop={8}
        >
          <Text style={styles.name} numberOfLines={1}>
            {username}
          </Text>
          {editable && <Ionicons name="pencil" size={13} color={colors.secondaryText} />}
        </Pressable>
      )}
      {/* Statut de connexion = info sur SA PROPRE session, jamais affichée pour le profil d'un autre utilisateur (`editable={false}`). */}
      {editable && (
        <Text style={styles.caption}>{isAnonymous ? 'Profil local, pas encore connecté' : 'Connecté avec Google'}</Text>
      )}

      {(editable || bio) &&
        (editingBio ? (
          <View style={styles.bioEditRow}>
            <TextInput
              value={bioDraft}
              onChangeText={(text) => setBioDraft(text.slice(0, MAX_BIO_LENGTH))}
              style={styles.bioInput}
              placeholder="Ajoute une description..."
              placeholderTextColor={colors.placeholder}
              multiline
              autoFocus
            />
            <View style={styles.bioEditButtons}>
              <Pressable onPress={confirmBioEditing} hitSlop={8} style={styles.editConfirm}>
                <Ionicons name="checkmark" size={16} color={colors.background} />
              </Pressable>
              <Pressable onPress={() => setEditingBio(false)} hitSlop={8} style={styles.editCancel}>
                <Ionicons name="close" size={16} color={colors.secondaryText} />
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={editable ? startEditingBio : undefined} disabled={!editable}>
            <Text style={bio ? styles.bioText : styles.bioPlaceholder}>
              {bio || (editable ? 'Ajouter une description' : '')}
            </Text>
          </Pressable>
        ))}

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

      {!editable && onToggleFollow && (
        <Pressable
          style={[styles.followButton, isFollowing && styles.followButtonActive]}
          onPress={onToggleFollow}
          disabled={followPending}
        >
          <Text style={[styles.followButtonText, isFollowing && styles.followButtonTextActive]}>
            {isFollowing ? 'Abonné' : 'Suivre'}
          </Text>
        </Pressable>
      )}

      {editable && googleLinkError ? <Text style={styles.errorText}>{googleLinkError}</Text> : null}
    </View>
  );
}

const AVATAR_SIZE = 76;

const styles = StyleSheet.create({
  // Plus de carte (fond/bordure/arrondi) : l'en-tête est posé à plat sur le
  // fond de l'écran, la séparation avec la suite est assurée par le
  // séparateur pleine largeur que `LibraryScreen` affiche juste en dessous.
  card: {
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.pill,
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginLeft: spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    ...typography.title,
    fontSize: 17,
  },
  statLabel: {
    ...typography.label,
    marginTop: 2,
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
  bioText: {
    ...typography.body,
    marginTop: spacing.xs,
  },
  bioPlaceholder: {
    ...typography.body,
    color: colors.secondaryText,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  bioEditRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: spacing.xs,
  },
  bioInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.primaryText,
    marginRight: spacing.xs,
    minHeight: 44,
    maxHeight: 110,
  },
  bioEditButtons: {
    flexDirection: 'row',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryText,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
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
    marginTop: spacing.xs,
  },
  secondaryButtonText: {
    ...typography.body,
    color: colors.danger,
  },
  followButton: {
    alignItems: 'center',
    backgroundColor: colors.accentOrange,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  followButtonActive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  followButtonText: {
    color: colors.background,
    fontWeight: '600',
  },
  followButtonTextActive: {
    color: colors.primaryText,
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
    marginTop: spacing.xs,
  },
});
