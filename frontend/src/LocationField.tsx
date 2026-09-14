import { useEffect, useRef, useState } from 'react';
import {
  TextField,
  IconButton,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import { Search, Check } from 'lucide-react';
import type { Place } from './types';

export default function LocationField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: Place | null;
  onChange: (value: Place | null) => void;
  disabled: boolean;
}) {
  const [query, setQuery] = useState(value?.label ?? '');
  const [results, setResults] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  useEffect(() => {
    requestId.current++;
    setBusy(false);
    if (value) {
      setQuery(value.label);
      setResults([]);
      setError('');
    }
  }, [value]);
  async function search() {
    if (query.trim().length < 2) {
      setError('Enter a city or street address.');
      return;
    }
    const id = ++requestId.current;
    setBusy(true);
    setError('');
    setResults([]);
    try {
      const response = await fetch(`/api/locations?q=${encodeURIComponent(query.trim())}`, {
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json().catch(() => {
        throw new Error('The location service returned an unreadable response. Please try again.');
      });
      if (!response.ok) throw new Error(data.error || 'Location search failed.');
      if (id !== requestId.current) return;
      setResults(data.places);
      if (!data.places.length) setError('No US locations found. Try a city and state.');
    } catch (e) {
      if (id === requestId.current)
        setError(
          e instanceof Error && e.name !== 'TimeoutError'
            ? e.message
            : 'Search timed out. Please try again.',
        );
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }
  return (
    <div className="location-field">
      <TextField
        label={label}
        value={query}
        fullWidth
        size="small"
        disabled={disabled}
        error={!!error}
        onChange={(e) => {
          requestId.current++;
          setBusy(false);
          setQuery(e.target.value);
          setError('');
          setResults([]);
          onChange(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void search();
          }
          if (e.key === 'Escape') setResults([]);
        }}
        helperText={error || (value ? 'Location selected' : 'City or address, then press search')}
        slotProps={{
          input: {
            endAdornment: busy ? (
              <CircularProgress size={18} />
            ) : value ? (
              <Check size={18} color="#11665c" aria-label="Selected" />
            ) : (
              <IconButton
                aria-label={`Search ${label.toLowerCase()}`}
                onClick={() => void search()}
                disabled={disabled}
                size="small"
              >
                <Search size={18} />
              </IconButton>
            ),
          },
        }}
      />
      {results.length > 0 && (
        <List dense className="location-results" aria-label={`${label} results`}>
          {results.map((place, i) => (
            <ListItemButton
              key={`${place.lon}-${place.lat}-${i}`}
              onClick={() => {
                onChange(place);
                setQuery(place.label);
                setResults([]);
              }}
            >
              <ListItemText
                primary={place.label}
                secondary={`${place.lat.toFixed(3)}, ${place.lon.toFixed(3)}`}
              />
            </ListItemButton>
          ))}
        </List>
      )}
    </div>
  );
}
