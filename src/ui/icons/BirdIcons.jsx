// src/ui/icons/BirdIcons.jsx
// 20 stylized Painted Bunting bird icons — palette matches T.js oklch tokens exactly

const C = {
  cobalt:   'oklch(42% 0.18 262)',   // cobalt500  head/CTA
  cobaltL:  'oklch(70% 0.14 258)',   // cobalt300
  cobaltD:  'oklch(26% 0.14 262)',   // cobalt700
  scarlet:  'oklch(60% 0.22 28)',    // scarlet500 chest
  scarletL: 'oklch(70% 0.20 30)',    // scarlet400
  forest:   'oklch(42% 0.13 150)',   // forest500  wings
  forestD:  'oklch(32% 0.10 150)',   // forest700
  lime:     'oklch(62% 0.18 142)',   // lime500
  limeL:    'oklch(72% 0.18 140)',   // lime400
  ochre:    'oklch(74% 0.15 80)',    // ochre500   beak/feet
  ochreL:   'oklch(80% 0.14 78)',    // ochre400
  cream:    'oklch(98% 0.014 82)',   // ink0
  ink:      'oklch(20% 0.020 110)',  // ink700
}

function Bird({ size = 48, children, ...p }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none"
      xmlns="http://www.w3.org/2000/svg" {...p}>{children}</svg>
  )
}

// Shared foot paths for right-facing perched birds
function FeetRight() {
  return (
    <>
      <path d="M22,35 L21,40 M21,40 L24,40 M21,40 L18,41"
        stroke={C.ochre} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M27,35 L26,40 M26,40 L29,40 M26,40 L23,41"
        stroke={C.ochre} strokeWidth="1.5" strokeLinecap="round"/>
    </>
  )
}

// ─── 1. BuntingPerchRight ───────────────────────────────────────────────────
// Classic Painted Bunting perched facing right — the app mascot
export function BuntingPerchRight({ size, ...p }) {
  return (
    <Bird size={size} {...p}>
      <rect x="6" y="40" width="36" height="3" rx="1.5" fill={C.forestD}/>
      <path d="M12,29 C7,32 5,37 7,42 L11,39 L10,33Z" fill={C.forestD}/>
      <path d="M14,30 C10,33 8,38 10,42 L14,39 L13,34Z" fill={C.lime}/>
      <ellipse cx="21" cy="27" rx="13" ry="8.5" fill={C.forest}/>
      <ellipse cx="30" cy="29" rx="9" ry="7" fill={C.scarlet}/>
      <circle cx="35" cy="15" r="8" fill={C.cobalt}/>
      <polygon points="41,13 47,16 41,19" fill={C.ochre}/>
      <circle cx="37" cy="13" r="2.2" fill={C.cobaltD}/>
      <circle cx="37.8" cy="12.3" r="0.7" fill={C.cream}/>
      <FeetRight/>
    </Bird>
  )
}

// ─── 2. BuntingPerchLeft ────────────────────────────────────────────────────
// Same bird, facing left
export function BuntingPerchLeft({ size, ...p }) {
  return (
    <Bird size={size} {...p}>
      <g transform="matrix(-1,0,0,1,48,0)">
        <rect x="6" y="40" width="36" height="3" rx="1.5" fill={C.forestD}/>
        <path d="M12,29 C7,32 5,37 7,42 L11,39 L10,33Z" fill={C.forestD}/>
        <path d="M14,30 C10,33 8,38 10,42 L14,39 L13,34Z" fill={C.lime}/>
        <ellipse cx="21" cy="27" rx="13" ry="8.5" fill={C.forest}/>
        <ellipse cx="30" cy="29" rx="9" ry="7" fill={C.scarlet}/>
        <circle cx="35" cy="15" r="8" fill={C.cobalt}/>
        <polygon points="41,13 47,16 41,19" fill={C.ochre}/>
        <circle cx="37" cy="13" r="2.2" fill={C.cobaltD}/>
        <circle cx="37.8" cy="12.3" r="0.7" fill={C.cream}/>
        <FeetRight/>
      </g>
    </Bird>
  )
}

// ─── 3. BuntingFlight ───────────────────────────────────────────────────────
// In flight, side view, flying right
export function BuntingFlight({ size, ...p }) {
  return (
    <Bird size={size} {...p}>
      <path d="M28,22 C22,14 14,8 6,9 C12,16 20,20 24,25Z" fill={C.lime}/>
      <ellipse cx="28" cy="26" rx="13" ry="5.5" transform="rotate(-20,28,26)" fill={C.cobalt}/>
      <ellipse cx="34" cy="22" rx="7" ry="4" transform="rotate(-20,34,22)" fill={C.scarlet}/>
      <circle cx="39" cy="16" r="7" fill={C.cobalt}/>
      <polygon points="45,14 48,16 45,18" fill={C.ochre}/>
      <circle cx="41" cy="14" r="1.8" fill={C.cobaltD}/>
      <circle cx="41.6" cy="13.4" r="0.6" fill={C.cream}/>
      <path d="M15,28 C9,30 6,35 8,42 L12,38 L11,32Z" fill={C.forestD}/>
      <path d="M17,29 C12,31 10,36 12,42 L16,38 L15,33Z" fill={C.forest}/>
    </Bird>
  )
}

// ─── 4. BuntingGlide ────────────────────────────────────────────────────────
// Gliding — wings swept back and angled down
export function BuntingGlide({ size, ...p }) {
  return (
    <Bird size={size} {...p}>
      <path d="M26,21 C20,18 12,14 6,16 C10,20 18,22 22,23Z" fill={C.lime}/>
      <path d="M26,23 C20,26 12,30 6,34 C10,30 18,27 22,25Z" fill={C.forest}/>
      <ellipse cx="29" cy="24" rx="14" ry="5" transform="rotate(-8,29,24)" fill={C.cobalt}/>
      <ellipse cx="36" cy="21" rx="7" ry="4" transform="rotate(-8,36,21)" fill={C.scarlet}/>
      <circle cx="40" cy="17" r="7" fill={C.cobalt}/>
      <polygon points="46,15 48,17 46,19" fill={C.ochre}/>
      <circle cx="42" cy="15" r="1.8" fill={C.cobaltD}/>
      <circle cx="42.6" cy="14.4" r="0.6" fill={C.cream}/>
      <path d="M15,26 C10,24 6,22 4,20 C6,24 10,26 14,26Z" fill={C.forestD}/>
      <path d="M16,28 C11,27 7,27 5,29 C7,27 11,26 15,28Z" fill={C.lime}/>
    </Bird>
  )
}

// ─── 5. BuntingSing ─────────────────────────────────────────────────────────
// Perched, head tilted back, beak open
export function BuntingSing({ size, ...p }) {
  return (
    <Bird size={size} {...p}>
      <rect x="6" y="40" width="36" height="3" rx="1.5" fill={C.forestD}/>
      <path d="M12,29 C7,32 5,37 7,42 L11,39 L10,33Z" fill={C.forestD}/>
      <path d="M14,30 C10,33 8,38 10,42 L14,39 L13,34Z" fill={C.lime}/>
      <ellipse cx="21" cy="28" rx="13" ry="8.5" fill={C.forest}/>
      <ellipse cx="29" cy="30" rx="9" ry="7" fill={C.scarlet}/>
      <circle cx="31" cy="13" r="8" fill={C.cobalt}/>
      <path d="M37,9 L44,5 L44,9Z" fill={C.ochre}/>
      <path d="M37,10 L44,10 L44,13Z" fill={C.ochreL}/>
      <path d="M37,9 L40,7 L40,10Z" fill={C.scarletL}/>
      <circle cx="34" cy="11" r="2.2" fill={C.cobaltD}/>
      <circle cx="34.8" cy="10.3" r="0.7" fill={C.cream}/>
      <path d="M22,36 L21,40 M21,40 L24,40 M21,40 L18,41"
        stroke={C.ochre} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M27,36 L26,40 M26,40 L29,40 M26,40 L23,41"
        stroke={C.ochre} strokeWidth="1.5" strokeLinecap="round"/>
    </Bird>
  )
}

// ─── 6. BuntingLand ─────────────────────────────────────────────────────────
// Wings raised upward, about to land
export function BuntingLand({ size, ...p }) {
  return (
    <Bird size={size} {...p}>
      <path d="M20,22 C14,12 8,6 4,5 C8,12 14,16 18,22Z" fill={C.forest}/>
      <path d="M28,22 C34,12 40,6 44,5 C40,12 34,16 30,22Z" fill={C.lime}/>
      <ellipse cx="24" cy="31" rx="8" ry="11" fill={C.cobalt}/>
      <ellipse cx="26" cy="35" rx="6" ry="7" fill={C.scarlet}/>
      <circle cx="24" cy="18" r="7" fill={C.cobalt}/>
      <polygon points="30,16 36,18 30,20" fill={C.ochre}/>
      <circle cx="27" cy="16" r="2" fill={C.cobaltD}/>
      <circle cx="27.7" cy="15.3" r="0.7" fill={C.cream}/>
      <path d="M20,43 L19,47 M19,47 L16,47 M19,47 L22,47"
        stroke={C.ochre} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M28,43 L27,47 M27,47 L24,47 M27,47 L30,47"
        stroke={C.ochre} strokeWidth="1.5" strokeLinecap="round"/>
    </Bird>
  )
}

// ─── 7. BuntingHop ──────────────────────────────────────────────────────────
// Mid-hop with one foot raised, body leaning forward
export function BuntingHop({ size, ...p }) {
  return (
    <Bird size={size} {...p}>
      <rect x="6" y="40" width="36" height="3" rx="1.5" fill={C.forestD}/>
      <path d="M11,26 C6,29 4,34 6,40 L10,37 L9,31Z" fill={C.forestD}/>
      <path d="M13,27 C9,30 7,35 9,40 L13,37 L12,32Z" fill={C.lime}/>
      <ellipse cx="23" cy="25" rx="13" ry="8" transform="rotate(-10,23,25)" fill={C.forest}/>
      <ellipse cx="32" cy="27" rx="9" ry="7" transform="rotate(-10,32,27)" fill={C.scarlet}/>
      <circle cx="37" cy="14" r="8" fill={C.cobalt}/>
      <polygon points="44,12 48,15 44,18" fill={C.ochre}/>
      <circle cx="39" cy="12" r="2.2" fill={C.cobaltD}/>
      <circle cx="39.8" cy="11.3" r="0.7" fill={C.cream}/>
      <path d="M28,33 L27,40 M27,40 L30,40 M27,40 L24,41"
        stroke={C.ochre} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M22,33 L18,37 M18,37 L21,36 M18,37 L15,38"
        stroke={C.ochre} strokeWidth="1.5" strokeLinecap="round"/>
    </Bird>
  )
}

// ─── 8. BuntingBranch ───────────────────────────────────────────────────────
// On a curved decorative branch with berries
export function BuntingBranch({ size, ...p }) {
  return (
    <Bird size={size} {...p}>
      <path d="M4,42 Q14,38 24,38 Q34,38 44,42"
        stroke={C.forestD} strokeWidth="3" strokeLinecap="round" fill="none"/>
      <ellipse cx="11" cy="35" rx="4" ry="2" transform="rotate(-30,11,35)" fill={C.lime}/>
      <circle cx="7" cy="36" r="2" fill={C.scarlet}/>
      <circle cx="5" cy="39" r="1.8" fill={C.scarletL}/>
      <circle cx="9" cy="38" r="1.5" fill={C.scarlet}/>
      <path d="M12,27 C7,30 5,35 7,40 L11,37 L10,31Z" fill={C.forestD}/>
      <path d="M14,28 C10,31 8,36 10,40 L14,37 L13,32Z" fill={C.lime}/>
      <ellipse cx="21" cy="25" rx="13" ry="8.5" fill={C.forest}/>
      <ellipse cx="30" cy="27" rx="9" ry="7" fill={C.scarlet}/>
      <circle cx="35" cy="13" r="8" fill={C.cobalt}/>
      <polygon points="41,11 47,14 41,17" fill={C.ochre}/>
      <circle cx="37" cy="11" r="2.2" fill={C.cobaltD}/>
      <circle cx="37.8" cy="10.3" r="0.7" fill={C.cream}/>
      <path d="M22,33 L21,38 M21,38 L24,38 M21,38 L18,39"
        stroke={C.ochre} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M27,33 L26,38 M26,38 L29,38 M26,38 L23,39"
        stroke={C.ochre} strokeWidth="1.5" strokeLinecap="round"/>
    </Bird>
  )
}

// ─── 9. BuntingNest ─────────────────────────────────────────────────────────
// Sitting in a nest, peeking out
export function BuntingNest({ size, ...p }) {
  return (
    <Bird size={size} {...p}>
      <path d="M8,44 Q8,28 24,28 Q40,28 40,44Z"
        fill={C.ochreL} opacity="0.25"/>
      <path d="M8,44 Q8,28 24,28 Q40,28 40,44"
        stroke={C.ochre} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M12,42 Q16,36 20,38" stroke={C.ochreL} strokeWidth="1" fill="none"/>
      <path d="M24,34 Q28,32 32,34" stroke={C.ochreL} strokeWidth="1" fill="none"/>
      <path d="M36,38 Q34,34 30,36" stroke={C.ochreL} strokeWidth="1" fill="none"/>
      <ellipse cx="22" cy="24" rx="12" ry="7" fill={C.forest}/>
      <ellipse cx="28" cy="26" rx="8" ry="6" fill={C.scarlet}/>
      <circle cx="32" cy="14" r="8" fill={C.cobalt}/>
      <polygon points="39,12 45,15 39,18" fill={C.ochre}/>
      <circle cx="34" cy="12" r="2.2" fill={C.cobaltD}/>
      <circle cx="34.8" cy="11.3" r="0.7" fill={C.cream}/>
    </Bird>
  )
}

// ─── 10. BuntingDive ────────────────────────────────────────────────────────
// Steep power dive, wings swept back
export function BuntingDive({ size, ...p }) {
  return (
    <Bird size={size} {...p}>
      <path d="M24,22 C18,16 10,10 4,8 C8,16 14,20 20,26Z" fill={C.lime}/>
      <path d="M24,24 C16,22 8,24 4,28 C8,26 14,24 20,26Z" fill={C.forest}/>
      <ellipse cx="28" cy="28" rx="13" ry="5" transform="rotate(50,28,28)" fill={C.cobalt}/>
      <ellipse cx="34" cy="33" rx="7" ry="4" transform="rotate(50,34,33)" fill={C.scarlet}/>
      <circle cx="38" cy="38" r="7" fill={C.cobalt}/>
      <polygon points="43,43 46,47 38,46" fill={C.ochre}/>
      <circle cx="40" cy="35" r="2" fill={C.cobaltD}/>
      <circle cx="40.7" cy="34.4" r="0.7" fill={C.cream}/>
    </Bird>
  )
}

// ─── 11. BuntingPair ────────────────────────────────────────────────────────
// Two birds facing each other on a branch
export function BuntingPair({ size, ...p }) {
  return (
    <Bird size={size} {...p}>
      <rect x="4" y="40" width="40" height="3" rx="1.5" fill={C.forestD}/>
      {/* left bird — faces right */}
      <path d="M5,28 C2,30 1,34 2,40 L5,37 L4,32Z" fill={C.forestD}/>
      <ellipse cx="11" cy="27" rx="9" ry="6" fill={C.forest}/>
      <ellipse cx="17" cy="29" rx="6" ry="5" fill={C.scarlet}/>
      <circle cx="21" cy="19" r="6.5" fill={C.cobalt}/>
      <polygon points="27,17 31,19 27,21" fill={C.ochre}/>
      <circle cx="23" cy="17" r="1.7" fill={C.cobaltD}/>
      <circle cx="23.6" cy="16.5" r="0.6" fill={C.cream}/>
      <path d="M13,34 L12,40 M12,40 L15,40 M12,40 L9,41"
        stroke={C.ochre} strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M17,34 L16,40 M16,40 L19,40 M16,40 L13,41"
        stroke={C.ochre} strokeWidth="1.2" strokeLinecap="round"/>
      {/* right bird — faces left (mirror) */}
      <path d="M43,28 C46,30 47,34 46,40 L43,37 L44,32Z" fill={C.forestD}/>
      <ellipse cx="37" cy="27" rx="9" ry="6" fill={C.forest}/>
      <ellipse cx="31" cy="29" rx="6" ry="5" fill={C.scarletL}/>
      <circle cx="27" cy="19" r="6.5" fill={C.cobaltL}/>
      <polygon points="21,17 17,19 21,21" fill={C.ochre}/>
      <circle cx="25" cy="17" r="1.7" fill={C.cobaltD}/>
      <circle cx="24.4" cy="16.5" r="0.6" fill={C.cream}/>
      <path d="M35,34 L36,40 M36,40 L33,40 M36,40 L39,41"
        stroke={C.ochre} strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M31,34 L32,40 M32,40 L29,40 M32,40 L35,41"
        stroke={C.ochre} strokeWidth="1.2" strokeLinecap="round"/>
    </Bird>
  )
}

// ─── 12. BuntingSwallow ─────────────────────────────────────────────────────
// Swallow silhouette — long pointed wings, deep forked tail
export function BuntingSwallow({ size, ...p }) {
  return (
    <Bird size={size} {...p}>
      <path d="M18,28 C12,30 6,28 2,24 C4,28 8,30 14,30Z" fill={C.forestD}/>
      <path d="M18,30 C12,32 6,34 2,38 C4,34 8,32 14,32Z" fill={C.forestD}/>
      <ellipse cx="28" cy="29" rx="12" ry="4.5" fill={C.cobalt}/>
      <path d="M30,26 C24,18 16,10 8,8 C14,16 22,22 28,28Z" fill={C.forest}/>
      <path d="M30,32 C24,38 16,42 8,44 C14,38 22,34 28,32Z" fill={C.forestD}/>
      <ellipse cx="34" cy="29" rx="6" ry="4" fill={C.scarlet}/>
      <circle cx="40" cy="27" r="6.5" fill={C.cobalt}/>
      <polygon points="45,25 48,27 45,29" fill={C.ochre}/>
      <circle cx="42" cy="25" r="1.8" fill={C.cobaltD}/>
      <circle cx="42.6" cy="24.4" r="0.6" fill={C.cream}/>
    </Bird>
  )
}

// ─── 13. BuntingWren ────────────────────────────────────────────────────────
// Wren pose — round body, signature upright tail
export function BuntingWren({ size, ...p }) {
  return (
    <Bird size={size} {...p}>
      <rect x="8" y="40" width="32" height="3" rx="1.5" fill={C.forestD}/>
      <path d="M22,23 C18,16 14,10 12,6 C16,10 20,14 22,19Z" fill={C.forestD}/>
      <path d="M24,22 C22,15 20,9 20,4 C22,8 24,13 24,18Z" fill={C.lime}/>
      <ellipse cx="26" cy="30" rx="10" ry="9" fill={C.forest}/>
      <ellipse cx="30" cy="32" rx="7" ry="6.5" fill={C.scarlet}/>
      <circle cx="34" cy="20" r="7" fill={C.cobalt}/>
      <polygon points="40,18 44,20 40,22" fill={C.ochre}/>
      <circle cx="36" cy="18" r="2" fill={C.cobaltD}/>
      <circle cx="36.7" cy="17.4" r="0.7" fill={C.cream}/>
      <path d="M22,38 L21,40 M21,40 L24,40 M21,40 L18,41"
        stroke={C.ochre} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M28,38 L27,40 M27,40 L30,40 M27,40 L24,41"
        stroke={C.ochre} strokeWidth="1.5" strokeLinecap="round"/>
    </Bird>
  )
}

// ─── 14. BuntingCardinal ────────────────────────────────────────────────────
// Cardinal with prominent spiked crest
export function BuntingCardinal({ size, ...p }) {
  return (
    <Bird size={size} {...p}>
      <rect x="6" y="40" width="36" height="3" rx="1.5" fill={C.forestD}/>
      <path d="M12,29 C7,32 5,37 7,42 L11,39 L10,33Z" fill={C.forestD}/>
      <path d="M14,30 C10,33 8,38 10,42 L14,39 L13,34Z" fill={C.scarlet}/>
      <ellipse cx="21" cy="27" rx="13" ry="8.5" fill={C.cobaltL}/>
      <ellipse cx="30" cy="29" rx="9" ry="7" fill={C.scarlet}/>
      <circle cx="35" cy="15" r="8" fill={C.cobalt}/>
      <path d="M34,8 L31,3 L36,7 L33,1 L38,6 L36,1 L40,7 L37,8Z"
        fill={C.lime}/>
      <polygon points="41,13 47,16 41,19" fill={C.ochre}/>
      <circle cx="37" cy="13" r="2.2" fill={C.cobaltD}/>
      <circle cx="37.8" cy="12.3" r="0.7" fill={C.cream}/>
      <FeetRight/>
    </Bird>
  )
}

// ─── 15. BuntingOwl ─────────────────────────────────────────────────────────
// Front-facing owl with large expressive eyes
export function BuntingOwl({ size, ...p }) {
  return (
    <Bird size={size} {...p}>
      <ellipse cx="24" cy="33" rx="13" ry="12" fill={C.forest}/>
      <ellipse cx="24" cy="36" rx="7" ry="8" fill={C.ochreL} opacity="0.55"/>
      <path d="M11,28 C8,24 7,18 10,14 C12,18 13,24 14,29Z" fill={C.forestD}/>
      <path d="M37,28 C40,24 41,18 38,14 C36,18 35,24 34,29Z" fill={C.forestD}/>
      <circle cx="24" cy="18" r="14" fill={C.cobalt}/>
      <ellipse cx="24" cy="20" rx="11" ry="10" fill={C.cobaltL} opacity="0.35"/>
      <path d="M14,7 L12,2 L17,7Z" fill={C.forestD}/>
      <path d="M34,7 L36,2 L31,7Z" fill={C.forestD}/>
      <circle cx="18" cy="18" r="5.5" fill={C.ochre}/>
      <circle cx="18" cy="18" r="3.5" fill={C.ink}/>
      <circle cx="16.8" cy="16.8" r="1.2" fill={C.cream}/>
      <circle cx="30" cy="18" r="5.5" fill={C.ochre}/>
      <circle cx="30" cy="18" r="3.5" fill={C.ink}/>
      <circle cx="28.8" cy="16.8" r="1.2" fill={C.cream}/>
      <polygon points="24,22 21,27 27,27" fill={C.ochreL}/>
    </Bird>
  )
}

// ─── 16. BuntingDove ────────────────────────────────────────────────────────
// Dove in flight — soft rounded wings, olive twig
export function BuntingDove({ size, ...p }) {
  return (
    <Bird size={size} {...p}>
      <path d="M26,22 C20,12 12,8 6,10 C10,16 16,18 22,24Z" fill={C.cobaltL}/>
      <path d="M22,26 C18,30 12,34 8,36 C12,32 16,28 20,26Z"
        fill={C.cobalt} opacity="0.45"/>
      <path d="M16,28 C10,26 6,24 4,22 C6,26 10,28 14,28Z" fill={C.cobaltL}/>
      <path d="M16,30 C10,31 6,33 4,36 C6,32 10,30 14,30Z" fill={C.cobalt}/>
      <ellipse cx="28" cy="26" rx="11" ry="7" fill={C.cream}/>
      <ellipse cx="32" cy="25" rx="7" ry="5.5" fill={C.cobaltL} opacity="0.4"/>
      <circle cx="38" cy="20" r="7" fill={C.cream}/>
      <ellipse cx="35" cy="23" rx="4" ry="3" fill={C.lime} opacity="0.45"/>
      <polygon points="44,18 47,20 44,22" fill={C.ochre}/>
      <circle cx="40" cy="18" r="2" fill={C.ink}/>
      <circle cx="40.8" cy="17.4" r="0.7" fill={C.cream}/>
      <path d="M44,20 L48,18 M46,19 L46,16"
        stroke={C.lime} strokeWidth="1" strokeLinecap="round"/>
    </Bird>
  )
}

// ─── 17. BuntingHummingbird ─────────────────────────────────────────────────
// Hummingbird hovering — blurred wing fans, needle beak
export function BuntingHummingbird({ size, ...p }) {
  return (
    <Bird size={size} {...p}>
      <ellipse cx="10" cy="23" rx="9" ry="4.5" transform="rotate(-15,10,23)"
        fill={C.lime} opacity="0.25"/>
      <ellipse cx="10" cy="23" rx="7" ry="3.5" transform="rotate(-5,10,23)"
        fill={C.lime} opacity="0.4"/>
      <ellipse cx="10" cy="23" rx="6" ry="2.5" fill={C.limeL} opacity="0.65"/>
      <ellipse cx="38" cy="23" rx="9" ry="4.5" transform="rotate(15,38,23)"
        fill={C.lime} opacity="0.25"/>
      <ellipse cx="38" cy="23" rx="7" ry="3.5" transform="rotate(5,38,23)"
        fill={C.lime} opacity="0.4"/>
      <ellipse cx="38" cy="23" rx="6" ry="2.5" fill={C.limeL} opacity="0.65"/>
      <ellipse cx="24" cy="25" rx="7" ry="5.5" fill={C.forest}/>
      <ellipse cx="24" cy="27" rx="4.5" ry="3.5" fill={C.scarlet}/>
      <circle cx="24" cy="18" r="6" fill={C.cobalt}/>
      <line x1="30" y1="17" x2="44" y2="16"
        stroke={C.ochre} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="27" cy="16" r="1.8" fill={C.cobaltD}/>
      <circle cx="27.7" cy="15.4" r="0.6" fill={C.cream}/>
      <path d="M22,31 L20,35" stroke={C.ochre} strokeWidth="1" strokeLinecap="round"/>
      <path d="M26,31 L24,35" stroke={C.ochre} strokeWidth="1" strokeLinecap="round"/>
    </Bird>
  )
}

// ─── 18. BuntingGrape ───────────────────────────────────────────────────────
// Perched above a hanging grape cluster
export function BuntingGrape({ size, ...p }) {
  return (
    <Bird size={size} {...p}>
      <rect x="6" y="32" width="36" height="3" rx="1.5" fill={C.forestD}/>
      <path d="M18,35 C16,37 14,39 12,41 C14,39 16,41 14,43"
        stroke={C.forest} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <circle cx="20" cy="40" r="3.5" fill={C.cobalt}/>
      <circle cx="14" cy="40" r="3.5" fill={C.cobaltL}/>
      <circle cx="17" cy="45" r="3.5" fill={C.cobalt}/>
      <circle cx="11" cy="45" r="3" fill={C.cobaltL}/>
      <circle cx="23" cy="45" r="3" fill={C.cobalt} opacity="0.8"/>
      <path d="M12,22 C7,25 5,30 7,34 L11,31 L10,26Z" fill={C.forestD}/>
      <path d="M14,23 C10,26 8,31 10,34 L14,31 L13,27Z" fill={C.lime}/>
      <ellipse cx="21" cy="20" rx="13" ry="8.5" fill={C.forest}/>
      <ellipse cx="30" cy="22" rx="9" ry="7" fill={C.scarlet}/>
      <circle cx="35" cy="9" r="8" fill={C.cobalt}/>
      <polygon points="41,7 47,10 41,13" fill={C.ochre}/>
      <circle cx="37" cy="7" r="2.2" fill={C.cobaltD}/>
      <circle cx="37.8" cy="6.3" r="0.7" fill={C.cream}/>
      <path d="M22,28 L21,32 M21,32 L24,32 M21,32 L18,33"
        stroke={C.ochre} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M27,28 L26,32 M26,32 L29,32 M26,32 L23,33"
        stroke={C.ochre} strokeWidth="1.5" strokeLinecap="round"/>
    </Bird>
  )
}

// ─── 19. BuntingCork ────────────────────────────────────────────────────────
// Perched on top of a wine cork
export function BuntingCork({ size, ...p }) {
  return (
    <Bird size={size} {...p}>
      <rect x="16" y="32" width="16" height="13" rx="3" fill={C.ochreL}/>
      <ellipse cx="24" cy="32" rx="8" ry="2.5" fill={C.ochre}/>
      <ellipse cx="24" cy="45" rx="8" ry="2.5" fill={C.ochre} opacity="0.6"/>
      <line x1="18" y1="36" x2="32" y2="36" stroke={C.ochre} strokeWidth="0.6" opacity="0.45"/>
      <line x1="18" y1="39" x2="32" y2="39" stroke={C.ochre} strokeWidth="0.6" opacity="0.45"/>
      <line x1="18" y1="42" x2="32" y2="42" stroke={C.ochre} strokeWidth="0.6" opacity="0.45"/>
      <path d="M13,22 C8,25 6,29 8,33 L12,30 L11,25Z" fill={C.forestD}/>
      <path d="M15,23 C11,26 9,30 11,33 L15,30 L14,26Z" fill={C.lime}/>
      <ellipse cx="22" cy="22" rx="12" ry="7.5" fill={C.forest}/>
      <ellipse cx="30" cy="24" rx="8.5" ry="6.5" fill={C.scarlet}/>
      <circle cx="34" cy="12" r="8" fill={C.cobalt}/>
      <polygon points="41,10 47,13 41,16" fill={C.ochre}/>
      <circle cx="36" cy="10" r="2.2" fill={C.cobaltD}/>
      <circle cx="36.8" cy="9.3" r="0.7" fill={C.cream}/>
      <path d="M22,29 L21,32 M21,32 L24,32 M21,32 L18,33"
        stroke={C.ochre} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M27,29 L26,32 M26,32 L29,32 M26,32 L23,33"
        stroke={C.ochre} strokeWidth="1.5" strokeLinecap="round"/>
    </Bird>
  )
}

// ─── 20. BuntingFeatured ────────────────────────────────────────────────────
// Hero showcase icon — all four palette colors at full expression
export function BuntingFeatured({ size, ...p }) {
  return (
    <Bird size={size} {...p}>
      <path d="M2,42 Q12,38 24,39 Q36,40 46,42"
        stroke={C.forestD} strokeWidth="3.5" strokeLinecap="round" fill="none"/>
      <path d="M11,28 C5,31 2,37 4,43 L8,39 L7,32Z" fill={C.forestD}/>
      <path d="M13,29 C8,32 6,38 8,43 L12,39 L11,33Z" fill={C.lime}/>
      <path d="M15,30 C11,33 10,39 12,43 L16,40 L15,35Z" fill={C.limeL}/>
      <ellipse cx="20" cy="26" rx="14" ry="9.5" fill={C.forest}/>
      <ellipse cx="19" cy="23" rx="10" ry="5.5" fill={C.lime} opacity="0.45"/>
      <ellipse cx="31" cy="28" rx="10.5" ry="9" fill={C.scarlet}/>
      <ellipse cx="30" cy="26" rx="6" ry="4.5" fill={C.scarletL} opacity="0.45"/>
      <circle cx="36" cy="14" r="9.5" fill={C.cobalt}/>
      <ellipse cx="34" cy="11" rx="5.5" ry="3.5" fill={C.cobaltL} opacity="0.38"/>
      <polygon points="44,11 48,14 44,17" fill={C.ochre}/>
      <line x1="44" y1="13" x2="47" y2="14"
        stroke={C.ochreL} strokeWidth="0.9" strokeLinecap="round"/>
      <circle cx="38.5" cy="12" r="3" fill={C.cobaltD}/>
      <circle cx="38.5" cy="12" r="1.6" fill={C.ink}/>
      <circle cx="39.2" cy="11.3" r="0.7" fill={C.cream}/>
      <path d="M22,35 L20,40 M20,40 L23,39 M20,40 L17,40 M20,40 L19,42"
        stroke={C.ochre} strokeWidth="2" strokeLinecap="round"/>
      <path d="M27,35 L25,40 M25,40 L28,39 M25,40 L22,40 M25,40 L24,42"
        stroke={C.ochre} strokeWidth="2" strokeLinecap="round"/>
    </Bird>
  )
}
