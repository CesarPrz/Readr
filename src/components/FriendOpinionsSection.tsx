import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { FriendOpinion, FriendOpinionKind } from '../domain/entities/FriendOpinion';
import { summarizeFriendRatings } from '../domain/usecases/getFriendOpinions';
import { colors, radius, spacing, typography } from '../theme/theme';
import { relativeTime } from '../utils/relativeTime';
import StarRatingDisplay from './StarRatingDisplay';

type Props = {
  opinions: FriendOpinion[];
  /** `loading` sans aucun avis déjà connu : affiche seulement un indicateur. */
  loading: boolean;
};

const KIND_LABEL: Record<FriendOpinionKind, string> = {
  read: 'a lu',
  reading: 'le lit en ce moment',
  rated: 'a noté',
  toRead: 'veut le lire',
};

const AVATAR_SIZE = 28;

/**
 * "Ce qu'en pensent tes abonnements" sur la fiche livre (08/10/2026, plan
 * Firebase) : les lecteurs suivis qui ont ce livre — ce qu'ils en ont fait,
 * leurs étoiles et leur note écrite — avec la moyenne de leurs notes en
 * en-tête. N'affiche RIEN quand il n'y a aucun avis et rien en cours de
 * chargement : pour qui ne suit personne (ou dont aucun abonné n'a ce
 * livre), la fiche reste exactement celle d'avant.
 */
export default function FriendOpinionsSection({ opinions, loading }: Props) {
  if (opinions.length === 0 && !loading) return null;

  const summary = summarizeFriendRatings(opinions);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Tes abonnements</Text>
        {summary && (
          <View style={styles.summary}>
            <Ionicons name="star" size={13} color={colors.accentOrange} />
            <Text style={styles.summaryText}>
              {summary.average.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} · {summary.count}{' '}
              {summary.count > 1 ? 'notes' : 'note'}
            </Text>
          </View>
        )}
      </View>

      {opinions.length === 0 ? (
        <ActivityIndicator style={styles.loader} color={colors.accentOrange} />
      ) : (
        opinions.map((opinion) => (
          <View key={opinion.user.uid} style={styles.row}>
            {opinion.user.photoUrl ? (
              <Image source={{ uri: opinion.user.photoUrl }} style={styles.avatar} contentFit="cover" />
            ) : (
              <Ionicons name="person-circle" size={AVATAR_SIZE} color={colors.secondaryText} />
            )}
            <View style={styles.body}>
              <Text style={styles.line}>
                <Text style={styles.username}>{opinion.user.username}</Text> {KIND_LABEL[opinion.kind]}
              </Text>
              {opinion.entry.rating !== undefined && (
                <View style={styles.stars}>
                  <StarRatingDisplay rating={opinion.entry.rating} size={13} />
                </View>
              )}
              {opinion.entry.note ? (
                <Text style={styles.note} numberOfLines={4}>
                  {opinion.entry.note}
                </Text>
              ) : null}
              <Text style={styles.time}>{relativeTime(opinion.at)}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.label,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryText: {
    ...typography.body,
    fontSize: 13,
    color: colors.primaryText,
  },
  loader: {
    marginVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    paddingTop: spacing.sm,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.pill,
  },
  body: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  line: {
    ...typography.body,
    fontSize: 14,
  },
  username: {
    ...typography.title,
    fontSize: 14,
  },
  stars: {
    marginTop: spacing.xs,
  },
  note: {
    ...typography.body,
    fontStyle: 'italic',
    color: colors.primaryText,
    marginTop: spacing.xs,
  },
  time: {
    ...typography.label,
    textTransform: 'none',
    fontWeight: '400',
    marginTop: spacing.xs,
  },
});
