export type OpenStreetMapPlace = {
  latitude: number;
  longitude: number;
  address: string;
};

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
};

let requestQueue = Promise.resolve();
let lastRequestAt = 0;

export function getOpenStreetMapTileUrl() {
  return "https://tile.openstreetmap.de/{z}/{x}/{y}.png";
}

function isNominatimResult(value: unknown): value is NominatimResult {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result.lat === "string" &&
    typeof result.lon === "string" &&
    typeof result.display_name === "string"
  );
}

async function requestNominatim(url: URL): Promise<unknown> {
  const previousRequest = requestQueue;
  let releaseRequest = () => {};
  requestQueue = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });
  await previousRequest;

  try {
    const waitTime = Math.max(0, 1000 - (Date.now() - lastRequestAt));
    if (waitTime > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, waitTime));
    }

    lastRequestAt = Date.now();
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`OpenStreetMap geocoding failed (${response.status}).`);
    }
    return await response.json();
  } finally {
    releaseRequest();
  }
}

function parsePlace(result: NominatimResult): OpenStreetMapPlace | null {
  const latitude = Number(result.lat);
  const longitude = Number(result.lon);
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }
  return {
    latitude,
    longitude,
    address: result.display_name,
  };
}

export async function searchOpenStreetMapAddress(
  address: string,
  language: string,
): Promise<OpenStreetMapPlace | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.search = new URLSearchParams({
    q: address,
    format: "jsonv2",
    limit: "1",
    countrycodes: "kz",
    "accept-language": language,
  }).toString();

  const data = await requestNominatim(url);
  if (!Array.isArray(data)) {
    throw new Error("OpenStreetMap returned an invalid search response.");
  }
  const result = data.find(isNominatimResult);
  return result ? parsePlace(result) : null;
}

export async function reverseSearchOpenStreetMapAddress(
  latitude: number,
  longitude: number,
  language: string,
): Promise<string | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.search = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: "jsonv2",
    "accept-language": language,
  }).toString();

  const data = await requestNominatim(url);
  if (
    typeof data !== "object" ||
    data === null ||
    !("display_name" in data) ||
    typeof data.display_name !== "string"
  ) {
    return null;
  }
  return data.display_name;
}
