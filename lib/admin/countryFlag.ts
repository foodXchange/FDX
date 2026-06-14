const COUNTRY_CODE_MAP: Record<string, string> = {
  Belgium: "BE",
  Italy: "IT",
  Spain: "ES",
  France: "FR",
  Germany: "DE",
  Netherlands: "NL",
  Portugal: "PT",
  Greece: "GR",
  Poland: "PL",
  Turkey: "TR",
  Israel: "IL",
  "United States": "US",
  "United Kingdom": "GB",
  "United Arab Emirates": "AE",
  Canada: "CA",
  Brazil: "BR",
  Mexico: "MX",
  China: "CN",
  Japan: "JP",
  "South Korea": "KR",
  Vietnam: "VN",
  "Czech Republic": "CZ",
  Australia: "AU",
  India: "IN",
  Argentina: "AR",
  Thailand: "TH",
};

export function countryToFlag(country: string | null | undefined): string | null {
  if (!country) return null;
  const code = COUNTRY_CODE_MAP[country.trim()];
  if (!code) return null;
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join("");
}
