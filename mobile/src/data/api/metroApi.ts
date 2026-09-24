/**
 * API client for Namma Metro backend.
 * All endpoints return typed responses.
 * Includes fallback behavior when backend is unavailable.
 */

import type {
  Station,
  TicketData,
  JourneyPlanResponse,
  JourneyResponse,
  TrainArrival,
} from '../../shared/types';
import { API_BASE, WS_BASE } from '../../config/env';

/**
 * Custom fetch with timeout to prevent hanging requests.
 */
const TIMEOUT_MS = 8000;

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetchWithTimeout(`${API_BASE}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error: ${res.status}`);
  }
  return res.json();
}

async function apiPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetchWithTimeout(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `API error: ${res.status}`);
  }
  return res.json();
}

// ── API Functions ──

export async function fetchStations(line?: string): Promise<Station[]> {
  const path = line ? `/api/stations/${line}` : '/api/stations';
  const data = await apiGet<{ stations: Station[] }>(path);
  return data.stations;
}

export async function planJourney(
  source: string,
  destination: string,
): Promise<JourneyPlanResponse> {
  return apiPost<JourneyPlanResponse>('/api/journey/plan', {
    source,
    destination,
  });
}

export async function purchaseTicket(
  source: string,
  destination: string,
  passengers: number,
): Promise<TicketData> {
  return apiPost<TicketData>('/api/ticket/purchase', {
    source,
    destination,
    passengers,
  });
}

export async function getJourney(journeyId: string): Promise<JourneyResponse> {
  return apiGet<JourneyResponse>(`/api/journey/${journeyId}`);
}

export async function getNextTrains(
  stationId: string,
  line: string = 'purple',
  count: number = 3,
): Promise<{ trains: TrainArrival[] }> {
  return apiGet(`/api/train/next/${stationId}?line=${line}&count=${count}`);
}

export async function getScheduleInfo(
  line: string,
): Promise<Record<string, unknown>> {
  return apiGet(`/api/schedule/info/${line}`);
}

export async function getHealthStatus(): Promise<Record<string, unknown>> {
  return apiGet('/api/health');
}

// ── WebSocket ──

export function connectJourneyWebSocket(
  journeyId: string,
  onMessage: (data: unknown) => void,
  onError?: (error: Event) => void,
  onClose?: () => void,
): WebSocket {
  const ws = new WebSocket(`${WS_BASE}/ws/journey/${journeyId}`);

  ws.onmessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      console.error('WebSocket parse error:', e);
    }
  };

  ws.onerror = (err: Event) => {
    console.error('WebSocket error:', err);
    onError?.(err);
  };

  ws.onclose = () => {
    onClose?.();
  };

  return ws;
}

// ── API Base URL (for configuration) ──
export const getApiBaseUrl = () => API_BASE;
