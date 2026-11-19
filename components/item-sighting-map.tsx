"use client";

import { useEffect, useRef, useState } from "react";
import type { DivIcon, Map as LeafletMap, Marker } from "leaflet";
import { useLanguage } from "@/components/language-provider";
import { getOpenStreetMapTileUrl } from "@/lib/openstreetmap";
import type { ItemSighting } from "@/lib/sightings";

type MapLocation = {
  latitude: number;
  longitude: number;
};

type ItemSightingMapProps = {
  mode: "select" | "sightings";
  sightings?: ItemSighting[];
  selectedLocation?: MapLocation | null;
  highlightSightingId?: string | null;
  onLocationSelect?: (location: MapLocation) => void;
};

const DEFAULT_CENTER: [number, number] = [48.0196, 66.9237];

export default function ItemSightingMap({
  mode,
  sightings = [],
  selectedLocation = null,
  highlightSightingId = null,
  onLocationSelect,
}: ItemSightingMapProps) {
  const { t } = useLanguage();
  const mapElement = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const markers = useRef<Marker[]>([]);
  const onLocationSelectRef = useRef(onLocationSelect);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  useEffect(() => {
    let active = true;
    let resizeObserver: ResizeObserver | null = null;
    let clickHandler: ((event: import("leaflet").LeafletMouseEvent) => void) | null =
      null;

    async function initializeMap() {
      try {
        const leaflet = await import("leaflet");
        if (!active || !mapElement.current) return;

        leafletRef.current = leaflet;
        const map = leaflet.map(mapElement.current, {
          scrollWheelZoom: false,
          zoomControl: true,
        });
        map.setView(DEFAULT_CENTER, 5);
        leaflet
          .tileLayer(getOpenStreetMapTileUrl(), {
            maxZoom: 19,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, tiles &copy; <a href="https://tile.openstreetmap.de/">OpenStreetMap.de</a>',
          })
          .addTo(map);
        mapInstance.current = map;

        if (mode === "select") {
          clickHandler = (event) => {
            onLocationSelectRef.current?.({
              latitude: event.latlng.lat,
              longitude: event.latlng.lng,
            });
          };
          map.on("click", clickHandler);
        }

        if (typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(() => map.invalidateSize());
          resizeObserver.observe(mapElement.current);
        }
        setIsLoaded(true);
      } catch {
        if (active) setLoadError(true);
      }
    }

    void initializeMap();
    return () => {
      active = false;
      resizeObserver?.disconnect();
      if (clickHandler) mapInstance.current?.off("click", clickHandler);
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
      mapInstance.current?.remove();
      mapInstance.current = null;
      leafletRef.current = null;
    };
  }, [mode]);

  useEffect(() => {
    const map = mapInstance.current;
    const leaflet = leafletRef.current;
    if (!map || !leaflet || !isLoaded) return;

    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    const locations =
      mode === "select"
        ? selectedLocation
          ? [
              {
                id: "selected-location",
                latitude: selectedLocation.latitude,
                longitude: selectedLocation.longitude,
                address: "",
                observedAt: "",
                comment: "",
                label: t("sighting.title"),
              },
            ]
          : []
        : sightings.map((sighting) => ({
            id: sighting.id,
            latitude: sighting.latitude,
            longitude: sighting.longitude,
            address: sighting.address,
            observedAt: sighting.observedAt,
            comment: sighting.comment,
            label: sighting.fullName || `@${sighting.username}`,
          }));

    const bounds = leaflet.latLngBounds([]);
    locations.forEach((location) => {
      const position: [number, number] = [
        location.latitude,
        location.longitude,
      ];
      const highlighted = location.id === highlightSightingId;
      const icon: DivIcon = leaflet.divIcon({
        className: "osm-marker-icon",
        html: `<span class="osm-marker-pin${highlighted ? " is-highlighted" : ""}"></span>`,
        iconSize: [28, 36],
        iconAnchor: [14, 34],
      });
      const marker = leaflet
        .marker(position, { icon, title: location.label })
        .addTo(map);

      const content = document.createElement("div");
      const heading = document.createElement("strong");
      heading.textContent = location.label;
      content.append(heading);
      if (location.observedAt) {
        const date = document.createElement("p");
        date.textContent = location.observedAt;
        content.append(date);
      }
      if (location.address) {
        const address = document.createElement("p");
        address.textContent = location.address;
        content.append(address);
      }
      if (location.comment) {
        const comment = document.createElement("p");
        comment.textContent = location.comment;
        content.append(comment);
      }
      marker.bindPopup(content);
      markers.current.push(marker);
      bounds.extend(position);
    });

    const focusedLocation =
      mode === "select"
        ? selectedLocation
        : sightings.find((sighting) => sighting.id === highlightSightingId) ?? null;
    if (focusedLocation) {
      map.setView(
        [focusedLocation.latitude, focusedLocation.longitude],
        16,
      );
    } else if (locations.length > 1) {
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 });
    } else if (locations.length === 1) {
      map.setView(
        [locations[0].latitude, locations[0].longitude],
        16,
      );
    }
  }, [highlightSightingId, isLoaded, mode, selectedLocation, sightings, t]);

  return (
    <div className="google-map-frame">
      <div
        aria-label={t("sighting.title")}
        className="google-map-canvas"
        ref={mapElement}
        role="region"
      />
      {(!isLoaded || loadError) && (
        <div
          className={`google-map-message${loadError ? " is-error" : ""}`}
          role={loadError ? "alert" : "status"}
        >
          {loadError ? t("sighting.mapLoadError") : t("sighting.mapLoading")}
        </div>
      )}
    </div>
  );
}
