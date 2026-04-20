import { useState, useEffect, useCallback, useMemo, useRef } from "react";

// ═════════════════════════════════════════════════════════════════════════════
// FONTS
// ═════════════════════════════════════════════════════════════════════════════
if (typeof document !== "undefined" && !document.getElementById("gf-golf-fonts")) {
  const l = document.createElement("link");
  l.id = "gf-golf-fonts"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap";
  document.head.appendChild(l);
}

// ═════════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═════════════════════════════════════════════════════════════════════════════
const T = {
  canvas:    "#0a1410",
  surface1:  "#101e16",
  surface2:  "#172a20",
  surface3:  "#213629",
  line:      "#1d3326",
  lineStrong:"#2d4a37",
  gold:      "#c9a85c",
  goldBright:"#ddb970",
  goldDim:   "#967d3e",
  sage:      "#7ea88a",
  sageDim:   "#5b7f68",
  text:      "#f0e9d3",
  textSoft:  "#b5ad96",
  textDim:   "#7a7260",
  birdie:    "#7ed389",
  par:       "#f0e9d3",
  bogey:     "#e89968",
  double:    "#e56e5e",
  strich:    "#7a7260",
  eagle:     "#f5d97a",
};

// Tee color mapping
const teeColor = (name) => {
  const n = (name || "").toLowerCase();
  if (n.includes("gelb") || n.includes("yellow")) return "#f5d97a";
  if (n.includes("blau") || n.includes("blue"))   return "#5db0e0";
  if (n.includes("rot")  || n.includes("red"))    return "#e56e5e";
  if (n.includes("weiß") || n.includes("weiss") || n.includes("white")) return "#f0e9d3";
  if (n.includes("orange")) return "#e89968";
  if (n.includes("schwarz") || n.includes("black")) return "#3d3d3d";
  return T.textSoft;
};

// ═════════════════════════════════════════════════════════════════════════════
// SUPABASE CLOUD SYNC
// ═════════════════════════════════════════════════════════════════════════════
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || "";
const SYNC_ENABLED = !!(SUPABASE_URL && SUPABASE_KEY);

const SYNC_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const genSyncCode = () => Array.from({ length: 8 }, () =>
  SYNC_CHARS[Math.floor(Math.random() * SYNC_CHARS.length)]
).join("");
const formatSync = c => c ? `${c.slice(0,4)}-${c.slice(4)}` : "";
const cleanSync  = c => (c || "").replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 8);

async function cloudPush(syncCode, data) {
  if (!SYNC_ENABLED || !syncCode) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_data`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        sync_code: syncCode,
        data,
        updated_at: new Date().toISOString(),
      }),
    });
    return res.ok;
  } catch (e) { console.error("Cloud push failed", e); return false; }
}

async function cloudPull(syncCode) {
  if (!SYNC_ENABLED || !syncCode) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/user_data?sync_code=eq.${syncCode}&select=*`,
      { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows[0] || null;
  } catch (e) { console.error("Cloud pull failed", e); return null; }
}

// ═════════════════════════════════════════════════════════════════════════════
// CLUB DATABASE
// ═════════════════════════════════════════════════════════════════════════════
const simple = (name, region, cr, slope, par, numHoles = 18) => ({
  name, region, numHoles,
  tees: { "Standard": { cr, slope, par } },
});

const BUILT_IN_CLUBS = [
  {
    name: "GC GolfRange Bockfließ",
    region: "Niederösterreich",
    numHoles: 18,
    tees: {
      "Gelb (Herren)": { cr: 68.7, slope: 124, par: 70 },
      "Blau (Herren)": { cr: 67.4, slope: 118, par: 70 },
      "Rot (Herren)":  { cr: 63.7, slope: 110, par: 70 },
      "Blau (Damen)":  { cr: 72.9, slope: 122, par: 70 },
      "Rot (Damen)":   { cr: 68.3, slope: 114, par: 70 },
    },
    holes: [
      { par:4, si:15 }, { par:3, si:5 },  { par:4, si:17 },
      { par:3, si:9 },  { par:5, si:11 }, { par:4, si:13 },
      { par:3, si:7 },  { par:4, si:1 },  { par:4, si:3 },
      { par:4, si:16 }, { par:3, si:8 },  { par:4, si:14 },
      { par:4, si:2 },  { par:4, si:18 }, { par:5, si:12 },
      { par:4, si:4 },  { par:3, si:6 },  { par:5, si:10 },
    ],
  },
  {
    name: "GC Adamstal (Championship)",
    region: "Niederösterreich",
    numHoles: 18,
    tees: {
      "Weiss (Herren)":  { cr: 73.3, slope: 137, par: 70 },
      "Gelb (Herren)":   { cr: 71.0, slope: 140, par: 70 },
      "Blau (Herren)":   { cr: 68.9, slope: 135, par: 70 },
      "Rot (Herren)":    { cr: 66.9, slope: 125, par: 70 },
      "Orange (Herren)": { cr: 65.1, slope: 118, par: 70 },
      "Gelb (Damen)":    { cr: 77.5, slope: 139, par: 70 },
      "Blau (Damen)":    { cr: 74.8, slope: 136, par: 70 },
      "Rot (Damen)":     { cr: 72.2, slope: 131, par: 70 },
      "Orange (Damen)":  { cr: 69.5, slope: 125, par: 70 },
    },
    holes: [
      { par:4, si:13 }, { par:4, si:5 },  { par:5, si:17 },
      { par:4, si:7 },  { par:4, si:11 }, { par:3, si:15 },
      { par:5, si:1 },  { par:3, si:9 },  { par:4, si:3 },
      { par:4, si:12 }, { par:4, si:8 },  { par:3, si:18 },
      { par:4, si:4 },  { par:4, si:14 }, { par:5, si:2 },
      { par:3, si:6 },  { par:4, si:10 }, { par:3, si:16 },
    ],
  },
  simple("GC Wien-Freudenau",              "Wien",            70.5, 120, 72),
  simple("GC Wien-Süßenbrunn",             "Wien",            70.0, 118, 72),
  simple("C&C Golfclub am Wienerberg",     "Wien",            70.0, 119, 71),
  simple("GC Adamstal (Wallerbach 9L)",    "Niederösterreich",34.7, 125, 35, 9),
  simple("Golfclub Frühling Götzendorf",   "Niederösterreich",71.5, 124, 73),
  simple("GC St. Pölten (Schloss Goldegg)","Niederösterreich",71.5, 125, 72),
  simple("Golfclub Schwechat",             "Niederösterreich",70.5, 121, 72),
  {
    name: "Golf & Country Club Brunn",
    region: "Niederösterreich",
    numHoles: 18,
    tees: {
      "Gelb (Herren)": { cr: 71.5, slope: 128, par: 70 },
    },
    holes: [
      { par:4, si:7 },  { par:5, si:1 },  { par:3, si:17 },
      { par:4, si:9 },  { par:3, si:13 }, { par:4, si:5 },
      { par:4, si:15 }, { par:5, si:3 },  { par:3, si:11 },
      { par:4, si:4 },  { par:4, si:6 },  { par:5, si:16 },
      { par:4, si:2 },  { par:4, si:18 }, { par:3, si:14 },
      { par:4, si:8 },  { par:3, si:12 }, { par:4, si:10 },
    ],
  },
  simple("Golfclub Lengenfeld",            "Niederösterreich",71.0, 123, 72),
  simple("GC Spillern",                    "Niederösterreich",71.5, 127, 72),
  simple("Fontana Golf Club",              "Niederösterreich",72.5, 133, 72),
  simple("Colony Club Gutenhof (West)",    "Niederösterreich",72.0, 128, 72),
  simple("Colony Club Gutenhof (Ost)",     "Niederösterreich",71.5, 124, 72),
  simple("GC Schloss Schönborn",           "Niederösterreich",72.5, 128, 72),
  simple("Diamond Country Club",           "Niederösterreich",73.0, 130, 72),
  simple("Golfresort Haugschlag",          "Niederösterreich",70.5, 124, 72),
  simple("GC Föhrenwald",                  "Niederösterreich",71.0, 123, 72),
  simple("GC Enzesfeld",                   "Niederösterreich",71.0, 123, 72),
  simple("GC Schloss Ebreichsdorf",        "Niederösterreich",71.5, 125, 72),
  simple("GC Linsberg",                    "Niederösterreich",70.5, 122, 72),
  simple("Diamond Club Ottenstein",        "Niederösterreich",71.0, 124, 72),
  simple("GC Donau",                       "Niederösterreich",70.0, 119, 72),
  simple("Gut Altentann G&CC",             "Salzburg",        73.0, 138, 72),
  simple("GC Zell am See (Schmittenhöhe)", "Salzburg",        71.5, 123, 72),
  simple("GC Zell am See (Kitzsteinhorn)", "Salzburg",        71.5, 121, 72),
  simple("GC Eugendorf",                   "Salzburg",        70.8, 125, 72),
  simple("GC Radstadt-Amadé",              "Salzburg",        71.0, 124, 72),
  simple("GC Goldegg",                     "Salzburg",        71.5, 126, 72),
  simple("GC Eichenheim Kitzbühel",        "Tirol",           72.8, 135, 71),
  simple("G&CC Lärchenhof",                "Tirol",           71.5, 127, 71),
  simple("GC Zillertal-Uderns",            "Tirol",           71.2, 127, 71),
  simple("GC Achensee",                    "Tirol",           71.2, 127, 71),
  simple("GC Seefeld-Wildmoos",            "Tirol",           70.5, 130, 70),
  simple("Golfpark Mieminger Plateau",     "Tirol",           71.0, 124, 72),
  simple("GC Kitzbühel-Kaps",              "Tirol",           70.0, 119, 70),
  simple("Dolomitengolf Osttirol",         "Tirol",           71.5, 128, 72),
  simple("GC Kitzbüheler Alpen Westendorf","Tirol",           70.5, 122, 71),
  simple("Kaiserwinkl Golf Kössen",        "Tirol",           71.0, 124, 72),
  simple("GC Murhof",                      "Steiermark",      73.1, 128, 72),
  simple("GC Schladming-Dachstein",        "Steiermark",      69.2, 129, 71),
  simple("GC Gut Murstätten",              "Steiermark",      71.5, 126, 72),
  simple("GC Schloss Frauenthal",          "Steiermark",      71.0, 124, 72),
  simple("G&LC Ennstal",                   "Steiermark",      71.0, 123, 72),
  simple("GC Graz-Andritz St. Gotthard",   "Steiermark",      70.5, 121, 72),
  simple("GC Mondsee",                     "Oberösterreich",  71.5, 126, 72),
  simple("GC Linz St. Florian",            "Oberösterreich",  71.0, 124, 72),
  simple("GC Regau Attersee-Traunsee",     "Oberösterreich",  70.5, 122, 72),
  simple("Golf Resort Kremstal",           "Oberösterreich",  70.5, 121, 72),
  simple("GC Klagenfurt-Seltenheim",       "Kärnten",         72.0, 127, 72),
  simple("GC Schloss Finkenstein",         "Kärnten",         71.5, 127, 72),
  simple("Kärntner GC Dellach",            "Kärnten",         71.5, 126, 72),
  simple("GC Millstättersee",              "Kärnten",         71.0, 124, 72),
  simple("GC Bad Kleinkirchheim",          "Kärnten",         70.5, 122, 72),
  simple("GC Neusiedlersee-Donnerskirchen","Burgenland",      70.5, 122, 72),
  simple("GC Bad Waltersdorf",             "Burgenland",      70.0, 120, 72),
  simple("GC Bregenzerwald",               "Vorarlberg",      70.0, 121, 72),
  simple("GC Montfort Rankweil",           "Vorarlberg",      70.5, 122, 72),
];

// ═════════════════════════════════════════════════════════════════════════════
// CALCULATIONS
// ═════════════════════════════════════════════════════════════════════════════
const STRICH = null;

function makeHoles(totalPar, numHoles) {
  const si18 = [1,3,5,7,9,11,13,15,17,2,4,6,8,10,12,14,16,18];
  const si9  = [2,4,6,8,1,3,5,7,9];
  const si = numHoles === 18 ? si18 : si9;
  const pars = [...(numHoles === 18 ? [4,4,3,5,4,3,4,5,4,4,4,3,5,4,3,4,5,4] : [4,4,3,5,4,3,4,5,4])];
  let diff = totalPar - pars.reduce((a,b) => a+b, 0);
  if (diff < 0) {
    for (let i=0; i<pars.length && diff<0; i++) if (pars[i]===5) { pars[i]=4; diff++; }
    for (let i=0; i<pars.length && diff<0; i++) if (pars[i]===4) { pars[i]=3; diff++; }
  } else if (diff > 0) {
    for (let i=0; i<pars.length && diff>0; i++) if (pars[i]===4) { pars[i]=5; diff--; }
  }
  return pars.map((par,i) => ({ par, si: si[i] }));
}

const sumPar     = hs => hs.reduce((s,h) => s + h.par, 0);
const calcPH     = (idx, slope, cr, par) => Math.round(idx * (slope/113) + (cr - par));
const holeHS     = (ph, si, n) => Math.floor(Math.abs(ph)/n) + (si <= Math.abs(ph)%n ? 1 : 0);
const isStrich   = v => v === null;
const isValid    = v => typeof v === "number" && v > 0;
const sfNetto    = (g, hs, par) => isStrich(g) ? 0 : (isValid(g) ? Math.max(0, par - (g - hs) + 2) : null);
const sfBrutto   = (g, par)     => isStrich(g) ? 0 : (isValid(g) ? Math.max(0, par - g + 2) : null);

const scoreColor = (gross, par) => {
  if (isStrich(gross)) return T.strich;
  if (!isValid(gross)) return T.textSoft;
  const d = gross - par;
  if (d <= -2) return T.eagle;
  if (d === -1) return T.birdie;
  if (d === 0)  return T.par;
  if (d === 1)  return T.bogey;
  return T.double;
};

const scoreLabel = (gross, par) => {
  if (isStrich(gross)) return "Gestrichen";
  if (!isValid(gross)) return "—";
  const d = gross - par;
  if (d <= -2) return "Eagle";
  if (d === -1) return "Birdie";
  if (d === 0)  return "Par";
  if (d === 1)  return "Bogey";
  if (d === 2)  return "Doppelbogey";
  return `+${d}`;
};

const uid = () => Math.random().toString(36).slice(2, 9);
const toDay = () => new Date().toISOString().slice(0, 10);
const fmtDate = d => {
  try {
    return new Date(d).toLocaleDateString("de-AT", { day:"numeric", month:"short", year:"numeric" });
  } catch { return d; }
};

// Resolve a player's tee data (supports old format with cfg.cr/cfg.slope fallback)
function playerTee(player, cfg, club) {
  if (typeof player.cr === "number" && typeof player.slope === "number") {
    return { cr: player.cr, slope: player.slope, par: player.par, teeName: player.teeName };
  }
  if (club && player.teeName && club.tees?.[player.teeName]) {
    const t = club.tees[player.teeName];
    return { cr: t.cr, slope: t.slope, par: t.par, teeName: player.teeName };
  }
  if (club && cfg.defaultTeeName && club.tees?.[cfg.defaultTeeName]) {
    const t = club.tees[cfg.defaultTeeName];
    return { cr: t.cr, slope: t.slope, par: t.par, teeName: cfg.defaultTeeName };
  }
  // Legacy fallback: cfg.cr/cfg.slope from old rounds
  if (typeof cfg.cr === "number") {
    return { cr: cfg.cr, slope: cfg.slope, par: cfg.par || sumPar, teeName: cfg.teeName || "Standard" };
  }
  return null;
}

function validateClub(c) {
  const e = [];
  if (!c.name) e.push("name fehlt");
  if (!c.region) e.push("region fehlt");
  if (!c.numHoles || ![9,18].includes(c.numHoles)) e.push("numHoles muss 9 oder 18 sein");
  if (!c.tees || Object.keys(c.tees).length === 0) e.push("mindestens ein Tee erforderlich");
  else Object.entries(c.tees).forEach(([k,t]) => {
    if (typeof t.cr !== "number")    e.push(`tee "${k}": cr fehlt`);
    if (typeof t.slope !== "number") e.push(`tee "${k}": slope fehlt`);
    if (typeof t.par !== "number")   e.push(`tee "${k}": par fehlt`);
  });
  if (c.holes) {
    if (c.holes.length !== c.numHoles) e.push(`holes: ${c.holes.length} statt ${c.numHoles}`);
    const sis = c.holes.map(h => h.si);
    if (new Set(sis).size !== sis.length) e.push("SI-Werte nicht unique");
    const sumP = c.holes.reduce((s,h) => s + h.par, 0);
    const firstTeePar = Object.values(c.tees)[0]?.par;
    if (sumP !== firstTeePar) e.push(`Par-Summe ${sumP} ≠ Tee-Par ${firstTeePar}`);
  }
  return e;
}

// ═════════════════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════════════════
const GLOBAL_CSS = `
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body { margin: 0; background: ${T.canvas}; }
  input, button, textarea { font-family: inherit; }
  input:focus, textarea:focus { outline: none; border-color: ${T.gold}66 !important; box-shadow: 0 0 0 3px ${T.gold}15; }
  button { cursor: pointer; transition: transform 0.1s ease, background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease; }
  button:active { transform: scale(0.96); }
  .serif { font-family: "Instrument Serif", serif; letter-spacing: -0.02em; }
  .mono { font-family: "JetBrains Mono", monospace; font-variant-numeric: tabular-nums; }
  .fade-in { animation: fadeIn 0.25s ease-out; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .slide-up { animation: slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1); }
  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  .slide-in-r { animation: slideInR 0.22s cubic-bezier(0.16, 1, 0.3, 1); }
  @keyframes slideInR { from { transform: translateX(40%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  .slide-in-l { animation: slideInL 0.22s cubic-bezier(0.16, 1, 0.3, 1); }
  @keyframes slideInL { from { transform: translateX(-40%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  .scroll-hide::-webkit-scrollbar { display: none; }
  .scroll-hide { scrollbar-width: none; }
  .btn-hover:hover { background: ${T.surface3} !important; }
  .card-hover:hover { border-color: ${T.lineStrong} !important; background: ${T.surface2} !important; }
  .gold-hover:hover { background: ${T.goldBright} !important; }
`;

const S = {
  app: { minHeight: "100vh", background: T.canvas, color: T.text, fontFamily: "Inter, system-ui, sans-serif", fontSize: "14px", paddingBottom: "100px", letterSpacing: "-0.005em" },
  eyebrow: { fontSize: "10px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: T.textDim },
  page: { padding: "20px 16px" },
  card: { background: T.surface1, border: `1px solid ${T.line}`, borderRadius: "16px", padding: "18px", transition: "border-color 0.15s, background 0.15s" },
  input: { width: "100%", background: T.surface1, border: `1px solid ${T.line}`, borderRadius: "10px", color: T.text, padding: "12px 14px", fontSize: "15px", fontFamily: "Inter, sans-serif", transition: "border-color 0.15s, box-shadow 0.15s" },
  btnPrimary: { background: T.gold, color: T.canvas, border: "none", borderRadius: "12px", padding: "14px 22px", fontSize: "15px", fontWeight: 700, letterSpacing: "-0.01em" },
  btnSecondary: { background: T.surface1, color: T.text, border: `1px solid ${T.lineStrong}`, borderRadius: "12px", padding: "14px 22px", fontSize: "15px", fontWeight: 500 },
  btnGhost: { background: "transparent", color: T.textSoft, border: `1px solid ${T.line}`, borderRadius: "8px", padding: "8px 12px", fontSize: "13px", fontWeight: 500 },
};

// ═════════════════════════════════════════════════════════════════════════════
// STATELESS COMPONENTS — defined OUTSIDE main to prevent keyboard remount bug
// ═════════════════════════════════════════════════════════════════════════════
const LogoMark = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="15" stroke={T.gold} strokeWidth="1.3" opacity="0.35"/>
    <circle cx="16" cy="16" r="4.5" fill={T.gold}/>
    <line x1="16" y1="11" x2="16" y2="3" stroke={T.gold} strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M 16 3 L 21 5 L 16 7 Z" fill={T.gold}/>
  </svg>
);

const TeeDot = ({ name, size = 10 }) => (
  <span style={{
    display: "inline-block",
    width: size + "px", height: size + "px",
    borderRadius: "50%",
    background: teeColor(name),
    border: `1px solid ${T.canvas}`,
    verticalAlign: "middle",
    flexShrink: 0,
  }}/>
);

const EmptyState = ({ icon, title, sub }) => (
  <div style={{ background: T.surface1, border: `1px dashed ${T.line}`, borderRadius: "16px", padding: "40px 20px", textAlign: "center" }}>
    <div style={{ fontSize: "32px", opacity: 0.5, marginBottom: "10px" }}>{icon}</div>
    <div className="serif" style={{ fontSize: "18px", color: T.text, marginBottom: "4px" }}>{title}</div>
    <div style={{ fontSize: "13px", color: T.textDim, lineHeight: 1.5 }}>{sub}</div>
  </div>
);

// ═════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═════════════════════════════════════════════════════════════════════════════
export default function GolfApp() {
  // Navigation
  const [view, setView] = useState("home");
  const [tab, setTab] = useState("rounds");
  // Round config
  const [cfg, setCfg] = useState({ name: "", date: toDay(), numHoles: 18, clubName: "", defaultTeeName: "" });
  const [holes, setHoles] = useState(makeHoles(72, 18));
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState({});
  // Persisted data
  const [rounds, setRounds] = useState([]);
  const [friends, setFriends] = useState([]);
  const [customClubs, setCustomClubs] = useState([]);
  // Loaded flag - prevents sync-loop on initial data load
  const [loaded, setLoaded] = useState(false);
  // Sync
  const [syncCode, setSyncCode] = useState(null);
  const [syncStatus, setSyncStatus] = useState("idle"); // idle | syncing | error
  const [showSyncModal, setShowSyncModal] = useState(false);
  // UI state
  const [clubQ, setClubQ] = useState("");
  const [showDD, setShowDD] = useState(false);
  const [pickedClub, setPickedClub] = useState(null); // club awaiting tee selection
  const [newP, setNewP] = useState({ name: "", hcp: "" });
  const [expId, setExpId] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importErrors, setImportErrors] = useState([]);
  const [padOpen, setPadOpen] = useState(null); // { playerId, holeIdx } | null
  const [teePickerFor, setTeePickerFor] = useState(null); // playerId to change tee for
  const [loadedRoundId, setLoadedRoundId] = useState(null); // track which round is being viewed/edited
  // Scoring mode
  const [scoringMode, setScoringMode] = useState("batch"); // batch | live
  const [currentHole, setCurrentHole] = useState(0);
  const touchStartX = useRef(null);
  const syncTimerRef = useRef(null);

  const allClubs = useMemo(() => [...customClubs, ...BUILT_IN_CLUBS], [customClubs]);
  const selectedClub = useMemo(() => allClubs.find(c => c.name === cfg.clubName), [allClubs, cfg.clubName]);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try { const r = await window.storage.get("golf-rounds");       if (r) setRounds(JSON.parse(r.value)); } catch {}
      try { const f = await window.storage.get("golf-friends");      if (f) setFriends(JSON.parse(f.value)); } catch {}
      try { const c = await window.storage.get("golf-custom-clubs"); if (c) setCustomClubs(JSON.parse(c.value)); } catch {}
      try { const s = await window.storage.get("golf-sync-code");    if (s?.value) setSyncCode(s.value); } catch {}

      // Pull from cloud if sync code exists
      try {
        const stored = await window.storage.get("golf-sync-code");
        const code = stored?.value;
        if (code && SYNC_ENABLED) {
          const cloud = await cloudPull(code);
          if (cloud && cloud.data) {
            const localTsRaw = await window.storage.get("golf-last-sync");
            const localTs = localTsRaw?.value ? parseInt(localTsRaw.value) : 0;
            const cloudTs = new Date(cloud.updated_at).getTime();
            if (cloudTs > localTs) {
              if (cloud.data.rounds)       setRounds(cloud.data.rounds);
              if (cloud.data.friends)      setFriends(cloud.data.friends);
              if (cloud.data.customClubs)  setCustomClubs(cloud.data.customClubs);
              try { await window.storage.set("golf-last-sync", String(cloudTs)); } catch {}
            }
          }
        }
      } catch (e) { console.warn("Initial pull failed", e); }
      setLoaded(true);
    })();
  }, []);

  // ── Auto-sync on data change (debounced) ──────────────────────────────────
  useEffect(() => {
    if (!loaded || !syncCode || !SYNC_ENABLED) return;
    clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async () => {
      setSyncStatus("syncing");
      const ok = await cloudPush(syncCode, { rounds, friends, customClubs });
      setSyncStatus(ok ? "idle" : "error");
      if (ok) {
        try { await window.storage.set("golf-last-sync", String(Date.now())); } catch {}
      }
    }, 2000);
    return () => clearTimeout(syncTimerRef.current);
  }, [rounds, friends, customClubs, syncCode, loaded]);

  // ── Stable callbacks (prevent remounts) ───────────────────────────────────
  const onClubQ   = useCallback(e => { setClubQ(e.target.value); setShowDD(true); }, []);
  const onCfgName = useCallback(e => setCfg(c => ({ ...c, name: e.target.value })), []);
  const onDate    = useCallback(e => setCfg(c => ({ ...c, date: e.target.value })), []);
  const onNewName = useCallback(e => setNewP(p => ({ ...p, name: e.target.value })), []);
  const onNewHcp  = useCallback(e => setNewP(p => ({ ...p, hcp: e.target.value })), []);

  const filteredClubs = clubQ.length > 0
    ? allClubs.filter(c => c.name.toLowerCase().includes(clubQ.toLowerCase()) || c.region.toLowerCase().includes(clubQ.toLowerCase()))
    : allClubs.slice(0, 8);

  // ── Club + tee selection ──────────────────────────────────────────────────
  const pickClub = useCallback(club => {
    const teeKeys = Object.keys(club.tees);
    if (teeKeys.length === 1) pickDefaultTee(club, teeKeys[0]);
    else setPickedClub(club);
    setShowDD(false);
  }, []);

  const pickDefaultTee = useCallback((club, teeName) => {
    const tee = club.tees[teeName];
    const newHoles = club.holes || makeHoles(tee.par, club.numHoles);
    setCfg(c => ({ ...c, clubName: club.name, defaultTeeName: teeName, numHoles: club.numHoles }));
    setHoles(newHoles);
    // Update all existing players to use this as their tee (if not already set)
    setPlayers(ps => ps.map(p => ({
      ...p,
      teeName, cr: tee.cr, slope: tee.slope, par: tee.par,
    })));
    setClubQ("");
    setPickedClub(null);
  }, []);

  // Change a specific player's tee
  const changePlayerTee = useCallback((playerId, teeName) => {
    if (!selectedClub) return;
    const tee = selectedClub.tees[teeName];
    if (!tee) return;
    setPlayers(ps => ps.map(p => p.id === playerId ? {
      ...p, teeName, cr: tee.cr, slope: tee.slope, par: tee.par,
    } : p));
    setTeePickerFor(null);
  }, [selectedClub]);

  // ── Players
  const par = sumPar(holes);

  const addPlayer = useCallback(() => {
    const name = newP.name.trim(); if (!name) return;
    const hcp = parseFloat(newP.hcp);
    const tee = selectedClub && cfg.defaultTeeName ? selectedClub.tees[cfg.defaultTeeName] : null;
    const playerData = {
      id: uid(), name, hcp: isNaN(hcp) ? 0 : hcp,
      teeName: cfg.defaultTeeName || "",
      cr: tee?.cr, slope: tee?.slope, par: tee?.par,
    };
    setPlayers(p => [...p, playerData]);
    setNewP({ name: "", hcp: "" });
  }, [newP, selectedClub, cfg.defaultTeeName]);

  const addFromFriend = useCallback(f => {
    setPlayers(p => {
      if (p.find(x => x.name === f.name)) return p;
      const tee = selectedClub && cfg.defaultTeeName ? selectedClub.tees[cfg.defaultTeeName] : null;
      return [...p, {
        id: uid(), name: f.name, hcp: f.hcp,
        teeName: cfg.defaultTeeName || "",
        cr: tee?.cr, slope: tee?.slope, par: tee?.par,
      }];
    });
  }, [selectedClub, cfg.defaultTeeName]);

  const saveFriend = async (player) => {
    if (friends.find(f => f.name === player.name)) return;
    const updated = [...friends, { name: player.name, hcp: player.hcp }];
    setFriends(updated);
    try { await window.storage.set("golf-friends", JSON.stringify(updated)); } catch {}
  };
  const deleteFriend = async (name) => {
    const updated = friends.filter(f => f.name !== name);
    setFriends(updated);
    try { await window.storage.set("golf-friends", JSON.stringify(updated)); } catch {}
  };
  const updateFriendHcp = async (name, hcp) => {
    const updated = friends.map(f => f.name === name ? { ...f, hcp: parseFloat(hcp) || 0 } : f);
    setFriends(updated);
    try { await window.storage.set("golf-friends", JSON.stringify(updated)); } catch {}
  };
  const addFriendDirect = async () => {
    const name = newP.name.trim(); if (!name) return;
    const hcp = parseFloat(newP.hcp) || 0;
    const updated = [...friends, { name, hcp }];
    setFriends(updated); setNewP({ name: "", hcp: "" });
    try { await window.storage.set("golf-friends", JSON.stringify(updated)); } catch {}
  };

  // ── Scores
  const setScore = (pid, hi, val) => setScores(s => ({ ...s, [pid]: { ...s[pid], [hi]: val } }));
  const clearScore = (pid, hi) => setScores(s => {
    const ps = { ...(s[pid] || {}) }; delete ps[hi];
    return { ...s, [pid]: ps };
  });

  // Auto-advance for number pad
  // Batch mode: same player, next hole → then next player, hole 0 (reads top-to-bottom per player)
  // Live mode: same hole, next player → then next hole, player 0 (reads hole-by-hole)
  const advanceToNext = () => {
    if (!padOpen) return;
    const { playerId, holeIdx } = padOpen;
    const playerIdx = players.findIndex(p => p.id === playerId);

    if (scoringMode === "batch") {
      // Find next empty hole for same player
      for (let h = holeIdx + 1; h < cfg.numHoles; h++) {
        if (scores[playerId]?.[h] === undefined) {
          setPadOpen({ playerId, holeIdx: h });
          return;
        }
      }
      // Move to next player, first empty hole
      for (let i = playerIdx + 1; i < players.length; i++) {
        for (let h = 0; h < cfg.numHoles; h++) {
          if (scores[players[i].id]?.[h] === undefined) {
            setPadOpen({ playerId: players[i].id, holeIdx: h });
            return;
          }
        }
      }
      // Fallback: next player, hole 0 if they have no empty holes left
      if (playerIdx + 1 < players.length) {
        setPadOpen({ playerId: players[playerIdx + 1].id, holeIdx: 0 });
        return;
      }
      setPadOpen(null);
    } else {
      // Live mode: next player same hole → next hole player 0
      for (let i = playerIdx + 1; i < players.length; i++) {
        if (scores[players[i].id]?.[holeIdx] === undefined) {
          setPadOpen({ playerId: players[i].id, holeIdx });
          return;
        }
      }
      if (holeIdx + 1 < cfg.numHoles) {
        for (let i = 0; i < players.length; i++) {
          if (scores[players[i].id]?.[holeIdx + 1] === undefined) {
            setPadOpen({ playerId: players[i].id, holeIdx: holeIdx + 1 });
            setCurrentHole(holeIdx + 1);
            return;
          }
        }
        setPadOpen({ playerId: players[0].id, holeIdx: holeIdx + 1 });
        setCurrentHole(holeIdx + 1);
        return;
      }
      setPadOpen(null);
    }
  };

  const padEnter = (n) => {
    if (!padOpen) return;
    setScore(padOpen.playerId, padOpen.holeIdx, n);
    setTimeout(advanceToNext, 120);
  };
  const padStrich = () => {
    if (!padOpen) return;
    setScore(padOpen.playerId, padOpen.holeIdx, STRICH);
    setTimeout(advanceToNext, 120);
  };
  const padClear = () => {
    if (!padOpen) return;
    clearScore(padOpen.playerId, padOpen.holeIdx);
  };

  // ── Stats (uses per-player tee data)
  const getStats = (player) => {
    const tee = playerTee(player, cfg, selectedClub);
    if (!tee) return { ph: 0, hr: [], bT: 0, nT: 0, sfNT: 0, sfBT: 0 };
    const ph = calcPH(player.hcp, tee.slope, tee.cr, tee.par || par);
    const hr = holes.map((h, i) => {
      const g = scores[player.id]?.[i];
      const hs = holeHS(ph, h.si, cfg.numHoles);
      return { g, hs, netto: isValid(g) ? g - hs : null, sfN: sfNetto(g, hs, h.par), sfB: sfBrutto(g, h.par), par: h.par };
    });
    const played = hr.filter(h => isValid(h.g));
    const bT = played.reduce((s, h) => s + h.g, 0);
    return {
      ph, hr, bT, tee,
      nT: played.length ? bT - ph : 0,
      sfNT: hr.reduce((s, h) => s + (h.sfN || 0), 0),
      sfBT: hr.reduce((s, h) => s + (h.sfB || 0), 0),
    };
  };

  // ── Rounds
  const saveRound = async () => {
    let u;
    if (loadedRoundId) {
      // Update existing round (avoid duplicates when viewing then re-saving)
      u = rounds.map(r => r.id === loadedRoundId
        ? { ...r, cfg, holes, players, scores, savedAt: new Date().toISOString() }
        : r);
    } else {
      // New round
      const newR = { id: uid(), cfg, holes, players, scores, savedAt: new Date().toISOString() };
      u = [newR, ...rounds].slice(0, 50);
      setLoadedRoundId(newR.id); // so subsequent saves update this one
    }
    setRounds(u);
    try { await window.storage.set("golf-rounds", JSON.stringify(u)); } catch {}
  };
  const loadRound = r => {
    setLoadedRoundId(r.id);
    setCfg(r.cfg); setHoles(r.holes); setPlayers(r.players); setScores(r.scores);
    setCurrentHole(0); setScoringMode("batch");
    setView("results");
  };
  const deleteRound = async (id) => {
    const updated = rounds.filter(r => r.id !== id);
    setRounds(updated);
    if (id === loadedRoundId) setLoadedRoundId(null);
    try { await window.storage.set("golf-rounds", JSON.stringify(updated)); } catch {}
  };

  const newRound = () => {
    setLoadedRoundId(null); // first save will create a new record
    setCfg({ name: "", date: toDay(), numHoles: 18, clubName: "", defaultTeeName: "" });
    setHoles(makeHoles(72, 18)); setPlayers([]); setScores({});
    setClubQ(""); setPickedClub(null);
    setCurrentHole(0); setScoringMode("batch");
    setView("setup");
  };

  // ── Import / sync
  const importClub = async () => {
    try {
      let text = importText.trim();
      text = text.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "");
      const parsed = JSON.parse(text);
      const errors = validateClub(parsed);
      if (errors.length > 0) { setImportErrors(errors); return; }
      const existing = customClubs.findIndex(c => c.name === parsed.name);
      const updated = existing >= 0
        ? customClubs.map((c, i) => i === existing ? parsed : c)
        : [parsed, ...customClubs];
      setCustomClubs(updated);
      try { await window.storage.set("golf-custom-clubs", JSON.stringify(updated)); } catch {}
      setImportText(""); setImportErrors([]); setShowImport(false);
    } catch (e) {
      setImportErrors([`JSON-Fehler: ${e.message}`]);
    }
  };

  const setupSync = async (code) => {
    const clean = cleanSync(code);
    if (clean.length !== 8) return false;
    setSyncCode(clean);
    try { await window.storage.set("golf-sync-code", clean); } catch {}
    // Pull existing cloud data if any
    if (SYNC_ENABLED) {
      const cloud = await cloudPull(clean);
      if (cloud && cloud.data) {
        if (cloud.data.rounds)      setRounds(cloud.data.rounds);
        if (cloud.data.friends)     setFriends(cloud.data.friends);
        if (cloud.data.customClubs) setCustomClubs(cloud.data.customClubs);
      }
    }
    setShowSyncModal(false);
    return true;
  };

  const disconnectSync = async () => {
    setSyncCode(null);
    try { await window.storage.delete("golf-sync-code"); } catch {}
    try { await window.storage.delete("golf-last-sync"); } catch {}
    setShowSyncModal(false);
  };

  // ── Live mode navigation
  const goToHole = (idx) => {
    if (idx < 0 || idx >= cfg.numHoles) return;
    setCurrentHole(idx);
  };

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 60) {
      if (diff < 0) goToHole(currentHole + 1);
      else goToHole(currentHole - 1);
    }
    touchStartX.current = null;
  };

  const stepIdx = ["setup","holes","scoring","results"].indexOf(view) + 1;

  // ═══════════════════════════════════════════════════════════════════════════
  // SUB-RENDERS
  // ═══════════════════════════════════════════════════════════════════════════

  // Header
  const renderHeader = () => (
    <div style={{
      padding: "14px 16px", borderBottom: `1px solid ${T.line}`, background: T.canvas,
      position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", gap: "10px",
    }}>
      <LogoMark size={22} />
      <div style={{ flex: 1 }}>
        <div className="serif" style={{ fontSize: "18px", color: T.text }}>Fairway</div>
        {view !== "home" && (
          <div style={{ fontSize: "11px", color: T.textSoft, marginTop: "1px" }}>
            {cfg.clubName || "Neue Runde"}
          </div>
        )}
      </div>
      {syncCode && SYNC_ENABLED && view === "home" && (
        <button
          onClick={() => setShowSyncModal(true)}
          style={{
            background: "transparent", border: "none",
            display: "flex", alignItems: "center", gap: "4px",
            color: syncStatus === "error" ? T.double : syncStatus === "syncing" ? T.gold : T.sage,
            fontSize: "11px", padding: "6px 8px",
          }}
          title="Cloud Sync Status"
        >
          <span style={{ fontSize: "14px" }}>☁️</span>
          <span>{syncStatus === "syncing" ? "..." : syncStatus === "error" ? "!" : "✓"}</span>
        </button>
      )}
      {view !== "home" && (
        <button onClick={() => setView("home")} className="btn-hover" style={{ ...S.btnGhost, padding: "7px 12px" }}>
          Schließen
        </button>
      )}
    </div>
  );

  // Progress bar
  const renderProgressBar = () => (
    <div style={{ padding: "12px 16px", background: T.canvas, borderBottom: `1px solid ${T.line}` }}>
      <div style={{ display: "flex", gap: "4px" }}>
        {["Setup", "Löcher", "Scores", "Ergebnis"].map((label, i) => {
          const active = stepIdx === i + 1;
          const done = stepIdx > i + 1;
          return (
            <div key={label} style={{ flex: 1 }}>
              <div style={{ height: "2px", borderRadius: "2px", background: done ? T.gold : active ? `${T.gold}aa` : T.line, marginBottom: "6px", transition: "background 0.3s" }}/>
              <div style={{ fontSize: "10px", color: active ? T.gold : done ? T.textSoft : T.textDim, fontWeight: active ? 600 : 500 }}>{label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // HOME SCREEN
  // ═══════════════════════════════════════════════════════════════════════════
  const renderHome = () => {
    const totalRounds = rounds.length;
    const clubsPlayed = new Set(rounds.map(r => r.cfg.clubName).filter(Boolean)).size;
    const bestSF = rounds.reduce((max, r) => {
      const rClub = allClubs.find(c => c.name === r.cfg.clubName);
      const stats = r.players.map(p => {
        const tee = playerTee(p, r.cfg, rClub);
        if (!tee) return 0;
        const ph = calcPH(p.hcp, tee.slope, tee.cr, tee.par || sumPar(r.holes));
        return r.holes.reduce((s, h, i) => {
          const g = r.scores[p.id]?.[i];
          const hs = holeHS(ph, h.si, r.cfg.numHoles);
          return s + (sfNetto(g, hs, h.par) || 0);
        }, 0);
      });
      return Math.max(max, ...stats, 0);
    }, 0);

    return (
      <div className="fade-in">
        {/* Hero */}
        <div style={{ padding: "32px 20px 24px" }}>
          <div style={{ ...S.eyebrow, marginBottom: "8px", color: T.gold }}>⛳ Golf Österreich</div>
          <h1 className="serif" style={{ fontSize: "42px", margin: "0 0 4px", lineHeight: 1.05, color: T.text }}>
            Schönes <em style={{ color: T.gold, fontStyle: "italic" }}>Spiel.</em>
          </h1>
          <p style={{ color: T.textSoft, margin: "0 0 24px", fontSize: "15px", lineHeight: 1.5 }}>
            WHS Handicap · Stableford · alle österreichischen Clubs
          </p>
          <button onClick={newRound} className="gold-hover"
            style={{ ...S.btnPrimary, width: "100%", padding: "18px", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Neue Runde starten</span>
            <span style={{ fontSize: "18px" }}>→</span>
          </button>
        </div>

        {/* Stats */}
        {totalRounds > 0 && (
          <div style={{ padding: "0 16px 20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", background: T.surface1, border: `1px solid ${T.line}`, borderRadius: "16px", padding: "4px" }}>
              {[
                { label: "Runden", value: totalRounds },
                { label: "Clubs", value: clubsPlayed },
                { label: "Bester SF", value: bestSF || "—", accent: true },
              ].map((s,i,arr) => (
                <div key={s.label} style={{ padding: "14px 8px", textAlign: "center", borderRight: i < arr.length-1 ? `1px solid ${T.line}` : "none" }}>
                  <div className="mono" style={{ fontSize: "22px", fontWeight: 700, color: s.accent ? T.gold : T.text }}>{s.value}</div>
                  <div style={{ ...S.eyebrow, marginTop: "4px", fontSize: "9px" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ padding: "0 16px 16px", display: "flex", gap: "4px" }}>
          {[{k:"rounds",l:"Runden"},{k:"friends",l:"Freunde"},{k:"history",l:"Verlauf"}].map(({k,l}) => (
            <button key={k} onClick={() => setTab(k)} style={{
              flex: 1, padding: "10px 0",
              background: tab === k ? T.surface2 : "transparent",
              color: tab === k ? T.text : T.textSoft,
              border: `1px solid ${tab === k ? T.lineStrong : "transparent"}`,
              borderRadius: "10px", fontSize: "13px",
              fontWeight: tab === k ? 600 : 500,
            }}>{l}</button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ padding: "0 16px" }}>
          {tab === "rounds" && (
            <>
              <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
                <button onClick={() => setShowImport(true)} className="btn-hover"
                  style={{ ...S.btnSecondary, flex: 1, fontSize: "12px", padding: "11px 10px" }}>
                  📥 Club importieren
                </button>
                <button onClick={() => setShowSyncModal(true)} className="btn-hover"
                  style={{ ...S.btnSecondary, flex: 1, fontSize: "12px", padding: "11px 10px" }}>
                  ☁️ {syncCode ? `Sync: ${formatSync(syncCode)}` : "Cloud Sync"}
                </button>
              </div>

              {customClubs.length > 0 && (
                <div style={{ fontSize: "11px", color: T.textDim, marginBottom: "12px", textAlign: "center" }}>
                  {customClubs.length} eigene{customClubs.length === 1 ? "r" : ""} Club{customClubs.length === 1 ? "" : "s"} gespeichert
                </div>
              )}

              {rounds.length === 0
                ? <EmptyState icon="🏌️" title="Noch keine Runden" sub="Deine gespielten Runden erscheinen hier." />
                : (<>
                    <div style={{ ...S.eyebrow, marginBottom: "10px" }}>Letzte Runden</div>
                    {rounds.slice(0, 5).map(r => renderRoundCard(r, false))}
                  </>)}
            </>
          )}

          {tab === "friends" && (
            <>
              {friends.length === 0
                ? <EmptyState icon="👥" title="Keine Freunde gespeichert" sub="Einmal Spieler+HCP hinzufügen, dann bei jeder Runde ein Tap." />
                : (<>
                    <div style={{ ...S.eyebrow, marginBottom: "10px" }}>Gespeichert ({friends.length})</div>
                    {friends.map((f,i) => (
                      <div key={i} className="card-hover" style={{ ...S.card, padding: "12px 14px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: `${T.gold}20`, border: `1px solid ${T.gold}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: T.gold }}>
                          {f.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: "14px", color: T.text }}>{f.name}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                            <span style={{ fontSize: "11px", color: T.textDim }}>HCP</span>
                            <input type="number" step="0.1" value={f.hcp}
                              onChange={e => updateFriendHcp(f.name, e.target.value)}
                              style={{ ...S.input, width: "70px", padding: "4px 8px", fontSize: "12px", borderRadius: "6px" }}/>
                          </div>
                        </div>
                        <button onClick={() => deleteFriend(f.name)} style={{ background: "transparent", border: "none", color: T.double, fontSize: "18px", padding: "8px", opacity: 0.6 }}>×</button>
                      </div>
                    ))}
                  </>)
              }
              <div style={{ ...S.card, padding: "14px", marginTop: "16px" }}>
                <div style={{ ...S.eyebrow, marginBottom: "10px" }}>Neu hinzufügen</div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input style={{ ...S.input, flex: 1 }} placeholder="Name" value={newP.name} onChange={onNewName}
                    onKeyDown={e => e.key === "Enter" && addFriendDirect()}/>
                  <input style={{ ...S.input, width: "80px", textAlign: "center" }} type="number" step="0.1" placeholder="HCP" value={newP.hcp} onChange={onNewHcp}
                    onKeyDown={e => e.key === "Enter" && addFriendDirect()}/>
                  <button onClick={addFriendDirect} className="gold-hover"
                    style={{ ...S.btnPrimary, padding: "0 18px", fontSize: "22px", lineHeight: 1 }}>+</button>
                </div>
              </div>
            </>
          )}

          {tab === "history" && (
            rounds.length === 0
              ? <EmptyState icon="📊" title="Kein Verlauf" sub="Sobald du Runden gespielt hast, siehst du hier deine Entwicklung." />
              : rounds.map(r => renderRoundCard(r, true))
          )}
        </div>
      </div>
    );
  };

  // Round card (inline, not a sub-component to avoid remounts)
  const renderRoundCard = (r, showFull) => {
    const rClub = allClubs.find(c => c.name === r.cfg.clubName);
    const sortedPlayers = r.players.map(p => {
      const tee = playerTee(p, r.cfg, rClub);
      const ph = tee ? calcPH(p.hcp, tee.slope, tee.cr, tee.par || sumPar(r.holes)) : 0;
      const sfNT = r.holes.reduce((s, h, i) => {
        const g = r.scores[p.id]?.[i];
        const hs = holeHS(ph, h.si, r.cfg.numHoles);
        return s + (sfNetto(g, hs, h.par) || 0);
      }, 0);
      return { p, sfNT, tee };
    }).sort((a, b) => b.sfNT - a.sfNT);
    const top = sortedPlayers[0];

    return (
      <div key={r.id} onClick={() => loadRound(r)} className="card-hover"
        style={{ ...S.card, cursor: "pointer", padding: "14px 16px", marginBottom: "10px", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: "24px" }}>
            <div style={{ fontSize: "14px", fontWeight: 600, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: "3px" }}>
              {r.cfg.clubName || r.cfg.name || "Runde"}
            </div>
            <div style={{ fontSize: "11px", color: T.textSoft }}>
              {fmtDate(r.cfg.date)} · {r.cfg.numHoles}L · {r.players.length} {r.players.length === 1 ? "Spieler" : "Spieler"}
            </div>
          </div>
          {top && (
            <div style={{ textAlign: "right" }}>
              <div className="mono" style={{ fontSize: "20px", fontWeight: 700, color: T.gold, lineHeight: 1 }}>{top.sfNT}</div>
              <div style={{ fontSize: "9px", color: T.textDim, letterSpacing: "0.06em", marginTop: "2px" }}>SF NETTO</div>
            </div>
          )}
        </div>
        {showFull && sortedPlayers.length > 0 && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px", paddingTop: "10px", borderTop: `1px solid ${T.line}` }}>
            {sortedPlayers.map((s,i) => (
              <div key={s.p.id} style={{
                fontSize: "11px", padding: "3px 8px",
                background: i === 0 ? `${T.gold}18` : T.surface2,
                color: i === 0 ? T.gold : T.textSoft,
                borderRadius: "6px",
                border: `1px solid ${i === 0 ? T.gold + "40" : T.line}`,
                display: "flex", alignItems: "center", gap: "5px",
              }}>
                {s.tee?.teeName && <TeeDot name={s.tee.teeName} size={7} />}
                {i === 0 && "🥇 "}{s.p.name}: <span style={{ fontWeight: 700 }}>{s.sfNT}</span>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={e => { e.stopPropagation(); if (confirm("Runde löschen?")) deleteRound(r.id); }}
          aria-label="Runde löschen"
          style={{
            position: "absolute", top: "8px", right: "8px",
            width: "32px", height: "32px",
            background: T.surface2,
            border: `1px solid ${T.line}`,
            borderRadius: "8px",
            color: T.textDim,
            fontSize: "18px",
            display: "flex", alignItems: "center", justifyContent: "center",
            lineHeight: 1,
            padding: 0,
          }}>×</button>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SETUP SCREEN
  // ═══════════════════════════════════════════════════════════════════════════
  const renderSetup = () => (
    <div className="fade-in">
      {renderProgressBar()}
      <div style={S.page}>
        <h2 className="serif" style={{ fontSize: "28px", margin: "0 0 6px", color: T.text }}>Setup</h2>
        <p style={{ fontSize: "13px", color: T.textSoft, marginTop: 0, marginBottom: "22px" }}>
          Club, Abschlag und Spieler wählen
        </p>

        {/* CLUB */}
        <div style={S.card}>
          <div style={{ ...S.eyebrow, marginBottom: "12px" }}>01 · Golfclub</div>
          <div style={{ position: "relative" }}>
            <input style={{ ...S.input, fontSize: "16px", paddingLeft: "40px" }}
              placeholder="Club suchen…" value={clubQ}
              onFocus={() => setShowDD(true)} onChange={onClubQ}
              autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck="false"/>
            <div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: T.textDim, fontSize: "16px" }}>🔍</div>
            {clubQ && (
              <button onClick={() => { setClubQ(""); setShowDD(false); }}
                style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: T.textDim, fontSize: "18px", padding: "8px" }}>×</button>
            )}
          </div>

          {showDD && filteredClubs.length > 0 && (
            <div style={{ marginTop: "8px", background: T.surface2, border: `1px solid ${T.line}`, borderRadius: "12px", maxHeight: "280px", overflowY: "auto", boxShadow: "0 8px 32px #00000088" }}>
              {filteredClubs.map((c,i) => {
                const firstTee = Object.values(c.tees)[0];
                const teeCount = Object.keys(c.tees).length;
                const hasHoles = !!c.holes;
                const isCustom = customClubs.includes(c);
                return (
                  <div key={i} onMouseDown={e => { e.preventDefault(); pickClub(c); }}
                    style={{ padding: "11px 14px", borderBottom: i < filteredClubs.length - 1 ? `1px solid ${T.line}` : "none", cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = T.surface3}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: T.text }}>{c.name}</span>
                      {hasHoles && <span style={{ fontSize: "9px", color: T.sage, background: `${T.sage}15`, padding: "1px 6px", borderRadius: "4px", border: `1px solid ${T.sage}40` }}>verifiziert</span>}
                      {isCustom && <span style={{ fontSize: "9px", color: T.gold, background: `${T.gold}15`, padding: "1px 6px", borderRadius: "4px", border: `1px solid ${T.gold}40` }}>eigen</span>}
                    </div>
                    <div style={{ fontSize: "11px", color: T.textDim }}>
                      {c.region} · Par {firstTee.par} · {c.numHoles} Loch{teeCount > 1 ? ` · ${teeCount} Abschläge` : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tee picker when club selected but no default tee */}
          {pickedClub && (
            <div className="fade-in" style={{ marginTop: "14px", padding: "14px", background: `${T.gold}10`, border: `1px solid ${T.gold}40`, borderRadius: "12px" }}>
              <div style={{ fontSize: "12px", color: T.gold, marginBottom: "12px", fontWeight: 600 }}>
                Standard-Abschlag für <b>{pickedClub.name}</b>:
              </div>
              <div style={{ fontSize: "11px", color: T.textSoft, marginBottom: "12px" }}>
                Dieser wird für neue Spieler verwendet. Jeder Spieler kann individuell geändert werden.
              </div>
              <div style={{ display: "grid", gap: "6px" }}>
                {Object.entries(pickedClub.tees).map(([tn, t]) => (
                  <button key={tn} onClick={() => pickDefaultTee(pickedClub, tn)} className="btn-hover"
                    style={{ ...S.btnSecondary, padding: "12px 14px", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <TeeDot name={tn} size={12} />
                      <span style={{ fontWeight: 600 }}>{tn}</span>
                    </span>
                    <span className="mono" style={{ fontSize: "11px", color: T.textSoft }}>Par {t.par} · {t.cr}/{t.slope}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Confirmation */}
          {cfg.clubName && !pickedClub && (
            <div className="fade-in" style={{ marginTop: "12px", background: `${T.gold}10`, border: `1px solid ${T.gold}40`, borderRadius: "12px", padding: "14px" }}>
              <div style={{ ...S.eyebrow, color: T.gold, marginBottom: "6px" }}>✓ Ausgewählt</div>
              <div style={{ fontWeight: 600, fontSize: "15px", color: T.text, marginBottom: "3px" }}>{cfg.clubName}</div>
              {cfg.defaultTeeName && (
                <div style={{ fontSize: "12px", color: T.textSoft, marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <TeeDot name={cfg.defaultTeeName} size={10} />
                  Standard: {cfg.defaultTeeName}
                </div>
              )}
              <div style={{ display: "flex", gap: "16px" }}>
                <div>
                  <div style={{ fontSize: "9px", color: T.goldDim, letterSpacing: "0.08em", fontWeight: 600 }}>PAR</div>
                  <div className="mono" style={{ fontSize: "16px", fontWeight: 700, color: T.text }}>{par}</div>
                </div>
                <div>
                  <div style={{ fontSize: "9px", color: T.goldDim, letterSpacing: "0.08em", fontWeight: 600 }}>LÖCHER</div>
                  <div className="mono" style={{ fontSize: "16px", fontWeight: 700, color: T.text }}>{cfg.numHoles}</div>
                </div>
                {selectedClub && Object.keys(selectedClub.tees).length > 1 && (
                  <div>
                    <div style={{ fontSize: "9px", color: T.goldDim, letterSpacing: "0.08em", fontWeight: 600 }}>ABSCHLÄGE</div>
                    <div className="mono" style={{ fontSize: "16px", fontWeight: 700, color: T.text }}>{Object.keys(selectedClub.tees).length}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* DETAILS */}
        <div style={{ ...S.card, marginTop: "12px" }}>
          <div style={{ ...S.eyebrow, marginBottom: "12px" }}>02 · Details</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
            <div>
              <div style={{ fontSize: "11px", color: T.textDim, marginBottom: "5px" }}>Datum</div>
              <input style={S.input} type="date" value={cfg.date} onChange={onDate}/>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: T.textDim, marginBottom: "5px" }}>Löcher</div>
              <div style={{ display: "flex", gap: "6px" }}>
                {[9,18].map(n => (
                  <button key={n} onClick={() => { setCfg(c => ({ ...c, numHoles: n })); setHoles(makeHoles(par, n)); }}
                    style={{ flex: 1, padding: "12px 0", borderRadius: "10px", fontSize: "15px", fontWeight: 700,
                      background: cfg.numHoles === n ? T.gold : T.surface1,
                      color: cfg.numHoles === n ? T.canvas : T.text,
                      border: `1px solid ${cfg.numHoles === n ? T.gold : T.line}` }}>{n}</button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: T.textDim, marginBottom: "5px" }}>Rundenname (optional)</div>
            <input style={S.input} placeholder="z.B. Samstag Runde" value={cfg.name} onChange={onCfgName}/>
          </div>
        </div>

        {/* PLAYERS */}
        <div style={{ ...S.card, marginTop: "12px" }}>
          <div style={{ ...S.eyebrow, marginBottom: "12px" }}>03 · Spieler {players.length > 0 && `(${players.length})`}</div>

          {friends.length > 0 && (
            <div style={{ marginBottom: "14px" }}>
              <div style={{ fontSize: "11px", color: T.textDim, marginBottom: "8px" }}>Aus Freunden:</div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {friends.map((f,i) => {
                  const added = !!players.find(p => p.name === f.name);
                  return (
                    <button key={i}
                      onClick={() => added ? setPlayers(p => p.filter(x => x.name !== f.name)) : addFromFriend(f)}
                      style={{ padding: "6px 11px", borderRadius: "20px",
                        border: `1px solid ${added ? T.gold : T.line}`,
                        background: added ? `${T.gold}20` : T.surface1,
                        color: added ? T.gold : T.textSoft,
                        fontSize: "12px", fontWeight: 500, whiteSpace: "nowrap" }}>
                      {added ? "✓ " : "+ "}{f.name} <span className="mono" style={{ opacity: 0.7 }}>({f.hcp})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {players.length === 0
            ? <EmptyState icon="👤" title="Noch keine Spieler" sub="Füge Freunde hinzu oder tippe unten einen Namen ein." />
            : players.map(p => {
                const tee = playerTee(p, cfg, selectedClub);
                const ph = tee ? calcPH(p.hcp, tee.slope, tee.cr, tee.par || par) : "—";
                const isFriend = !!friends.find(f => f.name === p.name);
                const teeCount = selectedClub ? Object.keys(selectedClub.tees).length : 0;
                return (
                  <div key={p.id} style={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: "12px", padding: "12px 14px", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: `${T.gold}20`, border: `1px solid ${T.gold}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: T.gold }}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: "14px", color: T.text }}>{p.name}</div>
                        <div style={{ fontSize: "11px", color: T.textSoft, marginTop: "1px" }}>
                          HCP <span className="mono">{p.hcp}</span> · Vorgabe <span className="mono" style={{ color: T.gold, fontWeight: 700 }}>{ph}</span>
                        </div>
                      </div>
                      {!isFriend && (
                        <button onClick={() => saveFriend(p)} title="Als Freund speichern"
                          style={{ background: "transparent", border: `1px solid ${T.line}`, borderRadius: "6px", color: T.textDim, padding: "4px 8px", fontSize: "11px" }}>☆</button>
                      )}
                      <button onClick={() => setPlayers(pl => pl.filter(x => x.id !== p.id))}
                        style={{ background: "transparent", border: "none", color: T.double, fontSize: "18px", padding: "4px 8px", opacity: 0.7 }}>×</button>
                    </div>

                    {/* Tee selector — only if club has multiple tees */}
                    {teeCount > 1 && (
                      <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px solid ${T.line}` }}>
                        <div style={{ fontSize: "10px", color: T.textDim, marginBottom: "6px", letterSpacing: "0.06em", fontWeight: 600 }}>ABSCHLAG</div>
                        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                          {Object.entries(selectedClub.tees).map(([tn, t]) => {
                            const isSelected = p.teeName === tn;
                            return (
                              <button key={tn} onClick={() => changePlayerTee(p.id, tn)}
                                style={{
                                  padding: "5px 9px", borderRadius: "14px",
                                  background: isSelected ? `${teeColor(tn)}25` : T.surface1,
                                  color: isSelected ? T.text : T.textSoft,
                                  border: `1px solid ${isSelected ? teeColor(tn) + "80" : T.line}`,
                                  fontSize: "11px", fontWeight: isSelected ? 600 : 500,
                                  display: "flex", alignItems: "center", gap: "5px",
                                }}>
                                <TeeDot name={tn} size={8} />
                                <span>{tn.replace(/\s*\([^)]*\)\s*/, "")}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
          }

          <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
            <input style={{ ...S.input, flex: 1 }} placeholder="Neuer Spieler" value={newP.name} onChange={onNewName} onKeyDown={e => e.key === "Enter" && addPlayer()}/>
            <input style={{ ...S.input, width: "70px", textAlign: "center" }} type="number" step="0.1" placeholder="HCP" value={newP.hcp} onChange={onNewHcp} onKeyDown={e => e.key === "Enter" && addPlayer()}/>
            <button onClick={addPlayer} className="gold-hover" style={{ ...S.btnPrimary, padding: "0 18px", fontSize: "22px" }}>+</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
          <button style={{ ...S.btnSecondary, flex: 1 }} onClick={() => setView("home")}>← Zurück</button>
          <button style={{ ...S.btnPrimary, flex: 2, opacity: players.length === 0 || !cfg.clubName ? 0.35 : 1 }}
            disabled={players.length === 0 || !cfg.clubName}
            onClick={() => { setShowDD(false); setView("holes"); }}
            className={players.length > 0 && cfg.clubName ? "gold-hover" : ""}>
            Weiter → Löcher prüfen
          </button>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLES SCREEN
  // ═══════════════════════════════════════════════════════════════════════════
  const renderHoles = () => {
    const verified = !!selectedClub?.holes;
    return (
      <div className="fade-in">
        {renderProgressBar()}
        <div style={S.page}>
          <h2 className="serif" style={{ fontSize: "28px", margin: "0 0 6px", color: T.text }}>Lochkonfiguration</h2>
          <p style={{ fontSize: "13px", color: T.textSoft, marginTop: 0, marginBottom: "16px" }}>Par und Vorgabenwert pro Loch</p>

          <div style={{ padding: "10px 14px", background: verified ? `${T.sage}15` : `${T.bogey}15`, border: `1px solid ${verified ? T.sage + "40" : T.bogey + "40"}`, borderRadius: "12px", marginBottom: "14px", fontSize: "12px", color: verified ? T.sage : T.bogey, display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "14px" }}>{verified ? "✓" : "⚠️"}</span>
            <span>{verified ? "Loch-Daten aus offizieller Scorekarte" : "Loch-Pars automatisch generiert – bitte mit Scorekarte vergleichen"}</span>
          </div>

          <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: T.surface2, borderBottom: `1px solid ${T.line}` }}>
                  {["Loch","Par","Vorgabe"].map(h => (
                    <th key={h} style={{ padding: "10px", fontSize: "10px", color: T.textDim, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", textAlign: "center" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {holes.map((hole,i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.line}` }}>
                    <td className="mono" style={{ padding: "6px 10px", textAlign: "center", fontWeight: 700, color: T.gold, fontSize: "14px" }}>{i+1}</td>
                    <td style={{ padding: "4px 10px", textAlign: "center" }}>
                      <input type="number" min="3" max="6" value={hole.par}
                        onChange={e => setHoles(hs => hs.map((h,j) => j === i ? { ...h, par: parseInt(e.target.value) || 4 } : h))}
                        style={{ ...S.input, width: "54px", padding: "6px 4px", textAlign: "center", margin: "0 auto", display: "block", fontSize: "14px" }}/>
                    </td>
                    <td style={{ padding: "4px 10px", textAlign: "center" }}>
                      <input type="number" min="1" max={cfg.numHoles} value={hole.si}
                        onChange={e => setHoles(hs => hs.map((h,j) => j === i ? { ...h, si: parseInt(e.target.value) || 1 } : h))}
                        style={{ ...S.input, width: "54px", padding: "6px 4px", textAlign: "center", margin: "0 auto", display: "block", fontSize: "14px" }}/>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: `1px solid ${T.lineStrong}`, background: T.surface2 }}>
                  <td style={{ padding: "10px", textAlign: "center", fontWeight: 700, color: T.textDim, fontSize: "10px", letterSpacing: "0.08em" }}>TOTAL</td>
                  <td className="mono" style={{ padding: "10px", textAlign: "center", fontWeight: 700, color: T.gold, fontSize: "16px" }}>{par}</td>
                  <td/>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
            <button style={{ ...S.btnSecondary, flex: 1 }} onClick={() => setView("setup")}>← Zurück</button>
            <button style={{ ...S.btnPrimary, flex: 2 }} className="gold-hover" onClick={() => { setCurrentHole(0); setView("scoring"); }}>Scores eingeben →</button>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SCORING — with mode toggle
  // ═══════════════════════════════════════════════════════════════════════════
  const renderScoring = () => {
    const totalScored = players.reduce((s, p) => s + Object.keys(scores[p.id] || {}).filter(i => scores[p.id][i] !== undefined).length, 0);
    const totalCells = players.length * cfg.numHoles;

    return (
      <div className="fade-in">
        {renderProgressBar()}
        <div style={S.page}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "14px" }}>
            <div>
              <h2 className="serif" style={{ fontSize: "28px", margin: "0 0 4px", color: T.text }}>Scores</h2>
              <div style={{ fontSize: "12px", color: T.textSoft }}>{cfg.clubName} · Par {par}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="mono" style={{ fontSize: "14px", color: T.textSoft, fontWeight: 600 }}>{totalScored}/{totalCells}</div>
              <div style={{ ...S.eyebrow, fontSize: "9px", marginTop: "2px" }}>erfasst</div>
            </div>
          </div>

          {/* Mode toggle */}
          <div style={{ display: "flex", background: T.surface1, border: `1px solid ${T.line}`, borderRadius: "12px", padding: "3px", marginBottom: "14px" }}>
            {[
              { k: "batch", l: "Gesamt", sub: "Alle Löcher" },
              { k: "live",  l: "Live",   sub: "Loch für Loch" },
            ].map(({k,l,sub}) => (
              <button key={k} onClick={() => setScoringMode(k)}
                style={{
                  flex: 1, padding: "9px 10px",
                  background: scoringMode === k ? T.gold : "transparent",
                  color: scoringMode === k ? T.canvas : T.textSoft,
                  border: "none", borderRadius: "9px",
                  fontSize: "13px", fontWeight: scoringMode === k ? 700 : 500,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "1px",
                }}>
                <span>{l}</span>
                <span style={{ fontSize: "9px", opacity: 0.7, fontWeight: 500 }}>{sub}</span>
              </button>
            ))}
          </div>

          {scoringMode === "batch" ? renderBatchMode() : renderLiveMode()}

          {/* Live totals card */}
          <div style={{ ...S.card, marginTop: "14px", marginBottom: "14px" }}>
            <div style={{ ...S.eyebrow, marginBottom: "12px" }}>Zwischenstand</div>
            {players.map((p,i) => {
              const s = getStats(p);
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: i < players.length - 1 ? `1px solid ${T.line}` : "none" }}>
                  <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: `${T.gold}20`, border: `1px solid ${T.gold}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: T.gold }}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "14px", color: T.text, display: "flex", alignItems: "center", gap: "6px" }}>
                      {p.name}
                      {s.tee?.teeName && <TeeDot name={s.tee.teeName} size={8} />}
                    </div>
                    <div style={{ fontSize: "11px", color: T.textSoft }}>
                      Vorgabe <span className="mono">{s.ph}</span> · Brutto <span className="mono">{s.bT || "—"}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="mono" style={{ fontSize: "22px", fontWeight: 800, color: T.gold, lineHeight: 1 }}>{s.sfNT}</div>
                    <div style={{ fontSize: "9px", color: T.textDim, marginTop: "2px" }}>SF NETTO</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button style={{ ...S.btnSecondary, flex: 1 }} onClick={() => setView("holes")}>← Löcher</button>
            <button style={{ ...S.btnPrimary, flex: 2 }} className="gold-hover" onClick={() => { saveRound(); setView("results"); }}>Auswertung →</button>
          </div>
        </div>
      </div>
    );
  };

  // Batch mode (scorecard table)
  const renderBatchMode = () => (
    <>
      <div style={{ padding: "10px 14px", background: `${T.gold}10`, border: `1px solid ${T.gold}30`, borderRadius: "10px", marginBottom: "14px", fontSize: "12px", color: T.gold, display: "flex", alignItems: "center", gap: "8px" }}>
        <span>👆</span>
        <span>Tippe ein Feld um den Score einzugeben</span>
      </div>
      <div className="scroll-hide" style={{ overflowX: "auto", borderRadius: "12px", border: `1px solid ${T.line}`, background: T.surface1 }}>
        <table style={{ borderCollapse: "collapse", minWidth: "100%" }}>
          <thead>
            <tr style={{ background: T.surface2 }}>
              <th style={{ padding: "10px 12px", fontSize: "10px", color: T.textDim, textAlign: "left", letterSpacing: "0.06em", fontWeight: 600, textTransform: "uppercase", position: "sticky", left: 0, background: T.surface2, zIndex: 2 }}>Loch</th>
              <th style={{ padding: "10px 8px", fontSize: "10px", color: T.textDim, textAlign: "center", letterSpacing: "0.06em", fontWeight: 600, textTransform: "uppercase" }}>Par</th>
              {players.map(p => (
                <th key={p.id} style={{ padding: "10px 8px", fontSize: "11px", color: T.text, textAlign: "center", fontWeight: 600, whiteSpace: "nowrap", minWidth: "80px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                    {p.teeName && <TeeDot name={p.teeName} size={7} />}
                    {p.name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {holes.map((hole,i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${T.line}` }}>
                <td style={{ padding: "8px 12px", fontSize: "13px", fontWeight: 700, color: T.gold, position: "sticky", left: 0, background: T.surface1, zIndex: 1, borderRight: `1px solid ${T.line}` }}>
                  <span className="mono">{i+1}</span>
                  <span style={{ fontSize: "9px", color: T.textDim, marginLeft: "6px", fontWeight: 500 }}>SI{hole.si}</span>
                </td>
                <td className="mono" style={{ padding: "8px 8px", textAlign: "center", fontSize: "13px", color: T.textSoft }}>{hole.par}</td>
                {players.map(p => {
                  const g = scores[p.id]?.[i];
                  const tee = playerTee(p, cfg, selectedClub);
                  const ph = tee ? calcPH(p.hcp, tee.slope, tee.cr, tee.par || par) : 0;
                  const hs = holeHS(ph, hole.si, cfg.numHoles);
                  const col = scoreColor(g, hole.par);
                  const isEmpty = g === undefined;
                  const display = isStrich(g) ? "✗" : isValid(g) ? g : "—";
                  return (
                    <td key={p.id} style={{ padding: "5px 6px", textAlign: "center" }}>
                      <button onClick={() => setPadOpen({ playerId: p.id, holeIdx: i })}
                        style={{
                          position: "relative", width: "56px", height: "40px",
                          background: isEmpty ? T.surface1 : `${col}12`,
                          color: col,
                          border: `1px solid ${isEmpty ? T.line : col + "50"}`,
                          borderRadius: "8px", fontSize: "16px",
                          fontWeight: isEmpty ? 400 : 700,
                          fontFamily: "JetBrains Mono, monospace",
                        }}>
                        {hs > 0 && !isEmpty && (
                          <span style={{ position: "absolute", top: "-4px", right: "-3px", fontSize: "8px", fontWeight: 700, background: T.gold, color: T.canvas, borderRadius: "4px", padding: "1px 3px", lineHeight: 1 }}>+{hs}</span>
                        )}
                        {display}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  // Live mode (one hole at a time, swipe)
  const renderLiveMode = () => {
    const hole = holes[currentHole];
    if (!hole) return null;

    return (
      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ touchAction: "pan-y" }}>
        {/* Hole navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
          <button onClick={() => goToHole(currentHole - 1)} disabled={currentHole === 0}
            style={{ background: T.surface1, border: `1px solid ${T.line}`, borderRadius: "10px", width: "44px", height: "44px", color: T.text, fontSize: "18px", opacity: currentHole === 0 ? 0.3 : 1 }}>←</button>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ ...S.eyebrow, fontSize: "10px" }}>Loch</div>
            <div className="serif mono" style={{ fontSize: "36px", color: T.gold, fontWeight: 400, lineHeight: 1 }}>
              {currentHole + 1}<span style={{ color: T.textDim, fontSize: "18px" }}>/{cfg.numHoles}</span>
            </div>
          </div>
          <button onClick={() => goToHole(currentHole + 1)} disabled={currentHole >= cfg.numHoles - 1}
            style={{ background: T.surface1, border: `1px solid ${T.line}`, borderRadius: "10px", width: "44px", height: "44px", color: T.text, fontSize: "18px", opacity: currentHole >= cfg.numHoles - 1 ? 0.3 : 1 }}>→</button>
        </div>

        {/* Hole info */}
        <div style={{ ...S.card, marginBottom: "12px", textAlign: "center", padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: "24px" }}>
            <div>
              <div style={{ fontSize: "9px", color: T.textDim, letterSpacing: "0.08em", fontWeight: 600 }}>PAR</div>
              <div className="mono" style={{ fontSize: "28px", fontWeight: 700, color: T.text }}>{hole.par}</div>
            </div>
            <div style={{ width: "1px", background: T.line }}/>
            <div>
              <div style={{ fontSize: "9px", color: T.textDim, letterSpacing: "0.08em", fontWeight: 600 }}>VORGABE</div>
              <div className="mono" style={{ fontSize: "28px", fontWeight: 700, color: T.gold }}>{hole.si}</div>
            </div>
          </div>
        </div>

        {/* Swipe hint */}
        <div style={{ fontSize: "10px", color: T.textDim, textAlign: "center", marginBottom: "10px" }}>
          ← nach links/rechts wischen zum Wechseln →
        </div>

        {/* Players on this hole */}
        <div className="slide-in-r" key={currentHole}>
          {players.map(p => {
            const g = scores[p.id]?.[currentHole];
            const tee = playerTee(p, cfg, selectedClub);
            const ph = tee ? calcPH(p.hcp, tee.slope, tee.cr, tee.par || par) : 0;
            const hs = holeHS(ph, hole.si, cfg.numHoles);
            const personalPar = hole.par + hs;
            const col = scoreColor(g, hole.par);
            const isEmpty = g === undefined;
            const sf = sfNetto(g, hs, hole.par);
            const label = scoreLabel(g, hole.par);

            return (
              <div key={p.id} style={{
                ...S.card, padding: "14px", marginBottom: "10px",
                borderColor: isEmpty ? T.line : col + "40",
                background: isEmpty ? T.surface1 : `${col}08`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                  <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: `${T.gold}20`, border: `1px solid ${T.gold}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: T.gold }}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "15px", color: T.text, display: "flex", alignItems: "center", gap: "6px" }}>
                      {p.name}
                      {p.teeName && <TeeDot name={p.teeName} size={9} />}
                    </div>
                    <div style={{ fontSize: "11px", color: T.textSoft, marginTop: "2px" }}>
                      HCP <span className="mono">{p.hcp}</span>
                      {hs > 0 && <> · <span style={{ color: T.gold, fontWeight: 600 }}>Pers. Par {personalPar}</span></>}
                    </div>
                  </div>
                </div>

                <button onClick={() => setPadOpen({ playerId: p.id, holeIdx: currentHole })}
                  style={{
                    width: "100%", height: "64px",
                    background: isEmpty ? T.surface2 : `${col}15`,
                    color: col,
                    border: `1.5px solid ${isEmpty ? T.line : col + "60"}`,
                    borderRadius: "12px", fontSize: "32px",
                    fontWeight: 700,
                    fontFamily: "JetBrains Mono, monospace",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2px",
                  }}>
                  <span>{isStrich(g) ? "✗" : isValid(g) ? g : "Tippen"}</span>
                  {!isEmpty && (
                    <span style={{ fontSize: "11px", opacity: 0.8, fontWeight: 500 }}>
                      {label} {sf != null && `· ${sf} SF`}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Progress dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: "3px", flexWrap: "wrap", marginTop: "14px", padding: "14px 0" }}>
          {holes.map((_, i) => {
            const allScored = players.every(p => scores[p.id]?.[i] !== undefined);
            const isNow = i === currentHole;
            return (
              <button key={i} onClick={() => goToHole(i)}
                style={{
                  width: isNow ? "22px" : "8px",
                  height: "8px",
                  borderRadius: "4px",
                  background: isNow ? T.gold : allScored ? T.sage : T.line,
                  border: "none", padding: 0, transition: "all 0.2s",
                }}/>
            );
          })}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RESULTS
  // ═══════════════════════════════════════════════════════════════════════════
  const renderResults = () => {
    const all = players.map(p => ({ p, ...getStats(p) }));
    const ranked = [...all].sort((a,b) => b.sfNT - a.sfNT);
    const medals = ["🥇", "🥈", "🥉"];

    return (
      <div className="fade-in">
        {renderProgressBar()}
        <div style={S.page}>
          <h2 className="serif" style={{ fontSize: "28px", margin: "0 0 6px", color: T.text }}>Auswertung</h2>
          <div style={{ fontSize: "12px", color: T.textSoft, marginBottom: "20px" }}>
            {cfg.clubName || cfg.name || "Runde"} · {fmtDate(cfg.date)} · Par {par}
          </div>

          <div style={{ ...S.card, background: `linear-gradient(135deg, ${T.surface2}, ${T.surface1})`, border: `1px solid ${T.gold}40`, marginBottom: "20px" }}>
            <div style={{ ...S.eyebrow, color: T.gold, marginBottom: "14px" }}>🏆 Stableford Netto</div>
            {ranked.map((s,i) => (
              <div key={s.p.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: i < ranked.length - 1 ? `1px solid ${T.line}` : "none" }}>
                <div style={{ fontSize: "24px", width: "30px", textAlign: "center" }}>
                  {medals[i] || <span className="mono" style={{ fontSize: "15px", color: T.textSoft, fontWeight: 700 }}>{i+1}.</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: "15px", color: T.text, display: "flex", alignItems: "center", gap: "6px" }}>
                    {s.p.name}
                    {s.tee?.teeName && <TeeDot name={s.tee.teeName} size={9} />}
                  </div>
                  <div style={{ fontSize: "11px", color: T.textSoft, marginTop: "1px" }}>
                    HCP <span className="mono">{s.p.hcp}</span> · Vorgabe <span className="mono">{s.ph}</span> · Brutto <span className="mono">{s.bT || "—"}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="mono serif" style={{ fontSize: "32px", fontWeight: 700, color: T.gold, lineHeight: 1 }}>{s.sfNT}</div>
                  <div style={{ fontSize: "9px", color: T.textDim, marginTop: "2px" }}>PUNKTE</div>
                </div>
              </div>
            ))}
          </div>

          {all.map(s => (
            <div key={s.p.id} style={{ ...S.card, marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "16px", color: T.text, display: "flex", alignItems: "center", gap: "6px" }}>
                    {s.p.name}
                    {s.tee?.teeName && <TeeDot name={s.tee.teeName} size={10} />}
                  </div>
                  <div style={{ fontSize: "11px", color: T.textSoft, marginTop: "2px" }}>Vorgabe <span className="mono">{s.ph}</span></div>
                </div>
                <button onClick={() => setExpId(expId === s.p.id ? null : s.p.id)} className="btn-hover" style={{ ...S.btnGhost, padding: "6px 12px" }}>
                  {expId === s.p.id ? "Einklappen" : "Details"}
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {[
                  { l: "SF Netto ★", v: `${s.sfNT}`, hi: true, suffix: "Pkt" },
                  { l: "SF Brutto",  v: `${s.sfBT}`, suffix: "Pkt" },
                  { l: "Netto Strokeplay",  v: s.nT },
                  { l: "Brutto Strokeplay", v: s.bT },
                ].map(item => (
                  <div key={item.l} style={{ background: item.hi ? `${T.gold}12` : T.surface2, border: `1px solid ${item.hi ? T.gold + "40" : T.line}`, borderRadius: "12px", padding: "12px 14px" }}>
                    <div style={{ fontSize: "9px", color: item.hi ? T.gold : T.textDim, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, marginBottom: "5px" }}>{item.l}</div>
                    <div className="mono" style={{ fontSize: "22px", fontWeight: 700, color: item.hi ? T.gold : T.text }}>
                      {item.v}{item.suffix && <span style={{ fontSize: "11px", fontWeight: 500, color: T.textSoft, marginLeft: "4px" }}>{item.suffix}</span>}
                    </div>
                  </div>
                ))}
              </div>
              {expId === s.p.id && (
                <div className="scroll-hide" style={{ marginTop: "14px", overflowX: "auto" }}>
                  <table style={{ borderCollapse: "collapse", fontSize: "11px", width: "100%" }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${T.line}` }}>
                        {["L","Par","SI","+","Brutto","Netto","SFN","SFB"].map(h => (
                          <th key={h} style={{ padding: "6px 7px", color: T.textDim, fontWeight: 600, textAlign: "center", fontSize: "10px" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {s.hr.map((h,i) => {
                        const col = scoreColor(h.g, holes[i].par);
                        return (
                          <tr key={i} style={{ borderBottom: `1px solid ${T.line}` }}>
                            <td className="mono" style={{ padding: "6px 7px", textAlign: "center", fontWeight: 700, color: T.gold }}>{i+1}</td>
                            <td className="mono" style={{ padding: "6px 7px", textAlign: "center", color: T.textSoft }}>{holes[i].par}</td>
                            <td className="mono" style={{ padding: "6px 7px", textAlign: "center", color: T.textDim }}>{holes[i].si}</td>
                            <td className="mono" style={{ padding: "6px 7px", textAlign: "center", color: T.gold, fontWeight: 600 }}>{h.hs > 0 ? `+${h.hs}` : "—"}</td>
                            <td className="mono" style={{ padding: "6px 7px", textAlign: "center", fontWeight: 700, color: col }}>{isStrich(h.g) ? "✗" : isValid(h.g) ? h.g : "—"}</td>
                            <td className="mono" style={{ padding: "6px 7px", textAlign: "center", color: T.textSoft }}>{h.netto ?? "—"}</td>
                            <td className="mono" style={{ padding: "6px 7px", textAlign: "center", fontWeight: 700, color: T.gold }}>{h.sfN ?? "—"}</td>
                            <td className="mono" style={{ padding: "6px 7px", textAlign: "center", color: T.textSoft }}>{h.sfB ?? "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: `1px solid ${T.lineStrong}`, background: T.surface2 }}>
                        <td colSpan={3} style={{ padding: "7px", textAlign: "right", fontWeight: 700, color: T.textDim, fontSize: "9px" }}>TOTAL</td>
                        <td className="mono" style={{ padding: "7px", textAlign: "center", fontWeight: 700, color: T.gold }}>{s.ph}</td>
                        <td className="mono" style={{ padding: "7px", textAlign: "center", fontWeight: 700, color: T.text }}>{s.bT}</td>
                        <td className="mono" style={{ padding: "7px", textAlign: "center", fontWeight: 700, color: T.text }}>{s.nT}</td>
                        <td className="mono" style={{ padding: "7px", textAlign: "center", fontWeight: 700, color: T.gold }}>{s.sfNT}</td>
                        <td className="mono" style={{ padding: "7px", textAlign: "center", fontWeight: 700, color: T.text }}>{s.sfBT}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          ))}

          <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
            <button style={{ ...S.btnSecondary, flex: 1 }} onClick={() => setView("scoring")}>← Scores</button>
            <button style={{ ...S.btnPrimary, flex: 1 }} className="gold-hover" onClick={() => { setTab("rounds"); setView("home"); }}>Fertig</button>
          </div>

          {/* Delete button - only shown when viewing/editing a saved round */}
          {loadedRoundId && rounds.find(r => r.id === loadedRoundId) && (
            <button
              onClick={async () => {
                if (confirm("Diese Runde wirklich löschen? Das kann nicht rückgängig gemacht werden.")) {
                  await deleteRound(loadedRoundId);
                  setLoadedRoundId(null);
                  setTab("rounds");
                  setView("home");
                }
              }}
              style={{
                width: "100%", marginTop: "14px",
                background: "transparent",
                color: T.double,
                border: `1px solid ${T.double}40`,
                borderRadius: "12px",
                padding: "12px",
                fontSize: "13px",
                fontWeight: 500,
                fontFamily: "Inter, sans-serif",
              }}>
              🗑 Diese Runde löschen
            </button>
          )}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // NUMBER PAD
  // ═══════════════════════════════════════════════════════════════════════════
  const renderNumberPad = () => {
    if (!padOpen) return null;
    const player = players.find(p => p.id === padOpen.playerId);
    const hole = holes[padOpen.holeIdx];
    if (!player || !hole) return null;
    const currentScore = scores[padOpen.playerId]?.[padOpen.holeIdx];
    const tee = playerTee(player, cfg, selectedClub);
    const ph = tee ? calcPH(player.hcp, tee.slope, tee.cr, tee.par || par) : 0;
    const hs = holeHS(ph, hole.si, cfg.numHoles);

    return (
      <div onClick={() => setPadOpen(null)}
        style={{ position: "fixed", inset: 0, background: "#000000aa", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div onClick={e => e.stopPropagation()} className="slide-up"
          style={{ width: "100%", maxWidth: "500px", background: T.surface1, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", border: `1px solid ${T.line}`, borderBottom: "none", padding: "20px 16px 32px", boxShadow: "0 -20px 60px #000000dd" }}>
          <div style={{ width: "40px", height: "4px", background: T.lineStrong, borderRadius: "2px", margin: "0 auto 18px" }}/>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div>
              <div style={{ fontSize: "13px", color: T.textSoft, display: "flex", alignItems: "center", gap: "6px" }}>
                {player.name}
                {player.teeName && <TeeDot name={player.teeName} size={8} />}
              </div>
              <div className="serif" style={{ fontSize: "24px", color: T.text, marginTop: "2px" }}>
                Loch <span style={{ color: T.gold }}>{padOpen.holeIdx + 1}</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "10px", color: T.textDim, letterSpacing: "0.06em" }}>PAR · SI</div>
              <div className="mono" style={{ fontSize: "18px", color: T.text, fontWeight: 700 }}>{hole.par} · {hole.si}</div>
              {hs > 0 && <div style={{ fontSize: "10px", color: T.gold, marginTop: "2px", fontWeight: 600 }}>+{hs} Vorgabe</div>}
            </div>
          </div>

          {currentScore !== undefined && (
            <div style={{ padding: "10px 14px", background: T.surface2, border: `1px solid ${T.line}`, borderRadius: "10px", marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "12px", color: T.textSoft }}>Aktuell</div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: scoreColor(currentScore, hole.par) }}>
                {isStrich(currentScore) ? "Gestrichen" : `${currentScore} · ${scoreLabel(currentScore, hole.par)}`}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "8px" }}>
            {[1,2,3,4,5,6,7,8,9].map(n => {
              const col = scoreColor(n, hole.par);
              const sel = currentScore === n;
              return (
                <button key={n} onClick={() => padEnter(n)}
                  style={{ height: "58px", fontSize: "22px", fontWeight: 700, fontFamily: "JetBrains Mono, monospace",
                    background: sel ? `${col}25` : T.surface2,
                    color: sel ? col : T.text,
                    border: `1.5px solid ${sel ? col + "80" : T.line}`,
                    borderRadius: "14px" }}>{n}</button>
              );
            })}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "14px" }}>
            <button onClick={() => padEnter(10)}
              style={{ height: "58px", fontSize: "22px", fontWeight: 700, fontFamily: "JetBrains Mono, monospace",
                background: currentScore === 10 ? `${T.double}25` : T.surface2,
                color: currentScore === 10 ? T.double : T.text,
                border: `1.5px solid ${currentScore === 10 ? T.double + "80" : T.line}`,
                borderRadius: "14px" }}>10</button>
            <button onClick={padStrich}
              style={{ height: "58px", background: isStrich(currentScore) ? `${T.strich}40` : T.surface2, color: isStrich(currentScore) ? T.text : T.textSoft, border: `1.5px solid ${isStrich(currentScore) ? T.strich : T.line}`, borderRadius: "14px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "18px" }}>✗</span>
              <span style={{ fontSize: "9px", marginTop: "2px", letterSpacing: "0.06em" }}>STRICH</span>
            </button>
            <button onClick={padClear}
              style={{ height: "58px", background: T.surface2, color: T.textDim, border: `1.5px solid ${T.line}`, borderRadius: "14px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "18px" }}>⌫</span>
              <span style={{ fontSize: "9px", marginTop: "2px", letterSpacing: "0.06em" }}>LEER</span>
            </button>
          </div>

          <button onClick={() => setPadOpen(null)} style={{ ...S.btnSecondary, width: "100%", fontSize: "13px", padding: "10px" }}>Schließen</button>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SYNC MODAL
  // ═══════════════════════════════════════════════════════════════════════════
  const [syncInput, setSyncInput] = useState("");
  useEffect(() => { if (showSyncModal) setSyncInput(""); }, [showSyncModal]);

  const renderSyncModal = () => {
    if (!showSyncModal) return null;
    return (
      <div onClick={() => setShowSyncModal(false)}
        style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div onClick={e => e.stopPropagation()} className="slide-up"
          style={{ width: "100%", maxWidth: "520px", background: T.surface1, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", border: `1px solid ${T.line}`, padding: "20px 16px 28px", maxHeight: "90vh", overflowY: "auto" }}>
          <div style={{ width: "40px", height: "4px", background: T.lineStrong, borderRadius: "2px", margin: "0 auto 18px" }}/>
          <h3 className="serif" style={{ fontSize: "24px", margin: "0 0 6px", color: T.text }}>☁️ Cloud Sync</h3>

          {!SYNC_ENABLED ? (
            <div style={{ background: `${T.bogey}15`, border: `1px solid ${T.bogey}50`, borderRadius: "10px", padding: "14px", fontSize: "13px", color: T.bogey, marginTop: "12px" }}>
              <div style={{ fontWeight: 700, marginBottom: "6px" }}>Nicht konfiguriert</div>
              <div style={{ lineHeight: 1.5, color: T.textSoft }}>
                Für automatische Gerätesynchronisation muss Supabase eingerichtet werden. Siehe die Anleitung <code style={{ background: T.surface2, padding: "1px 5px", borderRadius: "3px" }}>SUPABASE-SETUP.md</code>.
              </div>
            </div>
          ) : syncCode ? (
            <>
              <p style={{ fontSize: "13px", color: T.textSoft, lineHeight: 1.5 }}>
                Cloud Sync ist aktiv. Dein Code funktioniert auf allen deinen Geräten.
              </p>
              <div style={{ background: T.surface2, border: `1px solid ${T.gold}40`, borderRadius: "12px", padding: "16px", marginTop: "14px", textAlign: "center" }}>
                <div style={{ ...S.eyebrow, color: T.gold, marginBottom: "8px" }}>DEIN SYNC-CODE</div>
                <div className="mono" style={{ fontSize: "28px", color: T.text, fontWeight: 700, letterSpacing: "0.08em" }}>{formatSync(syncCode)}</div>
                <button onClick={() => navigator.clipboard?.writeText(syncCode)}
                  style={{ ...S.btnGhost, marginTop: "10px", fontSize: "11px" }}>📋 Kopieren</button>
              </div>
              <div style={{ fontSize: "11px", color: T.textDim, marginTop: "12px", lineHeight: 1.5 }}>
                💡 Gib diesen Code auf einem anderen Gerät ein um deine Daten zu synchronisieren.
              </div>
              <button onClick={disconnectSync}
                style={{ ...S.btnSecondary, width: "100%", marginTop: "18px", color: T.double, borderColor: `${T.double}40`, fontSize: "13px" }}>
                Cloud Sync deaktivieren
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: "13px", color: T.textSoft, lineHeight: 1.5, marginTop: "8px" }}>
                Synchronisiere deine Runden, Freunde und Clubs automatisch über alle deine Geräte.
              </p>
              <button onClick={async () => await setupSync(genSyncCode())} className="gold-hover"
                style={{ ...S.btnPrimary, width: "100%", marginTop: "14px" }}>
                Neuen Sync-Code generieren
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "16px 0" }}>
                <div style={{ flex: 1, height: "1px", background: T.line }}/>
                <div style={{ fontSize: "10px", color: T.textDim, letterSpacing: "0.06em" }}>ODER</div>
                <div style={{ flex: 1, height: "1px", background: T.line }}/>
              </div>
              <div style={{ ...S.eyebrow, marginBottom: "8px" }}>Vorhandenen Code eingeben</div>
              <input value={syncInput}
                onChange={e => setSyncInput(cleanSync(e.target.value))}
                placeholder="z.B. KF7M2XRB"
                maxLength={8}
                style={{ ...S.input, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "JetBrains Mono, monospace" }}/>
              <button onClick={async () => await setupSync(syncInput)}
                disabled={cleanSync(syncInput).length !== 8}
                style={{ ...S.btnSecondary, width: "100%", marginTop: "10px", opacity: cleanSync(syncInput).length !== 8 ? 0.4 : 1 }}>
                Verbinden & Daten laden
              </button>
            </>
          )}

          <button onClick={() => setShowSyncModal(false)}
            style={{ ...S.btnGhost, width: "100%", marginTop: "18px", fontSize: "13px" }}>Schließen</button>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // IMPORT MODAL
  // ═══════════════════════════════════════════════════════════════════════════
  const renderImportModal = () => (
    <div onClick={() => setShowImport(false)}
      style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} className="slide-up"
        style={{ width: "100%", maxWidth: "520px", background: T.surface1, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", border: `1px solid ${T.line}`, padding: "20px 16px 28px", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ width: "40px", height: "4px", background: T.lineStrong, borderRadius: "2px", margin: "0 auto 18px" }}/>
        <h3 className="serif" style={{ fontSize: "24px", margin: "0 0 6px", color: T.text }}>Club-Daten importieren</h3>
        <p style={{ fontSize: "13px", color: T.textSoft, marginBottom: "14px" }}>JSON aus dem Agent-Prompt einfügen.</p>
        <textarea value={importText} onChange={e => setImportText(e.target.value)}
          placeholder={`{\n  "name": "GC ...",\n  "tees": { ... },\n  "holes": [ ... ]\n}`}
          style={{ ...S.input, fontFamily: "JetBrains Mono, monospace", fontSize: "12px", minHeight: "220px", resize: "vertical", marginBottom: "10px" }}/>
        {importErrors.length > 0 && (
          <div style={{ background: `${T.double}15`, border: `1px solid ${T.double}50`, borderRadius: "10px", padding: "10px 14px", marginBottom: "10px", fontSize: "12px", color: T.double }}>
            <div style={{ fontWeight: 700, marginBottom: "4px" }}>Fehler:</div>
            {importErrors.map((e,i) => <div key={i}>• {e}</div>)}
          </div>
        )}
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => { setShowImport(false); setImportText(""); setImportErrors([]); }}
            style={{ ...S.btnSecondary, flex: 1 }}>Abbrechen</button>
          <button onClick={importClub} className="gold-hover" style={{ ...S.btnPrimary, flex: 2 }}>Importieren</button>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={S.app}>
      <style>{GLOBAL_CSS}</style>
      {renderHeader()}
      {view === "home"    && renderHome()}
      {view === "setup"   && renderSetup()}
      {view === "holes"   && renderHoles()}
      {view === "scoring" && renderScoring()}
      {view === "results" && renderResults()}
      {padOpen && renderNumberPad()}
      {showImport && renderImportModal()}
      {renderSyncModal()}
    </div>
  );
}
