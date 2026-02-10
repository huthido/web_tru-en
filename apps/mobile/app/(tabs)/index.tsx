import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { storyService, Story } from '../../src/services';
import { useAuth } from '../../src/contexts';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

function StoryCard({ story }: { story: Story }) {
  return (
    <Link href={`/story/${story.slug}`} asChild>
      <TouchableOpacity style={styles.card}>
        <Image
          source={{
            uri: story.cover || 'https://via.placeholder.com/150x200?text=No+Cover',
          }}
          style={styles.cardImage}
          resizeMode="cover"
        />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {story.title}
          </Text>
          <Text style={styles.cardAuthor} numberOfLines={1}>
            {story.author?.displayName || 'Unknown'}
          </Text>
          <View style={styles.cardStats}>
            <Text style={styles.cardStat}>👁 {story.viewCount || 0}</Text>
            <Text style={styles.cardStat}>❤️ {story.likeCount || 0}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Link>
  );
}

function StorySection({
  title,
  stories,
  loading,
}: {
  title: string;
  stories: Story[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <ActivityIndicator color="#3b82f6" size="large" style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
      >
        {stories.map((story) => (
          <StoryCard key={story.id} story={story} />
        ))}
      </ScrollView>
    </View>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: newestStories = [],
    isLoading: newestLoading,
    refetch: refetchNewest,
  } = useQuery({
    queryKey: ['stories', 'newest'],
    queryFn: () => storyService.getNewest(10),
  });

  const {
    data: recommendedStories = [],
    isLoading: recommendedLoading,
    refetch: refetchRecommended,
  } = useQuery({
    queryKey: ['stories', 'recommended'],
    queryFn: () => storyService.getRecommended(10),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchNewest(), refetchRecommended()]);
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#3b82f6"
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {user ? `Xin chào, ${user.displayName}` : 'Xin chào!'}
          </Text>
          <Text style={styles.headerTitle}>Web Truyện</Text>
        </View>
        {user ? (
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
            <Image
              source={{
                uri: user.avatar || 'https://ui-avatars.com/api/?name=User',
              }}
              style={styles.avatar}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.loginButtonText}>Đăng nhập</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Story Sections */}
      <StorySection
        title="📖 Truyện mới cập nhật"
        stories={newestStories}
        loading={newestLoading}
      />

      <StorySection
        title="⭐ Đề xuất cho bạn"
        stories={recommendedStories}
        loading={recommendedLoading}
      />

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  greeting: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  loginButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f8fafc',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  horizontalList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  loader: {
    paddingVertical: 40,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: CARD_WIDTH * 1.4,
    backgroundColor: '#334155',
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 4,
    lineHeight: 20,
  },
  cardAuthor: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
  },
  cardStats: {
    flexDirection: 'row',
    gap: 12,
  },
  cardStat: {
    fontSize: 12,
    color: '#64748b',
  },
  bottomPadding: {
    height: 100,
  },
});
