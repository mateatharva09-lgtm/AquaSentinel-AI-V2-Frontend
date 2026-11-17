/** Browser-only Leaflet map. Load with React.lazy behind a hydration check — never import statically from a route. */
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Category } from "@/lib/water/model";

export interface MapSite {
  key: string;
  name: string;
  lat: number;
  lng: number;
  wqi: number;
  category: Category;
  count: number;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export default function SampleMap({ sites, selected, onSelect }: { sites: MapSite[]; selected: string | null; onSelect: (key: string) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const fitted = useRef(false);

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current, { scrollWheelZoom: true }).setView([22.58, 88.37], 10);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    for (const s of sites) {
      const marker = L.circleMarker([s.lat, s.lng], {
        radius: s.key === selected ? 13 : 10,
        className: `aqua-marker cat-${s.category}${s.key === selected ? " is-selected" : ""}`,
      });
      marker.bindTooltip(`<strong>${esc(s.name)}</strong><br/>Latest index ${s.wqi.toFixed(0)} · ${s.count} sample${s.count === 1 ? "" : "s"}`, { direction: "top", offset: [0, -8] });
      marker.on("click", () => onSelect(s.key));
      marker.addTo(g);
    }
    if (!fitted.current && sites.length > 0) {
      m.fitBounds(L.latLngBounds(sites.map((s) => [s.lat, s.lng] as [number, number])).pad(0.2));
      fitted.current = true;
    }
  }, [sites, selected, onSelect]);

  useEffect(() => {
    const s = sites.find((x) => x.key === selected);
    if (s && map.current) map.current.panTo([s.lat, s.lng]);
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={el} className="size-full" role="region" aria-label="Map of sample locations" />;
}
