const COUNTRY_CODES = ["AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX","AZ","BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS","BT","BV","BW","BY","BZ","CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN","CO","CR","CU","CV","CW","CX","CY","CZ","DE","DJ","DK","DM","DO","DZ","EC","EE","EG","EH","ER","ES","ET","FI","FJ","FK","FM","FO","FR","GA","GB","GD","GE","GF","GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY","HK","HM","HN","HR","HT","HU","ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT","JE","JM","JO","JP","KE","KG","KH","KI","KM","KN","KP","KR","KW","KY","KZ","LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY","MA","MC","MD","ME","MF","MG","MH","MK","ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ","NA","NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ","OM","PA","PE","PF","PG","PH","PK","PL","PM","PN","PR","PS","PT","PW","PY","QA","RE","RO","RS","RU","RW","SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS","ST","SV","SX","SY","SZ","TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO","TR","TT","TV","TW","TZ","UA","UG","UM","US","UY","UZ","VA","VC","VE","VG","VI","VN","VU","WF","WS","YE","YT","ZA","ZM","ZW"];

const COUNTRY_ALIASES = {
  BO: ["Bolivia"],
  BN: ["Brunei"],
  CD: ["DR Congo", "Democratic Republic of the Congo", "Congo-Kinshasa"],
  CG: ["Republic of the Congo", "Congo-Brazzaville"],
  CI: ["Ivory Coast"],
  CZ: ["Czech Republic"],
  GB: ["United Kingdom", "UK", "Great Britain"],
  IR: ["Iran"],
  KR: ["South Korea"],
  KP: ["North Korea"],
  LA: ["Laos"],
  MD: ["Moldova"],
  PS: ["Palestine"],
  RU: ["Russia"],
  SY: ["Syria"],
  SZ: ["Eswatini", "Swaziland"],
  TZ: ["Tanzania"],
  TR: ["Türkiye", "Turkey"],
  TW: ["Taiwan"],
  US: ["United States", "USA", "United States of America"],
  VA: ["Vatican City"],
  VE: ["Venezuela"],
  VN: ["Vietnam"]
};

function createDisplayNames() {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    return null;
  }
}

export function normalizeSearch(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function countryCodeToEmoji(code) {
  return [...code]
    .map(character =>
      String.fromCodePoint(127397 + character.charCodeAt(0))
    )
    .join("");
}

export function createCountryCatalog() {
  const displayNames = createDisplayNames();
  const collator = new Intl.Collator("en", {
    sensitivity: "base",
    numeric: true
  });

  return COUNTRY_CODES
    .map(code => {
      const name = displayNames?.of(code) ?? code;
      const aliases = COUNTRY_ALIASES[code] ?? [];

      return {
        code,
        emoji: countryCodeToEmoji(code),
        name,
        searchTerms: [name, code, ...aliases]
          .map(normalizeSearch)
          .filter(Boolean)
      };
    })
    .sort((first, second) =>
      collator.compare(first.name, second.name)
    );
}

function scoreCountry(country, normalizedQuery) {
  const normalizedCode = country.code.toLowerCase();

  if (normalizedCode === normalizedQuery) {
    return 0;
  }

  let bestScore = Number.POSITIVE_INFINITY;

  for (const term of country.searchTerms) {
    if (term === normalizedQuery) {
      bestScore = Math.min(bestScore, 1);
    } else if (term.startsWith(normalizedQuery)) {
      bestScore = Math.min(bestScore, 2);
    } else if (
      term
        .split(/\s+/)
        .some(word => word.startsWith(normalizedQuery))
    ) {
      bestScore = Math.min(bestScore, 3);
    } else if (term.includes(normalizedQuery)) {
      bestScore = Math.min(bestScore, 4);
    }
  }

  if (normalizedCode.startsWith(normalizedQuery)) {
    bestScore = Math.min(bestScore, 5);
  }

  return bestScore;
}

export function searchCountries(catalog, query, limit = 8) {
  const normalizedQuery = normalizeSearch(query);

  if (!normalizedQuery) {
    return [];
  }

  return catalog
    .map(country => ({
      country,
      score: scoreCountry(country, normalizedQuery)
    }))
    .filter(result => Number.isFinite(result.score))
    .sort((first, second) =>
      first.score - second.score ||
      first.country.name.localeCompare(second.country.name)
    )
    .slice(0, limit)
    .map(result => result.country);
}
