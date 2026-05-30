/**
 * Core TypeScript type definitions for Namma Metro Journey Companion.
 * Strict typing enforced across the entire application.
 */

// ── Station Types ──

export interface Station {
  id: string;
  name: string;
  line: 'purple' | 'green' | 'both';
  order: number;
  is_interchange: boolean;
}

// ── Route & Journey Types ──

export interface RouteSegment {
  from_station_id: string;
  from_station: string;
  to_station_id: string;
  to_station: string;
  line: string;
  station_ids: string[];
  stations: string[];
  travel_time_minutes: number;
  departure_time?: string;
  arrival_time?: string;
  departure_iso?: string;
  arrival_iso?: string;
  frequency_minutes?: number;
}

export interface Route {
  segments: RouteSegment[];
  total_time_minutes: number;
  interchange_count: number;
  fare_estimate: number;
  stations_count: number;
}

export interface JourneyPlanResponse {
  route: Route;
  next_trains: TrainArrival[];
}

// ── Ticket Types ──

export interface TicketData {
  ticket_id: string;
  journey_id: string;
  source: string;
  source_id: string;
  destination: string;
  destination_id: string;
  passengers: number;
  fare: number;
  payment_mode: string;
  transaction_time: string;
  route: Route;
}

// ── Journey Tracking Types ──

export interface LiveStatus {
  progress: number;
  current_segment: number;
  segment_progress: number;
  current_station: string;
  next_station: string | null;
  elapsed_minutes: number;
  remaining_minutes: number;
  status: JourneyStatus;
  total_segments: number;
}

export type JourneyStatus =
  | 'boarding'
  | 'in_progress'
  | 'approaching_interchange'
  | 'approaching_destination'
  | 'completed';

export interface JourneyAlert {
  id: string;
  type: string;
  icon: string;
  title: string;
  message: string;
  detail: string;
  color: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: string;
}

export type InstructionStage =
  | 'WAITING_FIRST_TRAIN'
  | 'BOARD_FIRST_TRAIN'
  | 'IN_FIRST_TRAIN'
  | 'APPROACHING_INTERCHANGE'
  | 'DEBOARD_INTERCHANGE'
  | 'WALK_TO_PLATFORM'
  | 'WAITING_CONNECTING_TRAIN'
  | 'BOARD_CONNECTING_TRAIN'
  | 'IN_CONNECTING_TRAIN'
  | 'APPROACHING_DESTINATION'
  | 'DEBOARD_DESTINATION'
  | 'ARRIVED';

export interface JourneyInstruction {
  stage: InstructionStage;
  title: string;
  description: string;
  eta_minutes: number;
  scheduled_time: string;
  line: string;
  direction: string;
  station: string;
  active: boolean;
  platform?: number;
}

export interface JourneyUpdate {
  type: 'journey_update' | 'journey_complete';
  live_status?: LiveStatus;
  alerts?: JourneyAlert[];
  instructions?: JourneyInstruction[];
  message?: string;
  timestamp: string;
}

export interface JourneyResponse {
  journey: {
    ticket_id: string;
    journey_id: string;
    source: string;
    destination: string;
    segments: RouteSegment[];
    total_time_minutes: number;
    interchange_count: number;
    stations_count: number;
    fare: number;
    start_time: string;
    status: string;
  };
  live_status: LiveStatus;
  alerts: JourneyAlert[];
  instructions: JourneyInstruction[];
}

// ── Train Types ──

export interface TrainArrival {
  train_id: string;
  line: string;
  direction: string;
  arrival_time: string;
  arrival_iso: string;
  minutes_away: number;
  destination: string;
  status: string;
  platform: number;
  coaches: number;
}

export interface TrainPosition {
  train_id: string;
  line: string;
  direction: string;
  departure_terminal: string;
  destination_terminal: string;
  current_station_id: string;
  current_station_name: string;
  next_station_id?: string;
  next_station_name?: string;
  progress_to_next: number;
  departed_at: string;
  status: string;
}

// ── Navigation Types ──

export type RootStackParamList = {
  Home: undefined;
  QRTickets: { from?: string; to?: string } | undefined;
  TicketDetails: { ticketData: TicketData; journeyId: string };
  JourneyTimeline: { journeyId: string; ticketData: TicketData };
  JourneyVisualization: { journeyId: string; ticketData: TicketData };
  RoutePlanner: undefined;
  MetroMap: undefined;
  ActiveTickets: undefined;
};
