"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { DivIcon, Map as LeafletMap, Marker } from "leaflet";
import type { ItemLocation } from "@/lib/items";
import {
  getOpenStreetMapTileUrl,
  reverseSearchOpenStreetMapAddress,
  searchOpenStreetMapAddress,
} from "@/lib/openstreetmap";

type Language = "ru" | "kk" | "en";
type Coordinates = { latitude: number; longitude: number };

type MapLocationPickerProps = {
  value: ItemLocation;
  onChange?: (value: ItemLocation) => void;
  readOnly?: boolean;
  compact?: boolean;
  language?: Language;
};

const DEFAULT_CENTER: [number, number] = [43.65, 51.16];

function hasCoordinates(
  value: ItemLocation,
): value is ItemLocation & { latitude: number; longitude: number } {
  return (
    typeof value.latitude === "number" &&
    typeof value.longitude === "number" &&
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude)
  );
}

const messages: Record<
  Language,
  {
    address: string;
    placeholder: string;
    search: string;
    searching: string;
    mapLabel: string;
    loading: string;
    mapError: string;
    pointHint: string;
    pointAddressMissing: string;
    searchUnavailable: string;
    enterAddress: string;
    noMatch: string;
    reverseError: string;
    searchError: string;
  }
> = {
  ru: {
    address: "Адрес",
    placeholder: "Введите адрес и найдите его на карте",
    search: "Найти адрес",
    searching: "Ищем…",
    mapLabel: "Карта OpenStreetMap",
    loading: "Загружаем карту…",
    mapError: "Не удалось загрузить карту. Проверьте подключение к интернету.",
    pointHint: "Выберите точку на карте или переместите маркер.",
    pointAddressMissing: "Точка сохранена, но адрес определить не удалось.",
    searchUnavailable: "Поиск адреса пока недоступен.",
    enterAddress: "Введите адрес для поиска.",
    noMatch: "Адрес не найден. Попробуйте уточнить запрос.",
    reverseError: "Не удалось определить адрес.",
    searchError: "Не удалось найти адрес. Попробуйте ещё раз позже.",
  },
  kk: {
    address: "Мекенжай",
    placeholder: "Мекенжайды енгізіп, картадан табыңыз",
    search: "Мекенжайды табу",
    searching: "Іздеу…",
    mapLabel: "OpenStreetMap картасы",
    loading: "Карта жүктелуде…",
    mapError: "Карта жүктелмеді. Интернет байланысын тексеріңіз.",
    pointHint: "Картадан нүктені таңдаңыз немесе маркерді жылжытыңыз.",
    pointAddressMissing: "Нүкте сақталды, бірақ мекенжай анықталмады.",
    searchUnavailable: "Мекенжай іздеу әзірге қолжетімсіз.",
    enterAddress: "Іздеу үшін мекенжайды енгізіңіз.",
    noMatch: "Мекенжай табылмады. Сұрауды нақтылап көріңіз.",
    reverseError: "Мекенжай анықталмады.",
    searchError: "Мекенжай табылмады. Кейінірек қайталап көріңіз.",
  },
  en: {
    address: "Address",
    placeholder: "Enter an address and find it on the map",
    search: "Find address",
    searching: "Searching…",
    mapLabel: "OpenStreetMap map",
    loading: "Loading map…",
    mapError: "Could not load the map. Check your internet connection.",
    pointHint: "Select a point on the map or drag the marker.",
    pointAddressMissing: "Point saved, but the address could not be resolved.",
    searchUnavailable: "Address search is not available yet.",
    enterAddress: "Enter an address to search.",
    noMatch: "Address not found. Try a more specific query.",
    reverseError: "Could not resolve address.",
    searchError: "Could not find address. Try again later.",
  },
};

function geocodingLanguage(language: Language) {
  return language === "kk" ? "kk" : language;
}

export default function MapLocationPicker({
  value,
  onChange,
  readOnly = false,
  compact = false,
  language = "ru",
}: MapLocationPickerProps) {
  const addressInputId = useId();
  const text = messages[language];
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const selectMapPointRef = useRef<(coordinates: Coordinates) => void>(
    () => undefined,
  );
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const languageRef = useRef(language);
  const geocodeRequestRef = useRef(0);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [mapError, setMapError] = useState("");
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
    languageRef.current = language;
  }, [language, onChange, value]);

  useEffect(() => {
    let active = true;
    let resizeObserver: ResizeObserver | null = null;
    let mapClickHandler:
      | ((event: import("leaflet").LeafletMouseEvent) => void)
      | null = null;

    async function initializeMap() {
      try {
        const leaflet = await import("leaflet");
        if (!active || !mapElementRef.current) return;

        leafletRef.current = leaflet;
        const initialValue = valueRef.current;
        const initialCoordinates = hasCoordinates(initialValue);
        const map = leaflet.map(mapElementRef.current, {
          scrollWheelZoom: false,
          zoomControl: true,
        });
        map.setView(
          initialCoordinates
            ? [initialValue.latitude, initialValue.longitude]
            : DEFAULT_CENTER,
          initialCoordinates ? 16 : 12,
        );
        leaflet
          .tileLayer(getOpenStreetMapTileUrl(), {
            maxZoom: 19,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, tiles &copy; <a href="https://tile.openstreetmap.de/">OpenStreetMap.de</a>',
          })
          .addTo(map);
        mapRef.current = map;

        function moveMarker(coordinates: Coordinates) {
          const position: [number, number] = [
            coordinates.latitude,
            coordinates.longitude,
          ];
          map.setView(position, Math.max(map.getZoom(), 15));
          if (markerRef.current) {
            markerRef.current.setLatLng(position);
            return;
          }

          const icon: DivIcon = leaflet.divIcon({
            className: "osm-marker-icon",
            html: '<span class="osm-marker-pin osm-marker-pin-location"></span>',
            iconSize: [28, 36],
            iconAnchor: [14, 34],
          });
          const marker = leaflet
            .marker(position, { draggable: !readOnly, icon })
            .addTo(map);
          markerRef.current = marker;
          if (!readOnly) {
            marker.on("dragend", () => {
              const movedTo = marker.getLatLng();
              selectMapPointRef.current({
                latitude: movedTo.lat,
                longitude: movedTo.lng,
              });
            });
          }
        }

        const selectMapPoint = (coordinates: Coordinates) => {
          const requestId = ++geocodeRequestRef.current;
          const selection = {
            address: "",
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
          };
          onChangeRef.current?.(selection);
          setSearchError("");
          setIsSearching(true);
          moveMarker(coordinates);

          void reverseSearchOpenStreetMapAddress(
            coordinates.latitude,
            coordinates.longitude,
            geocodingLanguage(languageRef.current),
          )
            .then((address) => {
              if (requestId !== geocodeRequestRef.current) return;
              if (address) {
                onChangeRef.current?.({ ...selection, address });
              } else {
                setSearchError(
                  messages[languageRef.current].pointAddressMissing,
                );
              }
            })
            .catch(() => {
              if (requestId === geocodeRequestRef.current) {
                setSearchError(messages[languageRef.current].reverseError);
              }
            })
            .finally(() => {
              if (requestId === geocodeRequestRef.current) {
                setIsSearching(false);
              }
            });
        };
        selectMapPointRef.current = selectMapPoint;

        if (initialCoordinates) {
          moveMarker({
            latitude: initialValue.latitude,
            longitude: initialValue.longitude,
          });
        }
        if (!readOnly) {
          mapClickHandler = (event) => {
            selectMapPoint({
              latitude: event.latlng.lat,
              longitude: event.latlng.lng,
            });
          };
          map.on("click", mapClickHandler);
        }
        if (typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(() => map.invalidateSize());
          resizeObserver.observe(mapElementRef.current);
        }
        setIsMapReady(true);
      } catch {
        if (active) setMapError(messages[languageRef.current].mapError);
      }
    }

    void initializeMap();
    return () => {
      active = false;
      resizeObserver?.disconnect();
      if (mapClickHandler) mapRef.current?.off("click", mapClickHandler);
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
    };
  }, [readOnly]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;
    if (value.latitude === null || value.longitude === null) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    const position: [number, number] = [value.latitude, value.longitude];
    map.setView(position, Math.max(map.getZoom(), 15));
    if (markerRef.current) {
      markerRef.current.setLatLng(position);
    }
  }, [isMapReady, value.latitude, value.longitude]);

  async function searchAddress() {
    const address = value.address.trim();
    if (!address) {
      setSearchError(text.enterAddress);
      return;
    }
    if (!isMapReady) {
      setSearchError(text.searchUnavailable);
      return;
    }

    const requestId = ++geocodeRequestRef.current;
    setIsSearching(true);
    setSearchError("");
    try {
      const place = await searchOpenStreetMapAddress(
        address,
        geocodingLanguage(languageRef.current),
      );
      if (requestId !== geocodeRequestRef.current) return;
      if (!place) {
        setSearchError(text.noMatch);
        return;
      }
      onChangeRef.current?.(place);
      mapRef.current?.setView([place.latitude, place.longitude], 16);
      const leaflet = leafletRef.current;
      if (leaflet && mapRef.current) {
        const position: [number, number] = [place.latitude, place.longitude];
        if (markerRef.current) {
          markerRef.current.setLatLng(position);
        } else {
          const icon: DivIcon = leaflet.divIcon({
            className: "osm-marker-icon",
            html: '<span class="osm-marker-pin osm-marker-pin-location"></span>',
            iconSize: [28, 36],
            iconAnchor: [14, 34],
          });
          markerRef.current = leaflet
            .marker(position, { draggable: !readOnly, icon })
            .addTo(mapRef.current);
          if (!readOnly) {
            markerRef.current.on("dragend", () => {
              const movedTo = markerRef.current?.getLatLng();
              if (movedTo) {
                selectMapPointRef.current({
                  latitude: movedTo.lat,
                  longitude: movedTo.lng,
                });
              }
            });
          }
        }
      }
    } catch {
      if (requestId === geocodeRequestRef.current) {
        setSearchError(text.searchError);
      }
    } finally {
      if (requestId === geocodeRequestRef.current) setIsSearching(false);
    }
  }

  return (
    <div
      className={`google-map-location${compact ? " google-map-location-compact" : ""}${readOnly ? " google-map-location-readonly" : ""}`}
    >
      {!readOnly && (
        <div className="google-map-search">
          <label htmlFor={addressInputId}>{text.address}</label>
          <div className="google-map-search-row">
            <input
              autoComplete="street-address"
              id={addressInputId}
              maxLength={120}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void searchAddress();
                }
              }}
              onChange={(event) => {
                geocodeRequestRef.current += 1;
                setIsSearching(false);
                setSearchError("");
                onChangeRef.current?.({
                  address: event.target.value,
                  latitude: null,
                  longitude: null,
                });
              }}
              placeholder={text.placeholder}
              value={value.address}
            />
            <button
              disabled={!isMapReady || isSearching}
              onClick={() => void searchAddress()}
              type="button"
            >
              {isSearching ? text.searching : text.search}
            </button>
          </div>
        </div>
      )}
      <div className="google-map-canvas-wrap">
        <div
          aria-label={text.mapLabel}
          className="google-map-canvas"
          ref={mapElementRef}
          role="application"
        />
        {!isMapReady && !mapError && (
          <div className="google-map-overlay">{text.loading}</div>
        )}
        {mapError && (
          <div className="google-map-overlay google-map-error" role="alert">
            {mapError}
          </div>
        )}
      </div>
      {readOnly && <p className="google-map-address">{value.address}</p>}
      {!readOnly && (
        <>
          <p className="google-map-hint">{text.pointHint}</p>
          {searchError && (
            <p className="google-map-feedback" role="alert">
              {searchError}
            </p>
          )}
        </>
      )}
    </div>
  );
}
