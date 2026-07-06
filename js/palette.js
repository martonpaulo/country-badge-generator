import { loadSvgImage } from "./flag-service.js";

const SAMPLE_WIDTH = 176;
const QUANTIZATION_STEP = 18;
const MIN_ALPHA = 180;
const MAX_SOURCE_COLORS = 18;
const PALETTE_SIZE = 3;

const OPTION_NAMES = [
  "Option 1",
  "Option 2",
  "Option 3"
];

const OUTPUT_COLORS = [
  { hex: "#FDF2F8", family: "pink", tone: "tint" },
  { hex: "#EFF6FF", family: "blue", tone: "tint" },
  { hex: "#E0F2FE", family: "sky", tone: "tint" },
  { hex: "#ECFEFF", family: "cyan", tone: "tint" },
  { hex: "#F0FDF4", family: "green", tone: "tint" },
  { hex: "#FEFCE8", family: "gold", tone: "tint" },
  { hex: "#FFF1F2", family: "red", tone: "tint" },
  { hex: "#FFF7ED", family: "coral", tone: "tint" },
  { hex: "#FCA5A5", family: "red", tone: "soft" },
  { hex: "#F87171", family: "red", tone: "clear" },
  { hex: "#EF4444", family: "red", tone: "clear" },
  { hex: "#DC2626", family: "red", tone: "deep" },
  { hex: "#B91C1C", family: "red", tone: "deep" },
  { hex: "#FB7185", family: "rose", tone: "clear" },
  { hex: "#E11D48", family: "rose", tone: "deep" },
  { hex: "#FB7A57", family: "coral", tone: "clear" },
  { hex: "#F97316", family: "coral", tone: "clear" },
  { hex: "#FEF3C7", family: "gold", tone: "soft" },
  { hex: "#FDE68A", family: "gold", tone: "soft" },
  { hex: "#FACC15", family: "gold", tone: "clear" },
  { hex: "#EAB308", family: "gold", tone: "clear" },
  { hex: "#F59E0B", family: "gold", tone: "clear" },
  { hex: "#D97706", family: "gold", tone: "deep" },
  { hex: "#D9F99D", family: "lime", tone: "soft" },
  { hex: "#A3E635", family: "lime", tone: "clear" },
  { hex: "#65A30D", family: "lime", tone: "deep" },
  { hex: "#BBF7D0", family: "green", tone: "soft" },
  { hex: "#4ADE80", family: "green", tone: "clear" },
  { hex: "#22C55E", family: "green", tone: "clear" },
  { hex: "#16A34A", family: "green", tone: "deep" },
  { hex: "#15803D", family: "green", tone: "deep" },
  { hex: "#CCFBF1", family: "teal", tone: "soft" },
  { hex: "#2DD4BF", family: "teal", tone: "clear" },
  { hex: "#0D9488", family: "teal", tone: "deep" },
  { hex: "#22D3EE", family: "cyan", tone: "clear" },
  { hex: "#0891B2", family: "cyan", tone: "deep" },
  { hex: "#BFDBFE", family: "blue", tone: "soft" },
  { hex: "#93C5FD", family: "blue", tone: "soft" },
  { hex: "#60A5FA", family: "blue", tone: "clear" },
  { hex: "#3B82F6", family: "blue", tone: "clear" },
  { hex: "#2563EB", family: "blue", tone: "deep" },
  { hex: "#1D4ED8", family: "blue", tone: "deep" },
  { hex: "#0369A1", family: "sky", tone: "deep" },
  { hex: "#EDE9FE", family: "violet", tone: "tint" },
  { hex: "#A78BFA", family: "violet", tone: "clear" },
  { hex: "#7C3AED", family: "violet", tone: "deep" },
  { hex: "#FBCFE8", family: "pink", tone: "soft" },
  { hex: "#DB2777", family: "pink", tone: "deep" }
];

const FAMILY_ALTERNATES = {
  red: ["red", "rose", "coral"],
  rose: ["rose", "red", "pink"],
  coral: ["coral", "red", "gold"],
  gold: ["gold"],
  lime: ["lime", "green", "gold"],
  green: ["green", "lime", "teal"],
  teal: ["teal", "green", "cyan"],
  cyan: ["cyan", "sky", "teal"],
  sky: ["sky", "blue", "cyan"],
  blue: ["blue", "sky", "cyan"],
  violet: ["violet", "blue", "pink"],
  pink: ["pink", "rose", "violet"]
};

const FAMILY_TONE_PLAN = {
  red: ["clear", "deep", "soft", "tint"],
  rose: ["clear", "deep", "soft", "tint"],
  coral: ["clear", "soft", "tint"],
  gold: ["clear", "soft", "deep", "tint"],
  lime: ["clear", "soft", "deep", "tint"],
  green: ["clear", "deep", "soft", "tint"],
  teal: ["clear", "deep", "soft", "tint"],
  cyan: ["clear", "deep", "soft", "tint"],
  sky: ["tint", "clear", "deep", "soft"],
  blue: ["clear", "deep", "soft", "tint"],
  violet: ["clear", "deep", "tint"],
  pink: ["soft", "deep", "clear", "tint"]
};

const FAMILY_ORDER = [
  "red",
  "rose",
  "coral",
  "gold",
  "lime",
  "green",
  "teal",
  "cyan",
  "sky",
  "blue",
  "violet",
  "pink"
];

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function srgbToLinear(channel) {
  const normalized = channel / 255;

  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function rgbToOklab({ r, g, b }) {
  const red = srgbToLinear(r);
  const green = srgbToLinear(g);
  const blue = srgbToLinear(b);

  const l =
    0.4122214708 * red +
    0.5363325363 * green +
    0.0514459929 * blue;

  const m =
    0.2119034982 * red +
    0.6806995451 * green +
    0.1073969566 * blue;

  const s =
    0.0883024619 * red +
    0.2817188376 * green +
    0.6299787005 * blue;

  const lRoot = Math.cbrt(l);
  const mRoot = Math.cbrt(m);
  const sRoot = Math.cbrt(s);

  return {
    l:
      0.2104542553 * lRoot +
      0.793617785 * mRoot -
      0.0040720468 * sRoot,
    a:
      1.9779984951 * lRoot -
      2.428592205 * mRoot +
      0.4505937099 * sRoot,
    b:
      0.0259040371 * lRoot +
      0.7827717662 * mRoot -
      0.808675766 * sRoot
  };
}

function quantizeChannel(channel) {
  return clamp(
    Math.round(channel / QUANTIZATION_STEP) *
      QUANTIZATION_STEP,
    0,
    255
  );
}

function channelToHex(channel) {
  return channel.toString(16).padStart(2, "0");
}

export function rgbToHex({ r, g, b }) {
  return (
    "#" +
    channelToHex(r) +
    channelToHex(g) +
    channelToHex(b)
  ).toUpperCase();
}

function hexToRgb(hex) {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16)
  };
}

export function colorDistance(first, second) {
  const firstLab = rgbToOklab(first);
  const secondLab = rgbToOklab(second);

  return Math.hypot(
    firstLab.l - secondLab.l,
    firstLab.a - secondLab.a,
    firstLab.b - secondLab.b
  );
}

function rgbDistance(first, second) {
  return Math.hypot(
    (first.r - second.r) / 255,
    (first.g - second.g) / 255,
    (first.b - second.b) / 255
  );
}

function rgbToHsl({ r, g, b }) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const lightness = (maximum + minimum) / 2;

  if (maximum === minimum) {
    return {
      h: 0,
      s: 0,
      l: lightness
    };
  }

  const delta = maximum - minimum;
  const saturation =
    lightness > 0.5
      ? delta / (2 - maximum - minimum)
      : delta / (maximum + minimum);

  let hue;

  if (maximum === red) {
    hue =
      (green - blue) / delta +
      (green < blue ? 6 : 0);
  } else if (maximum === green) {
    hue = (blue - red) / delta + 2;
  } else {
    hue = (red - green) / delta + 4;
  }

  return {
    h: hue * 60,
    s: saturation,
    l: lightness
  };
}

function relativeLuminance({ r, g, b }) {
  return (
    0.2126 * srgbToLinear(r) +
    0.7152 * srgbToLinear(g) +
    0.0722 * srgbToLinear(b)
  );
}

function contrastRatio(first, second) {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(
    firstLuminance,
    secondLuminance
  );
  const darker = Math.min(
    firstLuminance,
    secondLuminance
  );

  return (lighter + 0.05) / (darker + 0.05);
}

function familyFromRgb(rgb) {
  const hsl = rgbToHsl(rgb);

  if (hsl.s < 0.12) {
    return hsl.l > 0.72 ? "light" : "dark";
  }

  const hue = hsl.h;

  if (hue >= 345 || hue < 12) {
    return "red";
  }

  if (hue < 28) {
    return "coral";
  }

  if (hue < 72) {
    return "gold";
  }

  if (hue < 102) {
    return "lime";
  }

  if (hue < 162) {
    return "green";
  }

  if (hue < 185) {
    return "teal";
  }

  if (hue < 205) {
    return "cyan";
  }

  if (hue < 225) {
    return "sky";
  }

  if (hue < 265) {
    return "blue";
  }

  if (hue < 305) {
    return "violet";
  }

  if (hue < 340) {
    return "pink";
  }

  return "rose";
}

function familyGroup(family) {
  if (["red", "rose", "coral"].includes(family)) {
    return "red";
  }

  if (["green", "lime", "teal"].includes(family)) {
    return "green";
  }

  if (["blue", "sky", "cyan"].includes(family)) {
    return "blue";
  }

  return family;
}

function familySortIndex(family) {
  const index = FAMILY_ORDER.indexOf(family);

  return index === -1 ? FAMILY_ORDER.length : index;
}

const CURATED_PALETTE = OUTPUT_COLORS.map(
  (color, index) => {
    const rgb = hexToRgb(color.hex);

    return {
      ...color,
      id: index,
      rgb,
      hsl: rgbToHsl(rgb)
    };
  }
);

async function extractSourceColors(flagSvgText) {
  const image = await loadSvgImage(flagSvgText);
  const aspectRatio =
    image.naturalWidth > 0 && image.naturalHeight > 0
      ? image.naturalHeight / image.naturalWidth
      : 2 / 3;

  const width = SAMPLE_WIDTH;
  const height = clamp(
    Math.round(width * aspectRatio),
    96,
    176
  );

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", {
    alpha: true,
    willReadFrequently: true
  });

  if (!context) {
    throw new Error(
      "Canvas is not available in this browser."
    );
  }

  canvas.width = width;
  canvas.height = height;
  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const { data } = context.getImageData(
    0,
    0,
    width,
    height
  );

  const histogram = new Map();

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const index = (y * width + x) * 4;
      const alpha = data[index + 3];

      if (alpha < MIN_ALPHA) {
        continue;
      }

      const r = quantizeChannel(data[index]);
      const g = quantizeChannel(data[index + 1]);
      const b = quantizeChannel(data[index + 2]);
      const key = `${r},${g},${b}`;

      histogram.set(
        key,
        (histogram.get(key) ?? 0) + alpha / 255
      );
    }
  }

  const colors = [...histogram.entries()]
    .map(([key, rawWeight]) => {
      const [r, g, b] = key.split(",").map(Number);
      const rgb = { r, g, b };
      const hsl = rgbToHsl(rgb);
      const toneWeight =
        hsl.l < 0.05 || hsl.l > 0.97
          ? 0.5
          : 1;
      const saturationWeight = clamp(
        0.45 + hsl.s * 1.2,
        0.45,
        1.8
      );

      return {
        rgb,
        hsl,
        rawWeight,
        rank:
          rawWeight *
          toneWeight *
          saturationWeight
      };
    })
    .sort((first, second) =>
      second.rank - first.rank ||
      second.rawWeight - first.rawWeight
    )
    .slice(0, 80);

  const merged = [];

  for (const color of colors) {
    const duplicate = merged.find(entry =>
      colorDistance(entry.rgb, color.rgb) < 0.055
    );

    if (duplicate) {
      duplicate.rawWeight += color.rawWeight;
      duplicate.rank += color.rank;
      continue;
    }

    merged.push({ ...color });

    if (merged.length >= MAX_SOURCE_COLORS) {
      break;
    }
  }

  const totalWeight = merged.reduce(
    (sum, color) => sum + color.rawWeight,
    0
  );

  if (totalWeight <= 0) {
    return [];
  }

  return merged.map(color => ({
    ...color,
    family: familyFromRgb(color.rgb),
    weight: color.rawWeight / totalWeight
  }));
}

function buildFamilyWeights(sourceColors) {
  const weights = new Map();
  let lightWeight = 0;

  for (const source of sourceColors) {
    const family = source.family;

    if (family === "light") {
      lightWeight += source.weight;
      continue;
    }

    if (family === "dark") {
      continue;
    }

    const accentFloor =
      source.hsl.s > 0.42 && source.weight > 0.006
        ? 0.035
        : 0;

    weights.set(
      family,
      (weights.get(family) ?? 0) +
        source.weight *
          (0.65 + source.hsl.s * 0.95) +
        accentFloor
    );
  }

  return {
    weights,
    lightWeight
  };
}

function sortFamilyWeights(first, second) {
  return (
    second[1] - first[1] ||
    familySortIndex(first[0]) -
      familySortIndex(second[0])
  );
}

function targetFamiliesFor(sourceColors) {
  const { weights, lightWeight } =
    buildFamilyWeights(sourceColors);

  const sortedFamilies =
    [...weights.entries()].sort(sortFamilyWeights);

  let targets = sortedFamilies
    .filter(([, weight]) => weight >= 0.055)
    .map(([family]) => family);

  const accentFamilies = sortedFamilies
    .filter(([, weight]) => weight >= 0.025)
    .map(([family]) => family);

  for (const family of accentFamilies) {
    if (!targets.includes(family)) {
      targets.push(family);
    }
  }

  const collapsedTargets = [];

  for (const family of targets) {
    const group = familyGroup(family);
    const hasGroup = collapsedTargets.some(
      existing => familyGroup(existing) === group
    );

    if (!hasGroup) {
      collapsedTargets.push(family);
    } else if (
      collapsedTargets.length < PALETTE_SIZE &&
      ["red", "blue"].includes(group) &&
      !collapsedTargets.includes(family)
    ) {
      collapsedTargets.push(family);
    }
  }

  targets = collapsedTargets;

  if (targets.length === 0) {
    return ["blue:tint", "gold", "green"];
  }

  if (targets.length === 1) {
    const family = targets[0];
    const related =
      FAMILY_ALTERNATES[family]?.find(
        alternate => alternate !== family
      ) ?? family;

    targets.push(related);

    if (lightWeight > 0.12) {
      targets.push(`${family}:tint`);
    } else {
      targets.push(`${related}:soft`);
    }
  } else if (
    targets.length === 2 &&
    lightWeight > 0.18
  ) {
    const lightFamily = targets.some(family =>
      ["blue", "sky", "cyan"].includes(family)
    )
      ? "blue"
      : targets[0];

    targets.push(`${lightFamily}:tint`);
  }

  return targets.slice(0, PALETTE_SIZE);
}

function candidateRepresentatives(
  sourceColors,
  baseFamily
) {
  const allowedFamilies =
    FAMILY_ALTERNATES[baseFamily] ?? [baseFamily];

  return sourceColors.filter(source =>
    allowedFamilies.includes(source.family)
  );
}

function scoreCandidate({
  candidate,
  baseFamily,
  forcedTone,
  familyWeights,
  representatives,
  selected
}) {
  const tonePlan =
    forcedTone
      ? [forcedTone]
      : FAMILY_TONE_PLAN[baseFamily] ?? [
          "clear",
          "soft",
          "deep",
          "tint"
        ];

  const toneIndex = tonePlan.indexOf(candidate.tone);
  const toneBonus =
    toneIndex >= 0
      ? 0.34 - toneIndex * 0.065
      : 0;

  const exactFamilyBonus =
    candidate.family === baseFamily ? 0.32 : 0;

  const familyWeight =
    familyWeights.weights.get(baseFamily) ?? 0;

  const sourceDistanceScore =
    representatives.length > 0
      ? representatives.reduce(
          (sum, source) =>
            sum +
            source.weight *
              Math.max(
                0,
                1 -
                  rgbDistance(
                    candidate.rgb,
                    source.rgb
                  )
              ),
          0
        )
      : 0;

  const contrastScore = representatives.reduce(
    (sum, source) =>
      sum +
      source.weight *
        clamp(
          contrastRatio(candidate.rgb, source.rgb) /
            4.8,
          0,
          1
        ),
    0
  );

  const selectedPenalty = selected.reduce(
    (penalty, existing) => {
      const distance = colorDistance(
        existing.rgb,
        candidate.rgb
      );

      if (distance < 0.105) {
        return penalty + 1.1;
      }

      if (distance < 0.15) {
        return penalty + 0.35;
      }

      return penalty;
    },
    0
  );

  const tintPenalty =
    candidate.tone === "tint" &&
    selected.some(option => option.tone === "tint")
      ? 1.1
      : 0;

  return (
    exactFamilyBonus +
    toneBonus +
    familyWeight * 0.4 +
    sourceDistanceScore * 0.22 +
    contrastScore * 0.12 -
    selectedPenalty -
    tintPenalty
  );
}

function pickCandidate({
  target,
  sourceColors,
  familyWeights,
  selected
}) {
  const [baseFamily, forcedTone] =
    target.split(":");
  const allowedFamilies =
    FAMILY_ALTERNATES[baseFamily] ?? [baseFamily];
  const representatives = candidateRepresentatives(
    sourceColors,
    baseFamily
  );

  let candidates = CURATED_PALETTE.filter(
    candidate =>
      allowedFamilies.includes(candidate.family) &&
      !selected.some(
        option => option.hex === candidate.hex
      )
  );

  if (forcedTone) {
    const toneMatches = candidates.filter(
      candidate => candidate.tone === forcedTone
    );

    if (toneMatches.length > 0) {
      candidates = toneMatches;
    }
  }

  if (candidates.length === 0) {
    candidates = CURATED_PALETTE.filter(
      candidate =>
        !selected.some(
          option => option.hex === candidate.hex
        )
    );
  }

  return candidates
    .map(candidate => ({
      ...candidate,
      score: scoreCandidate({
        candidate,
        baseFamily,
        forcedTone,
        familyWeights,
        representatives,
        selected
      })
    }))
    .sort((first, second) =>
      second.score - first.score ||
      first.id - second.id
    )[0];
}

function selectCuratedPalette(sourceColors) {
  const safeSourceColors =
    sourceColors.length > 0
      ? sourceColors
      : [
          {
            rgb: { r: 59, g: 130, b: 246 },
            hsl: rgbToHsl({ r: 59, g: 130, b: 246 }),
            family: "blue",
            weight: 1
          }
        ];

  const targets = targetFamiliesFor(safeSourceColors);
  const familyWeights = buildFamilyWeights(
    safeSourceColors
  );
  const selected = [];

  for (const target of targets) {
    const candidate = pickCandidate({
      target,
      sourceColors: safeSourceColors,
      familyWeights,
      selected
    });

    if (candidate) {
      selected.push(candidate);
    }
  }

  while (selected.length < PALETTE_SIZE) {
    const fallbackTarget =
      selected[0]?.family
        ? `${selected[0].family}:tint`
        : "blue:tint";
    const candidate = pickCandidate({
      target: fallbackTarget,
      sourceColors: safeSourceColors,
      familyWeights,
      selected
    });

    if (!candidate) {
      break;
    }

    selected.push(candidate);
  }

  return selected.slice(0, PALETTE_SIZE);
}

export async function createDeterministicPalette(
  flagSvgText
) {
  const sourceColors = await extractSourceColors(
    flagSvgText
  );
  const palette = selectCuratedPalette(sourceColors);

  return palette.map((option, index) => ({
    id: index + 1,
    label: OPTION_NAMES[index],
    hex: option.hex,
    rgb: option.rgb
  }));
}
