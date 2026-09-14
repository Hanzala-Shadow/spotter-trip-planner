export interface Place {
  label: string;
  lon: number;
  lat: number;
}
export type Status = 'off_duty' | 'sleeper' | 'driving' | 'on_duty';
export interface TripEvent {
  id: number;
  status: Status;
  kind: string;
  start: string;
  end: string;
  seconds: number;
  miles: number;
  route_miles: number;
  start_place: Place;
  end_place: Place;
  reason: string;
}
export interface Segment {
  status: Status;
  kind: string;
  start_second: number;
  end_second: number;
  miles: number;
  event_id: number | null;
}
export interface DailyLog {
  date: string;
  segments: Segment[];
  totals: Record<Status, number>;
  miles: number;
  remarks: { time: string; kind: string; location: string; reason: string }[];
}
export interface RouteLeg {
  start: Place;
  end: Place;
  miles: number;
  seconds: number;
  coordinates: [number, number][];
  directions: { instruction: string; miles: number }[];
}
export interface DriverDetails {
  driver: string;
  carrier: string;
  vehicle: string;
  shipping: string;
  office: string;
}
export interface Plan {
  events: TripEvent[];
  logs: DailyLog[];
  route: { legs: RouteLeg[]; provider: string; truck_restrictions_checked: boolean };
  summary: {
    miles: number;
    driving_seconds: number;
    on_duty_seconds: number;
    rest_seconds: number;
    elapsed_seconds: number;
    departure: string;
    arrival: string;
    cycle_used_at_finish: number;
    fuel_stops: number;
    daily_rests: number;
    cycle_restarts: number;
  };
  assumptions: string[];
  utc_offset_minutes: number;
  driver_details: DriverDetails;
}
