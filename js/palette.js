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

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function srgbToLinear(channel) {
  const normalized = channel / 255;

  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(channel) {
  return channel <= 0.0031308
    ? 12.92 * channel
    : 1.055 * channel ** (1 / 2.4) - 0.055;
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

function oklabToRgb({ l, a, b }) {
  const lRoot =
    l +
    0.3963377774 * a +
    0.2158037573 * b;

  const mRoot =
    l -
    0.1055613458 * a -
    0.0638541728 * b;

  const sRoot =
    l -
    0.0894841775 * a -
    1.291485548 * b;

  const lLinear = lRoot ** 3;
  const mLinear = mRoot ** 3;
  const sLinear = sRoot ** 3;

  const red =
    4.0767416621 * lLinear -
    3.3077115913 * mLinear +
    0.2309699292 * sLinear;

  const green =
    -1.2684380046 * lLinear +
    2.6097574011 * mLinear -
    0.3413193965 * sLinear;

  const blue =
    -0.0041960863 * lLinear -
    0.7034186147 * mLinear +
    1.707614701 * sLinear;

  return {
    r: Math.round(clamp(linearToSrgb(red), 0, 1) * 255),
    g: Math.round(clamp(linearToSrgb(green), 0, 1) * 255),
    b: Math.round(clamp(linearToSrgb(blue), 0, 1) * 255)
  };
}

function rgbToOklch(rgb) {
  const lab = rgbToOklab(rgb);
  const chroma = Math.hypot(lab.a, lab.b);
  const hue =
    chroma < 0.0001
      ? 0
      : (
          Math.atan2(lab.b, lab.a) *
          180 /
          Math.PI +
          360
        ) % 360;

  return {
    l: lab.l,
    c: chroma,
    h: hue
  };
}

function oklchToRgb({ l, c, h }) {
  const radians = h * Math.PI / 180;

  return oklabToRgb({
    l,
    a: c * Math.cos(radians),
    b: c * Math.sin(radians)
  });
}

function isInSrgbGamut({ l, c, h }) {
  const radians = h * Math.PI / 180;
  const a = c * Math.cos(radians);
  const b = c * Math.sin(radians);

  const lRoot =
    l +
    0.3963377774 * a +
    0.2158037573 * b;

  const mRoot =
    l -
    0.1055613458 * a -
    0.0638541728 * b;

  const sRoot =
    l -
    0.0894841775 * a -
    1.291485548 * b;

  const lLinear = lRoot ** 3;
  const mLinear = mRoot ** 3;
  const sLinear = sRoot ** 3;

  const red =
    4.0767416621 * lLinear -
    3.3077115913 * mLinear +
    0.2309699292 * sLinear;

  const green =
    -1.2684380046 * lLinear +
    2.6097574011 * mLinear -
    0.3413193965 * sLinear;

  const blue =
    -0.0041960863 * lLinear -
    0.7034186147 * mLinear +
    1.707614701 * sLinear;

  return (
    red >= 0 &&
    red <= 1 &&
    green >= 0 &&
    green <= 1 &&
    blue >= 0 &&
    blue <= 1
  );
}

function gamutMapOklch(color) {
  let chroma = color.c;

  while (
    chroma > 0.01 &&
    !isInSrgbGamut({
      ...color,
      c: chroma
    })
  ) {
    chroma -= 0.004;
  }

  return {
    ...color,
    c: Math.max(chroma, 0)
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

function rgbToHex({ r, g, b }) {
  return (
    "#" +
    channelToHex(r) +
    channelToHex(g) +
    channelToHex(b)
  ).toUpperCase();
}

function colorDistance(first, second) {
  const firstLab = rgbToOklab(first);
  const secondLab = rgbToOklab(second);

  return Math.hypot(
    firstLab.l - secondLab.l,
    firstLab.a - secondLab.a,
    firstLab.b - secondLab.b
  );
}

function hueDistance(firstHue, secondHue) {
  const difference =
    Math.abs(firstHue - secondHue) % 360;

  return Math.min(difference, 360 - difference);
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

function weightedAverage(entries, selector) {
  return entries.reduce(
    (sum, entry) =>
      sum + selector(entry) * entry.weight,
    0
  );
}

function weightedPercentile(
  entries,
  selector,
  percentile
) {
  const sorted = [...entries].sort(
    (first, second) =>
      selector(first) - selector(second)
  );

  let accumulatedWeight = 0;

  for (const entry of sorted) {
    accumulatedWeight += entry.weight;

    if (accumulatedWeight >= percentile) {
      return selector(entry);
    }
  }

  return selector(sorted.at(-1));
}

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
    .map(([key, weight]) => {
      const [r, g, b] = key.split(",").map(Number);
      const rgb = { r, g, b };
      const oklch = rgbToOklch(rgb);

      const toneWeight =
        oklch.l < 0.08 || oklch.l > 0.96
          ? 0.3
          : 1;

      const chromaWeight = clamp(
        0.38 + oklch.c / 0.16,
        0.38,
        1.55
      );

      return {
        rgb,
        oklch,
        rawWeight: weight,
        rank:
          weight *
          toneWeight *
          chromaWeight
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

  return merged.map(color => ({
    ...color,
    weight: color.rawWeight / totalWeight
  }));
}

function selectDistinctSources(sourceColors) {
  const chromatic = sourceColors.filter(
    color =>
      color.oklch.c >= 0.045 &&
      color.oklch.l >= 0.1 &&
      color.oklch.l <= 0.94
  );

  const pool =
    chromatic.length > 0
      ? chromatic
      : sourceColors;

  const selected = [];

  for (const candidate of pool) {
    const isDistinct = selected.every(existing => {
      const distance = colorDistance(
        existing.rgb,
        candidate.rgb
      );

      const hueGap = hueDistance(
        existing.oklch.h,
        candidate.oklch.h
      );

      return distance >= 0.08 || hueGap >= 28;
    });

    if (isDistinct) {
      selected.push(candidate);
    }

    if (selected.length === PALETTE_SIZE) {
      break;
    }
  }

  const primary =
    selected[0] ??
    sourceColors[0] ?? {
      rgb: { r: 59, g: 130, b: 246 },
      oklch: rgbToOklch({
        r: 59,
        g: 130,
        b: 246
      }),
      weight: 1
    };

  const fallbackHueOffsets = [24, -24, 48];

  while (selected.length < PALETTE_SIZE) {
    const offset =
      fallbackHueOffsets[selected.length - 1] ?? 36;

    const syntheticOklch = {
      l: primary.oklch.l,
      c: Math.max(primary.oklch.c, 0.1),
      h: (primary.oklch.h + offset + 360) % 360
    };

    selected.push({
      rgb: oklchToRgb(
        gamutMapOklch(syntheticOklch)
      ),
      oklch: syntheticOklch,
      weight: 0.1
    });
  }

  return selected;
}

function scoreBackground(
  candidateRgb,
  sourceColors,
  targetLightness
) {
  const measurements = sourceColors.map(color => ({
    weight: color.weight,
    contrast: contrastRatio(
      candidateRgb,
      color.rgb
    ),
    distance: colorDistance(
      candidateRgb,
      color.rgb
    )
  }));

  const lowerContrast = weightedPercentile(
    measurements,
    measurement => measurement.contrast,
    0.22
  );

  const averageContrast = weightedAverage(
    measurements,
    measurement => measurement.contrast
  );

  const averageDistance = weightedAverage(
    measurements,
    measurement => measurement.distance
  );

  const candidateLightness =
    rgbToOklch(candidateRgb).l;

  const lightnessPreference =
    Math.exp(
      -(
        (
          candidateLightness -
          targetLightness
        ) / 0.17
      ) ** 2
    );

  return (
    clamp(lowerContrast / 4.5, 0, 1) * 0.22 +
    clamp(averageContrast / 5, 0, 1) * 0.13 +
    clamp(averageDistance / 0.32, 0, 1) * 0.22 +
    lightnessPreference * 0.43
  );
}

function createPolishedBackground(
  source,
  sourceColors,
  optionIndex
) {
  const targetLightnesses = [
    0.79,
    0.73,
    0.67,
    0.61,
    0.31
  ];

  const optionTargetLightness = [
    0.77,
    0.72,
    0.68
  ][optionIndex];

  const sourceChroma = source.oklch.c;
  const targetChroma = clamp(
    Math.max(sourceChroma * 1.05, 0.095),
    0.095,
    0.19
  );

  let best = null;

  for (const lightness of targetLightnesses) {
    const mapped = gamutMapOklch({
      l: lightness,
      c: targetChroma,
      h: source.oklch.h
    });

    const rgb = oklchToRgb(mapped);
    const score = scoreBackground(
      rgb,
      sourceColors,
      optionTargetLightness
    );

    if (!best || score > best.score) {
      best = {
        rgb,
        oklch: mapped,
        score
      };
    }
  }

  return best;
}

function ensurePaletteSeparation(
  palette,
  sourceColors
) {
  const result = [];

  for (const option of palette) {
    let adjusted = option;
    let attempt = 0;

    while (
      result.some(existing =>
        colorDistance(
          existing.rgb,
          adjusted.rgb
        ) < 0.075
      ) &&
      attempt < 5
    ) {
      const direction =
        attempt % 2 === 0 ? 1 : -1;

      const shifted = gamutMapOklch({
        ...adjusted.oklch,
        h:
          (
            adjusted.oklch.h +
            direction * (18 + attempt * 7) +
            360
          ) % 360
      });

      adjusted = {
        ...adjusted,
        oklch: shifted,
        rgb: oklchToRgb(shifted),
        score: scoreBackground(
          oklchToRgb(shifted),
          sourceColors,
          shifted.l
        )
      };

      attempt += 1;
    }

    result.push(adjusted);
  }

  return result;
}

export async function createDeterministicPalette(
  flagSvgText
) {
  const sourceColors = await extractSourceColors(
    flagSvgText
  );

  const distinctSources = selectDistinctSources(
    sourceColors
  );

  const rawPalette = distinctSources.map(
    (source, index) =>
      createPolishedBackground(
        source,
        sourceColors,
        index
      )
  );

  const separatedPalette = ensurePaletteSeparation(
    rawPalette,
    sourceColors
  );

  return separatedPalette.map(
    (option, index) => ({
      id: index + 1,
      label: OPTION_NAMES[index],
      hex: rgbToHex(option.rgb),
      rgb: option.rgb
    })
  );
}
