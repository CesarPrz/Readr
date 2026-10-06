import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { bookRepository } from '../composition/repositories';
import type { Book } from '../domain/entities/Book';
import type { RecommendationGroup } from '../domain/entities/RecommendationGroup';
import { colors, spacing, typography } from '../theme/theme';
import BookCard from './BookCard';

type Props = {
  group: RecommendationGroup;
  onOpenBook: (book: Book) => void;
};

const ROW_CARD_WIDTH = 120;

/**
 * Une rangée de recommandations : la justification en titre, puis les livres
 * en défilement horizontal. Extrait de `DiscoverScreen` quand l'écran
 * d'accueil ("Accueil façon Goodreads", 08/10/2026) a eu besoin des mêmes
 * rangées — un seul rendu pour les deux écrans.
 */
export default function RecommendationRow({ group, onOpenBook }: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{group.title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowContent}>
        {group.books.map((book) => (
          <BookCard
            key={book.id}
            title={book.title}
            authors={book.authors}
            genres={book.genres}
            coverUrl={book.coverUrl ?? bookRepository.coverUrl(book.coverId, 'M')}
            onPress={() => onOpenBook(book)}
            width={ROW_CARD_WIDTH}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.title,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  rowContent: {
    gap: spacing.md,
    paddingRight: spacing.lg,
  },
});
