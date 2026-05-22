import { API_BASE_URL } from './api/client';

/**
 * Origin of the backend (API_BASE_URL minus the trailing `/api`).
 * Used to turn relative upload paths into absolute URLs.
 */
const ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

/**
 * Resolve an image reference to a loadable URL.
 * - Absolute URLs (Cloudinary / Garage / http) are returned unchanged.
 * - Relative paths (`/uploads/...`) are prefixed with the backend origin.
 */
export function resolveImageUrl(path?: string | null): string | undefined {
    if (!path) return undefined;
    if (/^https?:\/\//i.test(path)) return path;
    return `${ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}
