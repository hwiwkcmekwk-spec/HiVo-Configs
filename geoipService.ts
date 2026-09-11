import * as fs from "fs";
import { Reader, CityResponse, open } from "maxmind";
import { env } from "../config/env";
import { logger } from "../logger/logger";

export interface GeoInfo {
  countryCode?: string;
  country?: string;
  region?: string;
  city?: string;
  flag?: string;
}

let reader: Reader<CityResponse> | null = null;
let attemptedLoad = false;

async function getReader(): Promise<Reader<CityResponse> | null> {
  if (reader) return reader;
  if (attemptedLoad) return null; // don't retry every lookup if the file is missing
  attemptedLoad = true;

  if (!fs.existsSync(env.geoipDbPath)) {
    logger.warn("GeoIP database file not found — GeoIP lookups disabled", { path: env.geoipDbPath });
    return null;
  }

  try {
    reader = await open<CityResponse>(env.geoipDbPath);
    logger.info("GeoIP database loaded", { path: env.geoipDbPath });
    return reader;
  } catch (err) {
    logger.error("Failed to load GeoIP database", { error: String(err) });
    return null;
  }
}

function countryCodeToFlag(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

/**
 * Looks up an IP and returns only the fields MaxMind actually knows.
 * Never fills in a guess: if only the country is known, region/city stay
 * undefined so the formatter can render "Country" alone, per spec.
 */
export async function lookupGeo(ip: string): Promise<GeoInfo | null> {
  const db = await getReader();
  if (!db) return null;

  try {
    const result = db.get(ip);
    if (!result || !result.country) return null;

    const countryCode = result.country.iso_code;
    const info: GeoInfo = {
      countryCode,
      country: result.country.names?.en,
      region: result.subdivisions?.[0]?.names?.en,
      city: result.city?.names?.en,
      flag: countryCode ? countryCodeToFlag(countryCode) : undefined,
    };
    return info;
  } catch (err) {
    logger.warn("GeoIP lookup failed", { ip, error: String(err) });
    return null;
  }
}
