import React from 'react';

interface BackgroundArtworkProps {
  heavenPct: number; // 0 to 100
}

interface FlowerConfig {
  x: number;
  y: number;
  baseScale: number;
  rotation: number;
  animClass: string;
}

const FLOWERS: FlowerConfig[] = [
  { x: 500, y: 360, baseScale: 1.15, rotation: 0, animClass: 'flower-float-slow' },
  { x: 220, y: 240, baseScale: 0.82, rotation: -12, animClass: 'flower-float-mid' },
  { x: 780, y: 250, baseScale: 0.8, rotation: 10, animClass: 'flower-float-slow' },
  { x: 130, y: 480, baseScale: 0.68, rotation: -6, animClass: 'flower-float-mid' },
  { x: 870, y: 490, baseScale: 0.72, rotation: 8, animClass: 'flower-float-slow' },
  { x: 310, y: 640, baseScale: 0.62, rotation: -15, animClass: 'flower-float-slow' },
  { x: 690, y: 630, baseScale: 0.65, rotation: 14, animClass: 'flower-float-mid' }
];

export function BackgroundArtwork({ heavenPct }: BackgroundArtworkProps) {
  const t = Math.max(0, Math.min(100, heavenPct)) / 100;
  const hellPct = 100 - heavenPct;

  // STRICT REQUIREMENT 1: 3 Light beams active ONLY when Angel leads (heavenPct > 50)
  const isAngelLeading = heavenPct > 50;
  // angelLead ranges from 0.0 at 50% to 1.0 at 100%
  const angelLead = isAngelLeading ? Math.max(0, Math.min(1, (heavenPct - 50) / 50)) : 0;

  // Scaling of beams:
  // - "上から出現する" (emerges from the top down): beam reach scales with angelLead
  // - "色の強度" (color intensity): opacity and saturation scale with angelLead
  const beamReachHeight = 160 + angelLead * 880; // starts near top and reaches full depth at 100%
  const beamScaleY = 0.2 + angelLead * 0.8;
  const beamOpacity = 0.28 + angelLead * 0.72;

  // STRICT REQUIREMENT 2: Fire active when Demon leads (heavenPct < 50, i.e. hellPct > 50)
  const isDemonLeading = heavenPct < 50;
  // demonLead ranges from 0.0 at 50% to 1.0 at 0% heaven (100% hell)
  const demonLead = isDemonLeading ? Math.max(0, Math.min(1, (50 - heavenPct) / 50)) : 0;
  // Flame surge factor (0.2 at slight lead up to 1.0 at overwhelming dominance)
  const flameFactor = demonLead;
  const flameHeight = 160 + demonLead * 440; // in 800px bottom coordinate system
  const flameOpacity = 0.35 + demonLead * 0.65;

  // Flower bloom stage (0 to 1)
  const bloomStage = t;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
      {/* Dynamic Ambient Background Glow Mesh */}
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          opacity: 0.85,
          background: isAngelLeading
            ? `radial-gradient(circle at 50% 0%, rgba(254, 240, 138, ${0.2 + angelLead * 0.45}), rgba(255, 255, 255, ${0.1 + angelLead * 0.25}) 45%, transparent 75%)`
            : isDemonLeading
            ? `radial-gradient(circle at 50% 100%, rgba(220, 38, 38, ${0.25 + demonLead * 0.55}), rgba(69, 10, 10, ${0.2 + demonLead * 0.45}) 50%, transparent 85%)`
            : `radial-gradient(circle at 50% 50%, rgba(148, 163, 184, 0.1), transparent 70%)`
        }}
      />

      {/* =========================================================================
          LAYER 1: STEMLESS CELESTIAL FLOWERS (Centered field across the viewport)
          ========================================================================= */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Flower Petal Gradients */}
          <linearGradient id="petalHeavenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#fef08a" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.7" />
          </linearGradient>

          <linearGradient id="petalMidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fef9c3" stopOpacity="0.88" />
            <stop offset="65%" stopColor="#e2e8f0" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.6" />
          </linearGradient>

          <linearGradient id="petalHellGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#991b1b" stopOpacity="0.8" />
            <stop offset="65%" stopColor="#450a0a" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#18181b" stopOpacity="0.9" />
          </linearGradient>

          <radialGradient id="flowerHaloGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Floating stemless flowers blooming/curling based on war ratio */}
        <g id="celestialFlowersField">
          {FLOWERS.map((flw, idx) => {
            const scale = flw.baseScale * (0.62 + bloomStage * 0.62);
            const flowerOpacity = Math.max(0.18, Math.min(0.92, 0.35 + bloomStage * 0.6 - (flw.y > 550 ? demonLead * 0.35 : 0)));
            const petalSpread = 16 + bloomStage * 28;
            const petalLength = 28 + bloomStage * 32;

            const isHeavenTone = bloomStage >= 0.55;
            const isHellTone = bloomStage < 0.40;
            const petalFill = isHeavenTone
              ? 'url(#petalHeavenGrad)'
              : isHellTone
              ? 'url(#petalHellGrad)'
              : 'url(#petalMidGrad)';

            return (
              <g
                key={idx}
                className={flw.animClass}
                transform={`translate(${flw.x}, ${flw.y}) rotate(${flw.rotation}) scale(${scale})`}
                style={{
                  opacity: flowerOpacity,
                  transition: 'opacity 0.7s ease, transform 0.7s ease'
                }}
              >
                {/* Divine Halo behind flower (radiates when Heaven is high) */}
                {bloomStage > 0.4 && (
                  <circle
                    cx="0"
                    cy="0"
                    r={petalLength + 22}
                    fill="url(#flowerHaloGrad)"
                    style={{
                      opacity: Math.max(0, (bloomStage - 0.4) * 1.5),
                      transition: 'opacity 0.6s ease'
                    }}
                  />
                )}

                {/* Symmetrical Stemless Lotus / Blossom Petals */}
                <g>
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                    <g key={angle} transform={`rotate(${angle})`}>
                      <path
                        d={`M 0 0 
                            C ${-petalSpread * 0.6} ${-petalLength * 0.35} ${-petalSpread * 0.7} ${-petalLength * 0.8} 0 ${-petalLength} 
                            C ${petalSpread * 0.7} ${-petalLength * 0.8} ${petalSpread * 0.6} ${-petalLength * 0.35} 0 0 Z`}
                        fill={petalFill}
                        opacity={0.8}
                      />
                    </g>
                  ))}
                </g>

                {/* Inner Petals (staggered ring) */}
                {bloomStage > 0.25 && (
                  <g style={{ opacity: Math.min(1, (bloomStage - 0.2) * 2.5) }}>
                    {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((angle) => (
                      <g key={angle} transform={`rotate(${angle}) scale(0.72)`}>
                        <path
                          d={`M 0 0 
                              C ${-petalSpread * 0.55} ${-petalLength * 0.4} ${-petalSpread * 0.65} ${-petalLength * 0.85} 0 ${-petalLength} 
                              C ${petalSpread * 0.65} ${-petalLength * 0.85} ${petalSpread * 0.55} ${-petalLength * 0.4} 0 0 Z`}
                          fill={isHeavenTone ? '#ffffff' : isHellTone ? '#7f1d1d' : '#fef08a'}
                          opacity={0.88}
                        />
                      </g>
                    ))}
                  </g>
                )}

                {/* Core */}
                <circle
                  cx="0"
                  cy="0"
                  r={8 + bloomStage * 6}
                  fill={isHellTone ? '#991b1b' : '#fbbf24'}
                  opacity={0.9}
                />
                <circle
                  cx="0"
                  cy="0"
                  r={4 + bloomStage * 3}
                  fill={isHellTone ? '#18181b' : '#ffffff'}
                  opacity={0.95}
                />
              </g>
            );
          })}
        </g>
      </svg>

      {/* =========================================================================
          LAYER 2: HELLFIRE & FLAMES (Anchored firmly to BOTTOM via xMidYMax slice)
          Only active & visible when Demon leads (heavenPct < 50, i.e. hellPct > 50)
          ========================================================================= */}
      {isDemonLeading && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 1000 800"
          preserveAspectRatio="xMidYMax slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Multi-tier Fire Gradients (Bottom Y=800 to Top Y=200) */}
            <linearGradient id="infernalBackGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#450a0a" stopOpacity="0.95" />
              <stop offset="35%" stopColor="#7f1d1d" stopOpacity="0.88" />
              <stop offset="70%" stopColor="#b91c1c" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="infernalMidGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#991b1b" stopOpacity="0.95" />
              <stop offset="30%" stopColor="#c2410c" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#ea580c" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="infernalFrontGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#ea580c" stopOpacity="0.98" />
              <stop offset="30%" stopColor="#f59e0b" stopOpacity="0.92" />
              <stop offset="65%" stopColor="#fbbf24" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
            </linearGradient>

            <radialGradient id="infernalBaseGlow" cx="50%" cy="100%" r="75%">
              <stop offset="0%" stopColor="#ea580c" stopOpacity="0.6" />
              <stop offset="35%" stopColor="#dc2626" stopOpacity="0.45" />
              <stop offset="70%" stopColor="#7f1d1d" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Group wrapper with smooth fade & surge */}
          <g
            className="transition-opacity duration-700"
            style={{ opacity: flameOpacity }}
          >
            {/* Base infernal ambient glow dome anchored to the bottom edge */}
            <rect
              x="0"
              y={800 - flameHeight * 1.15}
              width="1000"
              height={flameHeight * 1.15}
              fill="url(#infernalBaseGlow)"
            />

            {/* Distant Demonic Gothic Spires rising from hellish bottom */}
            <g opacity={Math.min(0.65, 0.2 + demonLead * 0.45)}>
              <path
                d="M 60 800 L 90 520 L 110 560 L 140 480 L 170 570 L 210 450 L 240 540 L 300 800 Z"
                fill="#18040a"
              />
              <path
                d="M 700 800 L 750 490 L 780 570 L 820 440 L 860 550 L 900 480 L 940 800 Z"
                fill="#18040a"
              />
            </g>

            {/* Back Deep Flame Surge (Layer 3) */}
            <g className="flame-layer-3">
              <path
                d={`M 0 800 
                    L 0 ${800 - flameHeight * 0.85} 
                    Q 70 ${760 - flameHeight * 0.95} 130 ${790 - flameHeight * 0.82} 
                    Q 210 ${740 - flameHeight * 1.05} 280 ${780 - flameHeight * 0.84} 
                    Q 370 ${730 - flameHeight * 1.12} 440 ${775 - flameHeight * 0.88} 
                    Q 530 ${710 - flameHeight * 1.18} 610 ${770 - flameHeight * 0.85} 
                    Q 710 ${740 - flameHeight * 1.05} 790 ${785 - flameHeight * 0.82} 
                    Q 890 ${750 - flameHeight * 0.98} 950 ${780 - flameHeight * 0.86} 
                    L 1000 ${790 - flameHeight * 0.82} 
                    L 1000 800 Z`}
                fill="url(#infernalBackGrad)"
              />
            </g>

            {/* Mid Vibrantly Licking Flame Crests (Layer 2) */}
            <g className="flame-layer-2">
              <path
                d={`M 0 800 
                    L 0 ${800 - flameHeight * 0.65} 
                    Q 50 ${770 - flameHeight * 0.78} 100 ${795 - flameHeight * 0.62} 
                    Q 170 ${750 - flameHeight * 0.88} 240 ${790 - flameHeight * 0.65} 
                    Q 320 ${740 - flameHeight * 0.95} 390 ${785 - flameHeight * 0.68} 
                    Q 470 ${730 - flameHeight * 1.02} 550 ${780 - flameHeight * 0.7} 
                    Q 640 ${740 - flameHeight * 0.94} 720 ${788 - flameHeight * 0.64} 
                    Q 810 ${750 - flameHeight * 0.86} 880 ${792 - flameHeight * 0.62} 
                    Q 930 ${765 - flameHeight * 0.8} 1000 ${785 - flameHeight * 0.65} 
                    L 1000 800 Z`}
                fill="url(#infernalMidGrad)"
              />
            </g>

            {/* Front Fierce Golden/Orange Tongues (Layer 1) */}
            <g className="flame-layer-1">
              <path
                d={`M 0 800 
                    L 0 ${800 - flameHeight * 0.45} 
                    Q 40 ${780 - flameHeight * 0.58} 80 ${795 - flameHeight * 0.42} 
                    Q 140 ${760 - flameHeight * 0.68} 200 ${790 - flameHeight * 0.45} 
                    Q 280 ${755 - flameHeight * 0.74} 350 ${792 - flameHeight * 0.44} 
                    Q 430 ${745 - flameHeight * 0.8} 500 ${790 - flameHeight * 0.48} 
                    Q 590 ${750 - flameHeight * 0.75} 660 ${792 - flameHeight * 0.43} 
                    Q 750 ${760 - flameHeight * 0.68} 820 ${790 - flameHeight * 0.46} 
                    Q 900 ${770 - flameHeight * 0.6} 950 ${795 - flameHeight * 0.41} 
                    L 1000 ${790 - flameHeight * 0.45} 
                    L 1000 800 Z`}
                fill="url(#infernalFrontGrad)"
              />
            </g>

            {/* Animated Rising Sparks and Fiery Embers drifting upwards */}
            <g opacity={Math.min(1, 0.4 + demonLead * 0.6)}>
              <circle cx="160" cy={800 - flameHeight * 0.65} r="3" fill="#fef08a" className="ember-1" />
              <circle cx="270" cy={800 - flameHeight * 0.8} r="2.5" fill="#f59e0b" className="ember-2" />
              <circle cx="360" cy={800 - flameHeight * 0.88} r="3.5" fill="#fbbf24" className="ember-3" />
              <circle cx="480" cy={800 - flameHeight * 0.95} r="2" fill="#fef08a" className="ember-4" />
              <circle cx="580" cy={800 - flameHeight * 0.9} r="3" fill="#f97316" className="ember-5" />
              <circle cx="680" cy={800 - flameHeight * 0.85} r="2.5" fill="#fbbf24" className="ember-6" />
              <circle cx="790" cy={800 - flameHeight * 0.75} r="3.2" fill="#fef08a" className="ember-2" />
              <circle cx="890" cy={800 - flameHeight * 0.65} r="2.5" fill="#f43f5e" className="ember-4" />
            </g>
          </g>
        </svg>
      )}

      {/* =========================================================================
          LAYER 3: EXACTLY 3 DIVINE LIGHT BEAMS
          STRICT RULES:
          1. Active ONLY when Angel is leading/dominant (heavenPct > 50).
             If heavenPct <= 50, this group is completely unrendered!
          2. "上から出現する": Beams scale and emerge from the top down as heavenPct rises.
          3. "色の強度": Opacity, brilliance and gold/white saturation scale with heavenPct.
          ========================================================================= */}
      {isAngelLeading && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="xMidYMin slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Clip path that makes the 3 beams emerge and stretch downward from the top */}
            <clipPath id="angelBeamsEmergenceClip">
              <rect x="-100" y="-30" width="1200" height={beamReachHeight} />
            </clipPath>

            {/* Radiant Yellow Beam Gradient */}
            <linearGradient id="angelRayYellowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity={0.95} />
              <stop offset="15%" stopColor="#fef08a" stopOpacity={0.88} />
              <stop offset="45%" stopColor="#fde047" stopOpacity={0.75} />
              <stop offset="75%" stopColor="#f59e0b" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.15} />
            </linearGradient>

            {/* Luminous White Beam Gradient */}
            <linearGradient id="angelRayWhiteGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity={1} />
              <stop offset="25%" stopColor="#ffffff" stopOpacity={0.95} />
              <stop offset="60%" stopColor="#fef9c3" stopOpacity={0.8} />
              <stop offset="85%" stopColor="#fef08a" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#ffffff" stopOpacity={0.2} />
            </linearGradient>

            {/* Sun/Source Crown at Top Center */}
            <radialGradient id="angelTopCrownGrad" cx="50%" cy="0%" r="70%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity={1} />
              <stop offset="25%" stopColor="#ffffff" stopOpacity={0.95} />
              <stop offset="55%" stopColor="#fef08a" stopOpacity={0.8} />
              <stop offset="80%" stopColor="#f59e0b" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
            </radialGradient>
          </defs>

          {/* Group scaling in opacity and top-down reach according to Angel's lead percentage */}
          <g
            className="transition-all duration-700"
            style={{
              opacity: beamOpacity
            }}
          >
            {/* Radiant Celestial Source at Top Center */}
            <ellipse
              cx="500"
              cy="0"
              rx={320 + angelLead * 220}
              ry={110 + angelLead * 110}
              fill="url(#angelTopCrownGrad)"
              className="divine-halo-layer pointer-events-none"
            />

            {/* Exactly 3 distinct luminous shafts of light stretching down from the top */}
            <g
              clipPath="url(#angelBeamsEmergenceClip)"
              className="divine-rays-layer pointer-events-none"
              style={{
                transformOrigin: '500px 0px',
                transform: `scale(1, ${beamScaleY})`,
                transition: 'transform 0.7s ease'
              }}
            >
              {/* BEAM 1: Left Shaft (Descends diagonally to bottom-left) */}
              <polygon
                points="450,-10 40,1000 270,1000 480,-10"
                fill="url(#angelRayYellowGrad)"
                opacity={0.75 + angelLead * 0.25}
              />
              <polygon
                points="458,-10 95,1000 215,1000 472,-10"
                fill="url(#angelRayWhiteGrad)"
                opacity={0.85 + angelLead * 0.15}
              />
              <polygon
                points="464,-10 140,1000 170,1000 468,-10"
                fill="#ffffff"
                opacity={0.7 + angelLead * 0.3}
              />

              {/* BEAM 2: Center Shaft (Descends straight down through center) */}
              <polygon
                points="475,-10 375,1000 625,1000 525,-10"
                fill="url(#angelRayYellowGrad)"
                opacity={0.8 + angelLead * 0.2}
              />
              <polygon
                points="488,-10 430,1000 570,1000 512,-10"
                fill="url(#angelRayWhiteGrad)"
                opacity={0.9 + angelLead * 0.1}
              />
              <polygon
                points="496,-10 475,1000 525,1000 504,-10"
                fill="#ffffff"
                opacity={0.8 + angelLead * 0.2}
              />

              {/* BEAM 3: Right Shaft (Descends diagonally to bottom-right) */}
              <polygon
                points="520,-10 730,1000 960,1000 550,-10"
                fill="url(#angelRayYellowGrad)"
                opacity={0.75 + angelLead * 0.25}
              />
              <polygon
                points="528,-10 785,1000 905,1000 542,-10"
                fill="url(#angelRayWhiteGrad)"
                opacity={0.85 + angelLead * 0.15}
              />
              <polygon
                points="532,-10 830,1000 860,1000 536,-10"
                fill="#ffffff"
                opacity={0.7 + angelLead * 0.3}
              />
            </g>

            {/* Drifting Golden Petal Particles when Angel leads prominently */}
            {angelLead > 0.15 && (
              <g opacity={Math.min(0.75, angelLead * 0.85)}>
                <ellipse cx="280" cy={320 + angelLead * 120} rx="6" ry="12" fill="#fef08a" opacity="0.6" transform="rotate(35 280 380)" />
                <ellipse cx="720" cy={290 + angelLead * 140} rx="5" ry="11" fill="#ffffff" opacity="0.65" transform="rotate(-25 720 360)" />
                <ellipse cx="390" cy={200 + angelLead * 90} rx="6" ry="11" fill="#fef08a" opacity="0.55" transform="rotate(15 390 240)" />
                <ellipse cx="640" cy={170 + angelLead * 100} rx="5" ry="10" fill="#ffffff" opacity="0.65" transform="rotate(-40 640 220)" />
                <circle cx="480" cy={260 + angelLead * 110} r="2.5" fill="#ffffff" opacity="0.8" />
                <circle cx="530" cy={190 + angelLead * 80} r="2.2" fill="#fef08a" opacity="0.9" />
              </g>
            )}
          </g>
        </svg>
      )}
    </div>
  );
}
