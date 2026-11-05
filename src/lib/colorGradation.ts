/**
 * Utilities to smoothly transition colors from White (100% Heaven)
 * through Grey (50% Contested) to Black (0% Heaven / 100% Hell).
 */

export interface WarThemePalette {
  backgroundColor: string;
  textColor: string;
  subTextColor: string;
  cardBg: string;
  cardBorder: string;
  headerBg: string;
  headerBorder: string;
  isLightMode: boolean;
  heavenPct: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function rgbString(r: number, g: number, b: number, a?: number): string {
  const roundR = Math.round(r);
  const roundG = Math.round(g);
  const roundB = Math.round(b);
  if (a !== undefined) {
    return `rgba(${roundR}, ${roundG}, ${roundB}, ${a})`;
  }
  return `rgb(${roundR}, ${roundG}, ${roundB})`;
}

/**
 * Calculates smooth gradient palette from White -> Grey -> Black
 * Transitions are continuously lerped with cubic smoothstep to ensure gentle, gradual shifts.
 * @param heavenPct 0 (100% Hell/Devil) to 100 (100% Heaven/Angel)
 */
export function getWarThemePalette(heavenPct: number): WarThemePalette {
  const clamped = Math.max(0, Math.min(100, heavenPct));
  const t = clamped / 100;

  // Colors defining the scale:
  // t = 1.0 (Angel 100%): Radiant soft white
  const white = { r: 250, g: 248, b: 244 };
  // t = 0.5 (Contested 50%): Balanced pleasant medium slate-grey (neither too dark nor harsh)
  const grey = { r: 138, g: 142, b: 153 };
  // t = 0.0 (Devil 100%): Deep obsidian black
  const black = { r: 4, g: 4, b: 6 };

  let currentBgR = 0;
  let currentBgG = 0;
  let currentBgB = 0;

  if (t >= 0.5) {
    // Transition from Grey (0.5) to White (1.0)
    const factor = (t - 0.5) * 2; // 0 to 1
    const ease = factor * factor * (3 - 2 * factor);
    currentBgR = lerp(grey.r, white.r, ease);
    currentBgG = lerp(grey.g, white.g, ease);
    currentBgB = lerp(grey.b, white.b, ease);
  } else {
    // Transition from Black (0.0) to Grey (0.5)
    const factor = t * 2; // 0 to 1
    const ease = factor * factor * (3 - 2 * factor);
    currentBgR = lerp(black.r, grey.r, ease);
    currentBgG = lerp(black.g, grey.g, ease);
    currentBgB = lerp(black.b, grey.b, ease);
  }

  const backgroundColor = rgbString(currentBgR, currentBgG, currentBgB);

  const isLightMode = t >= 0.40;
  const isMidRange = t >= 0.25 && t <= 0.75;

  // Maximum pigment contrast ("色素を重視・中間色付近は枠線や文字の色を濃く・強く"):
  // In light and medium-grey states (t >= 0.40), use absolute pure black #000000 and deep #09090b.
  // In dark states (t < 0.40), use pure luminous white #ffffff and zinc #f4f4f5.
  const textColor = isLightMode ? '#000000' : '#ffffff';
  const subTextColor = isLightMode ? '#09090b' : '#f4f4f5';

  const fullEase = t * t * (3 - 2 * t);

  // Smooth card background tone that gradually lightens / darkens
  const cardR = lerp(18, 255, fullEase);
  const cardG = lerp(18, 255, fullEase);
  const cardB = lerp(24, 255, fullEase);
  const cardAlpha = lerp(0.90, 0.96, fullEase);
  const cardBg = rgbString(cardR, cardG, cardB, cardAlpha);

  // Strong, pronounced card border with deep pigment contrast in intermediate range
  const borderR = isLightMode ? 0 : 255;
  const borderG = isLightMode ? 0 : 255;
  const borderB = isLightMode ? 0 : 255;
  // Much stronger border alpha in intermediate range (0.75 vs 0.35/0.40) as requested
  const borderAlpha = isMidRange ? 0.75 : (isLightMode ? 0.35 : 0.40);
  const cardBorder = rgbString(borderR, borderG, borderB, borderAlpha);

  // Header background that tracks background color smoothly
  const headerBg = rgbString(currentBgR, currentBgG, currentBgB, 0.95);
  const headerBorder = rgbString(borderR, borderG, borderB, isMidRange ? 0.55 : 0.25);

  return {
    backgroundColor,
    textColor,
    subTextColor,
    cardBg,
    cardBorder,
    headerBg,
    headerBorder,
    isLightMode,
    heavenPct: clamped
  };
}
