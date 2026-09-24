/**
 * Environment Configuration
 *
 * Reads values from Expo's public environment variables.
 * For local development, create a `.env` file in the mobile/ root:
 *   EXPO_PUBLIC_API_BASE=http://192.168.x.x:8000
 *
 * For a physical device, replace 'localhost' with your machine's LAN IP.
 * For production, set EXPO_PUBLIC_API_BASE to your deployed API URL.
 */

// Default to localhost:8000 for emulator/web development. Override via .env.
const RAW_API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8000';

// Strip trailing slash for consistent URL building
export const API_BASE = RAW_API_BASE.replace(/\/$/, '');

// WebSocket base derived from API_BASE (http→ws, https→wss)
export const WS_BASE = API_BASE.replace(/^http/, 'ws');

// Convenience flag to know if a real backend URL was configured
export const IS_BACKEND_CONFIGURED = Boolean(process.env.EXPO_PUBLIC_API_BASE);
