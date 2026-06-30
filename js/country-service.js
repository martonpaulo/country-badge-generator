import {
  createCountryCatalog
} from "./countries.js";

export const COUNTRY_DATA_URL =
  "https://cdn.jsdelivr.net/npm/world-countries@5.1.0/dist/countries.json";

const CACHE_KEY =
  "country-badge-generator.country-data.v1";

function getStorage() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function readCachedPayload(storage) {
  if (!storage) {
    return null;
  }

  try {
    const cached = storage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

function writeCachedPayload(storage, payload) {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Session cache is an optimization; failure should not block use.
  }
}

export async function fetchCountryCatalog({
  signal,
  fetcher = fetch,
  storage = getStorage()
} = {}) {
  const cachedPayload =
    readCachedPayload(storage);

  if (cachedPayload) {
    try {
      return createCountryCatalog(cachedPayload);
    } catch {
      storage?.removeItem(CACHE_KEY);
    }
  }

  let response;

  try {
    response = await fetcher(COUNTRY_DATA_URL, {
      signal,
      cache: "force-cache",
      headers: {
        Accept: "application/json"
      }
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }

    throw new Error(
      "The country list could not be loaded. Check the connection and try again."
    );
  }

  if (!response.ok) {
    throw new Error(
      "The country list is temporarily unavailable."
    );
  }

  let payload;

  try {
    payload = await response.json();
  } catch {
    throw new Error(
      "The country list returned invalid JSON."
    );
  }

  const catalog = createCountryCatalog(payload);

  writeCachedPayload(storage, payload);

  return catalog;
}
