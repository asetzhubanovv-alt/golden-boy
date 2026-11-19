"use client";

import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import type { ItemSighting } from "@/lib/sightings";

type MapLocation = {
  latitude: number;
  longitude: number;
};

type GoogleMapProps = {
  mode: "select" | "sightings";
  sightings?: ItemSighting[];
  selectedLocation?: MapLocation | null;
  highlightSightingId?: string | null;
  onLocationSelect?: (location: MapLocation) => void;
};

let mapsLibraryPromise: Promise<google.maps.MapsLibrary> | undefined;

function loadMapsLibrary() {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("Missing Google Maps API key.");

  if (!mapsLibraryPromise) {
    setOptions({ key, v: "weekly" });
    mapsLibraryPromise = importLibrary("maps");
  }
  return mapsLibraryPromise;
}

export default function GoogleMap({
  mode,
  sightings = [],
  selectedLocation = null,
  highlightSightingId = null,
  onLocationSelect,
}: GoogleMapProps) {
  const { t } = useLanguage();
  const mapElement = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.Marker[]>([]);
  const onLocationSelectRef = useRef(onLocationSelect);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  useEffect(() => {
    let active = true;
    let mapClickListener: google.maps.MapsEventListener | undefined;

    const initializeMap = async () => {
      if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
        setLoadError(t("sighting.mapKeyMissing"));
        return;
      }

      try {
        const { Map } = await loadMapsLibrary();
        if (!active || !mapElement.current) return;

        const map = new Map(mapElement.current, {
          center: { lat: 48.0196, lng: 66.9237 },
          zoom: 5,
          clickableIcons: false,
          fullscreenControl: false,
          gestureHandling: "greedy",
          mapTypeControl: false,
          streetViewControl: false,
        });
        mapInstance.current = map;

        if (mode === "select") {
          mapClickListener = map.addListener("click", (event: google.maps.MapMouseEvent) => {
            if (!event.latLng) return;
            onLocationSelectRef.current?.({
              latitude: event.latLng.lat(),
              longitude: event.latLng.lng(),
            });
          });
        }
        setIsLoaded(true);
      } catch {
        if (active) setLoadError(t("sighting.mapLoadError"));
      }
    };

    void initializeMap();
    return () => {
      active = false;
      mapClickListener?.remove();
      markers.current.forEach((marker) => marker.setMap(null));
      markers.current = [];
      mapInstance.current = null;
    };
  }, [mode, t]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !isLoaded) return;

    markers.current.forEach((marker) => marker.setMap(null));
    markers.current = [];

    const locations = mode === "select"
      ? selectedLocation
        ? [{
            id: "selected-location",
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude,
            observedAt: "",
            comment: "",
            label: t("sighting.title"),
          }]
        : []
      : sightings.map((sighting) => ({
          id: sighting.id,
          latitude: sighting.latitude,
          longitude: sighting.longitude,
          observedAt: sighting.observedAt,
          comment: sighting.comment,
          label: sighting.fullName || `@${sighting.username}`,
        }));

    const infoWindow = new google.maps.InfoWindow();
    locations.forEach((location) => {
      const marker = new google.maps.Marker({
        map,
        position: { lat: location.latitude, lng: location.longitude },
        title: location.label,
        animation:
          location.id === highlightSightingId
            ? google.maps.Animation.BOUNCE
            : undefined,
      });
      const content = document.createElement("div");
      const heading = document.createElement("strong");
      heading.textContent = location.label;
      content.append(heading);
      if (location.observedAt) {
        const date = document.createElement("p");
        date.textContent = location.observedAt;
        content.append(date);
      }
      if (location.comment) {
        const comment = document.createElement("p");
        comment.textContent = location.comment;
        content.append(comment);
      }
      marker.addListener("click", () => {
        infoWindow.setContent(content);
        infoWindow.open({ map, anchor: marker });
      });
      markers.current.push(marker);
    });

    const focusedLocation =
      mode === "select"
        ? selectedLocation
        : sightings.find((sighting) => sighting.id === highlightSightingId) ?? null;
    if (focusedLocation) {
      map.setCenter({
        lat: focusedLocation.latitude,
        lng: focusedLocation.longitude,
      });
      map.setZoom(16);
    } else if (locations.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      locations.forEach((location) => {
        bounds.extend({ lat: location.latitude, lng: location.longitude });
      });
      map.fitBounds(bounds, 36);
    } else if (locations.length === 1) {
      map.setCenter({ lat: locations[0].latitude, lng: locations[0].longitude });
      map.setZoom(16);
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
      {!isLoaded && (
        <div className={`google-map-message${loadError ? " is-error" : ""}`} role={loadError ? "alert" : "status"}>
          {loadError || t("sighting.mapLoading")}
        </div>
      )}
    </div>
  );
}
