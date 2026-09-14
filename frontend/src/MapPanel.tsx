import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Alert, Button } from '@mui/material';
import { Maximize2 } from 'lucide-react';
import type { Plan, Place } from './types';
import { kindLabel, time } from './format';

export default function MapPanel({
  plan,
  selected,
  onSelect,
}: {
  plan: Plan | null;
  selected: number | null;
  onSelect: (id: number) => void;
}) {
  const node = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.FeatureGroup | null>(null);
  const markers = useRef(new Map<number, L.CircleMarker>());
  const [tileError, setTileError] = useState(false);
  useEffect(() => {
    if (!node.current) return;
    const instance = L.map(node.current, { zoomControl: false, scrollWheelZoom: false }).setView(
      [38.8, -96],
      4,
    );
    L.control.zoom({ position: 'bottomright' }).addTo(instance);
    L.tileLayer(import.meta.env.VITE_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        import.meta.env.VITE_TILE_ATTRIBUTION ||
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    })
      .on('tileerror', () => setTileError(true))
      .addTo(instance);
    map.current = instance;
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(node.current);
    return () => {
      observer.disconnect();
      instance.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    if (layer.current) instance.removeLayer(layer.current);
    markers.current.clear();
    const group = L.featureGroup().addTo(instance);
    layer.current = group;
    if (!plan) return;
    plan.route.legs.forEach((leg, i) =>
      L.polyline(
        leg.coordinates.map(([lon, lat]) => [lat, lon] as L.LatLngTuple),
        {
          color: i ? '#11665c' : '#6e91a5',
          weight: 5,
          opacity: 0.95,
          dashArray: i ? undefined : '8 6',
        },
      ).addTo(group),
    );
    function textPopup(title: string, detail: string) {
      const root = document.createElement('div');
      const strong = document.createElement('strong');
      const p = document.createElement('p');
      strong.textContent = title;
      p.textContent = detail;
      root.append(strong, p);
      return root;
    }
    const points: [Place, string][] = [
      [plan.route.legs[0].start, 'Start'],
      [plan.route.legs[0].end, 'Pickup'],
      [plan.route.legs[1].end, 'Dropoff'],
    ];
    points.forEach(([place, label], i) =>
      L.marker([place.lat, place.lon], {
        icon: L.divIcon({
          className: 'waypoint-pin',
          html: `<span>${i + 1}</span>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        }),
      })
        .bindPopup(textPopup(label, place.label))
        .addTo(group),
    );
    plan.events
      .filter((e) => e.kind !== 'drive')
      .forEach((event) => {
        const marker = L.circleMarker([event.start_place.lat, event.start_place.lon], {
          radius: 7,
          color: '#fff',
          weight: 2,
          fillColor: event.kind === 'fuel' ? '#bd7031' : '#102b2d',
          fillOpacity: 1,
        })
          .bindPopup(
            textPopup(
              `${kindLabel[event.kind]} · ${time(event.start)}`,
              `${event.reason} ${event.start_place.label}`,
            ),
          )
          .on('click', () => onSelect(event.id))
          .addTo(group);
        markers.current.set(event.id, marker);
      });
    if (group.getBounds().isValid())
      instance.fitBounds(group.getBounds(), { padding: [45, 45], maxZoom: 11 });
  }, [plan, onSelect]);
  useEffect(() => {
    if (!plan || selected === null) return;
    const event = plan.events.find((e) => e.id === selected);
    if (event && map.current) {
      map.current.panTo([event.start_place.lat, event.start_place.lon]);
      markers.current.get(selected)?.openPopup();
    }
  }, [selected, plan]);
  return (
    <div className="map-wrap">
      <div ref={node} className="route-map" aria-label="Trip route map" />
      {plan ? (
        <Button
          className="fit-button"
          variant="contained"
          color="inherit"
          size="small"
          startIcon={<Maximize2 size={15} />}
          onClick={() => {
            const bounds = layer.current?.getBounds();
            if (bounds?.isValid())
              map.current?.fitBounds(bounds, { padding: [45, 45], maxZoom: 11 });
          }}
        >
          Fit route
        </Button>
      ) : (
        <div className="map-empty">
          <span className="eyebrow">YOUR NEXT TRIP</span>
          <h2>Route preview</h2>
          <p>Choose your locations to see the route, rest stops and daily logs.</p>
          <div className="map-empty-key">
            <span>01 Start</span>
            <span>02 Pickup</span>
            <span>03 Dropoff</span>
          </div>
        </div>
      )}
      <div className="map-legend">
        <span>
          <i className="route-key empty" />
          To pickup
        </span>
        <span>
          <i className="route-key" />
          To dropoff
        </span>
        <span>
          <i className="stop-key" />
          Planned stop
        </span>
      </div>
      {tileError && (
        <Alert severity="info" className="tile-error">
          Map tiles could not load. Your route and itinerary are still available.
        </Alert>
      )}
    </div>
  );
}
