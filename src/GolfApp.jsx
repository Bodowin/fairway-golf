import { useState, useEffect, useCallback, useMemo } from "react";

// ═════════════════════════════════════════════════════════════════════════════
// FONTS — Instrument Serif (display) + Inter (body)
// ═════════════════════════════════════════════════════════════════════════════
if (!document.getElementById("gf-golf-fonts")) {
  const l = document.createElement("link");
  l.id = "gf-golf-fonts"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap";
  document.head.appendChild(l);
}

// ═════════════════════════════════════════════════════════════════════════════
// DESIGN SYSTEM — "Deep Forest" palette
// ═════════════════════════════════════════════════════════════════════════════
const T = {
  // Base canvas (darkest → lightest)
  canvas:    "#0a1410",       // page background
  surface1:  "#101e16",       // cards, inputs
  surface2:  "#172a20",       // elevated cards
  surface3:  "#213629",       // hover / active
  // Borders
  line:      "#1d3326",       // subtle
  lineStrong:"#2d4a37",       // visible
  // Accents — gold family
  gold:      "#c9a85c",
  goldBright:"#ddb970",
  goldDim:   "#967d3e",
  // Sage — secondary accent
  sage:      "#7ea88a",
  sageDim:   "#5b7f68",
  // Text
  text:      "#f0e9d3",       // primary
  textSoft:  "#b5ad96",       // secondary
  textDim:   "#7a7260",       // tertiary
  // Semantic score colors
  birdie:    "#7ed389",       // under par
  par:       "#f0e9d3",       // at par
  bogey:     "#e89968",       // over par
  double:    "#e56e5e",       // double+
  strich:    "#7a7260",       // picked up
  eagle:     "#f5d97a",       // -2 or better
};

// ═════════════════════════════════════════════════════════════════════════════
// CLUB DATABASE
// ═════════════════════════════════════════════════════════════════════════════
const simple = (name, region, cr, slope, par, numHoles=18) => ({
  name, region, numHoles,
  tees: { "Standard": { cr, slope, par } }
});

const BUILT_IN_CLUBS = [
  // ═══ Bockfließ – full detail from user scorecard ═══
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
  // Wien
  simple("GC Wien-Freudenau",              "Wien",            70.5, 120, 72),
  simple("GC Wien-Süßenbrunn",             "Wien",            70.0, 118, 72),
  simple("C&C Golfclub am Wienerberg",     "Wien",            70.0, 119, 71),
  // Niederösterreich
  {
    name: "GC Adamstal (Championship)",
    region: "Niederösterreich",
    numHoles: 18,
    tees: {
      "Gelb (Herren)": { cr: 71.0, slope: 140, par: 70 },
    },
  },
  simple("GC Adamstal (Wallerbach 9L)",    "Niederösterreich",34.7, 125, 35, 9),
  simple("Golfclub Frühling Götzendorf",   "Niederösterreich",71.5, 124, 73),
  simple("GC St. Pölten (Schloss Goldegg)","Niederösterreich",71.5, 125, 72),
  simple("Golfclub Schwechat",             "Niederösterreich",70.5, 121, 72),
  simple("Golf & Country Club Brunn",      "Niederösterreich",71.5, 128, 72),
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
  // Salzburg
  simple("Gut Altentann G&CC",             "Salzburg",        73.0, 138, 72),
  simple("GC Zell am See (Schmittenhöhe)", "Salzburg",        71.5, 123, 72),
  simple("GC Zell am See (Kitzsteinhorn)", "Salzburg",        71.5, 121, 72),
  simple("GC Eugendorf",                   "Salzburg",        70.8, 125, 72),
  simple("GC Radstadt-Amadé",              "Salzburg",        71.0, 124, 72),
  simple("GC Goldegg",                     "Salzburg",        71.5, 126, 72),
  // Tirol
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
  // Steiermark
  simple("GC Murhof",                      "Steiermark",      73.1, 128, 72),
  simple("GC Schladming-Dachstein",        "Steiermark",      69.2, 129, 71),
  simple("GC Gut Murstätten",              "Steiermark",      71.5, 126, 72),
  simple("GC Schloss Frauenthal",          "Steiermark",      71.0, 124, 72),
  simple("G&LC Ennstal",                   "Steiermark",      71.0, 123, 72),
  simple("GC Graz-Andritz St. Gotthard",   "Steiermark",      70.5, 121, 72),
  // Oberösterreich
  simple("GC Mondsee",                     "Oberösterreich",  71.5, 126, 72),
  simple("GC Linz St. Florian",            "Oberösterreich",  71.0, 124, 72),
  simple("GC Regau Attersee-Traunsee",     "Oberösterreich",  70.5, 122, 72),
  simple("Golf Resort Kremstal",           "Oberösterreich",  70.5, 121, 72),
  // Kärnten
  simple("GC Klagenfurt-Seltenheim",       "Kärnten",         72.0, 127, 72),
  simple("GC Schloss Finkenstein",         "Kärnten",         71.5, 127, 72),
  simple("Kärntner GC Dellach",            "Kärnten",         71.5, 126, 72),
  simple("GC Millstättersee",              "Kärnten",         71.0, 124, 72),
  simple("GC Bad Kleinkirchheim",          "Kärnten",         70.5, 122, 72),
  // Burgenland
  simple("GC Neusiedlersee-Donnerskirchen","Burgenland",      70.5, 122, 72),
  simple("GC Bad Waltersdorf",             "Burgenland",      70.0, 120, 72),
  // Vorarlberg
  simple("GC Bregenzerwald",               "Vorarlberg",      70.0, 121, 72),
  simple("GC Montfort Rankweil",           "Vorarlberg",      70.5, 122, 72),
];

// ═════════════════════════════════════════════════════════════════════════════
// CALCULATIONS
// ═════════════════════════════════════════════════════════════════════════════
// Score value model:
//   undefined → not yet played
//   null      → gestrichenes Loch (picked up)
//   number    → gross strokes
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
const holeHS     = (ph, si, n) => Math.floor(ph/n) + (si <= ph%n ? 1 : 0);
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

const uid   = () => Math.random().toString(36).slice(2, 9);
const toDay = () => new Date().toISOString().slice(0, 10);
const fmtDate = d => {
  const dt = new Date(d);
  return dt.toLocaleDateString("de-AT", { day:"numeric", month:"short", year:"numeric" });
};

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
// STYLES (global CSS via <style> + inline style objects)
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
  .shimmer { background: linear-gradient(105deg, ${T.gold}00 30%, ${T.gold}40 50%, ${T.gold}00 70%); background-size: 200% 100%; animation: shimmer 2.5s ease-in-out infinite; }
  @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -100% 0; } }
  .scroll-hide::-webkit-scrollbar { display: none; }
  .scroll-hide { scrollbar-width: none; }
  .btn-hover:hover { background: ${T.surface3} !important; }
  .card-hover:hover { border-color: ${T.lineStrong} !important; background: ${T.surface2} !important; }
  .gold-hover:hover { background: ${T.goldBright} !important; }
`;

const S = {
  app: {
    minHeight: "100vh",
    background: T.canvas,
    color: T.text,
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: "14px",
    paddingBottom: "100px",
    letterSpacing: "-0.005em",
  },
  // Typography
  display: {
    fontFamily: "Instrument Serif, serif",
    fontWeight: 400,
    letterSpacing: "-0.03em",
    lineHeight: 1.1,
  },
  eyebrow: {
    fontSize: "10px",
    fontWeight: 600,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: T.textDim,
  },
  // Layouts
  page: { padding: "20px 16px" },
  // Cards
  card: {
    background: T.surface1,
    border: `1px solid ${T.line}`,
    borderRadius: "16px",
    padding: "18px",
    transition: "border-color 0.15s, background 0.15s",
  },
  // Inputs
  input: {
    width: "100%",
    background: T.surface1,
    border: `1px solid ${T.line}`,
    borderRadius: "10px",
    color: T.text,
    padding: "12px 14px",
    fontSize: "15px",
    fontFamily: "Inter, sans-serif",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  // Buttons
  btnPrimary: {
    background: T.gold,
    color: T.canvas,
    border: "none",
    borderRadius: "12px",
    padding: "14px 22px",
    fontSize: "15px",
    fontWeight: 700,
    letterSpacing: "-0.01em",
  },
  btnSecondary: {
    background: T.surface1,
    color: T.text,
    border: `1px solid ${T.lineStrong}`,
    borderRadius: "12px",
    padding: "14px 22px",
    fontSize: "15px",
    fontWeight: 500,
  },
  btnGhost: {
    background: "transparent",
    color: T.textSoft,
    border: `1px solid ${T.line}`,
    borderRadius: "8px",
    padding: "8px 12px",
    fontSize: "13px",
    fontWeight: 500,
  },
};

// ═════════════════════════════════════════════════════════════════════════════
// LOGO MARK (inline SVG)
// ═════════════════════════════════════════════════════════════════════════════
const LogoMark = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="15" stroke={T.gold} strokeWidth="1.3" opacity="0.35"/>
    <circle cx="16" cy="16" r="4.5" fill={T.gold}/>
    <line x1="16" y1="11" x2="16" y2="3" stroke={T.gold} strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M 16 3 L 21 5 L 16 7 Z" fill={T.gold}/>
  </svg>
);

// ═════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═════════════════════════════════════════════════════════════════════════════
export default function GolfApp() {
  // Navigation
  const [view, setView]     = useState("home");
  const [tab, setTab]       = useState("rounds"); // rounds | friends | history
  // Round data
  const [cfg, setCfg]       = useState({ name:"", date:toDay(), numHoles:18, cr:72.0, slope:113, clubName:"", teeName:"" });
  const [holes, setHoles]   = useState(makeHoles(72, 18));
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState({});
  // Persistent data
  const [rounds, setRounds] = useState([]);
  const [friends, setFriends] = useState([]);
  const [customClubs, setCustomClubs] = useState([]);
  // UI state
  const [clubQ, setClubQ] = useState("");
  const [showDD, setShowDD] = useState(false);
  const [pickedClub, setPickedClub] = useState(null);
  const [newP, setNewP] = useState({ name:"", hcp:"" });
  const [expId, setExpId] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importErrors, setImportErrors] = useState([]);
  // Number pad overlay
  const [padOpen, setPadOpen] = useState(null); // { playerId, holeIdx } or null

  const allClubs = useMemo(() => [...customClubs, ...BUILT_IN_CLUBS], [customClubs]);

  // Load persisted data
  useEffect(() => {
    (async () => {
      try { const r = await window.storage.get("golf-rounds");        if (r) setRounds(JSON.parse(r.value)); } catch {}
      try { const f = await window.storage.get("golf-friends");       if (f) setFriends(JSON.parse(f.value)); } catch {}
      try { const c = await window.storage.get("golf-custom-clubs");  if (c) setCustomClubs(JSON.parse(c.value)); } catch {}
    })();
  }, []);

  // Stable callbacks
  const onClubQ   = useCallback(e => { setClubQ(e.target.value); setShowDD(true); }, []);
  const onCfgName = useCallback(e => setCfg(c => ({ ...c, name: e.target.value })), []);
  const onDate    = useCallback(e => setCfg(c => ({ ...c, date: e.target.value })), []);
  const onCR      = useCallback(e => setCfg(c => ({ ...c, cr: parseFloat(e.target.value) || 0 })), []);
  const onSlope   = useCallback(e => setCfg(c => ({ ...c, slope: parseInt(e.target.value) || 113 })), []);
  const onNewName = useCallback(e => setNewP(p => ({ ...p, name: e.target.value })), []);
  const onNewHcp  = useCallback(e => setNewP(p => ({ ...p, hcp: e.target.value })), []);

  const filteredClubs = clubQ.length > 0
    ? allClubs.filter(c => c.name.toLowerCase().includes(clubQ.toLowerCase()) || c.region.toLowerCase().includes(clubQ.toLowerCase()))
    : allClubs.slice(0, 8);

  // ── Club + tee selection
  const pickClub = useCallback(club => {
    const teeKeys = Object.keys(club.tees);
    if (teeKeys.length === 1) pickTee(club, teeKeys[0]);
    else setPickedClub(club);
    setShowDD(false);
  }, []);

  const pickTee = useCallback((club, teeName) => {
    const tee = club.tees[teeName];
    const newHoles = club.holes || makeHoles(tee.par, club.numHoles);
    setCfg(c => ({ ...c, cr:tee.cr, slope:tee.slope, clubName:club.name, teeName, numHoles:club.numHoles }));
    setHoles(newHoles);
    setClubQ("");
    setPickedClub(null);
  }, []);

  // ── Players
  const par = sumPar(holes);
  const addPlayer = useCallback(() => {
    const name = newP.name.trim(); if (!name) return;
    const hcp = parseFloat(newP.hcp);
    setPlayers(p => [...p, { id: uid(), name, hcp: isNaN(hcp) ? 0 : hcp }]);
    setNewP({ name:"", hcp:"" });
  }, [newP]);
  const addFromFriend = useCallback(f => {
    setPlayers(p => p.find(x => x.name === f.name) ? p : [...p, { id: uid(), name: f.name, hcp: f.hcp }]);
  }, []);
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

  // ── Score manipulation
  const setScore = (pid, hi, val) => {
    setScores(s => ({ ...s, [pid]: { ...s[pid], [hi]: val } }));
  };
  const clearScore = (pid, hi) => {
    setScores(s => {
      const playerScores = { ...(s[pid] || {}) };
      delete playerScores[hi];
      return { ...s, [pid]: playerScores };
    });
  };

  // ── Number pad actions
  const advanceToNext = () => {
    if (!padOpen) return;
    const { playerId, holeIdx } = padOpen;
    // Find next un-scored cell: prefer next player on same hole, else next hole player 0
    const playerIdx = players.findIndex(p => p.id === playerId);
    // Try next player on same hole
    for (let i = playerIdx + 1; i < players.length; i++) {
      if (scores[players[i].id]?.[holeIdx] === undefined) {
        setPadOpen({ playerId: players[i].id, holeIdx });
        return;
      }
    }
    // Try next hole starting from first player
    if (holeIdx + 1 < cfg.numHoles) {
      for (let i = 0; i < players.length; i++) {
        if (scores[players[i].id]?.[holeIdx + 1] === undefined) {
          setPadOpen({ playerId: players[i].id, holeIdx: holeIdx + 1 });
          return;
        }
      }
      // All scored on next hole, just advance to first player
      setPadOpen({ playerId: players[0].id, holeIdx: holeIdx + 1 });
      return;
    }
    // End of round
    setPadOpen(null);
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

  // ── Stats
  const getStats = (player) => {
    const ph = calcPH(player.hcp, cfg.slope, cfg.cr, par);
    const hr = holes.map((h, i) => {
      const g = scores[player.id]?.[i];
      const hs = holeHS(ph, h.si, cfg.numHoles);
      return { g, hs, netto: isValid(g) ? g - hs : null, sfN: sfNetto(g, hs, h.par), sfB: sfBrutto(g, h.par), par: h.par };
    });
    const played = hr.filter(h => isValid(h.g));
    const bT = played.reduce((s, h) => s + h.g, 0);
    return {
      ph, hr, bT,
      nT: played.length ? bT - ph : 0,
      sfNT: hr.reduce((s, h) => s + (h.sfN || 0), 0),
      sfBT: hr.reduce((s, h) => s + (h.sfB || 0), 0),
      playedCount: played.length + hr.filter(h => isStrich(h.g)).length,
    };
  };

  // ── Save round
  const saveRound = async () => {
    const r = { id: uid(), cfg, holes, players, scores, savedAt: new Date().toISOString() };
    const u = [r, ...rounds].slice(0, 50);
    setRounds(u);
    try { await window.storage.set("golf-rounds", JSON.stringify(u)); } catch {}
  };
  const loadRound = r => { setCfg(r.cfg); setHoles(r.holes); setPlayers(r.players); setScores(r.scores); setView("results"); };
  const deleteRound = async (id) => {
    const updated = rounds.filter(r => r.id !== id);
    setRounds(updated);
    try { await window.storage.set("golf-rounds", JSON.stringify(updated)); } catch {}
  };

  const newRound = () => {
    setCfg({ name:"", date:toDay(), numHoles:18, cr:72.0, slope:113, clubName:"", teeName:"" });
    setHoles(makeHoles(72, 18)); setPlayers([]); setScores({}); setClubQ(""); setPickedClub(null);
    setView("setup");
  };

  // ── Import
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

  const stepIdx = ["setup","holes","scoring","results"].indexOf(view) + 1;

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════════════════
  const Header = () => (
    <div style={{
      padding: "14px 16px",
      borderBottom: `1px solid ${T.line}`,
      background: T.canvas,
      position: "sticky",
      top: 0,
      zIndex: 50,
      display: "flex",
      alignItems: "center",
      gap: "10px",
    }}>
      <LogoMark size={22} />
      <div style={{ flex: 1 }}>
        <div className="serif" style={{ fontSize: "18px", fontWeight: 400, color: T.text }}>
          Fairway
        </div>
        {view !== "home" && (
          <div style={{ fontSize: "11px", color: T.textSoft, marginTop: "1px", letterSpacing: "-0.005em" }}>
            {cfg.clubName || "Neue Runde"}{cfg.teeName && ` · ${cfg.teeName}`}
          </div>
        )}
      </div>
      {view !== "home" && (
        <button
          onClick={() => setView("home")}
          className="btn-hover"
          style={{ ...S.btnGhost, padding: "7px 12px" }}
        >
          Schließen
        </button>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PROGRESS BAR
  // ═══════════════════════════════════════════════════════════════════════════
  const ProgressBar = () => (
    <div style={{ padding: "12px 16px", background: T.canvas, borderBottom: `1px solid ${T.line}` }}>
      <div style={{ display: "flex", gap: "4px" }}>
        {["Setup", "Löcher", "Scores", "Ergebnis"].map((label, i) => {
          const active = stepIdx === i + 1;
          const done = stepIdx > i + 1;
          return (
            <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{
                height: "2px",
                borderRadius: "2px",
                background: done ? T.gold : active ? `${T.gold}aa` : T.line,
                transition: "background 0.3s",
              }}/>
              <div style={{
                fontSize: "10px",
                color: active ? T.gold : done ? T.textSoft : T.textDim,
                fontWeight: active ? 600 : 500,
                letterSpacing: "0.02em",
              }}>{label}</div>
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
    // Stats
    const totalRounds = rounds.length;
    const clubsPlayed = new Set(rounds.map(r => r.cfg.clubName).filter(Boolean)).size;
    const bestSF = rounds.reduce((max, r) => {
      const stats = r.players.map(p => {
        const ph = calcPH(p.hcp, r.cfg.slope, r.cfg.cr, sumPar(r.holes));
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
          <h1 className="serif" style={{ fontSize: "42px", fontWeight: 400, margin: "0 0 4px", letterSpacing: "-0.03em", lineHeight: 1.05, color: T.text }}>
            Schönes <em style={{ color: T.gold, fontStyle: "italic" }}>Spiel.</em>
          </h1>
          <p style={{ color: T.textSoft, margin: "0 0 24px", fontSize: "15px", lineHeight: 1.5 }}>
            WHS Handicap · Stableford · alle österreichischen Clubs
          </p>

          <button
            onClick={newRound}
            className="gold-hover"
            style={{
              ...S.btnPrimary,
              width: "100%",
              padding: "18px",
              fontSize: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>Neue Runde starten</span>
            <span style={{ fontSize: "18px" }}>→</span>
          </button>
        </div>

        {/* Stats row */}
        {totalRounds > 0 && (
          <div style={{ padding: "0 16px 20px" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "8px",
              background: T.surface1,
              border: `1px solid ${T.line}`,
              borderRadius: "16px",
              padding: "4px",
            }}>
              {[
                { label: "Runden", value: totalRounds },
                { label: "Clubs", value: clubsPlayed },
                { label: "Bester SF", value: bestSF || "—", accent: true },
              ].map((s,i,arr) => (
                <div key={s.label} style={{
                  padding: "14px 8px",
                  textAlign: "center",
                  borderRight: i < arr.length-1 ? `1px solid ${T.line}` : "none",
                }}>
                  <div className="mono" style={{ fontSize: "22px", fontWeight: 700, color: s.accent ? T.gold : T.text, letterSpacing: "-0.02em" }}>
                    {s.value}
                  </div>
                  <div style={{ ...S.eyebrow, marginTop: "4px", fontSize: "9px" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ padding: "0 16px 16px", display: "flex", gap: "4px" }}>
          {[
            { k: "rounds", l: "Runden" },
            { k: "friends", l: "Freunde" },
            { k: "history", l: "Verlauf" },
          ].map(({k, l}) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              style={{
                flex: 1,
                padding: "10px 0",
                background: tab === k ? T.surface2 : "transparent",
                color: tab === k ? T.text : T.textSoft,
                border: `1px solid ${tab === k ? T.lineStrong : "transparent"}`,
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: tab === k ? 600 : 500,
                transition: "all 0.15s",
              }}
            >{l}</button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ padding: "0 16px" }}>
          {tab === "rounds" && (
            <>
              <button
                onClick={() => setShowImport(true)}
                className="btn-hover"
                style={{ ...S.btnSecondary, width: "100%", marginBottom: "14px", fontSize: "13px", padding: "11px" }}
              >
                📥 &nbsp; Club-Daten importieren (JSON)
              </button>
              {customClubs.length > 0 && (
                <div style={{ fontSize: "11px", color: T.textDim, marginBottom: "12px", textAlign: "center" }}>
                  {customClubs.length} eigene{customClubs.length === 1 ? "r" : ""} Club{customClubs.length === 1 ? "" : "s"} gespeichert
                </div>
              )}
              {rounds.length === 0 ? (
                <EmptyState icon="🏌️" title="Noch keine Runden" sub="Deine gespielten Runden erscheinen hier." />
              ) : (
                <>
                  <div style={{ ...S.eyebrow, marginBottom: "10px" }}>Letzte Runden</div>
                  {rounds.slice(0, 5).map(r => <RoundCard key={r.id} r={r} onClick={() => loadRound(r)} onDelete={() => deleteRound(r.id)} />)}
                </>
              )}
            </>
          )}

          {tab === "friends" && <FriendsTab friends={friends} newP={newP} onNewName={onNewName} onNewHcp={onNewHcp}
            onAdd={async () => {
              const name = newP.name.trim(); if (!name) return;
              const hcp = parseFloat(newP.hcp) || 0;
              const updated = [...friends, { name, hcp }];
              setFriends(updated); setNewP({ name:"", hcp:"" });
              try { await window.storage.set("golf-friends", JSON.stringify(updated)); } catch {}
            }}
            onUpdate={updateFriendHcp} onDelete={deleteFriend} />}

          {tab === "history" && (
            rounds.length === 0
              ? <EmptyState icon="📊" title="Kein Verlauf" sub="Sobald du Runden gespielt hast, siehst du hier deine Entwicklung." />
              : rounds.map(r => <RoundCard key={r.id} r={r} onClick={() => loadRound(r)} onDelete={() => deleteRound(r.id)} showFull />)
          )}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // REUSABLE COMPONENTS
  // ═══════════════════════════════════════════════════════════════════════════
  const EmptyState = ({ icon, title, sub }) => (
    <div style={{
      background: T.surface1,
      border: `1px dashed ${T.line}`,
      borderRadius: "16px",
      padding: "40px 20px",
      textAlign: "center",
    }}>
      <div style={{ fontSize: "32px", opacity: 0.5, marginBottom: "10px" }}>{icon}</div>
      <div className="serif" style={{ fontSize: "18px", color: T.text, marginBottom: "4px" }}>{title}</div>
      <div style={{ fontSize: "13px", color: T.textDim, lineHeight: 1.5 }}>{sub}</div>
    </div>
  );

  const RoundCard = ({ r, onClick, onDelete, showFull }) => {
    const sortedPlayers = r.players.map(p => {
      const ph = calcPH(p.hcp, r.cfg.slope, r.cfg.cr, sumPar(r.holes));
      const sfNT = r.holes.reduce((s, h, i) => {
        const g = r.scores[p.id]?.[i];
        const hs = holeHS(ph, h.si, r.cfg.numHoles);
        return s + (sfNetto(g, hs, h.par) || 0);
      }, 0);
      return { p, sfNT };
    }).sort((a, b) => b.sfNT - a.sfNT);
    const top = sortedPlayers[0];

    return (
      <div
        onClick={onClick}
        className="card-hover"
        style={{
          ...S.card,
          cursor: "pointer",
          padding: "14px 16px",
          marginBottom: "10px",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: "14px",
              fontWeight: 600,
              color: T.text,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              marginBottom: "3px",
            }}>
              {r.cfg.clubName || r.cfg.name || "Runde"}
            </div>
            <div style={{ fontSize: "11px", color: T.textSoft, letterSpacing: "-0.005em" }}>
              {fmtDate(r.cfg.date)} · {r.cfg.numHoles}L{r.cfg.teeName ? ` · ${r.cfg.teeName}` : ""} · {r.players.length} {r.players.length === 1 ? "Spieler" : "Spieler"}
            </div>
          </div>
          {top && (
            <div style={{ textAlign: "right", marginLeft: "10px" }}>
              <div className="mono" style={{ fontSize: "20px", fontWeight: 700, color: T.gold, lineHeight: 1 }}>{top.sfNT}</div>
              <div style={{ fontSize: "9px", color: T.textDim, letterSpacing: "0.06em", marginTop: "2px" }}>SF NETTO</div>
            </div>
          )}
        </div>
        {showFull && sortedPlayers.length > 0 && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px", paddingTop: "10px", borderTop: `1px solid ${T.line}` }}>
            {sortedPlayers.map((s,i) => (
              <div key={s.p.id} style={{
                fontSize: "11px",
                padding: "3px 8px",
                background: i === 0 ? `${T.gold}18` : T.surface2,
                color: i === 0 ? T.gold : T.textSoft,
                borderRadius: "6px",
                border: `1px solid ${i === 0 ? T.gold + "40" : T.line}`,
              }}>
                {i === 0 && "🥇 "}{s.p.name}: <span style={{ fontWeight: 700 }}>{s.sfNT}</span>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={e => { e.stopPropagation(); if (confirm("Runde löschen?")) onDelete(); }}
          style={{
            position: "absolute",
            top: "10px", right: "10px",
            background: "transparent",
            border: "none",
            color: T.textDim,
            fontSize: "16px",
            padding: "4px",
            opacity: 0.5,
          }}
        >×</button>
      </div>
    );
  };

  const FriendsTab = ({ friends, newP, onNewName, onNewHcp, onAdd, onUpdate, onDelete }) => (
    <>
      {friends.length === 0
        ? <EmptyState icon="👥" title="Keine Freunde gespeichert" sub="Einmal Spieler+HCP hinzufügen, dann bei jeder Runde ein Tap." />
        : <>
            <div style={{ ...S.eyebrow, marginBottom: "10px" }}>Gespeichert ({friends.length})</div>
            {friends.map((f,i) => (
              <div key={i} className="card-hover" style={{ ...S.card, padding: "12px 14px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "36px", height: "36px",
                  borderRadius: "50%",
                  background: `${T.gold}20`,
                  border: `1px solid ${T.gold}50`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "13px", fontWeight: 700, color: T.gold,
                }}>{f.name.charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "14px", color: T.text }}>{f.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                    <span style={{ fontSize: "11px", color: T.textDim }}>HCP</span>
                    <input
                      type="number" step="0.1"
                      value={f.hcp}
                      onChange={e => onUpdate(f.name, e.target.value)}
                      style={{ ...S.input, width: "70px", padding: "4px 8px", fontSize: "12px", borderRadius: "6px" }}
                    />
                  </div>
                </div>
                <button onClick={() => onDelete(f.name)} style={{
                  background: "transparent", border: "none", color: T.double,
                  fontSize: "18px", padding: "8px", opacity: 0.6,
                }}>×</button>
              </div>
            ))}
          </>
      }
      <div style={{ ...S.card, padding: "14px", marginTop: "16px" }}>
        <div style={{ ...S.eyebrow, marginBottom: "10px" }}>Neu hinzufügen</div>
        <div style={{ display: "flex", gap: "8px" }}>
          <input style={{ ...S.input, flex: 1 }} placeholder="Name" value={newP.name} onChange={onNewName}/>
          <input style={{ ...S.input, width: "80px", textAlign: "center" }} type="number" step="0.1" placeholder="HCP" value={newP.hcp} onChange={onNewHcp}/>
          <button onClick={onAdd} className="gold-hover" style={{ ...S.btnPrimary, padding: "0 18px", fontSize: "22px", lineHeight: 1 }}>+</button>
        </div>
      </div>
    </>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SETUP SCREEN
  // ═══════════════════════════════════════════════════════════════════════════
  const renderSetup = () => (
    <div className="fade-in">
      <ProgressBar/>
      <div style={S.page}>
        <h2 className="serif" style={{ fontSize: "28px", margin: "0 0 6px", color: T.text }}>Setup</h2>
        <p style={{ fontSize: "13px", color: T.textSoft, marginTop: 0, marginBottom: "22px" }}>
          Club, Abschlag und Spieler wählen
        </p>

        {/* CLUB */}
        <div style={S.card}>
          <div style={{ ...S.eyebrow, marginBottom: "12px" }}>01 &nbsp;·&nbsp; Golfclub</div>
          <div style={{ position: "relative" }}>
            <input
              style={{ ...S.input, fontSize: "16px", paddingLeft: "40px" }}
              placeholder="Club suchen…"
              value={clubQ}
              onFocus={() => setShowDD(true)}
              onChange={onClubQ}
              autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck="false"
            />
            <div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: T.textDim, fontSize: "16px" }}>🔍</div>
            {clubQ && (
              <button
                onClick={() => { setClubQ(""); setShowDD(false); }}
                style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: T.textDim, fontSize: "18px", padding: "8px" }}
              >×</button>
            )}
          </div>

          {showDD && filteredClubs.length > 0 && (
            <div style={{
              marginTop: "8px",
              background: T.surface2,
              border: `1px solid ${T.line}`,
              borderRadius: "12px",
              maxHeight: "280px",
              overflowY: "auto",
              boxShadow: "0 8px 32px #00000088",
            }}>
              {filteredClubs.map((c,i) => {
                const firstTee = Object.values(c.tees)[0];
                const teeCount = Object.keys(c.tees).length;
                const hasHoles = !!c.holes;
                const isCustom = customClubs.includes(c);
                return (
                  <div
                    key={i}
                    onMouseDown={e => { e.preventDefault(); pickClub(c); }}
                    style={{
                      padding: "11px 14px",
                      borderBottom: i < filteredClubs.length - 1 ? `1px solid ${T.line}` : "none",
                      cursor: "pointer",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = T.surface3}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: T.text }}>{c.name}</span>
                      {hasHoles && <span style={{ fontSize: "9px", color: T.sage, background: `${T.sage}15`, padding: "1px 6px", borderRadius: "4px", border: `1px solid ${T.sage}40` }}>verifiziert</span>}
                      {isCustom && <span style={{ fontSize: "9px", color: T.gold, background: `${T.gold}15`, padding: "1px 6px", borderRadius: "4px", border: `1px solid ${T.gold}40` }}>eigen</span>}
                    </div>
                    <div style={{ fontSize: "11px", color: T.textDim, letterSpacing: "-0.005em" }}>
                      {c.region} · Par {firstTee.par} · {c.numHoles} Loch{teeCount > 1 ? ` · ${teeCount} Abschläge` : ` · CR ${firstTee.cr} / Slope ${firstTee.slope}`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tee picker */}
          {pickedClub && (
            <div style={{ marginTop: "14px", padding: "14px", background: `${T.gold}10`, border: `1px solid ${T.gold}40`, borderRadius: "12px" }} className="fade-in">
              <div style={{ fontSize: "12px", color: T.gold, marginBottom: "12px", fontWeight: 600 }}>
                Abschlag für <b>{pickedClub.name}</b>:
              </div>
              <div style={{ display: "grid", gap: "6px" }}>
                {Object.entries(pickedClub.tees).map(([tn, t]) => (
                  <button
                    key={tn}
                    onClick={() => pickTee(pickedClub, tn)}
                    className="btn-hover"
                    style={{
                      ...S.btnSecondary,
                      padding: "12px 14px",
                      textAlign: "left",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "13px",
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{tn}</span>
                    <span className="mono" style={{ fontSize: "11px", color: T.textSoft }}>
                      Par {t.par} · {t.cr}/{t.slope}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected confirmation */}
          {cfg.clubName && !pickedClub && (
            <div style={{
              marginTop: "12px",
              background: `${T.gold}10`,
              border: `1px solid ${T.gold}40`,
              borderRadius: "12px",
              padding: "14px",
            }} className="fade-in">
              <div style={{ ...S.eyebrow, color: T.gold, marginBottom: "6px" }}>✓ Ausgewählt</div>
              <div style={{ fontWeight: 600, fontSize: "15px", color: T.text, marginBottom: "3px" }}>{cfg.clubName}</div>
              {cfg.teeName && <div style={{ fontSize: "12px", color: T.textSoft, marginBottom: "10px" }}>Abschlag: {cfg.teeName}</div>}
              <div style={{ display: "flex", gap: "16px" }}>
                {[["Par", par], ["CR", cfg.cr], ["Slope", cfg.slope], ["Löcher", cfg.numHoles]].map(([l,v]) => (
                  <div key={l}>
                    <div style={{ fontSize: "9px", color: T.goldDim, letterSpacing: "0.08em", fontWeight: 600 }}>{l.toUpperCase()}</div>
                    <div className="mono" style={{ fontSize: "16px", fontWeight: 700, color: T.text }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* DETAILS */}
        <div style={{ ...S.card, marginTop: "12px" }}>
          <div style={{ ...S.eyebrow, marginBottom: "12px" }}>02 &nbsp;·&nbsp; Details</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
            <div>
              <div style={{ fontSize: "11px", color: T.textDim, marginBottom: "5px" }}>Datum</div>
              <input style={S.input} type="date" value={cfg.date} onChange={onDate}/>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: T.textDim, marginBottom: "5px" }}>Löcher</div>
              <div style={{ display: "flex", gap: "6px" }}>
                {[9,18].map(n => (
                  <button
                    key={n}
                    onClick={() => { setCfg(c => ({ ...c, numHoles: n })); setHoles(makeHoles(par, n)); }}
                    style={{
                      flex: 1,
                      padding: "12px 0",
                      borderRadius: "10px",
                      fontSize: "15px",
                      fontWeight: 700,
                      background: cfg.numHoles === n ? T.gold : T.surface1,
                      color: cfg.numHoles === n ? T.canvas : T.text,
                      border: `1px solid ${cfg.numHoles === n ? T.gold : T.line}`,
                    }}
                  >{n}</button>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={S.eyebrow}>03 &nbsp;·&nbsp; Spieler {players.length > 0 && `(${players.length})`}</div>
          </div>

          {friends.length > 0 && (
            <div style={{ marginBottom: "14px" }}>
              <div style={{ fontSize: "11px", color: T.textDim, marginBottom: "8px" }}>Aus Freunden:</div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {friends.map((f,i) => {
                  const added = !!players.find(p => p.name === f.name);
                  return (
                    <button
                      key={i}
                      onClick={() => added ? setPlayers(p => p.filter(x => x.name !== f.name)) : addFromFriend(f)}
                      style={{
                        padding: "6px 11px",
                        borderRadius: "20px",
                        border: `1px solid ${added ? T.gold : T.line}`,
                        background: added ? `${T.gold}20` : T.surface1,
                        color: added ? T.gold : T.textSoft,
                        fontSize: "12px",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                      }}
                    >
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
                const ph = calcPH(p.hcp, cfg.slope, cfg.cr, par);
                const isFriend = !!friends.find(f => f.name === p.name);
                return (
                  <div key={p.id} style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    background: T.surface2,
                    border: `1px solid ${T.line}`,
                    borderRadius: "12px",
                    padding: "10px 14px",
                    marginBottom: "8px",
                  }}>
                    <div style={{
                      width: "32px", height: "32px",
                      borderRadius: "50%",
                      background: `${T.gold}20`,
                      border: `1px solid ${T.gold}40`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "13px", fontWeight: 700, color: T.gold,
                    }}>{p.name.charAt(0).toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: "14px", color: T.text }}>{p.name}</div>
                      <div style={{ fontSize: "11px", color: T.textSoft, marginTop: "1px" }}>
                        HCP <span className="mono">{p.hcp}</span>  ·  Vorgabe <span className="mono" style={{ color: T.gold, fontWeight: 700 }}>{ph}</span>
                      </div>
                    </div>
                    {!isFriend && (
                      <button
                        onClick={() => saveFriend(p)}
                        title="Als Freund speichern"
                        style={{ background: "transparent", border: `1px solid ${T.line}`, borderRadius: "6px", color: T.textDim, padding: "4px 8px", fontSize: "12px" }}
                      >☆ Merken</button>
                    )}
                    <button onClick={() => setPlayers(pl => pl.filter(x => x.id !== p.id))} style={{ background: "transparent", border: "none", color: T.double, fontSize: "18px", padding: "4px 8px", opacity: 0.7 }}>×</button>
                  </div>
                );
              })
          }

          <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
            <input style={{ ...S.input, flex: 1 }} placeholder="Neuer Spieler" value={newP.name} onChange={onNewName} onKeyDown={e => e.key === "Enter" && addPlayer()} />
            <input style={{ ...S.input, width: "70px", textAlign: "center" }} type="number" step="0.1" placeholder="HCP" value={newP.hcp} onChange={onNewHcp} onKeyDown={e => e.key === "Enter" && addPlayer()} />
            <button onClick={addPlayer} className="gold-hover" style={{ ...S.btnPrimary, padding: "0 18px", fontSize: "22px" }}>+</button>
          </div>
        </div>

        {/* NEXT BUTTON */}
        <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
          <button style={{ ...S.btnSecondary, flex: 1 }} onClick={() => setView("home")}>← Zurück</button>
          <button
            style={{ ...S.btnPrimary, flex: 2, opacity: players.length === 0 || !cfg.clubName ? 0.35 : 1 }}
            disabled={players.length === 0 || !cfg.clubName}
            onClick={() => { setShowDD(false); setView("holes"); }}
            className={players.length > 0 && cfg.clubName ? "gold-hover" : ""}
          >
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
    const selectedClub = allClubs.find(c => c.name === cfg.clubName);
    const verified = !!selectedClub?.holes;
    return (
      <div className="fade-in">
        <ProgressBar/>
        <div style={S.page}>
          <h2 className="serif" style={{ fontSize: "28px", margin: "0 0 6px", color: T.text }}>Lochkonfiguration</h2>
          <p style={{ fontSize: "13px", color: T.textSoft, marginTop: 0, marginBottom: "16px" }}>
            Par und Vorgabenwert pro Loch
          </p>

          <div style={{
            padding: "10px 14px",
            background: verified ? `${T.sage}15` : `${T.bogey}15`,
            border: `1px solid ${verified ? T.sage + "40" : T.bogey + "40"}`,
            borderRadius: "12px",
            marginBottom: "14px",
            fontSize: "12px",
            color: verified ? T.sage : T.bogey,
            display: "flex", alignItems: "center", gap: "8px",
          }}>
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
                      <input
                        type="number" min="3" max="6"
                        value={hole.par}
                        onChange={e => setHoles(hs => hs.map((h,j) => j === i ? { ...h, par: parseInt(e.target.value) || 4 } : h))}
                        style={{ ...S.input, width: "54px", padding: "6px 4px", textAlign: "center", margin: "0 auto", display: "block", fontSize: "14px" }}
                      />
                    </td>
                    <td style={{ padding: "4px 10px", textAlign: "center" }}>
                      <input
                        type="number" min="1" max={cfg.numHoles}
                        value={hole.si}
                        onChange={e => setHoles(hs => hs.map((h,j) => j === i ? { ...h, si: parseInt(e.target.value) || 1 } : h))}
                        style={{ ...S.input, width: "54px", padding: "6px 4px", textAlign: "center", margin: "0 auto", display: "block", fontSize: "14px" }}
                      />
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
            <button style={{ ...S.btnPrimary, flex: 2 }} className="gold-hover" onClick={() => setView("scoring")}>Scores eingeben →</button>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SCORING SCREEN — tap-to-score table
  // ═══════════════════════════════════════════════════════════════════════════
  const renderScoring = () => {
    const totalScored = players.reduce((s, p) => s + Object.keys(scores[p.id] || {}).filter(i => scores[p.id][i] !== undefined).length, 0);
    const totalCells = players.length * cfg.numHoles;

    return (
      <div className="fade-in">
        <ProgressBar/>
        <div style={S.page}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "14px" }}>
            <div>
              <h2 className="serif" style={{ fontSize: "28px", margin: "0 0 4px", color: T.text }}>Scores</h2>
              <div style={{ fontSize: "12px", color: T.textSoft }}>
                {cfg.clubName}{cfg.teeName && ` · ${cfg.teeName}`} · Par {par}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="mono" style={{ fontSize: "14px", color: T.textSoft, fontWeight: 600 }}>{totalScored}/{totalCells}</div>
              <div style={{ ...S.eyebrow, fontSize: "9px", marginTop: "2px" }}>erfasst</div>
            </div>
          </div>

          {/* Tip banner */}
          <div style={{
            padding: "10px 14px",
            background: `${T.gold}10`,
            border: `1px solid ${T.gold}30`,
            borderRadius: "10px",
            marginBottom: "14px",
            fontSize: "12px",
            color: T.gold,
            display: "flex", alignItems: "center", gap: "8px",
          }}>
            <span>👆</span>
            <span>Tippe ein Feld um den Score einzugeben</span>
          </div>

          {/* Scorecard table */}
          <div style={{
            overflowX: "auto",
            borderRadius: "12px",
            border: `1px solid ${T.line}`,
            marginBottom: "16px",
            background: T.surface1,
          }} className="scroll-hide">
            <table style={{ borderCollapse: "collapse", minWidth: "100%" }}>
              <thead>
                <tr style={{ background: T.surface2 }}>
                  <th style={{
                    padding: "10px 12px", fontSize: "10px", color: T.textDim, textAlign: "left",
                    letterSpacing: "0.06em", fontWeight: 600, textTransform: "uppercase",
                    position: "sticky", left: 0, background: T.surface2, zIndex: 2,
                  }}>Loch</th>
                  <th style={{ padding: "10px 8px", fontSize: "10px", color: T.textDim, textAlign: "center", letterSpacing: "0.06em", fontWeight: 600, textTransform: "uppercase" }}>Par</th>
                  {players.map(p => (
                    <th key={p.id} style={{
                      padding: "10px 8px", fontSize: "11px", color: T.text, textAlign: "center",
                      fontWeight: 600, whiteSpace: "nowrap", minWidth: "80px",
                    }}>{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {holes.map((hole,i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.line}` }}>
                    <td style={{
                      padding: "8px 12px", fontSize: "13px", fontWeight: 700, color: T.gold,
                      position: "sticky", left: 0, background: T.surface1, zIndex: 1,
                      borderRight: `1px solid ${T.line}`,
                    }}>
                      <span className="mono">{i+1}</span>
                      <span style={{ fontSize: "9px", color: T.textDim, marginLeft: "6px", fontWeight: 500 }}>SI{hole.si}</span>
                    </td>
                    <td className="mono" style={{ padding: "8px 8px", textAlign: "center", fontSize: "13px", color: T.textSoft }}>{hole.par}</td>
                    {players.map(p => {
                      const g = scores[p.id]?.[i];
                      const ph = calcPH(p.hcp, cfg.slope, cfg.cr, par);
                      const hs = holeHS(ph, hole.si, cfg.numHoles);
                      const col = scoreColor(g, hole.par);
                      const isEmpty = g === undefined;
                      const displayValue = isStrich(g) ? "✗" : isValid(g) ? g : "—";
                      return (
                        <td key={p.id} style={{ padding: "5px 6px", textAlign: "center" }}>
                          <button
                            onClick={() => setPadOpen({ playerId: p.id, holeIdx: i })}
                            style={{
                              position: "relative",
                              width: "56px", height: "40px",
                              background: isEmpty ? T.surface1 : `${col}12`,
                              color: col,
                              border: `1px solid ${isEmpty ? T.line : col + "50"}`,
                              borderRadius: "8px",
                              fontSize: "16px",
                              fontWeight: isEmpty ? 400 : 700,
                              fontFamily: "JetBrains Mono, monospace",
                              fontVariantNumeric: "tabular-nums",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {hs > 0 && !isEmpty && (
                              <span style={{
                                position: "absolute", top: "-4px", right: "-3px",
                                fontSize: "8px", fontWeight: 700,
                                background: T.gold, color: T.canvas,
                                borderRadius: "4px", padding: "1px 3px",
                                lineHeight: 1,
                              }}>+{hs}</span>
                            )}
                            {displayValue}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Live totals */}
          <div style={{ ...S.card, marginBottom: "14px" }}>
            <div style={{ ...S.eyebrow, marginBottom: "12px" }}>Zwischenstand</div>
            {players.map((p,i) => {
              const s = getStats(p);
              return (
                <div key={p.id} style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "10px 0",
                  borderBottom: i < players.length - 1 ? `1px solid ${T.line}` : "none",
                }}>
                  <div style={{
                    width: "30px", height: "30px",
                    borderRadius: "50%",
                    background: `${T.gold}20`,
                    border: `1px solid ${T.gold}40`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "12px", fontWeight: 700, color: T.gold,
                  }}>{p.name.charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "14px", color: T.text }}>{p.name}</div>
                    <div style={{ fontSize: "11px", color: T.textSoft, marginTop: "1px" }}>
                      Vorgabe <span className="mono">{s.ph}</span> · Brutto <span className="mono">{s.bT || "—"}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="mono" style={{ fontSize: "22px", fontWeight: 800, color: T.gold, lineHeight: 1 }}>{s.sfNT}</div>
                    <div style={{ fontSize: "9px", color: T.textDim, letterSpacing: "0.06em", marginTop: "2px" }}>SF NETTO</div>
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

  // ═══════════════════════════════════════════════════════════════════════════
  // NUMBER PAD (bottom sheet)
  // ═══════════════════════════════════════════════════════════════════════════
  const renderNumberPad = () => {
    if (!padOpen) return null;
    const player = players.find(p => p.id === padOpen.playerId);
    const hole = holes[padOpen.holeIdx];
    const currentScore = scores[padOpen.playerId]?.[padOpen.holeIdx];
    const ph = calcPH(player.hcp, cfg.slope, cfg.cr, par);
    const hs = holeHS(ph, hole.si, cfg.numHoles);

    return (
      <div
        onClick={() => setPadOpen(null)}
        style={{
          position: "fixed",
          inset: 0,
          background: "#000000aa",
          zIndex: 1000,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          className="slide-up"
          style={{
            width: "100%",
            maxWidth: "500px",
            background: T.surface1,
            borderTopLeftRadius: "24px",
            borderTopRightRadius: "24px",
            border: `1px solid ${T.line}`,
            borderBottom: "none",
            padding: "20px 16px 32px",
            boxShadow: "0 -20px 60px #000000dd",
          }}
        >
          {/* Handle */}
          <div style={{ width: "40px", height: "4px", background: T.lineStrong, borderRadius: "2px", margin: "0 auto 18px" }}/>

          {/* Context */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div>
              <div style={{ fontSize: "13px", color: T.textSoft }}>{player.name}</div>
              <div className="serif" style={{ fontSize: "24px", color: T.text, fontWeight: 400, marginTop: "2px" }}>
                Loch <span style={{ color: T.gold }}>{padOpen.holeIdx + 1}</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", color: T.textDim, letterSpacing: "0.06em" }}>PAR · SI</div>
              <div className="mono" style={{ fontSize: "18px", color: T.text, fontWeight: 700 }}>
                {hole.par} · {hole.si}
              </div>
              {hs > 0 && (
                <div style={{ fontSize: "10px", color: T.gold, marginTop: "2px", fontWeight: 600 }}>
                  +{hs} Vorgabeschlag{hs > 1 ? "e" : ""}
                </div>
              )}
            </div>
          </div>

          {/* Current score indicator */}
          {(currentScore !== undefined) && (
            <div style={{
              padding: "10px 14px",
              background: T.surface2,
              border: `1px solid ${T.line}`,
              borderRadius: "10px",
              marginBottom: "14px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div style={{ fontSize: "12px", color: T.textSoft }}>Aktuell</div>
              <div style={{
                fontSize: "13px",
                fontWeight: 700,
                color: scoreColor(currentScore, hole.par),
              }}>
                {isStrich(currentScore) ? "Gestrichen" : `${currentScore} · ${scoreLabel(currentScore, hole.par)}`}
              </div>
            </div>
          )}

          {/* Number grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "8px",
            marginBottom: "8px",
          }}>
            {[1,2,3,4,5,6,7,8,9].map(n => {
              const wouldBeColor = scoreColor(n, hole.par);
              const isSelected = currentScore === n;
              return (
                <button
                  key={n}
                  onClick={() => padEnter(n)}
                  style={{
                    height: "58px",
                    fontSize: "22px",
                    fontWeight: 700,
                    fontFamily: "JetBrains Mono, monospace",
                    background: isSelected ? `${wouldBeColor}25` : T.surface2,
                    color: isSelected ? wouldBeColor : T.text,
                    border: `1.5px solid ${isSelected ? wouldBeColor + "80" : T.line}`,
                    borderRadius: "14px",
                  }}
                >
                  {n}
                </button>
              );
            })}
          </div>

          {/* Extra row: 10 / Strich / Clear */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "14px" }}>
            <button
              onClick={() => padEnter(10)}
              style={{
                height: "58px",
                fontSize: "22px",
                fontWeight: 700,
                fontFamily: "JetBrains Mono, monospace",
                background: currentScore === 10 ? `${T.double}25` : T.surface2,
                color: currentScore === 10 ? T.double : T.text,
                border: `1.5px solid ${currentScore === 10 ? T.double + "80" : T.line}`,
                borderRadius: "14px",
              }}
            >10</button>
            <button
              onClick={padStrich}
              style={{
                height: "58px",
                fontSize: "18px",
                fontWeight: 700,
                background: isStrich(currentScore) ? `${T.strich}40` : T.surface2,
                color: isStrich(currentScore) ? T.text : T.textSoft,
                border: `1.5px solid ${isStrich(currentScore) ? T.strich : T.line}`,
                borderRadius: "14px",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                lineHeight: 1,
              }}
            >
              <span style={{ fontSize: "18px" }}>✗</span>
              <span style={{ fontSize: "9px", marginTop: "2px", letterSpacing: "0.06em" }}>STRICH</span>
            </button>
            <button
              onClick={padClear}
              style={{
                height: "58px",
                fontSize: "16px",
                fontWeight: 600,
                background: T.surface2,
                color: T.textDim,
                border: `1.5px solid ${T.line}`,
                borderRadius: "14px",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                lineHeight: 1,
              }}
            >
              <span style={{ fontSize: "18px" }}>⌫</span>
              <span style={{ fontSize: "9px", marginTop: "2px", letterSpacing: "0.06em" }}>LEER</span>
            </button>
          </div>

          <button
            onClick={() => setPadOpen(null)}
            style={{ ...S.btnSecondary, width: "100%", fontSize: "13px", padding: "10px" }}
          >Schließen</button>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RESULTS SCREEN
  // ═══════════════════════════════════════════════════════════════════════════
  const renderResults = () => {
    const all = players.map(p => ({ p, ...getStats(p) }));
    const ranked = [...all].sort((a,b) => b.sfNT - a.sfNT);
    const medals = ["🥇", "🥈", "🥉"];

    return (
      <div className="fade-in">
        <ProgressBar/>
        <div style={S.page}>
          <h2 className="serif" style={{ fontSize: "28px", margin: "0 0 6px", color: T.text }}>Auswertung</h2>
          <div style={{ fontSize: "12px", color: T.textSoft, marginBottom: "20px" }}>
            {cfg.clubName || cfg.name || "Runde"}{cfg.teeName && ` · ${cfg.teeName}`} · {fmtDate(cfg.date)} · Par {par}
          </div>

          {/* Podium */}
          <div style={{
            ...S.card,
            background: `linear-gradient(135deg, ${T.surface2}, ${T.surface1})`,
            border: `1px solid ${T.gold}40`,
            marginBottom: "20px",
          }}>
            <div style={{ ...S.eyebrow, color: T.gold, marginBottom: "14px" }}>🏆 Stableford Netto</div>
            {ranked.map((s,i) => (
              <div key={s.p.id} style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "12px 0",
                borderBottom: i < ranked.length - 1 ? `1px solid ${T.line}` : "none",
              }}>
                <div style={{ fontSize: "24px", width: "30px", textAlign: "center" }}>
                  {medals[i] || <span className="mono" style={{ fontSize: "15px", color: T.textSoft, fontWeight: 700 }}>{i+1}.</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: "15px", color: T.text }}>{s.p.name}</div>
                  <div style={{ fontSize: "11px", color: T.textSoft, marginTop: "1px" }}>
                    HCP <span className="mono">{s.p.hcp}</span> · Vorgabe <span className="mono">{s.ph}</span> · Brutto <span className="mono">{s.bT || "—"}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="mono serif" style={{ fontSize: "32px", fontWeight: 700, color: T.gold, lineHeight: 1, letterSpacing: "-0.02em" }}>{s.sfNT}</div>
                  <div style={{ fontSize: "9px", color: T.textDim, letterSpacing: "0.06em", marginTop: "2px" }}>PUNKTE</div>
                </div>
              </div>
            ))}
          </div>

          {/* Per-player details */}
          {all.map(s => (
            <div key={s.p.id} style={{ ...S.card, marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "16px", color: T.text }}>{s.p.name}</div>
                  <div style={{ fontSize: "11px", color: T.textSoft, marginTop: "2px" }}>Vorgabe <span className="mono">{s.ph}</span></div>
                </div>
                <button
                  onClick={() => setExpId(expId === s.p.id ? null : s.p.id)}
                  style={{ ...S.btnGhost, padding: "6px 12px" }}
                  className="btn-hover"
                >
                  {expId === s.p.id ? "Einklappen" : "Details"}
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {[
                  { l: "SF Netto ★", v: `${s.sfNT}`, hi: true, suffix: "Pkt" },
                  { l: "SF Brutto", v: `${s.sfBT}`, suffix: "Pkt" },
                  { l: "Netto Strokeplay", v: s.nT },
                  { l: "Brutto Strokeplay", v: s.bT },
                ].map(item => (
                  <div key={item.l} style={{
                    background: item.hi ? `${T.gold}12` : T.surface2,
                    border: `1px solid ${item.hi ? T.gold + "40" : T.line}`,
                    borderRadius: "12px",
                    padding: "12px 14px",
                  }}>
                    <div style={{ fontSize: "9px", color: item.hi ? T.gold : T.textDim, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, marginBottom: "5px" }}>{item.l}</div>
                    <div className="mono" style={{ fontSize: "22px", fontWeight: 700, color: item.hi ? T.gold : T.text, letterSpacing: "-0.02em" }}>
                      {item.v}{item.suffix && <span style={{ fontSize: "11px", fontWeight: 500, color: T.textSoft, marginLeft: "4px" }}>{item.suffix}</span>}
                    </div>
                  </div>
                ))}
              </div>
              {expId === s.p.id && (
                <div style={{ marginTop: "14px", overflowX: "auto" }} className="scroll-hide">
                  <table style={{ borderCollapse: "collapse", fontSize: "11px", width: "100%" }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${T.line}` }}>
                        {["L","Par","SI","+","Brutto","Netto","SFN","SFB"].map(h => (
                          <th key={h} style={{ padding: "6px 7px", color: T.textDim, fontWeight: 600, textAlign: "center", fontSize: "10px", letterSpacing: "0.04em" }}>{h}</th>
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
                        <td colSpan={3} style={{ padding: "7px", textAlign: "right", fontWeight: 700, color: T.textDim, fontSize: "9px", letterSpacing: "0.06em" }}>TOTAL</td>
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
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // IMPORT MODAL
  // ═══════════════════════════════════════════════════════════════════════════
  const renderImportModal = () => (
    <div
      onClick={() => setShowImport(false)}
      style={{
        position: "fixed", inset: 0,
        background: "#000000cc",
        zIndex: 1000,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="slide-up"
        style={{
          width: "100%", maxWidth: "520px",
          background: T.surface1,
          borderTopLeftRadius: "24px",
          borderTopRightRadius: "24px",
          border: `1px solid ${T.line}`,
          borderBottom: "none",
          padding: "20px 16px 28px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 -20px 60px #000000dd",
        }}
      >
        <div style={{ width: "40px", height: "4px", background: T.lineStrong, borderRadius: "2px", margin: "0 auto 18px" }}/>
        <h3 className="serif" style={{ fontSize: "24px", margin: "0 0 6px", color: T.text }}>Club-Daten importieren</h3>
        <p style={{ fontSize: "13px", color: T.textSoft, marginTop: 0, marginBottom: "14px", lineHeight: 1.5 }}>
          JSON aus dem Agent-Prompt einfügen. Markdown-Codeblöcke werden erkannt.
        </p>
        <textarea
          value={importText}
          onChange={e => setImportText(e.target.value)}
          placeholder={`{\n  "name": "GC ...",\n  "region": "...",\n  "numHoles": 18,\n  "tees": { ... },\n  "holes": [ ... ]\n}`}
          style={{
            ...S.input,
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "12px",
            minHeight: "220px",
            resize: "vertical",
            marginBottom: "10px",
          }}
        />
        {importErrors.length > 0 && (
          <div style={{
            background: `${T.double}15`,
            border: `1px solid ${T.double}50`,
            borderRadius: "10px",
            padding: "10px 14px",
            marginBottom: "10px",
            fontSize: "12px",
            color: T.double,
          }}>
            <div style={{ fontWeight: 700, marginBottom: "4px" }}>Fehler:</div>
            {importErrors.map((e,i) => <div key={i}>• {e}</div>)}
          </div>
        )}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => { setShowImport(false); setImportText(""); setImportErrors([]); }}
            style={{ ...S.btnSecondary, flex: 1 }}
          >Abbrechen</button>
          <button
            onClick={importClub}
            className="gold-hover"
            style={{ ...S.btnPrimary, flex: 2 }}
          >Importieren</button>
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
      <Header/>
      {view === "home"     && renderHome()}
      {view === "setup"    && renderSetup()}
      {view === "holes"    && renderHoles()}
      {view === "scoring"  && renderScoring()}
      {view === "results"  && renderResults()}
      {padOpen && renderNumberPad()}
      {showImport && renderImportModal()}
    </div>
  );
}
