import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme/theme';

type Props = {
  username: string;
  photoUrl?: string;
  bio?: string;
  onPress: () => void;
};

const AVATAR_SIZE = 48;

/** Une ligne de résultat de la recherche d'utilisateurs : avatar, pseudo, début de bio. */
export default function UserSearchRow({ username, photoUrl, bio, onPress }: Props) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={onPress}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.avatar} contentFit="cover" transition={150} />
      ) : (
        <Ionicons name="person-circle" size={AVATAR_SIZE} color={colors.secondaryText} />
      )}

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {username}
        </Text>
        {bio ? (
          <Text style={styles.bio} numberOfLines={1}>
            {bio}
          </Text>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.pill,
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  name: {
    ...typography.title,
    fontSize: 16,
  },
  bio: {
    ...typography.body,
    marginTop: 2,
  },
});
