// Renders a nationality as a Unicode flag emoji. Inputs vary by source:
// F1 supplies demonyms ("Italian"), cycling supplies 2- or 3-letter country codes.

/** Returns the flag emoji for a nationality string, or undefined if it can't be resolved. */
export function nationalityFlag(nationality: string | undefined): string | undefined {
  const alpha2 = alpha2For(nationality);
  return alpha2 ? toFlagEmoji(alpha2) : undefined;
}

function toFlagEmoji(alpha2: string): string {
  return [...alpha2.toUpperCase()]
    .map((char) => String.fromCodePoint(0x1f1e6 + char.charCodeAt(0) - 65))
    .join("");
}

function alpha2For(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  const upper = trimmed.toUpperCase();
  if (/^[A-Z]{3}$/.test(upper) && ALPHA3[upper]) {
    return ALPHA3[upper];
  }

  return DEMONYM[trimmed.toLowerCase()];
}

// Demonyms used by the F1 entry list, plus common motorsport/endurance nations.
const DEMONYM: Record<string, string> = {
  american: "US",
  argentine: "AR",
  argentinian: "AR",
  australian: "AU",
  austrian: "AT",
  belgian: "BE",
  brazilian: "BR",
  british: "GB",
  bulgarian: "BG",
  canadian: "CA",
  chinese: "CN",
  colombian: "CO",
  croatian: "HR",
  czech: "CZ",
  danish: "DK",
  dutch: "NL",
  ecuadorian: "EC",
  english: "GB",
  eritrean: "ER",
  estonian: "EE",
  finnish: "FI",
  french: "FR",
  german: "DE",
  greek: "GR",
  hungarian: "HU",
  irish: "IE",
  italian: "IT",
  japanese: "JP",
  kenyan: "KE",
  latvian: "LV",
  luxembourgish: "LU",
  mexican: "MX",
  monegasque: "MC",
  "new zealander": "NZ",
  norwegian: "NO",
  polish: "PL",
  portuguese: "PT",
  russian: "RU",
  scottish: "GB",
  slovak: "SK",
  slovakian: "SK",
  slovenian: "SI",
  "south african": "ZA",
  spanish: "ES",
  swedish: "SE",
  swiss: "CH",
  thai: "TH",
  ukrainian: "UA",
  welsh: "GB",
};

// 3-letter codes (IOC and ISO 3166-1 alpha-3 variants) → alpha-2.
const ALPHA3: Record<string, string> = {
  ARG: "AR",
  AUS: "AU",
  AUT: "AT",
  BEL: "BE",
  BRA: "BR",
  CAN: "CA",
  CHE: "CH",
  CHN: "CN",
  COL: "CO",
  CRO: "HR",
  CZE: "CZ",
  DEN: "DK",
  DNK: "DK",
  ECU: "EC",
  ERI: "ER",
  ESP: "ES",
  EST: "EE",
  FIN: "FI",
  FRA: "FR",
  GBR: "GB",
  GER: "DE",
  DEU: "DE",
  GRE: "GR",
  GRC: "GR",
  HUN: "HU",
  IRL: "IE",
  ITA: "IT",
  JPN: "JP",
  KEN: "KE",
  LAT: "LV",
  LVA: "LV",
  LUX: "LU",
  MEX: "MX",
  MON: "MC",
  MCO: "MC",
  NED: "NL",
  NLD: "NL",
  NOR: "NO",
  NZL: "NZ",
  POL: "PL",
  POR: "PT",
  PRT: "PT",
  RSA: "ZA",
  ZAF: "ZA",
  RUS: "RU",
  SLO: "SI",
  SVN: "SI",
  SVK: "SK",
  SUI: "CH",
  SWE: "SE",
  THA: "TH",
  UKR: "UA",
  USA: "US",
};
