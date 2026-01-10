import { MetadataRoute } from 'next';
import { apiClient } from '@/lib/api/client';

async function getAllStories() {
  try {
    // Skip API call if no API URL is configured, if it's localhost, or during Vercel build
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const isVercelBuild = process.env.VERCEL === '1';
    const isLocalhost = apiUrl?.includes('localhost') || apiUrl?.includes('127.0.0.1');

    if (!apiUrl || isLocalhost || isVercelBuild) {
      // During build, API might not be available, so skip fetching stories
      // Sitemap will still work with static pages
      if (isVercelBuild) {
        console.log('Skipping sitemap stories fetch during Vercel build');
      } else {
        console.warn('Skipping sitemap stories fetch: API URL not configured or localhost');
      }
      return [];
    }

    let allStories: any[] = [];
    let page = 1;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const response = await apiClient.get(`/stories?page=${page}&limit=${limit}&status=PUBLISHED&isPublished=true`);

      const data = response.data?.data || response.data;
      const stories = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);

      if (stories.length === 0) {
        hasMore = false;
      } else {
        allStories = [...allStories, ...stories];
        page++;

        // Check if there are more pages
        const total = data?.meta?.total || 0;
        if (allStories.length >= total) {
          hasMore = false;
        }
      }

      // Safety limit
      if (page > 100) break;
    }

    return allStories;
  } catch (error: any) {
    // Silently fail during build - return empty array so sitemap still works with static pages
    if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
      console.warn('API unavailable during build, skipping stories in sitemap');
    } else {
      console.error('Error fetching stories for sitemap:', error);
    }
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const stories = await getAllStories();

  const storyUrls: MetadataRoute.Sitemap = stories.map((story) => ({
    url: `${baseUrl}/truyen/${story.slug}`,
    lastModified: story.updatedAt ? new Date(story.updatedAt) : new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/library`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/favorites`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/follows`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/history`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
  ];

  return [...staticPages, ...storyUrls];
}

