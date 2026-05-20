/**
 * Server-side settings fetcher for use in generateMetadata
 * This is used in server components and cannot use the client-side apiClient
 */

// Server-side metadata fetch.
// Priority: INTERNAL_API_URL (Docker network, http://backend:3009) → avoids
// public TLS / self-signed cert pitfalls when Next.js SSR talks to backend.
// Falls back to NEXT_PUBLIC_API_URL (public HTTPS) for non-container deploys.
// Dev: http://localhost:3001 if neither set.
const API_URL =
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV !== 'production' ? 'http://localhost:3001' : '');
const BASE_URL = API_URL.endsWith('/api') ? API_URL : `${API_URL}/api`;

export interface ServerSettings {
    id: string;
    siteName: string;
    siteDescription?: string;
    siteLogo?: string;
    siteFavicon?: string;
    siteEmail?: string;
    sitePhone?: string;
    siteAddress?: string;
    siteFacebook?: string;
    siteTwitter?: string;
    siteX?: string;
    siteYoutube?: string;
    siteInstagram?: string;
    siteTikTok?: string;
    siteLinkedIn?: string;
    siteThreads?: string;
    maintenanceMode: boolean;
    maintenanceMessage?: string;
    allowRegistration: boolean;
    requireEmailVerification: boolean;
    createdAt: string;
    updatedAt: string;
}

/**
 * Fetch settings from API (server-side only)
 * Used in generateMetadata and other server components
 */
export async function getServerSettings(): Promise<ServerSettings | null> {
    try {
        const response = await fetch(`${BASE_URL}/settings`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            // Don't cache settings for too long, but cache for a short time for performance
            next: { revalidate: 60 }, // Revalidate every 60 seconds
        });

        if (!response.ok) {
            console.error('Failed to fetch settings:', response.statusText);
            return null;
        }

        const data = await response.json();

        // Handle different response formats
        if (data?.data && typeof data.data === 'object' && 'id' in data.data) {
            return data.data as ServerSettings;
        }

        if (data?.id) {
            return data as ServerSettings;
        }

        return null;
    } catch (error) {
        console.error('Error fetching server settings:', error);
        return null;
    }
}

