import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchCountryCatalog
} from "../../js/country-service.js";

import {
  fetchFlagSvg
} from "../../js/flag-service.js";

function createResponse({
  ok = true,
  status = 200,
  json,
  text
} = {}) {
  return {
    ok,
    status,
    json: async () => json,
    text: async () => text
  };
}

test("country service reports network and CORS-style failures", async () => {
  await assert.rejects(
    () => fetchCountryCatalog({
      fetcher: async () => {
        throw new TypeError("Failed to fetch");
      },
      storage: null
    }),
    /country list could not be loaded/
  );
});

test("country service rejects unavailable, invalid, and malformed payloads", async () => {
  await assert.rejects(
    () => fetchCountryCatalog({
      fetcher: async () => createResponse({ ok: false, status: 503 }),
      storage: null
    }),
    /temporarily unavailable/
  );

  await assert.rejects(
    () => fetchCountryCatalog({
      fetcher: async () => ({
        ok: true,
        json: async () => {
          throw new SyntaxError("Invalid JSON");
        }
      }),
      storage: null
    }),
    /invalid JSON/
  );

  await assert.rejects(
    () => fetchCountryCatalog({
      fetcher: async () => createResponse({ json: { invalid: true } }),
      storage: null
    }),
    /unsupported format/
  );
});

test("flag service reports unsupported and unavailable flags", async () => {
  await assert.rejects(
    () => fetchFlagSvg({
      countryCode: "",
      flagUrl: ""
    }),
    /supported flag/
  );

  await assert.rejects(
    () => fetchFlagSvg({
      countryCode: "BR",
      flagUrl: "https://flagcdn.com/br.svg",
      fetcher: async () => createResponse({ ok: false, status: 404 })
    }),
    /unavailable/
  );
});

test("flag service rejects network failures and malformed SVG", async () => {
  await assert.rejects(
    () => fetchFlagSvg({
      countryCode: "PY",
      flagUrl: "https://flagcdn.com/py.svg",
      fetcher: async () => {
        throw new TypeError("Failed to fetch");
      }
    }),
    /could not be loaded/
  );

  await assert.rejects(
    () => fetchFlagSvg({
      countryCode: "ES",
      flagUrl: "https://flagcdn.com/es.svg",
      fetcher: async () => createResponse({
        text: "not svg"
      })
    }),
    /malformed SVG/
  );
});
