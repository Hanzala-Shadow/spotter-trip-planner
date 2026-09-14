import { useCallback, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Tab,
  Tabs,
  TextField,
} from '@mui/material';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coffee,
  FileText,
  Fuel,
  Info,
  MapPin,
  Moon,
  PackageCheck,
  Printer,
  RotateCcw,
  Route,
  Truck,
} from 'lucide-react';
import LocationField from './LocationField';
import MapPanel from './MapPanel';
import LogSheet from './LogSheet';
import { dateLabel, duration, kindLabel, offsetLabel, time } from './format';
import type { DriverDetails, Place, Plan } from './types';
import './styles.css';

const chicago: Place = { label: 'Chicago, Illinois', lat: 41.8781, lon: -87.6298 };
const springfield: Place = { label: 'Springfield, Illinois', lat: 39.7817, lon: -89.6501 };
const nashville: Place = { label: 'Nashville, Tennessee', lat: 36.1627, lon: -86.7816 };
const samples = [
  { name: 'Day trip', places: [chicago, springfield, nashville], cycle: '0' },
  {
    name: 'Multi-day',
    places: [
      { label: 'Los Angeles, California', lat: 34.0522, lon: -118.2437 },
      { label: 'Phoenix, Arizona', lat: 33.4484, lon: -112.074 },
      { label: 'Dallas, Texas', lat: 32.7767, lon: -96.797 },
    ],
    cycle: '20',
  },
  {
    name: 'Cycle restart',
    places: [chicago, nashville, { label: 'Atlanta, Georgia', lat: 33.749, lon: -84.388 }],
    cycle: '68',
  },
];
const blankDetails: DriverDetails = {
  driver: '',
  carrier: '',
  vehicle: '',
  shipping: '',
  office: '',
};
const assumptions = [
  'Property-carrying, 70 hours in 8 days. No adverse driving conditions.',
  'Start fully rested with a full tank. Pickup and dropoff each take 1 hour; fuel stops take 30 minutes.',
  'At most 11 hours driving within a 14-hour window, followed by 10 hours of rest. A 30-minute non-driving break is required after 8 hours of driving.',
  'Fuel at least every 1,000 miles. A 34-hour restart is used when the remaining cycle cannot cover the work; prior daily recap hours are unknown.',
  'All logs use your selected fixed home-terminal UTC offset, including when the route crosses time zones.',
  'Public road routing is not checked for truck restrictions. Roadside stops are planning coordinates, not verified facilities. Review the route before travel.',
];
function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T06:00`;
}
function EventIcon({ kind }: { kind: string }) {
  const Icon =
    kind === 'drive'
      ? Truck
      : kind === 'fuel'
        ? Fuel
        : kind === 'daily_rest'
          ? Moon
          : kind === 'cycle_restart'
            ? RotateCcw
            : kind === 'break'
              ? Coffee
              : PackageCheck;
  return <Icon size={18} />;
}

export default function App() {
  const [current, setCurrent] = useState<Place | null>(chicago),
    [pickup, setPickup] = useState<Place | null>(springfield),
    [dropoff, setDropoff] = useState<Place | null>(nashville);
  const [cycle, setCycle] = useState('0'),
    [departure, setDeparture] = useState(tomorrow),
    [offset, setOffset] = useState(-360),
    [details, setDetails] = useState<DriverDetails>(blankDetails);
  const [plan, setPlan] = useState<Plan | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(''),
    [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState(0),
    [day, setDay] = useState(0),
    [selected, setSelected] = useState<number | null>(null),
    [showAssumptions, setShowAssumptions] = useState(false);
  const selectEvent = useCallback((id: number) => setSelected(id), []);
  function changed() {
    setDirty(true);
    setError('');
  }
  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!current || !pickup || !dropoff) {
      setError('Search and select all three locations.');
      return;
    }
    if (
      cycle.trim() === '' ||
      !Number.isFinite(Number(cycle)) ||
      Number(cycle) < 0 ||
      Number(cycle) > 70
    ) {
      setError('Cycle hours must be between 0 and 70.');
      return;
    }
    if (!departure) {
      setError('Choose a departure date and time.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current,
          pickup,
          dropoff,
          cycle_used: Number(cycle),
          departure,
          utc_offset_minutes: offset,
          driver_details: details,
        }),
        signal: AbortSignal.timeout(55000),
      });
      const data = await response.json().catch(() => {
        throw new Error('The trip service returned an unreadable response. Please try again.');
      });
      if (!response.ok) throw new Error(data.error || 'The trip could not be planned.');
      setPlan(data);
      setDirty(false);
      setDay(0);
      setTab(0);
      setSelected(null);
    } catch (e) {
      setError(
        e instanceof Error && e.name !== 'TimeoutError'
          ? e.message
          : 'Planning timed out. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }
  const logProps = plan
    ? {
        details: plan.driver_details,
        offset: plan.utc_offset_minutes,
        from: plan.route.legs[0].start.label,
        to: plan.route.legs[1].end.label,
      }
    : null;
  return (
    <>
      <div className="app-shell">
        <header className="topbar">
          <a className="brand" href="/" aria-label="Waypoint home">
            <span className="brand-icon">
              <Route size={22} />
            </span>
            waypoint<span className="brand-dot">.</span>
          </a>
          <span className="workspace-name">TRIP WORKSPACE</span>
          <span className="rules-badge">
            <span />
            70 hr / 8 day cycle
          </span>
        </header>
        <div className="workspace">
          <aside className="planner-sidebar">
            <div className="section-heading">
              <span className="eyebrow">PLAN YOUR ROUTE</span>
              <h1>A clear road ahead.</h1>
              <p>Build your trip and the daily logs that go with it.</p>
            </div>
            <form onSubmit={generate} noValidate>
              <div className="location-stack">
                {[
                  { label: 'Current location', value: current, set: setCurrent },
                  { label: 'Pickup location', value: pickup, set: setPickup },
                  { label: 'Dropoff location', value: dropoff, set: setDropoff },
                ].map((field, i) => (
                  <div className="location-row" key={field.label}>
                    <span className={`location-number number-${i}`}>{i + 1}</span>
                    <LocationField
                      label={field.label}
                      value={field.value}
                      disabled={loading}
                      onChange={(place) => {
                        field.set(place);
                        changed();
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="form-divider" />
              <div className="field-heading">
                <Clock3 size={17} />
                <h2>Hours & departure</h2>
              </div>
              <TextField
                fullWidth
                size="small"
                label="Current cycle used (hours)"
                type="number"
                value={cycle}
                disabled={loading}
                onChange={(e) => {
                  setCycle(e.target.value);
                  changed();
                }}
                slotProps={{ htmlInput: { min: 0, max: 70, step: 0.25 } }}
              />
              <div className="cycle-caption">
                <span>Available in this cycle</span>
                <strong>
                  {Math.max(0, 70 - (Number(cycle) || 0))
                    .toFixed(2)
                    .replace(/\.00$/, '')}{' '}
                  hr
                </strong>
              </div>
              <div className="cycle-meter">
                <span
                  style={{
                    width: `${Math.max(0, Math.min(100, ((70 - (Number(cycle) || 0)) / 70) * 100))}%`,
                  }}
                />
              </div>
              <TextField
                className="departure-field"
                fullWidth
                size="small"
                label="Departure · terminal time"
                type="datetime-local"
                value={departure}
                disabled={loading}
                onChange={(e) => {
                  setDeparture(e.target.value);
                  changed();
                }}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                select
                fullWidth
                size="small"
                label="Home-terminal UTC offset"
                value={offset}
                disabled={loading}
                onChange={(e) => {
                  setOffset(Number(e.target.value));
                  changed();
                }}
                helperText="Use the same terminal offset for every log."
              >
                {[-240, -300, -360, -420, -480].map((o) => (
                  <MenuItem key={o} value={o}>
                    {offsetLabel(o)}
                  </MenuItem>
                ))}
              </TextField>
              <Accordion className="driver-accordion" elevation={0} disableGutters>
                <AccordionSummary expandIcon={<ChevronDown size={16} />}>
                  <FileText size={16} />
                  <span>Driver & vehicle details</span>
                  <small>Optional</small>
                </AccordionSummary>
                <AccordionDetails>
                  {(Object.keys(blankDetails) as (keyof DriverDetails)[]).map((key) => (
                    <TextField
                      key={key}
                      fullWidth
                      size="small"
                      label={
                        {
                          driver: 'Driver name',
                          carrier: 'Carrier',
                          vehicle: 'Vehicle / trailer',
                          shipping: 'Shipping document',
                          office: 'Office / terminal',
                        }[key]
                      }
                      value={details[key]}
                      disabled={loading}
                      slotProps={{ htmlInput: { maxLength: 150 } }}
                      onChange={(e) => {
                        setDetails({ ...details, [key]: e.target.value });
                        changed();
                      }}
                    />
                  ))}
                </AccordionDetails>
              </Accordion>
              {error && (
                <Alert severity="error" className="form-error">
                  {error}
                </Alert>
              )}
              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                endIcon={
                  loading ? (
                    <CircularProgress size={17} color="inherit" />
                  ) : (
                    <ArrowRight size={18} />
                  )
                }
              >
                {loading ? 'Planning your trip…' : 'Generate trip plan'}
              </Button>
            </form>
            <div className="sample-section">
              <span>Try a sample trip</span>
              <div>
                {samples.map((sample) => (
                  <button
                    disabled={loading}
                    key={sample.name}
                    onClick={() => {
                      setCurrent(sample.places[0]);
                      setPickup(sample.places[1]);
                      setDropoff(sample.places[2]);
                      setCycle(sample.cycle);
                      changed();
                    }}
                  >
                    {sample.name}
                  </button>
                ))}
              </div>
            </div>
            <button className="assumptions-link" onClick={() => setShowAssumptions(true)}>
              <Info size={15} />
              Planning rules & assumptions
            </button>
            <div className="sidebar-note">
              <Check size={15} />
              <span>No account needed. Your trip is not saved.</span>
            </div>
          </aside>
          <main className="results" aria-busy={loading}>
            <div className="results-heading">
              <div>
                <span className="eyebrow">YOUR TRIP, AT A GLANCE</span>
                <h2>
                  {plan
                    ? `${plan.route.legs[0].start.label.split(',')[0]} to ${plan.route.legs[1].end.label.split(',')[0]}`
                    : 'Trip overview'}
                </h2>
                <p>
                  {plan
                    ? `Via ${plan.route.legs[0].end.label} · ${dateLabel(plan.summary.departure)}`
                    : 'Your route and duty schedule will appear here.'}
                </p>
              </div>
              {plan && (
                <Button
                  variant="outlined"
                  startIcon={<Printer size={16} />}
                  disabled={dirty || loading}
                  onClick={() => window.print()}
                >
                  Print logs
                </Button>
              )}
            </div>
            {dirty && plan && (
              <Alert severity="info" className="stale-notice">
                Inputs changed. Generate a new plan to update these results.
              </Alert>
            )}
            <div className="stats-grid">
              <div>
                <span>
                  <Route size={15} />
                  Total distance
                </span>
                <strong>
                  {plan ? Math.round(plan.summary.miles).toLocaleString() : '—'}
                  <small>{plan ? ' mi' : ''}</small>
                </strong>
                <p>Current → pickup → dropoff</p>
              </div>
              <div>
                <span>
                  <Truck size={15} />
                  Driving time
                </span>
                <strong>{plan ? duration(plan.summary.driving_seconds) : '—'}</strong>
                <p>Road travel only</p>
              </div>
              <div>
                <span>
                  <Clock3 size={15} />
                  Trip duration
                </span>
                <strong>{plan ? duration(plan.summary.elapsed_seconds) : '—'}</strong>
                <p>
                  {plan
                    ? `${plan.logs.length} daily log ${plan.logs.length === 1 ? 'sheet' : 'sheets'}`
                    : 'Includes work & rest'}
                </p>
              </div>
              <div>
                <span>
                  <PackageCheck size={15} />
                  Delivery completed
                </span>
                <strong>{plan ? time(plan.summary.arrival) : '—'}</strong>
                <p>
                  {plan
                    ? `${dateLabel(plan.summary.arrival)} · ${offsetLabel(plan.utc_offset_minutes)}`
                    : 'In home-terminal time'}
                </p>
              </div>
            </div>
            <div className="map-card">
              <MapPanel plan={plan} selected={selected} onSelect={selectEvent} />
              {loading && (
                <div className="map-loading">
                  <CircularProgress size={24} />
                  <span>Finding the road route and scheduling your stops…</span>
                </div>
              )}
            </div>
            {plan ? (
              <>
                <div className="trip-summary">
                  <span>
                    <Fuel size={16} />
                    {plan.summary.fuel_stops} fuel stops
                  </span>
                  <span>
                    <Moon size={16} />
                    {plan.summary.daily_rests} daily rests
                  </span>
                  <span>
                    <RotateCcw size={16} />
                    {plan.summary.cycle_restarts} cycle restarts
                  </span>
                  <span>
                    {(70 - plan.summary.cycle_used_at_finish).toFixed(1)} cycle hours left
                  </span>
                </div>
                <section className="details-card">
                  <Tabs
                    value={tab}
                    onChange={(_, value) => setTab(value)}
                    variant="scrollable"
                    scrollButtons="auto"
                    aria-label="Trip details"
                  >
                    <Tab label="Itinerary" id="tab-0" aria-controls="panel-0" />
                    <Tab
                      label={`Daily logs (${plan.logs.length})`}
                      id="tab-1"
                      aria-controls="panel-1"
                    />
                    <Tab label="Directions" id="tab-2" aria-controls="panel-2" />
                  </Tabs>
                  <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
                    {tab === 0 && (
                      <div className="itinerary">
                        <div className="panel-intro">
                          <h3>One step at a time</h3>
                          <span>All times {offsetLabel(plan.utc_offset_minutes)}</span>
                        </div>
                        {plan.events.map((event, i) => (
                          <div key={event.id}>
                            {(i === 0 ||
                              event.start.slice(0, 10) !==
                                plan.events[i - 1].start.slice(0, 10)) && (
                              <div className="day-label">{dateLabel(event.start)}</div>
                            )}
                            <button
                              className={`event-row ${selected === event.id ? 'selected' : ''}`}
                              onClick={() => setSelected(event.id)}
                              aria-label={`${kindLabel[event.kind]} at ${time(event.start)}`}
                            >
                              <div className="event-time">
                                <strong>{time(event.start)}</strong>
                                <span>
                                  {time(event.end)}
                                  {event.end.slice(0, 10) !== event.start.slice(0, 10)
                                    ? ` · ${dateLabel(event.end)}`
                                    : ''}
                                </span>
                              </div>
                              <span className={`event-icon kind-${event.kind}`}>
                                <EventIcon kind={event.kind} />
                              </span>
                              <div className="event-description">
                                <strong>
                                  {kindLabel[event.kind]}
                                  {event.kind === 'drive' ? ` · ${event.miles.toFixed(1)} mi` : ''}
                                </strong>
                                <span>
                                  {event.kind === 'drive'
                                    ? `${event.start_place.label} → ${event.end_place.label}`
                                    : event.start_place.label}
                                </span>
                                <small>{event.reason}</small>
                              </div>
                              <span className="event-duration">{duration(event.seconds)}</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {tab === 1 && (
                      <div className="logs-panel">
                        <div className="log-pagination">
                          <div>
                            <h3>Daily duty records</h3>
                            <p>24 hours per sheet, including off-duty time.</p>
                          </div>
                          <div className="pagination-controls">
                            <Button
                              aria-label="Previous log day"
                              disabled={day === 0}
                              onClick={() => setDay(day - 1)}
                            >
                              <ChevronLeft size={19} />
                            </Button>
                            <span>
                              Day {day + 1} of {plan.logs.length}
                            </span>
                            <Button
                              aria-label="Next log day"
                              disabled={day === plan.logs.length - 1}
                              onClick={() => setDay(day + 1)}
                            >
                              <ChevronRight size={19} />
                            </Button>
                          </div>
                        </div>
                        <LogSheet log={plan.logs[day]} {...logProps!} />
                      </div>
                    )}
                    {tab === 2 && (
                      <div className="directions-panel">
                        <Alert severity="info">
                          Road directions are not checked for vehicle height, weight or truck
                          restrictions.
                        </Alert>
                        {plan.route.legs.map((leg, i) => (
                          <div key={i}>
                            <h3>
                              <MapPin size={17} />
                              {i === 0 ? 'To pickup' : 'To dropoff'}{' '}
                              <span>{leg.miles.toFixed(1)} mi</span>
                            </h3>
                            <p>
                              {leg.start.label} → {leg.end.label}
                            </p>
                            <ol>
                              {leg.directions.map((direction, j) => (
                                <li key={j}>
                                  <span>{direction.instruction}</span>
                                  <small>{direction.miles.toFixed(1)} mi</small>
                                </li>
                              ))}
                            </ol>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </>
            ) : (
              <div className="ready-panel">
                <span className="ready-icon">
                  <FileText size={23} />
                </span>
                <div>
                  <h3>Ready when you are</h3>
                  <p>
                    Generate a trip to see your driving schedule, planned stops and filled daily
                    logs.
                  </p>
                </div>
              </div>
            )}
            <footer className="results-footer">
              <span>Built for the full journey.</span>
              <button onClick={() => setShowAssumptions(true)}>
                Review planning assumptions <ArrowRight size={13} />
              </button>
            </footer>
          </main>
        </div>
      </div>
      {plan && (
        <div className="print-logs">
          {dirty && (
            <p className="print-stale-notice">
              These sheets are out of date: the inputs changed after this plan was generated.
              Generate a new plan before using updated details.
            </p>
          )}
          {plan.logs.map((log) => (
            <LogSheet key={log.date} log={log} {...logProps!} />
          ))}
        </div>
      )}
      <Dialog
        open={showAssumptions}
        onClose={() => setShowAssumptions(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Planning rules & assumptions</DialogTitle>
        <DialogContent>
          <p className="dialog-intro">
            Waypoint creates a proposed schedule from the information you provide.
          </p>
          <ul className="assumptions-list">
            {(plan?.assumptions || assumptions).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAssumptions(false)}>Got it</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
