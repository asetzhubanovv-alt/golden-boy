"use client";

import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { useEffect, useId, useRef, useState } from "react";
import type { ItemLocation } from "@/lib/items";

type Language = "ru" | "kk" | "en";

type GoogleMapLocationProps = {
  value: ItemLocation;
  onChange?: (value: ItemLocation) => void;
  readOnly?: boolean;
  compact?: boolean;
  language?: Language;
};

const messages: Record<
  Language,
  {
    address: string;
    placeholder: string;
    search: string;
    searching: string;
    mapLabel: string;
    loading: string;
    missingKey: string;
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
    mapLabel: "Google Maps",
    loading: "Загружаем Google Maps…",
    missingKey: "Добавьте NEXT_PUBLIC_GOOGLE_MAPS_API_KEY в файл .env.local.",
    mapError: "Не удалось загрузить Google Maps.",
    pointHint: "Выберите точку на карте или переместите маркер.",
    pointAddressMissing: "Точка сохранена, но Google Maps не вернул адрес.",
    searchUnavailable: "Поиск адреса пока недоступен.",
    enterAddress: "Введите адрес для поиска.",
    noMatch: "Адрес не найден. Попробуйте уточнить запрос.",
    reverseError: "Не удалось определить адрес",
    searchError: "Не удалось найти адрес",
  },
  kk: {
    address: "Мекенжай",
    placeholder: "Мекенжайды енгізіп, картадан табыңыз",
    search: "Мекенжайды табу",
    searching: "Іздеу…",
    mapLabel: "Google Maps",
    loading: "Google Maps жүктелуде…",
    missingKey: ".env.local файлына NEXT_PUBLIC_GOOGLE_MAPS_API_KEY қосыңыз.",
    mapError: "Google Maps жүктелмеді.",
    pointHint: "Картадан нүктені таңдаңыз немесе маркерді жылжытыңыз.",
    pointAddressMissing: "Нүкте сақталды, бірақ Google Maps мекенжайды қайтармады.",
    searchUnavailable: "Мекенжай іздеу әзірге қолжетімсіз.",
    enterAddress: "Іздеу үшін мекенжайды енгізіңіз.",
    noMatch: "Мекенжай табылмады. Сұрауды нақтылап көріңіз.",
    reverseError: "Мекенжай анықталмады",
    searchError: "Мекенжай табылмады",
  },
  en: {
    address: "Address",
    placeholder: "Enter an address and find it on the map",
    search: "Find address",
    searching: "Searching…",
    mapLabel: "Google Maps",
    loading: "Loading Google Maps…",
    missingKey: "Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local.",
    mapError: "Google Maps could not be loaded.",
    pointHint: "Select a point on the map or drag the marker.",
    pointAddressMissing: "Point saved, but Google Maps did not return an address.",
    searchUnavailable: "Address search is not available yet.",
    enterAddress: "Enter an address to search.",
    noMatch: "Address not found. Try a more specific query.",
    reverseError: "Could not resolve address",
    searchError: "Could not find address",
  },
};

const DEFAULT_CENTER: google.maps.LatLngLiteral = { lat: 43.65, lng: 51.16 };
let mapsPromise: Promise<void> | null = null;
let mapsOptionsConfigured = false;

function loadGoogleMaps(language: Language): Promise<void> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) {
    return Promise.reject(new Error("MAPS_API_KEY_MISSING"));
  }

  if (!mapsOptionsConfigured) {
    setOptions({ key, v: "weekly", language, region: "KZ" });
    mapsOptionsConfigured = true;
  }
  if (!mapsPromise) {
    mapsPromise = Promise.all([
      importLibrary("maps"),
      importLibrary("geocoding"),
    ])
      .then(() => undefined)
      .catch((error: unknown) => {
        mapsPromise = null;
        throw error;
      });
  }
  return mapsPromise;
}

function errorMessage(error: unknown, language: Language): string {
  if (error instanceof Error && error.message === "MAPS_API_KEY_MISSING") {
    return messages[language].missingKey;
  }
  return error instanceof Error ? error.message : messages[language].mapError;
}

export default function GoogleMapLocation({
  value,
  onChange,
  readOnly = false,
  compact = false,
  language = "ru",
}: GoogleMapLocationProps) {
  const addressInputId = useId();
  const text = messages[language];
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const selectMapPointRef = useRef<
    (position: google.maps.LatLngLiteral) => void
  >(() => undefined);
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
    let isCancelled = false;
    const initializeMap = async () => {
      await loadGoogleMaps(languageRef.current);
      if (isCancelled || !mapElementRef.current) return;

      const { Map } = await importLibrary("maps");
      const { Geocoder } = await importLibrary("geocoding");
      if (isCancelled || !mapElementRef.current) return;

      const currentValue = valueRef.current;
      const initialPosition =
        currentValue.latitude !== null && currentValue.longitude !== null
          ? { lat: currentValue.latitude, lng: currentValue.longitude }
          : DEFAULT_CENTER;
      const map = new Map(mapElementRef.current, {
        center: initialPosition,
        zoom: currentValue.latitude !== null ? 16 : 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: "cooperative",
      });
      const geocoder = new Geocoder();
      mapRef.current = map;
      geocoderRef.current = geocoder;

      const moveMarker = (position: google.maps.LatLngLiteral) => {
        map.setCenter(position);
        if (markerRef.current) {
          markerRef.current.setPosition(position);
          return;
        }
        const marker = new google.maps.Marker({
          map,
          position,
          draggable: !readOnly,
        });
        markerRef.current = marker;
        if (!readOnly) {
          marker.addListener("dragend", () => {
            const draggedPosition = marker.getPosition();
            if (draggedPosition) {
              selectMapPointRef.current(draggedPosition.toJSON());
            }
          });
        }
      };

      const selectMapPoint = (position: google.maps.LatLngLiteral) => {
        const requestId = ++geocodeRequestRef.current;
        setIsSearching(false);
        const selection = {
          address: "",
          latitude: position.lat,
          longitude: position.lng,
        };
        onChangeRef.current?.(selection);
        setSearchError("");
        moveMarker(position);

        void geocoder
          .geocode({ location: position })
          .then(({ results }) => {
            if (requestId !== geocodeRequestRef.current) return;
            const address = results[0]?.formatted_address;
            if (address) {
              onChangeRef.current?.({ ...selection, address });
            } else {
              setSearchError(messages[languageRef.current].pointAddressMissing);
            }
          })
          .catch((error: unknown) => {
            if (requestId === geocodeRequestRef.current) {
              setSearchError(
                `${messages[languageRef.current].reverseError}: ${errorMessage(error, languageRef.current)}`,
              );
            }
          });
      };
      selectMapPointRef.current = selectMapPoint;

      const initialValue = valueRef.current;
      if (initialValue.latitude !== null && initialValue.longitude !== null) {
        moveMarker({
          lat: initialValue.latitude,
          lng: initialValue.longitude,
        });
      }
      if (!readOnly) {
        map.addListener("click", (event: google.maps.MapMouseEvent) => {
          if (event.latLng) selectMapPoint(event.latLng.toJSON());
        });
      }
      setIsMapReady(true);
    };

    void initializeMap().catch((error: unknown) => {
      if (!isCancelled) setMapError(errorMessage(error, languageRef.current));
    });

    return () => {
      isCancelled = true;
      markerRef.current?.setMap(null);
      markerRef.current = null;
      mapRef.current = null;
      geocoderRef.current = null;
    };
  }, [readOnly]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (value.latitude === null || value.longitude === null) {
      markerRef.current?.setMap(null);
      markerRef.current = null;
      return;
    }

    const position = { lat: value.latitude, lng: value.longitude };
    map.setCenter(position);
    if (markerRef.current) {
      markerRef.current.setPosition(position);
    } else {
      markerRef.current = new google.maps.Marker({
        map,
        position,
        draggable: !readOnly,
      });
      if (!readOnly) {
        markerRef.current.addListener("dragend", () => {
          const draggedPosition = markerRef.current?.getPosition();
          if (draggedPosition) {
            selectMapPointRef.current(draggedPosition.toJSON());
          }
        });
      }
    }
  }, [readOnly, value.latitude, value.longitude]);

  async function searchAddress() {
    const address = value.address.trim();
    if (!address) {
      setSearchError(text.enterAddress);
      return;
    }
    const geocoder = geocoderRef.current;
    if (!geocoder) {
      setSearchError(text.searchUnavailable);
      return;
    }

    const requestId = ++geocodeRequestRef.current;
    setIsSearching(true);
    setSearchError("");
    try {
      const { results } = await geocoder.geocode({ address });
      if (requestId !== geocodeRequestRef.current) return;
      const match = results[0];
      if (!match) {
        setSearchError(text.noMatch);
        return;
      }
      const position = match.geometry.location.toJSON();
      onChangeRef.current?.({
        address: match.formatted_address,
        latitude: position.lat,
        longitude: position.lng,
      });
      mapRef.current?.setCenter(position);
      mapRef.current?.setZoom(16);
      if (markerRef.current) {
        markerRef.current.setPosition(position);
      } else if (mapRef.current) {
        markerRef.current = new google.maps.Marker({
          map: mapRef.current,
          position,
          draggable: !readOnly,
        });
        if (!readOnly) {
          markerRef.current.addListener("dragend", () => {
            const draggedPosition = markerRef.current?.getPosition();
            if (draggedPosition) {
              selectMapPointRef.current(draggedPosition.toJSON());
            }
          });
        }
      }
    } catch (error: unknown) {
      if (requestId === geocodeRequestRef.current) {
        setSearchError(`${text.searchError}: ${errorMessage(error, language)}`);
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
