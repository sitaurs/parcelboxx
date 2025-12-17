/**
 * URL utility functions to avoid hardcoded localhost URLs
 */

/**
 * Get base URL for API (without /api suffix)
 * @returns Base URL for accessing static files and photos
 */
export const getBaseURL = (): string => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://3.27.11.106:9090/api';
  return apiUrl.replace('/api', '');
};

/**
 * Get full photo URL from path
 * @param photoPath - Photo path from API (e.g., /storage/photo.jpg)
 * @returns Full URL to photo
 */
export const getPhotoURL = (photoPath: string): string => {
  return `${getBaseURL()}${photoPath}`;
};

/**
 * Get WhatsApp backend URL
 * @returns WhatsApp backend base URL
 */
export const getWhatsAppURL = (): string => {
  return import.meta.env.VITE_WA_API_URL || 'http://3.27.11.106:9090/api';
};
