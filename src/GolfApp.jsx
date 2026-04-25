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
// Format: insert a dash after the 4th char if input has exactly 8 chars, else leave as-is
const formatSync = c => {
  if (!c) return "";
  // If user entered a custom code with a dash, keep it
  if (c.includes("-")) return c;
  // Classic 8-char: insert dash in middle for readability
  if (c.length === 8) return `${c.slice(0,4)}-${c.slice(4)}`;
  return c;
};
// cleanSync: allow A-Z, 0-9, and dash. Uppercase. Up to 20 chars for custom codes.
const cleanSync  = c => (c || "").replace(/[^A-Z0-9-]/gi, "").toUpperCase().slice(0, 20);
// Validation: at least 4 chars of actual content (excluding dashes)
const isValidSyncCode = c => {
  const cleaned = (c || "").replace(/-/g, "");
  return cleaned.length >= 4 && cleaned.length <= 20;
};

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
    const encodedCode = encodeURIComponent(syncCode);
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/user_data?sync_code=eq.${encodedCode}&select=*`,
      { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows[0] || null;
  } catch (e) { console.error("Cloud pull failed", e); return null; }
}

// ─── Live Ticker ─────────────────────────────────────────────────────────────
// Stores a snapshot of the current round in the `live_rounds` table.
// Each live round has a unique short code; the code maps to a public URL.
// Anyone with the URL can view (read-only) the round data.
// Auto-expires after 48h (DB-side via DEFAULT and optional cron cleanup).

// Create a new live ticker. Returns { code } on success, or { error } on failure.
async function liveCreate(data) {
  if (!SYNC_ENABLED) return { error: "sync-disabled" };
  const code = genSyncCode(); // reuse same alphabet, 8 chars
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/live_rounds`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        code,
        data,
        updated_at: new Date().toISOString(),
      }),
    });
    if (res.ok) return { code };
    // Try to extract useful error info
    let detail = "";
    try {
      const body = await res.text();
      detail = body.slice(0, 200);
    } catch {}
    return { error: `http-${res.status}`, status: res.status, detail };
  } catch (e) {
    console.error("Live create failed", e);
    return { error: "network", detail: String(e.message || e) };
  }
}

// Push an update to an existing live ticker.
async function liveUpdate(code, data) {
  if (!SYNC_ENABLED || !code) return false;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/live_rounds?code=eq.${encodeURIComponent(code)}`,
      {
        method: "PATCH",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data,
          updated_at: new Date().toISOString(),
        }),
      }
    );
    return res.ok;
  } catch (e) { console.error("Live update failed", e); return false; }
}

// Pull the current snapshot of a live ticker (used by the viewer page).
async function liveRead(code) {
  if (!SYNC_ENABLED || !code) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/live_rounds?code=eq.${encodeURIComponent(code)}&select=*`,
      { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows[0] || null;
  } catch (e) { console.error("Live read failed", e); return null; }
}

// Delete a live ticker (when the scorer wants to end the live share).
async function liveDelete(code) {
  if (!SYNC_ENABLED || !code) return false;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/live_rounds?code=eq.${encodeURIComponent(code)}`,
      {
        method: "DELETE",
        headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` },
      }
    );
    return res.ok;
  } catch (e) { console.error("Live delete failed", e); return false; }
}

// List all currently-active live rounds, optionally filtered to recently-updated ones.
// Backend's TTL is ~48h so we additionally filter client-side to "updated within last 24h"
// so we only show truly active rounds (not just stale ones).
async function liveListActive() {
  if (!SYNC_ENABLED) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/live_rounds?select=code,updated_at,data&order=updated_at.desc&limit=20`,
      { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
    );
    if (!res.ok) return [];
    const rows = await res.json();
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24h ago
    return rows.filter(r => {
      const ts = new Date(r.updated_at).getTime();
      return ts > cutoff;
    });
  } catch (e) { console.error("Live list failed", e); return []; }
}

// List ALL live rounds without filtering (for cleanup purposes).
// Returns full data so we can match against local rounds by content fingerprint.
async function liveListAll() {
  if (!SYNC_ENABLED) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/live_rounds?select=code,updated_at,data&order=updated_at.desc&limit=50`,
      { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
    );
    if (!res.ok) return [];
    return await res.json();
  } catch (e) { console.error("Live listAll failed", e); return []; }
}

// ═════════════════════════════════════════════════════════════════════════════
// CLUB DATABASE
// ═════════════════════════════════════════════════════════════════════════════
const simple = (name, region, cr, slope, par, numHoles = 18) => ({
  name, region, numHoles,
  tees: { "Standard": { cr, slope, par } },
});

// ─── Club GPS-Koordinaten für Sortierung nach Distanz zu Wien ────────────────
// Wien Zentrum: 48.2082, 16.3738
// Key = genauer Club-Name (wie im BUILT_IN_CLUBS Array)
const VIENNA_LAT = 48.2082;
const VIENNA_LNG = 16.3738;
const CLUB_COORDS = {
  // Wien & Niederösterreich — Stammregion
  "GC GolfRange Bockfließ":             [48.3683, 16.6583],
  "GC Adamstal Championship":           [47.8583, 15.6717],
  "GCC Brunn":                          [48.1050, 16.2783],
  "GC Frühling Götzendorf (DayCourse)": [48.0033, 16.7283],
  "GC Fontana":                         [48.0267, 16.2950],
  "GC Schloss Schönborn":               [48.4833, 16.0500],
  "GC Wien-Süßenbrunn":                 [48.3167, 16.4683],
  "C&C Wienerberg":                     [48.1550, 16.3700],
  "GC Lengenfeld-Kamptal":              [48.5300, 15.7667],
  "GC Lengenfeld-Donauland":            [48.5350, 15.7700],
  "GC Himberg":                         [48.0850, 16.4383],
  "GC Spillern":                        [48.3883, 16.2733],
  "GC St. Pölten":                      [48.2050, 15.6167],
  "GC Enzesfeld":                       [47.9233, 16.2083],
  "GC Atzenbrugg":                      [48.3000, 15.9333],
  "GC Maria Taferl":                    [48.2217, 15.1717],
  "GC Semmering":                       [47.6417, 15.8283],
  "GC Schloss Hainfeld":                [48.0383, 15.7783],
  "GC Wiener Neustadt":                 [47.8150, 16.2433],
  "GC Gut Altentann":                   [47.8833, 13.1667],
  "GC Gösting":                         [47.0833, 15.4167],
  "GC Murhof":                          [47.2583, 15.0333],
  "GC Murstätten":                      [46.9683, 15.5350],
  "GC Kitzbühel Schwarzsee-Reith":      [47.4500, 12.3667],
  // Burgenland / Süd
  "GC Neusiedlersee-Donnerskirchen":    [47.8967, 16.6500],
  "GC Bad Waltersdorf":                 [47.1767, 15.9533],
  // Westösterreich
  "GC Bregenzerwald":                   [47.4750, 9.8817],
  "GC Montfort Rankweil":               [47.2717, 9.6533],
  // International
  "Penati Golf Resort (Heritage)":      [48.6917, 17.2400],
  "Penati Golf Resort (Legend)":        [48.6917, 17.2400],
  "Aphrodite Hills Golf Club (Cyprus)": [34.7167, 32.5667],
  "Secret Valley Golf Resort (Cyprus)": [34.7300, 32.5833],
  "Minthis Golf Club (Cyprus)":         [34.8333, 32.5000],
  "Eléa Golf Club (Cyprus)":            [34.7833, 32.4833],
};

// Haversine-Formel: Distanz zwischen zwei GPS-Punkten in km
function geoDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Erdradius km
  const toRad = (deg) => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function clubDistanceFromVienna(clubName) {
  const coords = CLUB_COORDS[clubName];
  if (!coords) return null; // unknown → will sort last
  return geoDistance(VIENNA_LAT, VIENNA_LNG, coords[0], coords[1]);
}

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
  {
    name: "GC Frühling Götzendorf (DayCourse)",
    region: "Niederösterreich",
    numHoles: 18,
    tees: {
      "Weiss (Herren)": { cr: 75.0, slope: 129, par: 73 },
      "Gelb (Herren)":  { cr: 71.9, slope: 122, par: 73 },
      "Blau (Herren)":  { cr: 70.7, slope: 118, par: 73 },
      "Rot (Herren)":   { cr: 68.4, slope: 114, par: 73 },
      "Gelb (Damen)":   { cr: 78.4, slope: 135, par: 73 },
      "Blau (Damen)":   { cr: 77.3, slope: 131, par: 73 },
      "Rot (Damen)":    { cr: 74.4, slope: 124, par: 73 },
    },
    conversionTables: {
      "Weiss (Herren)": [
        { min: 4.9, max: 5.6, spielvorgabe: 8 },   { min: 5.7, max: 6.5, spielvorgabe: 9 },
        { min: 6.6, max: 7.4, spielvorgabe: 10 },  { min: 7.5, max: 8.3, spielvorgabe: 11 },
        { min: 8.4, max: 9.1, spielvorgabe: 12 },  { min: 9.2, max: 10.0, spielvorgabe: 13 },
        { min: 10.1, max: 10.9, spielvorgabe: 14 },{ min: 11.0, max: 11.8, spielvorgabe: 15 },
        { min: 11.9, max: 12.7, spielvorgabe: 16 },{ min: 12.8, max: 13.5, spielvorgabe: 17 },
        { min: 13.6, max: 14.4, spielvorgabe: 18 },{ min: 14.5, max: 15.3, spielvorgabe: 19 },
        { min: 15.4, max: 16.2, spielvorgabe: 20 },{ min: 16.3, max: 17.0, spielvorgabe: 21 },
        { min: 17.1, max: 17.9, spielvorgabe: 22 },{ min: 18.0, max: 18.8, spielvorgabe: 23 },
        { min: 18.9, max: 19.7, spielvorgabe: 24 },{ min: 19.8, max: 20.5, spielvorgabe: 25 },
        { min: 20.6, max: 21.4, spielvorgabe: 26 },{ min: 21.5, max: 22.3, spielvorgabe: 27 },
        { min: 22.4, max: 23.2, spielvorgabe: 28 },{ min: 23.3, max: 24.0, spielvorgabe: 29 },
        { min: 24.1, max: 24.9, spielvorgabe: 30 },{ min: 25.0, max: 25.8, spielvorgabe: 31 },
        { min: 25.9, max: 26.7, spielvorgabe: 32 },{ min: 26.8, max: 27.5, spielvorgabe: 33 },
        { min: 27.6, max: 28.4, spielvorgabe: 34 },{ min: 28.5, max: 29.3, spielvorgabe: 35 },
        { min: 29.4, max: 30.2, spielvorgabe: 36 },{ min: 30.3, max: 31.0, spielvorgabe: 37 },
        { min: 31.1, max: 31.9, spielvorgabe: 38 },{ min: 32.0, max: 32.8, spielvorgabe: 39 },
        { min: 32.9, max: 33.7, spielvorgabe: 40 },{ min: 33.8, max: 34.6, spielvorgabe: 41 },
        { min: 34.7, max: 35.4, spielvorgabe: 42 },{ min: 35.5, max: 36.0, spielvorgabe: 43 },
      ],
      "Gelb (Herren)": [
        { min: 3.4, max: 4.2, spielvorgabe: 3 },   { min: 4.3, max: 5.1, spielvorgabe: 4 },
        { min: 5.2, max: 6.1, spielvorgabe: 5 },   { min: 6.2, max: 7.0, spielvorgabe: 6 },
        { min: 7.1, max: 7.9, spielvorgabe: 7 },   { min: 8.0, max: 8.8, spielvorgabe: 8 },
        { min: 8.9, max: 9.8, spielvorgabe: 9 },   { min: 9.9, max: 10.7, spielvorgabe: 10 },
        { min: 10.8, max: 11.6, spielvorgabe: 11 },{ min: 11.7, max: 12.5, spielvorgabe: 12 },
        { min: 12.6, max: 13.5, spielvorgabe: 13 },{ min: 13.6, max: 14.4, spielvorgabe: 14 },
        { min: 14.5, max: 15.3, spielvorgabe: 15 },{ min: 15.4, max: 16.3, spielvorgabe: 16 },
        { min: 16.4, max: 17.2, spielvorgabe: 17 },{ min: 17.3, max: 18.1, spielvorgabe: 18 },
        { min: 18.2, max: 19.0, spielvorgabe: 19 },{ min: 19.1, max: 20.0, spielvorgabe: 20 },
        { min: 20.1, max: 20.9, spielvorgabe: 21 },{ min: 21.0, max: 21.8, spielvorgabe: 22 },
        { min: 21.9, max: 22.7, spielvorgabe: 23 },{ min: 22.8, max: 23.7, spielvorgabe: 24 },
        { min: 23.8, max: 24.6, spielvorgabe: 25 },{ min: 24.7, max: 25.5, spielvorgabe: 26 },
        { min: 25.6, max: 26.4, spielvorgabe: 27 },{ min: 26.5, max: 27.4, spielvorgabe: 28 },
        { min: 27.5, max: 28.3, spielvorgabe: 29 },{ min: 28.4, max: 29.2, spielvorgabe: 30 },
        { min: 29.3, max: 30.1, spielvorgabe: 31 },{ min: 30.2, max: 31.1, spielvorgabe: 32 },
        { min: 31.2, max: 32.0, spielvorgabe: 33 },{ min: 32.1, max: 32.9, spielvorgabe: 34 },
        { min: 33.0, max: 33.8, spielvorgabe: 35 },{ min: 33.9, max: 34.8, spielvorgabe: 36 },
        { min: 34.9, max: 35.7, spielvorgabe: 37 },{ min: 35.8, max: 36.0, spielvorgabe: 38 },
      ],
      "Blau (Herren)": [
        { min: 1.8, max: 2.6, spielvorgabe: 0 },   { min: 2.7, max: 3.6, spielvorgabe: 1 },
        { min: 3.7, max: 4.5, spielvorgabe: 2 },   { min: 4.6, max: 5.5, spielvorgabe: 3 },
        { min: 5.6, max: 6.5, spielvorgabe: 4 },   { min: 6.6, max: 7.4, spielvorgabe: 5 },
        { min: 7.5, max: 8.4, spielvorgabe: 6 },   { min: 8.5, max: 9.3, spielvorgabe: 7 },
        { min: 9.4, max: 10.3, spielvorgabe: 8 },  { min: 10.4, max: 11.2, spielvorgabe: 9 },
        { min: 11.3, max: 12.2, spielvorgabe: 10 },{ min: 12.3, max: 13.2, spielvorgabe: 11 },
        { min: 13.3, max: 14.1, spielvorgabe: 12 },{ min: 14.2, max: 15.1, spielvorgabe: 13 },
        { min: 15.2, max: 16.0, spielvorgabe: 14 },{ min: 16.1, max: 17.0, spielvorgabe: 15 },
        { min: 17.1, max: 18.0, spielvorgabe: 16 },{ min: 18.1, max: 18.9, spielvorgabe: 17 },
        { min: 19.0, max: 19.9, spielvorgabe: 18 },{ min: 20.0, max: 20.8, spielvorgabe: 19 },
        { min: 20.9, max: 21.8, spielvorgabe: 20 },{ min: 21.9, max: 22.7, spielvorgabe: 21 },
        { min: 22.8, max: 23.7, spielvorgabe: 22 },{ min: 23.8, max: 24.7, spielvorgabe: 23 },
        { min: 24.8, max: 25.6, spielvorgabe: 24 },{ min: 25.7, max: 26.6, spielvorgabe: 25 },
        { min: 26.7, max: 27.5, spielvorgabe: 26 },{ min: 27.6, max: 28.5, spielvorgabe: 27 },
        { min: 28.6, max: 29.4, spielvorgabe: 28 },{ min: 29.5, max: 30.4, spielvorgabe: 29 },
        { min: 30.5, max: 31.4, spielvorgabe: 30 },{ min: 31.5, max: 32.3, spielvorgabe: 31 },
        { min: 32.4, max: 33.3, spielvorgabe: 32 },{ min: 33.4, max: 34.2, spielvorgabe: 33 },
        { min: 34.3, max: 35.2, spielvorgabe: 34 },{ min: 35.3, max: 36.0, spielvorgabe: 35 },
      ],
      "Rot (Herren)": [
        { min: 1.1, max: 2.0, spielvorgabe: -3 },  { min: 2.1, max: 3.0, spielvorgabe: -2 },
        { min: 3.1, max: 4.0, spielvorgabe: -1 },  { min: 4.1, max: 5.0, spielvorgabe: 0 },
        { min: 5.1, max: 6.0, spielvorgabe: 1 },   { min: 6.1, max: 7.0, spielvorgabe: 2 },
        { min: 7.1, max: 8.0, spielvorgabe: 3 },   { min: 8.1, max: 9.0, spielvorgabe: 4 },
        { min: 9.1, max: 10.0, spielvorgabe: 5 },  { min: 10.1, max: 11.0, spielvorgabe: 6 },
        { min: 11.1, max: 11.9, spielvorgabe: 7 }, { min: 12.0, max: 12.9, spielvorgabe: 8 },
        { min: 13.0, max: 13.9, spielvorgabe: 9 }, { min: 14.0, max: 14.9, spielvorgabe: 10 },
        { min: 15.0, max: 15.9, spielvorgabe: 11 },{ min: 16.0, max: 16.9, spielvorgabe: 12 },
        { min: 17.0, max: 17.9, spielvorgabe: 13 },{ min: 18.0, max: 18.9, spielvorgabe: 14 },
        { min: 19.0, max: 19.9, spielvorgabe: 15 },{ min: 20.0, max: 20.9, spielvorgabe: 16 },
        { min: 21.0, max: 21.9, spielvorgabe: 17 },{ min: 22.0, max: 22.8, spielvorgabe: 18 },
        { min: 22.9, max: 23.8, spielvorgabe: 19 },{ min: 23.9, max: 24.8, spielvorgabe: 20 },
        { min: 24.9, max: 25.8, spielvorgabe: 21 },{ min: 25.9, max: 26.8, spielvorgabe: 22 },
        { min: 26.9, max: 27.8, spielvorgabe: 23 },{ min: 27.9, max: 28.8, spielvorgabe: 24 },
        { min: 28.9, max: 29.8, spielvorgabe: 25 },{ min: 29.9, max: 30.8, spielvorgabe: 26 },
        { min: 30.9, max: 31.8, spielvorgabe: 27 },{ min: 31.9, max: 32.8, spielvorgabe: 28 },
        { min: 32.9, max: 33.8, spielvorgabe: 29 },{ min: 33.9, max: 34.7, spielvorgabe: 30 },
        { min: 34.8, max: 35.7, spielvorgabe: 31 },{ min: 35.8, max: 36.0, spielvorgabe: 32 },
      ],
      "Gelb (Damen)": [
        { min: 6.0, max: 6.7, spielvorgabe: 13 },  { min: 6.8, max: 7.6, spielvorgabe: 14 },
        { min: 7.7, max: 8.4, spielvorgabe: 15 },  { min: 8.5, max: 9.2, spielvorgabe: 16 },
        { min: 9.3, max: 10.1, spielvorgabe: 17 }, { min: 10.2, max: 10.9, spielvorgabe: 18 },
        { min: 11.0, max: 11.8, spielvorgabe: 19 },{ min: 11.9, max: 12.6, spielvorgabe: 20 },
        { min: 12.7, max: 13.4, spielvorgabe: 21 },{ min: 13.5, max: 14.3, spielvorgabe: 22 },
        { min: 14.4, max: 15.1, spielvorgabe: 23 },{ min: 15.2, max: 15.9, spielvorgabe: 24 },
        { min: 16.0, max: 16.8, spielvorgabe: 25 },{ min: 16.9, max: 17.6, spielvorgabe: 26 },
        { min: 17.7, max: 18.4, spielvorgabe: 27 },{ min: 18.5, max: 19.3, spielvorgabe: 28 },
        { min: 19.4, max: 20.1, spielvorgabe: 29 },{ min: 20.2, max: 21.0, spielvorgabe: 30 },
        { min: 21.1, max: 21.8, spielvorgabe: 31 },{ min: 21.9, max: 22.6, spielvorgabe: 32 },
        { min: 22.7, max: 23.5, spielvorgabe: 33 },{ min: 23.6, max: 24.3, spielvorgabe: 34 },
        { min: 24.4, max: 25.1, spielvorgabe: 35 },{ min: 25.2, max: 26.0, spielvorgabe: 36 },
        { min: 26.1, max: 26.8, spielvorgabe: 37 },{ min: 26.9, max: 27.7, spielvorgabe: 38 },
        { min: 27.8, max: 28.5, spielvorgabe: 39 },{ min: 28.6, max: 29.3, spielvorgabe: 40 },
        { min: 29.4, max: 30.2, spielvorgabe: 41 },{ min: 30.3, max: 31.0, spielvorgabe: 42 },
        { min: 31.1, max: 31.8, spielvorgabe: 43 },{ min: 31.9, max: 32.7, spielvorgabe: 44 },
        { min: 32.8, max: 33.5, spielvorgabe: 45 },{ min: 33.6, max: 34.4, spielvorgabe: 46 },
        { min: 34.5, max: 35.2, spielvorgabe: 47 },{ min: 35.3, max: 36.0, spielvorgabe: 48 },
      ],
      "Blau (Damen)": [
        { min: 5.4, max: 6.2, spielvorgabe: 11 },  { min: 6.3, max: 7.0, spielvorgabe: 12 },
        { min: 7.1, max: 7.9, spielvorgabe: 13 },  { min: 8.0, max: 8.7, spielvorgabe: 14 },
        { min: 8.8, max: 9.6, spielvorgabe: 15 },  { min: 9.7, max: 10.5, spielvorgabe: 16 },
        { min: 10.6, max: 11.3, spielvorgabe: 17 },{ min: 11.4, max: 12.2, spielvorgabe: 18 },
        { min: 12.3, max: 13.1, spielvorgabe: 19 },{ min: 13.2, max: 13.9, spielvorgabe: 20 },
        { min: 14.0, max: 14.8, spielvorgabe: 21 },{ min: 14.9, max: 15.6, spielvorgabe: 22 },
        { min: 15.7, max: 16.5, spielvorgabe: 23 },{ min: 16.6, max: 17.4, spielvorgabe: 24 },
        { min: 17.5, max: 18.2, spielvorgabe: 25 },{ min: 18.3, max: 19.1, spielvorgabe: 26 },
        { min: 19.2, max: 20.0, spielvorgabe: 27 },{ min: 20.1, max: 20.8, spielvorgabe: 28 },
        { min: 20.9, max: 21.7, spielvorgabe: 29 },{ min: 21.8, max: 22.5, spielvorgabe: 30 },
        { min: 22.6, max: 23.4, spielvorgabe: 31 },{ min: 23.5, max: 24.3, spielvorgabe: 32 },
        { min: 24.4, max: 25.1, spielvorgabe: 33 },{ min: 25.2, max: 26.0, spielvorgabe: 34 },
        { min: 26.1, max: 26.9, spielvorgabe: 35 },{ min: 27.0, max: 27.7, spielvorgabe: 36 },
        { min: 27.8, max: 28.6, spielvorgabe: 37 },{ min: 28.7, max: 29.5, spielvorgabe: 38 },
        { min: 29.6, max: 30.3, spielvorgabe: 39 },{ min: 30.4, max: 31.2, spielvorgabe: 40 },
        { min: 31.3, max: 32.0, spielvorgabe: 41 },{ min: 32.1, max: 32.9, spielvorgabe: 42 },
        { min: 33.0, max: 33.8, spielvorgabe: 43 },{ min: 33.9, max: 34.6, spielvorgabe: 44 },
        { min: 34.7, max: 35.5, spielvorgabe: 45 },{ min: 35.6, max: 36.0, spielvorgabe: 46 },
      ],
      "Rot (Damen)": [
        { min: 3.8, max: 4.6, spielvorgabe: 6 },   { min: 4.7, max: 5.5, spielvorgabe: 7 },
        { min: 5.6, max: 6.4, spielvorgabe: 8 },   { min: 6.5, max: 7.3, spielvorgabe: 9 },
        { min: 7.4, max: 8.2, spielvorgabe: 10 },  { min: 8.3, max: 9.2, spielvorgabe: 11 },
        { min: 9.3, max: 10.1, spielvorgabe: 12 }, { min: 10.2, max: 11.0, spielvorgabe: 13 },
        { min: 11.1, max: 11.9, spielvorgabe: 14 },{ min: 12.0, max: 12.8, spielvorgabe: 15 },
        { min: 12.9, max: 13.7, spielvorgabe: 16 },{ min: 13.8, max: 14.6, spielvorgabe: 17 },
        { min: 14.7, max: 15.5, spielvorgabe: 18 },{ min: 15.6, max: 16.4, spielvorgabe: 19 },
        { min: 16.5, max: 17.4, spielvorgabe: 20 },{ min: 17.5, max: 18.3, spielvorgabe: 21 },
        { min: 18.4, max: 19.2, spielvorgabe: 22 },{ min: 19.3, max: 20.1, spielvorgabe: 23 },
        { min: 20.2, max: 21.0, spielvorgabe: 24 },{ min: 21.1, max: 21.9, spielvorgabe: 25 },
        { min: 22.0, max: 22.8, spielvorgabe: 26 },{ min: 22.9, max: 23.7, spielvorgabe: 27 },
        { min: 23.8, max: 24.6, spielvorgabe: 28 },{ min: 24.7, max: 25.6, spielvorgabe: 29 },
        { min: 25.7, max: 26.5, spielvorgabe: 30 },{ min: 26.6, max: 27.4, spielvorgabe: 31 },
        { min: 27.5, max: 28.3, spielvorgabe: 32 },{ min: 28.4, max: 29.2, spielvorgabe: 33 },
        { min: 29.3, max: 30.1, spielvorgabe: 34 },{ min: 30.2, max: 31.0, spielvorgabe: 35 },
        { min: 31.1, max: 31.9, spielvorgabe: 36 },{ min: 32.0, max: 32.8, spielvorgabe: 37 },
        { min: 32.9, max: 33.8, spielvorgabe: 38 },{ min: 33.9, max: 34.7, spielvorgabe: 39 },
        { min: 34.8, max: 35.6, spielvorgabe: 40 },{ min: 35.7, max: 36.0, spielvorgabe: 41 },
      ],
    },
  },
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
  // ─── International ─────────────────────────────────────────────────────────
  {
    name: "Penati Golf Resort (Heritage)",
    region: "Slowakei",
    numHoles: 18,
    tees: {
      "Championship (Herren)": { cr: 73.7, slope: 140, par: 72 },
      "Gelb (Herren)":         { cr: 72.0, slope: 139, par: 72 },
      "Blau (Herren)":         { cr: 70.3, slope: 135, par: 72 },
      "Gelb (Damen)":          { cr: 73.8, slope: 137, par: 72 },
      "Rot (Damen)":           { cr: 70.0, slope: 123, par: 72 },
    },
    holes: [
      { par:4, si:11 }, { par:4, si:17 }, { par:5, si:5  }, { par:3, si:13 },
      { par:4, si:3  }, { par:4, si:9  }, { par:3, si:15 }, { par:4, si:1  },
      { par:5, si:7  }, { par:4, si:14 }, { par:5, si:4  }, { par:3, si:18 },
      { par:4, si:16 }, { par:3, si:10 }, { par:4, si:6  }, { par:4, si:8  },
      { par:5, si:2  }, { par:4, si:12 },
    ],
  },
  {
    name: "Penati Golf Resort (Legend)",
    region: "Slowakei",
    numHoles: 18,
    tees: {
      "Championship (Herren)": { cr: 76.4, slope: 154, par: 73 },
      "Gelb (Herren)":         { cr: 73.7, slope: 151, par: 73 },
      "Blau (Herren)":         { cr: 71.2, slope: 145, par: 73 },
      "Gelb (Damen)":          { cr: 74.7, slope: 142, par: 73 },
      "Blau (Damen)":          { cr: 71.6, slope: 134, par: 73 },
      "Rot (Junior)":          { cr: 69.5, slope: 129, par: 73 },
    },
    holes: [
      { par:4, si:8  }, { par:5, si:15 }, { par:3, si:13 }, { par:4, si:3  },
      { par:4, si:16 }, { par:5, si:10 }, { par:4, si:5  }, { par:3, si:4  },
      { par:4, si:11 }, { par:4, si:1  }, { par:5, si:17 }, { par:3, si:7  },
      { par:4, si:2  }, { par:4, si:14 }, { par:6, si:12 }, { par:3, si:18 },
      { par:4, si:9  }, { par:4, si:6  },
    ],
  },
  // ─── Zypern ────────────────────────────────────────────────────────────────
  {
    name: "Aphrodite Hills Golf Club (Cyprus)",
    region: "Zypern",
    numHoles: 18,
    tees: {
      "Black (Herren)":  { cr: 73.4, slope: 135, par: 71 },
      "White (Herren)":  { cr: 70.4, slope: 129, par: 71 },
      "Yellow (Herren)": { cr: 68.8, slope: 126, par: 71 },
      "Blue (Damen)":    { cr: 70.9, slope: 123, par: 71 },
      "Red (Damen)":     { cr: 68.8, slope: 121, par: 71 },
    },
    holes: [
      { par:4, si:10 }, { par:4, si:6  }, { par:5, si:14 }, { par:4, si:4  },
      { par:3, si:18 }, { par:5, si:8  }, { par:3, si:16 }, { par:4, si:2  },
      { par:4, si:12 }, { par:5, si:9  }, { par:4, si:1  }, { par:3, si:15 },
      { par:4, si:3  }, { par:4, si:13 }, { par:3, si:11 }, { par:4, si:5  },
      { par:3, si:17 }, { par:5, si:7  },
    ],
  },
  {
    name: "Secret Valley Golf Resort (Cyprus)",
    region: "Zypern",
    numHoles: 18,
    tees: {
      "Black (Herren)":  { cr: 70.6, slope: 138, par: 71 },
      "White (Herren)":  { cr: 68.9, slope: 134, par: 71 },
      "Yellow (Herren)": { cr: 67.1, slope: 126, par: 71 },
      "Yellow (Damen)":  { cr: 71.3, slope: 129, par: 71 },
      "Blue (Mixed)":    { cr: 69.8, slope: 126, par: 71 },
      "Red (Damen)":     { cr: 67.7, slope: 120, par: 71 },
    },
    holes: [
      { par:4, si:17 }, { par:5, si:5  }, { par:4, si:13 }, { par:3, si:9  },
      { par:4, si:3  }, { par:3, si:15 }, { par:4, si:11 }, { par:4, si:7  },
      { par:5, si:1  }, { par:3, si:14 }, { par:4, si:2  }, { par:4, si:8  },
      { par:5, si:6  }, { par:3, si:18 }, { par:4, si:12 }, { par:3, si:16 },
      { par:4, si:4  }, { par:5, si:10 },
    ],
  },
  {
    name: "Minthis Golf Club (Cyprus)",
    region: "Zypern",
    numHoles: 18,
    tees: {
      "Black (Herren)":  { cr: 72.1, slope: 134, par: 72 },
      "Yellow (Herren)": { cr: 69.8, slope: 130, par: 72 },
    },
    // Loch-Daten nicht online verfügbar — werden vor Ort aus der Scorekarte ergänzt
  },
  {
    name: "Eléa Golf Club (Cyprus)",
    region: "Zypern",
    numHoles: 18,
    tees: {
      "Black (Herren)":  { cr: 73.6, slope: 142, par: 71 },
      "White (Herren)":  { cr: 71.3, slope: 138, par: 71 },
      "Yellow (Herren)": { cr: 68.0, slope: 127, par: 71 },
      "Yellow (Damen)":  { cr: 74.0, slope: 134, par: 71 },
      "Red (Damen)":     { cr: 70.6, slope: 127, par: 71 },
    },
    // Loch-Daten nicht online verfügbar — werden vor Ort aus der Scorekarte ergänzt
  },
  // Limassol Greens noch ohne CR/Slope (eröffnet 2025, noch nicht offiziell bewertet).
  // Bei Interesse vor Ort nachfragen oder manuell in der App anlegen.
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

// Look up course handicap from an official ÖGV conversion table.
// Table format: [{ min, max, spielvorgabe }, ...] where min/max are decimal handicap ranges.
// Returns the spielvorgabe (integer) or null if HCP is outside the table range.
// Note: For normal HCP ranges (0-36), this usually matches the WHS formula exactly.
// The table is useful for edge cases (Plus-players, HCPs over 36 with Clubvorgaben, etc.)
function lookupCourseHcp(hcp, table) {
  if (!table || !Array.isArray(table) || table.length === 0) return null;
  if (typeof hcp !== "number" || isNaN(hcp)) return null;
  // Find row where hcp falls between min and max (inclusive, small tolerance for rounding)
  for (const row of table) {
    if (hcp >= row.min - 0.05 && hcp <= row.max + 0.05) {
      return row.spielvorgabe;
    }
  }
  return null; // outside table range — fall back to formula
}

// Preferred lookup chain:
// 1. Manual override (player-specific) — user knows best
// 2. Conversion table (if available for this tee)
// 3. WHS formula — mathematical baseline
// Returns { ph, source: "manual" | "table" | "formula" }
function calcCourseHcp(hcp, slope, cr, par, conversionTable) {
  const tableResult = lookupCourseHcp(hcp, conversionTable);
  if (tableResult !== null) return { ph: tableResult, source: "table" };
  return { ph: calcPH(hcp, slope, cr, par), source: "formula" };
}

const holeHS     = (ph, si, n) => Math.floor(Math.abs(ph)/n) + (si <= Math.abs(ph)%n ? 1 : 0);
const isStrich   = v => v === null;
const isValid    = v => typeof v === "number" && v > 0;
const sfNetto    = (g, hs, par) => isStrich(g) ? 0 : (isValid(g) ? Math.max(0, par - (g - hs) + 2) : null);
const sfBrutto   = (g, par)     => isStrich(g) ? 0 : (isValid(g) ? Math.max(0, par - g + 2) : null);

// Check whether a round is fully complete (all players, all holes have a score or strich).
// Returns { complete, holesPlayed, totalHoles, playersCount }.
// Also detects "not started" (zero scores across the board).
function getRoundProgress(round) {
  const players = round.players || [];
  const holes = round.holes || [];
  const scores = round.scores || {};
  const totalHoles = holes.length;
  if (players.length === 0 || totalHoles === 0) {
    return { complete: false, notStarted: true, holesPlayed: 0, totalHoles, playersCount: players.length };
  }
  let totalFilled = 0;
  let maxHolesForAnyPlayer = 0;
  players.forEach(p => {
    let n = 0;
    for (let i = 0; i < totalHoles; i++) {
      const v = scores[p.id]?.[i];
      if (isValid(v) || isStrich(v)) n++;
    }
    totalFilled += n;
    if (n > maxHolesForAnyPlayer) maxHolesForAnyPlayer = n;
  });
  const expected = players.length * totalHoles;
  const complete = totalFilled === expected;
  const notStarted = totalFilled === 0;
  return { complete, notStarted, holesPlayed: maxHolesForAnyPlayer, totalHoles, playersCount: players.length };
}

/**
 * Aggregate stats for a given club across all rounds.
 * Returns null if no rounds exist for that club.
 *
 * Output shape:
 * {
 *   roundsCount, rounds: [...],
 *   playerStats: [{ name, roundsPlayed, sfList, bestSF, avgSF, worstSF, birdies, pars, bogeys, doubles, strichCount, uschi: {total, par3Wins, bestCarry, burntCount}, perHole: [{...}] }],
 *   holeStats: [{ holeIdx, par, si, avgGross, avgVsPar, birdieCount, parCount, bogeyCount, doubleCount, strichCount, samplesSize, scores: [{playerName, gross, date, strich}] }],
 *   hallOfFame: { bestHole, worstHole, birdieKing, uschiMaster }
 * }
 *
 * Strike handling: strich (null value) counts as par+3 gross for stat purposes.
 * It's tracked separately so UI can display it distinctly.
 */
// ─── SwipeHandle: drag-down-to-close handle for bottom sheet modals ─────────
// Renders the visual grab handle AND attaches touch handlers that detect a
// downward swipe of >80px on the handle area, calling onClose when triggered.
//
// Usage:
//   <SwipeHandle onClose={() => setShowModal(false)} />
//
// Note: only the handle bar itself is the swipe target — the rest of the
// modal content is unaffected, so users can still scroll inside long modals.
function SwipeHandle({ onClose }) {
  const startY = useRef(null);
  const moved = useRef(0);
  const handleStart = (e) => {
    const t = e.touches ? e.touches[0] : e;
    startY.current = t.clientY;
    moved.current = 0;
  };
  const handleMove = (e) => {
    if (startY.current === null) return;
    const t = e.touches ? e.touches[0] : e;
    moved.current = t.clientY - startY.current;
  };
  const handleEnd = () => {
    if (moved.current > 80) onClose && onClose();
    startY.current = null;
    moved.current = 0;
  };
  return (
    <div
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      style={{
        padding: "8px 0 14px",
        margin: "-8px auto 4px",
        cursor: "grab",
        touchAction: "none",
      }}
    >
      <div style={{
        width: "40px", height: "4px",
        background: "#3a4a40", borderRadius: "2px", margin: "0 auto",
      }}/>
    </div>
  );
}

function aggregateClubStats(clubName, allRounds) {
  const rounds = allRounds.filter(r => r.cfg?.clubName === clubName);
  if (rounds.length === 0) return null;

  const latestRound = rounds[0];
  const holes = latestRound.holes || [];
  const totalHoles = holes.length;
  if (totalHoles === 0) return null;

  // Player stats — aggregated by name (IDs may differ across rounds)
  const playerMap = {};

  // Hole stats — global aggregate across all players
  const holeStats = holes.map((h, i) => ({
    holeIdx: i, par: h.par, si: h.si,
    grossList: [], // all gross scores incl. strikes-as-par+3
    realGrossList: [], // only non-strike scores
    birdieCount: 0, parCount: 0, bogeyCount: 0, doubleCount: 0, strichCount: 0,
    scores: [], // { playerName, gross, date, isStrich }
  }));

  rounds.forEach(r => {
    const rHoles = r.holes || [];
    const rPlayers = r.players || [];
    const rScores = r.scores || {};
    const roundDate = r.cfg?.date || r.savedAt;
    const rClub = r.selectedClubSnapshot || null;

    rPlayers.forEach(p => {
      if (!playerMap[p.name]) {
        playerMap[p.name] = {
          name: p.name,
          roundsPlayed: 0,
          sfList: [], // {score, date, clubName} per round
          birdies: 0, pars: 0, bogeys: 0, doubles: 0, strichCount: 0,
          uschi: { total: 0, par3Wins: 0, bestCarry: 0, burntCount: 0 },
          perHole: holes.map((h, i) => ({
            holeIdx: i, par: h.par, si: h.si,
            grossList: [], // strikes treated as par+3
            realGrossList: [], // only played scores
            birdieCount: 0, parCount: 0, bogeyCount: 0, doubleCount: 0, strichCount: 0,
            scores: [], // { gross, date, isStrich }
          })),
        };
      }
      const pm = playerMap[p.name];
      pm.roundsPlayed++;

      // Determine tee for PH calculation
      const teeName = p.teeName || r.cfg?.defaultTeeName;
      let tee = null;
      if (rClub?.tees && teeName && rClub.tees[teeName]) tee = rClub.tees[teeName];
      let ph = 0;
      if (tee) {
        const parForTee = tee.par || rHoles.reduce((s, h) => s + h.par, 0);
        ph = Math.round((p.hcp || 0) * (tee.slope / 113) + (tee.cr - parForTee));
      } else {
        ph = Math.round(p.hcp || 0);
      }

      let roundSF = 0;
      rHoles.forEach((h, i) => {
        const g = rScores[p.id]?.[i];
        const isStrich_ = g === null;
        const isValid_ = typeof g === "number" && g > 0;
        if (!isValid_ && !isStrich_) return;

        // Strokes this player gets on this hole based on Course HCP
        const strokesOnHole = Math.floor(Math.abs(ph) / rHoles.length) + (h.si <= Math.abs(ph) % rHoles.length ? 1 : 0);
        // Personal par = hole par + strokes the player gets
        const personalPar = h.par + strokesOnHole;

        // Effective gross for stats:
        // - Real score: the actual value
        // - Strich (picked up): personal par + 2 (minimum to lose all SF Netto points)
        //   This reflects the actual rule: a Stableford player picks up exactly when
        //   they can no longer score any Netto points — which is at personal par + 2.
        const effectiveGross = isStrich_ ? personalPar + 2 : g;

        // Birdie/par/bogey/double tallies (only from real scores, not strikes)
        if (isValid_) {
          const diff = g - h.par;
          if (diff <= -1) pm.birdies++;
          else if (diff === 0) pm.pars++;
          else if (diff === 1) pm.bogeys++;
          else if (diff >= 2) pm.doubles++;
        }
        if (isStrich_) pm.strichCount++;

        // Stableford netto (strike = 0 points)
        const netto = effectiveGross - strokesOnHole;
        const sf = isStrich_ ? 0 : Math.max(0, h.par - netto + 2);
        roundSF += sf;

        // Add to per-player hole stats
        if (i < pm.perHole.length && pm.perHole[i].par === h.par) {
          const ph_ = pm.perHole[i];
          ph_.grossList.push(effectiveGross);
          if (isValid_) ph_.realGrossList.push(g);
          if (isStrich_) ph_.strichCount++;
          else if (g - h.par <= -1) ph_.birdieCount++;
          else if (g - h.par === 0) ph_.parCount++;
          else if (g - h.par === 1) ph_.bogeyCount++;
          else ph_.doubleCount++;
          ph_.scores.push({ gross: g, date: roundDate, isStrich: isStrich_ });
        }

        // Add to global hole stats
        if (i < holeStats.length && holeStats[i].par === h.par) {
          const hs = holeStats[i];
          hs.grossList.push(effectiveGross);
          if (isValid_) hs.realGrossList.push(g);
          if (isStrich_) hs.strichCount++;
          else if (g - h.par <= -1) hs.birdieCount++;
          else if (g - h.par === 0) hs.parCount++;
          else if (g - h.par === 1) hs.bogeyCount++;
          else hs.doubleCount++;
          hs.scores.push({ playerName: p.name, gross: g, date: roundDate, isStrich: isStrich_ });
        }
      });

      pm.sfList.push({ score: roundSF, date: roundDate });

      // Uschi data (if available)
      if ((r.gameMode === "uschi-single" || r.gameMode === "uschi-team") && r.uschiResult?.totals?.[p.id]) {
        const ut = r.uschiResult.totals[p.id];
        pm.uschi.total += ut.total || 0;
        pm.uschi.par3Wins += ut.uschi || 0;
      }
      // Scan par-3 data for best carry / burnt events for this player
      const par3Data = r.par3Data || {};
      Object.entries(par3Data).forEach(([holeIdxStr, data]) => {
        if (!data?.closest) return;
        const hi = parseInt(holeIdxStr, 10);
        const h = rHoles[hi];
        if (!h || h.par !== 3) return;
        const cScore = rScores[data.closest]?.[hi];
        const isValid_ = typeof cScore === "number" && cScore > 0;
        // Track carry/burnt for this player (approximation: we don't have exact carry count here)
        if (data.closest === p.id && data.greenHits?.includes(p.id)) {
          if (isValid_ && cScore <= h.par) {
            // Win — carry unknown precisely, at least 1
          } else if (isValid_) {
            pm.uschi.burntCount++;
          }
        }
      });
    });
  });

  // Finalize player stats
  const playerStats = Object.values(playerMap).map(pm => {
    const sfScores = pm.sfList.map(x => x.score);
    return {
      name: pm.name,
      roundsPlayed: pm.roundsPlayed,
      sfList: pm.sfList, // for sparkline
      bestSF: sfScores.length ? Math.max(...sfScores) : 0,
      avgSF: sfScores.length ? Math.round(sfScores.reduce((s, v) => s + v, 0) / sfScores.length) : 0,
      worstSF: sfScores.length ? Math.min(...sfScores) : 0,
      birdies: pm.birdies,
      pars: pm.pars,
      bogeys: pm.bogeys,
      doubles: pm.doubles,
      strichCount: pm.strichCount,
      uschi: pm.uschi,
      perHole: pm.perHole.map(ph => ({
        ...ph,
        avgGross: ph.grossList.length ? ph.grossList.reduce((s, v) => s + v, 0) / ph.grossList.length : 0,
        avgVsPar: ph.grossList.length ? (ph.grossList.reduce((s, v) => s + v, 0) / ph.grossList.length) - ph.par : 0,
        samplesSize: ph.grossList.length,
      })),
    };
  }).sort((a, b) => b.avgSF - a.avgSF);

  // Finalize hole stats (global)
  const holeStatsOut = holeStats.map(hs => ({
    holeIdx: hs.holeIdx,
    par: hs.par, si: hs.si,
    avgGross: hs.grossList.length ? (hs.grossList.reduce((s, v) => s + v, 0) / hs.grossList.length) : 0,
    avgVsPar: hs.grossList.length ? ((hs.grossList.reduce((s, v) => s + v, 0) / hs.grossList.length) - hs.par) : 0,
    birdieCount: hs.birdieCount,
    parCount: hs.parCount,
    bogeyCount: hs.bogeyCount,
    doubleCount: hs.doubleCount,
    strichCount: hs.strichCount,
    samplesSize: hs.grossList.length,
    scores: hs.scores,
  }));

  // Hall of Fame (team-level)
  const playedHoles = holeStatsOut.filter(h => h.samplesSize > 0);
  const bestHole = playedHoles.length ? playedHoles.reduce((min, h) => h.avgVsPar < min.avgVsPar ? h : min, playedHoles[0]) : null;
  const worstHole = playedHoles.length ? playedHoles.reduce((max, h) => h.avgVsPar > max.avgVsPar ? h : max, playedHoles[0]) : null;
  const birdieKing = playerStats.length ? playerStats.reduce((max, p) => p.birdies > max.birdies ? p : max, playerStats[0]) : null;
  const uschiMaster = playerStats.length ? playerStats.reduce((max, p) => p.uschi.total > max.uschi.total ? p : max, playerStats[0]) : null;

  return {
    roundsCount: rounds.length,
    rounds,
    playerStats,
    holeStats: holeStatsOut,
    hallOfFame: {
      bestHole: bestHole ? { idx: bestHole.holeIdx, avg: bestHole.avgVsPar } : null,
      worstHole: worstHole ? { idx: worstHole.holeIdx, avg: worstHole.avgVsPar } : null,
      birdieKing: birdieKing && birdieKing.birdies > 0 ? { name: birdieKing.name, count: birdieKing.birdies } : null,
      uschiMaster: uschiMaster && uschiMaster.uschi.total > 0 ? { name: uschiMaster.name, points: uschiMaster.uschi.total } : null,
    },
  };
}



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

// ─── Round Analysis: stats for a single round ───────────────────────────────
/**
 * Analyzes a completed or ongoing round and returns insights for the "Round Analysis" view.
 * Returns null if no players or no data.
 *
 * Output shape:
 * {
 *   completeness: { played, total, percent },
 *   hallOfFame: {
 *     bestNettoScore: { playerName, score, holeIdx }, // best single-hole netto
 *     bestSFRound: { playerName, sf },
 *     birdieStreak: { playerName, length, startHole, endHole } | null,
 *     biggestUschi: { playerName, carry, holeIdx } | null,
 *     worstGroupHole: { idx, groupAvgVsPar, strichCount },
 *     comebackKing: { playerName, f9, b9, delta } | null,
 *   },
 *   f9b9: [{ playerName, f9, b9, delta }],
 *   hardestHoles: [{ idx, par, avgVsPar, strichCount }],
 *   easiestHoles: [{ idx, par, avgVsPar }],
 *   playerHighlights: [{ playerName, lines: [string] }],
 *   uschiTrend: { labels, series: [{ name, points: [number] }] } | null,
 * }
 */
function analyzeRound(round) {
  if (!round || !round.players || !round.holes) return null;
  const players = round.players;
  const holes = round.holes;
  const scores = round.scores || {};
  const par3Data = round.par3Data || {};
  const gameMode = round.gameMode || "stableford";
  const isUschi = gameMode === "uschi-single" || gameMode === "uschi-team";

  if (players.length === 0 || holes.length === 0) return null;

  // Compute player setup data we'll reuse
  const playerMeta = players.map(p => {
    const tee = playerTee(p, round.cfg, round.selectedClubSnapshot);
    const { ph } = resolvePlayerPH(p, round.cfg, round.selectedClubSnapshot, holes.reduce((s, h) => s + h.par, 0));
    return { player: p, tee, ph };
  });

  // Helper: strokes this player gets on hole i
  const strokesOn = (pm, hIdx) => {
    const numHoles = holes.length;
    const h = holes[hIdx];
    return Math.floor(Math.abs(pm.ph) / numHoles) + (h.si <= Math.abs(pm.ph) % numHoles ? 1 : 0);
  };

  // Completeness
  let played = 0, total = players.length * holes.length;
  players.forEach(p => {
    for (let i = 0; i < holes.length; i++) {
      const v = scores[p.id]?.[i];
      if ((typeof v === "number" && v > 0) || v === null) played++;
    }
  });

  // Per-hole per-player data
  const perPlayerHoleData = {}; // { pid: [{ gross, netto, sf, isStrich, diffVsPar }] }
  players.forEach(p => {
    const pm = playerMeta.find(x => x.player.id === p.id);
    perPlayerHoleData[p.id] = holes.map((h, i) => {
      const g = scores[p.id]?.[i];
      const isStrich = g === null;
      const isValid = typeof g === "number" && g > 0;
      if (!isValid && !isStrich) return null;
      const strokes = strokesOn(pm, i);
      const personalPar = h.par + strokes;
      const effectiveGross = isStrich ? personalPar + 2 : g;
      const netto = effectiveGross - strokes;
      const sf = isStrich ? 0 : Math.max(0, h.par - netto + 2);
      return {
        gross: g, effectiveGross, netto, sf, strokes,
        isStrich, diffVsPar: isStrich ? null : (g - h.par),
        holeIdx: i, par: h.par,
      };
    });
  });

  // Best single-hole netto (lowest netto across all players/holes)
  let bestNettoScore = null;
  players.forEach(p => {
    perPlayerHoleData[p.id].forEach((d, i) => {
      if (!d || d.isStrich) return;
      if (!bestNettoScore || d.netto < bestNettoScore.netto) {
        bestNettoScore = { playerName: p.name, score: d.gross, netto: d.netto, holeIdx: i, diffVsPar: d.diffVsPar };
      }
    });
  });

  // SF Round totals
  const sfRound = {};
  players.forEach(p => {
    sfRound[p.id] = perPlayerHoleData[p.id].reduce((s, d) => s + (d?.sf || 0), 0);
  });
  let bestSFRound = null;
  players.forEach(p => {
    if (!bestSFRound || sfRound[p.id] > bestSFRound.sf) {
      bestSFRound = { playerName: p.name, sf: sfRound[p.id] };
    }
  });

  // Birdie streak: longest streak of par-or-better per player (netto, since mixed HCs)
  let birdieStreak = null;
  players.forEach(p => {
    let currentStreakLen = 0, currentStart = -1;
    let maxLen = 0, maxStart = -1, maxEnd = -1;
    perPlayerHoleData[p.id].forEach((d, i) => {
      if (d && !d.isStrich && d.sf >= 2) {
        // sf >= 2 means netto par or better
        if (currentStreakLen === 0) currentStart = i;
        currentStreakLen++;
        if (currentStreakLen > maxLen) {
          maxLen = currentStreakLen;
          maxStart = currentStart;
          maxEnd = i;
        }
      } else {
        currentStreakLen = 0;
      }
    });
    if (maxLen >= 2 && (!birdieStreak || maxLen > birdieStreak.length)) {
      birdieStreak = { playerName: p.name, length: maxLen, startHole: maxStart, endHole: maxEnd };
    }
  });

  // F9/B9 split (only if 18-hole round)
  let f9b9 = null;
  if (holes.length === 18) {
    f9b9 = players.map(p => {
      const data = perPlayerHoleData[p.id];
      const f9 = data.slice(0, 9).reduce((s, d) => s + (d?.sf || 0), 0);
      const b9 = data.slice(9).reduce((s, d) => s + (d?.sf || 0), 0);
      const f9Valid = data.slice(0, 9).some(d => d !== null);
      const b9Valid = data.slice(9).some(d => d !== null);
      return { playerName: p.name, f9, b9, delta: b9 - f9, f9Valid, b9Valid };
    });
  }

  // Comeback king: biggest improvement F9→B9
  let comebackKing = null;
  if (f9b9) {
    f9b9.forEach(x => {
      if (x.f9Valid && x.b9Valid && x.delta > 2 && (!comebackKing || x.delta > comebackKing.delta)) {
        comebackKing = { playerName: x.playerName, f9: x.f9, b9: x.b9, delta: x.delta };
      }
    });
  }

  // Hole difficulty ranking (group-wide)
  const holeDifficulty = holes.map((h, i) => {
    const diffs = [];
    let strichCount = 0;
    players.forEach(p => {
      const d = perPlayerHoleData[p.id][i];
      if (!d) return;
      if (d.isStrich) {
        strichCount++;
        // Use personal par+2 as "effective" diff vs par for group ranking
        diffs.push((d.effectiveGross - h.par));
      } else {
        diffs.push(d.diffVsPar);
      }
    });
    const avgVsPar = diffs.length ? diffs.reduce((s, v) => s + v, 0) / diffs.length : 0;
    return { idx: i, par: h.par, si: h.si, avgVsPar, strichCount, playedCount: diffs.length };
  }).filter(h => h.playedCount > 0);

  const hardest = [...holeDifficulty].sort((a, b) => b.avgVsPar - a.avgVsPar).slice(0, 3);
  const easiest = [...holeDifficulty].sort((a, b) => a.avgVsPar - b.avgVsPar).slice(0, 3);
  const worstGroupHole = hardest[0] || null;

  // Biggest Uschi moment: highest carry (par3Data with closest that won)
  let biggestUschi = null;
  if (isUschi) {
    // Walk through par-3 holes in order, tracking carry
    let carry = 1;
    for (let i = 0; i < holes.length; i++) {
      if (holes[i].par !== 3) continue;
      const data = par3Data[i];
      if (!data) continue;
      const greenHits = data.greenHits || [];
      const closest = data.closest;
      if (greenHits.length === 0) {
        carry += 1;
      } else if (closest && greenHits.includes(closest)) {
        const cGross = scores[closest]?.[i];
        if (typeof cGross === "number" && cGross > 0 && cGross <= holes[i].par) {
          // Won
          const winnerName = players.find(pl => pl.id === closest)?.name || "?";
          if (!biggestUschi || carry > biggestUschi.carry) {
            biggestUschi = { playerName: winnerName, carry, holeIdx: i };
          }
          carry = 1;
        } else {
          carry = 1;
        }
      }
    }
  }

  // Player highlights: 1-3 lines per player
  const playerHighlights = players.map(p => {
    const data = perPlayerHoleData[p.id];
    const lines = [];
    const birdies = data.filter(d => d && !d.isStrich && d.diffVsPar <= -1);
    const strikes = data.filter(d => d && d.isStrich);
    const realScores = data.filter(d => d && !d.isStrich);
    // Best hole (lowest diff vs par for a real score)
    let bestHole = null;
    realScores.forEach(d => {
      if (!bestHole || d.diffVsPar < bestHole.diffVsPar) bestHole = d;
    });
    // Worst hole (highest diff vs par for a real score)
    let worstHole = null;
    realScores.forEach(d => {
      if (!worstHole || d.diffVsPar > worstHole.diffVsPar) worstHole = d;
    });

    if (birdies.length > 0) {
      const holeList = birdies.map(b => b.holeIdx + 1).join(", ");
      const label = birdies.length === 1 ? "Birdie" : `${birdies.length} Birdies`;
      lines.push(`🎯 ${label} auf Loch ${holeList}`);
    }
    if (strikes.length > 0) {
      const holeList = strikes.map(s => s.holeIdx + 1).join(", ");
      lines.push(`✗ Aufgeben auf Loch ${holeList}`);
    }
    if (bestHole && bestHole.diffVsPar >= 0) {
      // Only mention "bestes Loch" if no birdies were played (otherwise redundant)
      if (birdies.length === 0) {
        lines.push(`🏆 Bestes Loch: ${bestHole.holeIdx + 1} (${bestHole.diffVsPar === 0 ? "Par" : "+" + bestHole.diffVsPar})`);
      }
    }
    if (worstHole && worstHole.diffVsPar >= 2 && strikes.length === 0) {
      lines.push(`💀 Schlimmstes: Loch ${worstHole.holeIdx + 1} (+${worstHole.diffVsPar})`);
    }
    return { playerName: p.name, lines };
  });

  // Uschi trend: cumulative points per player per hole
  let uschiTrend = null;
  if (isUschi && round.uschiResult?.perHole) {
    const perHole = round.uschiResult.perHole;
    const labels = holes.map((_, i) => i + 1);
    const series = players.map(p => {
      const points = [];
      let cum = 0;
      for (let i = 0; i < holes.length; i++) {
        const ph = perHole.find(x => x.holeIdx === i);
        if (ph && ph.holePoints && ph.holePoints[p.id] !== undefined) {
          cum += ph.holePoints[p.id];
        }
        points.push(cum);
      }
      return { name: p.name, points };
    });
    uschiTrend = { labels, series };
  }

  return {
    completeness: { played, total, percent: Math.round((played / total) * 100) },
    hallOfFame: {
      bestNettoScore,
      bestSFRound,
      birdieStreak,
      biggestUschi,
      worstGroupHole,
      comebackKing,
    },
    f9b9,
    hardestHoles: hardest,
    easiestHoles: easiest,
    playerHighlights,
    uschiTrend,
  };
}

// ─── Uschi Live Standing: current state + what's achievable ─────────────────
/**
 * For an in-progress round, calculates each player's current standing +
 * what they could theoretically still achieve (max) and lose (min).
 *
 * For Uschi:
 *  - Per remaining hole: max gain = +1 (best) + +1 (birdie) = +2
 *    For Par-3 holes not yet played, the current carry adds on top
 *  - Per remaining hole: min gain = -1 (worst)
 *
 * For Stableford/Uschi other metrics we keep it simple.
 *
 * Returns:
 * {
 *   players: [{ name, current, max, min, securedRank: 1|null }],
 *   remaining: { holes, par3WithoutData, currentCarry },
 *   decided: boolean,  // true if all ranks are mathematically locked
 *   leader: { name, current } | null,
 * }
 */
function computeUschiLiveStanding(round) {
  if (!round || !round.players || !round.holes) return null;
  const gameMode = round.gameMode || "stableford";
  const isUschi = gameMode === "uschi-single" || gameMode === "uschi-team";
  if (!isUschi) return null;
  if (!round.uschiResult?.totals) return null;

  const players = round.players;
  const holes = round.holes;
  const scores = round.scores || {};
  const par3Data = round.par3Data || {};

  // Which holes are "completed" (all players entered score or strich)?
  const remainingHoleIdxs = [];
  for (let i = 0; i < holes.length; i++) {
    const allHave = players.every(p => {
      const v = scores[p.id]?.[i];
      return (typeof v === "number" && v > 0) || v === null;
    });
    if (!allHave) remainingHoleIdxs.push(i);
  }

  // Count remaining par-3 holes (for potential carry wins)
  const remainingPar3s = remainingHoleIdxs.filter(i => holes[i].par === 3);

  // Current carry estimate: walk through completed par-3 in order, same rule as computeUschi
  let currentCarry = 1;
  for (let i = 0; i < holes.length; i++) {
    if (holes[i].par !== 3) continue;
    if (remainingHoleIdxs.includes(i)) break; // stop at first unplayed
    const data = par3Data[i];
    if (!data) continue;
    const greenHits = data.greenHits || [];
    const closest = data.closest;
    if (greenHits.length === 0) {
      currentCarry += 1;
    } else if (closest && greenHits.includes(closest)) {
      const cGross = scores[closest]?.[i];
      if (typeof cGross === "number" && cGross > 0 && cGross <= holes[i].par) {
        currentCarry = 1;
      } else {
        currentCarry = 1;
      }
    }
  }

  // Per-player current/max/min
  const playerStandings = players.map(p => {
    const current = round.uschiResult.totals[p.id]?.total || 0;

    // Max gain per remaining hole: +2 (best netto + birdie)
    // Plus: theoretical carry on one of remaining par-3s, if any
    let maxGain = remainingHoleIdxs.length * 2;
    if (remainingPar3s.length > 0) {
      // Assume the player could win ONE par-3 uschi — the remaining carries would accumulate
      // Conservative: at least the current carry could be won on any remaining par-3
      maxGain += currentCarry;
      // Plus any future carry increases (if no-green on each remaining par-3)
      maxGain += remainingPar3s.length - 1; // each missed adds 1 carry, so last player gets extra
    }

    // Min: -1 per remaining hole (worst netto, assumed always)
    const minGain = -remainingHoleIdxs.length;

    return {
      id: p.id,
      name: p.name,
      current,
      max: current + maxGain,
      min: current + minGain,
    };
  });

  // Check if rank is secured: for each pair, player A is ahead if A.min >= B.max
  // A player is "secured rank 1" if their min >= every other player's max
  const sortedByCurrent = [...playerStandings].sort((a, b) => b.current - a.current);
  const leader = sortedByCurrent[0] || null;

  // Determine if the overall leader is mathematically secure
  let decided = false;
  if (leader && sortedByCurrent.length >= 2) {
    const othersMaxes = sortedByCurrent.slice(1).map(p => p.max);
    const maxOfOthers = Math.max(...othersMaxes);
    if (leader.min > maxOfOthers) decided = true;
  }

  return {
    players: sortedByCurrent,
    remaining: {
      holes: remainingHoleIdxs.length,
      par3Count: remainingPar3s.length,
      currentCarry,
    },
    decided,
    leader: leader ? { name: leader.name, current: leader.current } : null,
  };
}

// Resolve a player's tee data (supports old format with cfg.cr/cfg.slope fallback).
// If the club has a `conversionTables` block for the tee, it is attached.
function playerTee(player, cfg, club) {
  // Find the tee name we're working with
  const teeName = player.teeName || cfg.defaultTeeName || null;
  const conversionTable = (club?.conversionTables && teeName) ? club.conversionTables[teeName] : null;

  if (typeof player.cr === "number" && typeof player.slope === "number") {
    return { cr: player.cr, slope: player.slope, par: player.par, teeName: player.teeName, conversionTable };
  }
  if (club && player.teeName && club.tees?.[player.teeName]) {
    const t = club.tees[player.teeName];
    return { cr: t.cr, slope: t.slope, par: t.par, teeName: player.teeName, conversionTable };
  }
  if (club && cfg.defaultTeeName && club.tees?.[cfg.defaultTeeName]) {
    const t = club.tees[cfg.defaultTeeName];
    return { cr: t.cr, slope: t.slope, par: t.par, teeName: cfg.defaultTeeName, conversionTable };
  }
  // Legacy fallback: cfg.cr/cfg.slope from old rounds
  if (typeof cfg.cr === "number") {
    return { cr: cfg.cr, slope: cfg.slope, par: cfg.par || sumPar, teeName: cfg.teeName || "Standard", conversionTable: null };
  }
  return null;
}

// Resolve a player's effective course handicap, honoring manual override first,
// then the club's conversion table, then WHS formula as a fallback.
// Returns { ph, source: "manual" | "table" | "formula" }
function resolvePlayerPH(player, cfg, club, par) {
  // Manual override takes precedence
  if (typeof player.phOverride === "number") {
    return { ph: player.phOverride, source: "manual" };
  }
  const tee = playerTee(player, cfg, club);
  if (!tee) return { ph: 0, source: "formula" };
  return calcCourseHcp(player.hcp, tee.slope, tee.cr, tee.par || par, tee.conversionTable);
}

// Convert "Birdiebook"-style JSON (with nested club/scorecard/ratings) to app format.
// If the input doesn't look like Birdiebook format, returns it unchanged.
//
// Birdiebook format example:
// {
//   "club": {
//     "name": "...",
//     "adresse": { "ort": "Wien" },
//     "ratings": [{ "tee": "weiß", "cr": 71.2, "slope": 121 }],
//     "scorecard": {
//       "loecher": [{ "loch": 1, "par": 4, "hcp": 3, "h_st": 340 }]
//     }
//   }
// }
//
// Tee-name normalization: weiß/weiss → weiss, gelb → gelb, etc.
// SI mapping: input field is "hcp" (which is German for SI/Stroke-Index)
// Length mapping: prefers h_st (Herren Standard) > h_ch (Herren Championship) > d_ch (Damen)
function normalizeBirdiebookFormat(input) {
  // Detect Birdiebook format: nested club + scorecard.loecher
  if (!input || typeof input !== "object") return input;
  if (input.name && input.holes && input.tees) return input; // Already app format

  const club = input.club || input;
  if (!club.name || !club.scorecard?.loecher || !club.ratings) return input; // Not Birdiebook format

  // Tee name normalizer: lowercase, ß→ss, strip diacritics
  const normalizeTeeName = (name) => {
    return String(name).toLowerCase()
      .replace(/ß/g, "ss")
      .replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u")
      .trim();
  };

  // Build tees object: { teeName: { cr, slope, par, length } }
  const totalPar = club.scorecard.summen?.total?.par
    || club.scorecard.loecher.reduce((s, h) => s + (h.par || 0), 0);

  const tees = {};
  club.ratings.forEach(r => {
    const teeName = normalizeTeeName(r.tee);
    // Length: try multiple field names depending on tee
    // Heuristic: tee names containing women hint (rot/red/damen) → use d_ch
    // Otherwise use h_st (men's standard)
    const isWomenTee = /rot|red|damen|women|ladies/.test(teeName);
    const lengthField = isWomenTee ? "d_ch" : "h_st";
    const totalLength = club.scorecard.summen?.total?.[lengthField]
      || club.scorecard.loecher.reduce((s, h) => s + (h[lengthField] || 0), 0);

    tees[teeName] = {
      cr: r.cr,
      slope: r.slope,
      par: totalPar,
      length: totalLength,
    };
  });

  // Build holes array
  const holes = club.scorecard.loecher.map(l => ({
    par: l.par,
    si: l.hcp, // German "hcp" = Stroke Index in Austrian notation
  }));

  // Determine region from address.ort if available
  const region = club.adresse?.ort || club.region || "Österreich";

  // Output app format with bonus fields preserved
  return {
    name: club.name,
    region,
    numHoles: holes.length,
    tees,
    holes,
    // Optional bonus data: preserved for future display in detail view
    _meta: {
      adresse: club.adresse,
      kontakt: club.kontakt,
      greenfee: club.greenfee,
      pinPositionen: club.pin_positionen,
    },
  };
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
// USCHI MODE CALCULATIONS
// (Low-Ball, Best-Ball, Birdie, Uschi)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Compute stroke-adjusted handicaps for Uschi mode.
 * Best (lowest CH) player = baseline (0 strokes).
 * Others: round((diff) × 0.8). For 9-hole: ceil × 9/18.
 * Strokes are distributed on the hardest SI holes.
 * Returns [{ playerId, ch, strokes, perHole: [0|1|2...] }, ...]
 */
function uschiAdjustedStrokes(players, cfg, club, holes) {
  const numHoles = holes.length;
  const is9 = numHoles === 9;
  const par = sumPar(holes);

  // Compute Kurs-HC for each player, respecting manual override
  const withCH = players.map(p => {
    const tee = playerTee(p, cfg, club);
    if (!tee) return { playerId: p.id, ch: p.hcp || 0 };
    const { ph } = resolvePlayerPH(p, cfg, club, par);
    return { playerId: p.id, ch: ph };
  });
  if (withCH.length === 0) return [];

  const minCH = Math.min(...withCH.map(c => c.ch));

  // Pre-compute hole order by SI (hardest first)
  const sortedByHardness = holes.map((h, i) => ({ i, si: h.si })).sort((a, b) => a.si - b.si);

  return withCH.map(({ playerId, ch }) => {
    const diff = ch - minCH;
    const strokes18 = Math.max(0, Math.round(diff * 0.8));
    const strokes = is9 ? Math.ceil(strokes18 * 9 / 18) : strokes18;

    // Distribute strokes across holes (repeating for >numHoles edge case, though unlikely)
    const perHole = new Array(numHoles).fill(0);
    let remaining = strokes;
    let safety = 3;
    while (remaining > 0 && safety > 0) {
      for (const { i } of sortedByHardness) {
        if (remaining === 0) break;
        perHole[i]++;
        remaining--;
      }
      safety--;
    }
    return { playerId, ch, diff, strokes, perHole };
  });
}

/**
 * Compute per-hole Uschi points and totals for all players.
 *
 * Per hole:
 *   - Netto = gross - playerStrokesOnThisHole
 *   - Best netto → +1 (all ties get +1)
 *   - Worst netto → -1 (all ties get -1)
 *   - Middle → 0
 *   - If all nettos tied → nobody gets points
 * Birdie/Eagle bonus:
 *   - gross <= par - 1 → +1 (birdie or better, per-player)
 * Uschi (Par 3 only):
 *   - If data.closest hit green and made par (gross <= 3) → +carry
 *   - If closest hit green but didn't par → burnt (no winner, carry resets to 1)
 *   - If nobody hit green → carry += 1 (doubles/triples next par 3)
 *   - If par-3 data not yet entered → no points yet (treated same as carry=1 next time)
 *
 * par3Data: { [holeIdx]: { greenHits: [pid, ...], closest: pid } }
 *
 * Returns:
 *   {
 *     perHole: [{ holeIdx, holePoints: {pid: n}, uschi: {winner|burnt|carryTo, points, multiplier}, netto: {pid: n|null} }, ...],
 *     totals: { [pid]: { total, best, worst, birdies, uschi } },
 *     carry: finalCarry,
 *     openUschi: [holeIdx, ...],  // par-3 holes still missing data
 *   }
 */
function computeUschiPoints(players, holes, scores, adjStrokes, par3Data) {
  const strokesByPid = {};
  adjStrokes.forEach(a => { strokesByPid[a.playerId] = a.perHole; });

  const totals = {};
  players.forEach(p => {
    totals[p.id] = { total: 0, best: 0, worst: 0, birdies: 0, uschi: 0 };
  });

  const perHole = [];
  let carry = 1;
  const openUschi = [];

  for (let i = 0; i < holes.length; i++) {
    const hole = holes[i];
    const holePoints = {};
    const holeBreakdown = {}; // { [pid]: { best: bool, worst: bool, birdie: bool, uschi: number } }
    players.forEach(p => {
      holePoints[p.id] = 0;
      holeBreakdown[p.id] = { best: false, worst: false, birdie: false, uschi: 0 };
    });

    // Compute netto for each player who played this hole
    const netto = {};
    const nettos = [];
    players.forEach(p => {
      const gross = scores[p.id]?.[i];
      if (isValid(gross)) {
        const s = strokesByPid[p.id]?.[i] || 0;
        const n = gross - s;
        netto[p.id] = n;
        nettos.push({ pid: p.id, netto: n });
      } else {
        netto[p.id] = null;
      }
    });

    // Best/worst points (only if ≥2 valid nettos AND not all same)
    if (nettos.length >= 2) {
      const best = Math.min(...nettos.map(n => n.netto));
      const worst = Math.max(...nettos.map(n => n.netto));
      if (best !== worst) {
        nettos.forEach(n => {
          if (n.netto === best)  { holePoints[n.pid] += 1; totals[n.pid].best += 1;  holeBreakdown[n.pid].best = true; }
          if (n.netto === worst) { holePoints[n.pid] -= 1; totals[n.pid].worst -= 1; holeBreakdown[n.pid].worst = true; }
        });
      }
    }

    // Birdie bonus (per player)
    players.forEach(p => {
      const gross = scores[p.id]?.[i];
      if (isValid(gross) && gross <= hole.par - 1) {
        holePoints[p.id] += 1;
        totals[p.id].birdies += 1;
        holeBreakdown[p.id].birdie = true;
      }
    });

    // Uschi (Par 3 only)
    let uschiInfo = null;
    if (hole.par === 3) {
      const data = par3Data?.[i];
      const allPar3Scored = players.every(p => {
        const g = scores[p.id]?.[i];
        return isValid(g) || isStrich(g);
      });

      if (!data) {
        if (allPar3Scored) openUschi.push(i);
        uschiInfo = { pending: true, multiplier: carry };
        // Don't change carry yet — wait for data
      } else {
        const greenHits = data.greenHits || [];
        const closest = data.closest;

        if (greenHits.length === 0) {
          // Nobody hit green → carry over
          uschiInfo = { type: "carry", multiplier: carry, newMultiplier: carry + 1 };
          carry += 1;
        } else if (closest && greenHits.includes(closest)) {
          const closestGross = scores[closest]?.[i];
          if (isValid(closestGross) && closestGross <= hole.par) {
            // WON! Closest hit green AND made par (or better)
            holePoints[closest] += carry;
            totals[closest].uschi += carry;
            holeBreakdown[closest].uschi = carry;
            uschiInfo = { type: "won", winner: closest, points: carry, multiplier: carry };
            carry = 1;
          } else {
            // Burnt — closest hit green but didn't make par
            uschiInfo = { type: "burnt", burnBy: closest, multiplier: carry };
            carry = 1;
          }
        } else {
          // Data incomplete — green hit recorded but no closest selected yet
          if (allPar3Scored) openUschi.push(i);
          uschiInfo = { pending: true, multiplier: carry };
        }
      }
    }

    perHole.push({ holeIdx: i, holePoints, holeBreakdown, uschi: uschiInfo, netto });

    // Add hole points to totals
    players.forEach(p => { totals[p.id].total += holePoints[p.id]; });
  }

  return { perHole, totals, carry, openUschi };
}

/**
 * Aggregate Uschi points by team (2v2).
 * teams: { A: [pid, pid], B: [pid, pid] }
 */
function computeTeamUschiPoints(uschiResult, teams) {
  const teamTotals = { A: 0, B: 0 };
  const teamPerHole = [];
  const teamOf = {};
  (teams.A || []).forEach(p => { teamOf[p] = "A"; });
  (teams.B || []).forEach(p => { teamOf[p] = "B"; });

  uschiResult.perHole.forEach(h => {
    const holeA = (teams.A || []).reduce((s, p) => s + (h.holePoints[p] || 0), 0);
    const holeB = (teams.B || []).reduce((s, p) => s + (h.holePoints[p] || 0), 0);
    teamTotals.A += holeA;
    teamTotals.B += holeB;
    teamPerHole.push({ holeIdx: h.holeIdx, A: holeA, B: holeB });
  });

  return { teamTotals, teamPerHole };
}

/**
 * Auto-assign teams: best + worst CH vs the two middle players.
 * Input: adjStrokes sorted by CH ascending.
 */
function autoAssignTeams(adjStrokes) {
  if (adjStrokes.length !== 4) return { A: [], B: [] };
  // adjStrokes already ordered by computation — but sort by ch ascending to be safe
  const sorted = [...adjStrokes].sort((a, b) => a.ch - b.ch);
  return {
    A: [sorted[0].playerId, sorted[3].playerId], // best + worst
    B: [sorted[1].playerId, sorted[2].playerId], // middle two
  };
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
  @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.85); } }
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
  const [statsClubName, setStatsClubName] = useState(null); // null = not yet chosen
  const [statsFocusPlayer, setStatsFocusPlayer] = useState(null); // null = "all players" (team view); name string = focused player
  const [statsPlayerDetail, setStatsPlayerDetail] = useState(null); // player name for drill-down modal
  const [statsHoleDetail, setStatsHoleDetail] = useState(null); // hole index for drill-down modal
  const [statsImportedRounds, setStatsImportedRounds] = useState([]); // rounds from other sync codes, merged into stats
  const [showStatsImport, setShowStatsImport] = useState(false);
  const [statsImportInput, setStatsImportInput] = useState("");
  const [statsImportLoading, setStatsImportLoading] = useState(false);
  // Round analysis modal — holds the round ID being analyzed (null = closed)
  const [roundAnalysisId, setRoundAnalysisId] = useState(null);
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
  const [showWelcome, setShowWelcome] = useState(false);
  // Sync conflict modal: shown when cloud data significantly differs from local
  const [syncConflict, setSyncConflict] = useState(null);
  // Shape: { localRounds, cloudData, cloudUpdatedAt, type: "fewer-rounds" | "fresh-pull" }
  const [welcomeSlide, setWelcomeSlide] = useState(0);
  // Undo toast for destructive actions
  const [undoAction, setUndoAction] = useState(null); // { message, undo: () => void }
  const undoTimerRef = useRef(null);
  // Sync
  const [syncCode, setSyncCode] = useState(null);
  const [syncStatus, setSyncStatus] = useState("idle"); // idle | syncing | error
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
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
  const [phEditingFor, setPhEditingFor] = useState(null); // playerId whose PH is being edited manually
  const [sharePreview, setSharePreview] = useState(null); // { blob, url } when share preview is open
  const [showAddClub, setShowAddClub] = useState(false); // "Add new club" modal
  const [addClubMode, setAddClubMode] = useState("choose"); // "choose" | "quick" | "manual" | "paste"
  const [quickClubForm, setQuickClubForm] = useState({ name: "", cr: "", slope: "", par: "", numHoles: 18, teeName: "Gelb (Herren)" });
  // Live ticker
  const [liveCode, setLiveCode] = useState(null); // current live ticker code, if active
  const [liveStatus, setLiveStatus] = useState("idle"); // "idle" | "creating" | "active" | "error"
  const [showLiveModal, setShowLiveModal] = useState(false); // controls the Live-Share modal
  // List of live rounds from anyone in the wider community (refreshed every minute)
  const [activeLiveRounds, setActiveLiveRounds] = useState([]);
  // Round-delete confirmation modal: holds the round to delete (null = closed)
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [loadedRoundId, setLoadedRoundId] = useState(null); // track which round is being viewed/edited
  // Scoring mode
  const [scoringMode, setScoringMode] = useState("batch"); // batch | live
  const [currentHole, setCurrentHole] = useState(0);
  // Game mode (Uschi)
  const [gameMode, setGameMode] = useState("stableford"); // "stableford" | "uschi-single" | "uschi-team"
  const [teams, setTeams] = useState(null); // { A: [pid], B: [pid] } | null (null = not split yet)
  const [par3Data, setPar3Data] = useState({}); // { [holeIdx]: { greenHits: [pid], closest: pid } }
  const [uschiPromptHole, setUschiPromptHole] = useState(null); // holeIdx currently prompting for par-3 data
  const [showUschiReview, setShowUschiReview] = useState(false); // Uschi protocol review screen
  const touchStartX = useRef(null);
  const syncTimerRef = useRef(null);
  const livePushTimerRef = useRef(null);

  const allClubs = useMemo(() => [...customClubs, ...BUILT_IN_CLUBS], [customClubs]);
  const selectedClub = useMemo(() => allClubs.find(c => c.name === cfg.clubName), [allClubs, cfg.clubName]);

  // ── Online / offline detection ────────────────────────────────────────────
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // ── Active live rounds: fetch from cloud, refresh on home view ────────────
  // Polls every 60s while on home screen so users see in real-time who's playing.
  useEffect(() => {
    if (!SYNC_ENABLED) return;
    let cancelled = false;
    let timer = null;
    const fetchOnce = async () => {
      const list = await liveListActive();
      if (!cancelled) setActiveLiveRounds(list);
    };
    fetchOnce();
    if (view === "home") {
      timer = setInterval(fetchOnce, 60000);
    }
    return () => { cancelled = true; if (timer) clearInterval(timer); };
  }, [view]);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("golf-rounds");
        if (r) {
          let loadedRounds = JSON.parse(r.value);
          // Self-cleanup: dedup duplicates by content fingerprint
          // (same club + date + player names + holes count = treat as same round)
          // This protects against legacy duplicates with mismatched IDs.
          if (Array.isArray(loadedRounds) && loadedRounds.length > 0) {
            const fingerprint = round => {
              const date = round.cfg?.date || round.savedAt || 0;
              const club = round.cfg?.clubName || "";
              const playerNames = (round.players || []).map(p => p.name).sort().join("|");
              const holesCount = (round.holes || []).length;
              return `${club}::${date}::${playerNames}::${holesCount}`;
            };
            const seen = new Map();
            for (const round of loadedRounds) {
              const key = fingerprint(round);
              const existing = seen.get(key);
              // Keep the version with the higher savedAt (most recent edit)
              if (!existing || (round.savedAt || 0) > (existing.savedAt || 0)) {
                seen.set(key, round);
              }
            }
            const cleaned = Array.from(seen.values()).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
            if (cleaned.length < loadedRounds.length) {
              console.log(`Cleaned ${loadedRounds.length - cleaned.length} duplicate round(s) from local storage`);
              loadedRounds = cleaned;
              try { await window.storage.set("golf-rounds", JSON.stringify(cleaned)); } catch {}
            }
          }
          setRounds(loadedRounds);
        }
      } catch {}
      try { const f = await window.storage.get("golf-friends");      if (f) setFriends(JSON.parse(f.value)); } catch {}
      try { const c = await window.storage.get("golf-custom-clubs"); if (c) setCustomClubs(JSON.parse(c.value)); } catch {}
      try { const s = await window.storage.get("golf-sync-code");    if (s?.value) setSyncCode(s.value); } catch {}

      // Pull from cloud if sync code exists — with safety checks
      try {
        const stored = await window.storage.get("golf-sync-code");
        const code = stored?.value;
        if (code && SYNC_ENABLED) {
          const cloud = await cloudPull(code);
          if (cloud && cloud.data) {
            const localTsRaw = await window.storage.get("golf-last-sync");
            const localTs = localTsRaw?.value ? parseInt(localTsRaw.value) : 0;
            const cloudTs = new Date(cloud.updated_at).getTime();

            // Read current local data (already loaded above)
            const localRoundsRaw = await window.storage.get("golf-rounds");
            const localRounds = localRoundsRaw?.value ? JSON.parse(localRoundsRaw.value) : [];

            const cloudRounds = Array.isArray(cloud.data.rounds) ? cloud.data.rounds : [];

            // ── SAFETY CHECK 1: Cloud is empty / drastically smaller ──
            // If we have local data and cloud has none (or much fewer), DON'T overwrite.
            // This protects against accidental wipes from someone pushing empty state.
            const cloudIsSuspicious = (
              localRounds.length > 0 &&
              cloudRounds.length < Math.max(1, Math.floor(localRounds.length * 0.5))
            );

            if (cloudIsSuspicious) {
              // Show conflict modal — let user decide
              console.warn(`Cloud has ${cloudRounds.length} rounds but local has ${localRounds.length}. Asking user.`);
              setSyncConflict({
                localRounds,
                cloudData: cloud.data,
                cloudUpdatedAt: cloud.updated_at,
                type: "fewer-rounds",
              });
              // Important: do NOT update last-sync here, so we won't auto-push the local state yet
            } else if (cloudTs > localTs) {
              // ── SMART MERGE: combine local + cloud, dedup by id + fingerprint ──
              // First pass: dedup by ID
              const cloudIds = new Set(cloudRounds.map(r => r.id));
              const localOnlyRounds = localRounds.filter(r => !cloudIds.has(r.id));

              // Second pass: dedup by content fingerprint (club + date + sorted player names + holes count)
              // This catches the edge case where the same round exists with different IDs in cloud vs local
              // (can happen when a round was created locally before sync, then later synced).
              const fingerprint = r => {
                const date = r.cfg?.date || r.savedAt || 0;
                const club = r.cfg?.clubName || "";
                const playerNames = (r.players || []).map(p => p.name).sort().join("|");
                const holesCount = (r.holes || []).length;
                return `${club}::${date}::${playerNames}::${holesCount}`;
              };
              const cloudFingerprints = new Set(cloudRounds.map(fingerprint));
              const trulyLocalOnly = localOnlyRounds.filter(r => !cloudFingerprints.has(fingerprint(r)));

              const merged = [...cloudRounds, ...trulyLocalOnly].sort((a, b) =>
                (b.savedAt || 0) - (a.savedAt || 0)
              );

              if (localOnlyRounds.length !== trulyLocalOnly.length) {
                console.log(`Smart merge: ${localOnlyRounds.length - trulyLocalOnly.length} duplicate(s) by content fingerprint suppressed`);
              }

              // Friends: union by name (keep cloud version if duplicate)
              const cloudFriends = Array.isArray(cloud.data.friends) ? cloud.data.friends : [];
              const localFriendsRaw = await window.storage.get("golf-friends");
              const localFriends = localFriendsRaw?.value ? JSON.parse(localFriendsRaw.value) : [];
              const cloudFriendNames = new Set(cloudFriends.map(f => f.name));
              const localOnlyFriends = localFriends.filter(f => !cloudFriendNames.has(f.name));
              const mergedFriends = [...cloudFriends, ...localOnlyFriends];

              // Custom clubs: union by name
              const cloudClubs = Array.isArray(cloud.data.customClubs) ? cloud.data.customClubs : [];
              const localClubsRaw = await window.storage.get("golf-custom-clubs");
              const localClubs = localClubsRaw?.value ? JSON.parse(localClubsRaw.value) : [];
              const cloudClubNames = new Set(cloudClubs.map(c => c.name));
              const localOnlyClubs = localClubs.filter(c => !cloudClubNames.has(c.name));
              const mergedClubs = [...cloudClubs, ...localOnlyClubs];

              setRounds(merged);
              setFriends(mergedFriends);
              setCustomClubs(mergedClubs);
              try { await window.storage.set("golf-last-sync", String(cloudTs)); } catch {}

              if (localOnlyRounds.length > 0) {
                console.log(`Smart merge: kept ${localOnlyRounds.length} local-only rounds`);
              }
            }

            // ── AUTO-BACKUP: snapshot the resulting state under daily key ──
            try {
              const today = new Date().toISOString().slice(0, 10);
              const backupKey = `golf-rounds-backup-${today}`;
              const existingBackup = await window.storage.get(backupKey);
              if (!existingBackup?.value) {
                // Take backup of whatever we have right now (before any conflict resolution)
                const backupData = JSON.stringify({
                  date: today,
                  rounds: localRounds,
                  friends: (await window.storage.get("golf-friends"))?.value || "[]",
                  customClubs: (await window.storage.get("golf-custom-clubs"))?.value || "[]",
                });
                await window.storage.set(backupKey, backupData);
                // Cleanup: keep only last 7 backups
                const allKeys = await window.storage.list?.("golf-rounds-backup-");
                if (allKeys?.keys) {
                  const sorted = [...allKeys.keys].sort();
                  while (sorted.length > 7) {
                    const oldKey = sorted.shift();
                    try { await window.storage.delete(oldKey); } catch {}
                  }
                }
              }
            } catch (e) { console.warn("Auto-backup failed", e); }
          }
        }
      } catch (e) { console.warn("Initial pull failed", e); }
      // Check if welcome has been seen before
      try {
        const seenWelcome = await window.storage.get("golf-welcome-seen");
        if (!seenWelcome?.value) setShowWelcome(true);
      } catch {}
      setLoaded(true);
    })();
  }, []);

  // ── Auto-sync on data change (debounced) ──────────────────────────────────
  useEffect(() => {
    if (!loaded || !syncCode || !SYNC_ENABLED) return;
    // SAFETY: don't auto-push while a sync conflict modal is open
    // (otherwise the user's "wait, let me decide" gets overruled by an instant push)
    if (syncConflict) return;
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
  }, [rounds, friends, customClubs, syncCode, loaded, syncConflict]);

  // ── Live ticker auto-push (debounced) ─────────────────────────────────────
  // When a live ticker is active, push current round state to Supabase on any change.
  useEffect(() => {
    if (!liveCode || !SYNC_ENABLED || liveStatus !== "active") return;
    clearTimeout(livePushTimerRef.current);
    livePushTimerRef.current = setTimeout(async () => {
      const payload = {
        cfg,
        holes,
        players,
        scores,
        gameMode,
        teams,
        par3Data,
        clubName: cfg.clubName,
        selectedClubSnapshot: selectedClub ? {
          name: selectedClub.name,
          region: selectedClub.region,
          numHoles: selectedClub.numHoles,
          tees: selectedClub.tees,
          holes: selectedClub.holes,
        } : null,
      };
      await liveUpdate(liveCode, payload);
    }, 2500);
    return () => clearTimeout(livePushTimerRef.current);
  }, [liveCode, liveStatus, cfg, holes, players, scores, gameMode, teams, par3Data, selectedClub]);

  // ── Stable callbacks (prevent remounts) ───────────────────────────────────
  const onClubQ   = useCallback(e => { setClubQ(e.target.value); setShowDD(true); }, []);
  const onCfgName = useCallback(e => setCfg(c => ({ ...c, name: e.target.value })), []);
  const onDate    = useCallback(e => setCfg(c => ({ ...c, date: e.target.value })), []);
  const onNewName = useCallback(e => setNewP(p => ({ ...p, name: e.target.value })), []);
  const onNewHcp  = useCallback(e => setNewP(p => ({ ...p, hcp: e.target.value })), []);

  // Sort clubs: (1) custom clubs first, (2) verified with holes-data next, (3) others last
  // Within each tier, sort by distance from Vienna (closest first).
  const sortedClubs = useMemo(() => {
    const withMeta = allClubs.map(c => ({
      club: c,
      isCustom: customClubs.includes(c),
      isVerified: !!c.holes,
      distance: clubDistanceFromVienna(c.name),
    }));
    withMeta.sort((a, b) => {
      // Tier 1: custom clubs first
      if (a.isCustom !== b.isCustom) return a.isCustom ? -1 : 1;
      // Tier 2: verified before non-verified
      if (a.isVerified !== b.isVerified) return a.isVerified ? -1 : 1;
      // Tier 3: by distance — clubs with known distance before unknowns
      if (a.distance === null && b.distance !== null) return 1;
      if (a.distance !== null && b.distance === null) return -1;
      if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
      // Fallback: alphabetical
      return a.club.name.localeCompare(b.club.name);
    });
    return withMeta.map(x => x.club);
  }, [allClubs, customClubs]);

  const filteredClubs = clubQ.length > 0
    ? sortedClubs.filter(c => c.name.toLowerCase().includes(clubQ.toLowerCase()) || c.region.toLowerCase().includes(clubQ.toLowerCase()))
    : sortedClubs.slice(0, 8);

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
    const deletedFriend = friends.find(f => f.name === name);
    const updated = friends.filter(f => f.name !== name);
    setFriends(updated);
    try { await window.storage.set("golf-friends", JSON.stringify(updated)); } catch {}
    if (deletedFriend) {
      showUndoToast(`${name} entfernt`, async () => {
        const restored = [...updated, deletedFriend];
        setFriends(restored);
        try { await window.storage.set("golf-friends", JSON.stringify(restored)); } catch {}
        setUndoAction(null);
      });
    }
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
      // But: if we're in "correction mode" (hole was already fully scored when pad opened),
      // stop after filling gaps on this hole — don't auto-advance to next hole.
      const wasFullyScoredOnOpen = padOpen.correctionMode === true;

      for (let i = playerIdx + 1; i < players.length; i++) {
        if (scores[players[i].id]?.[holeIdx] === undefined) {
          setPadOpen({ playerId: players[i].id, holeIdx, correctionMode: wasFullyScoredOnOpen });
          return;
        }
      }
      // All players on this hole are done
      if (wasFullyScoredOnOpen) {
        // Correction mode: just close the pad, don't jump forward.
        // User can see all players' scores on this hole now and decide what to do next.
        setPadOpen(null);
        return;
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
    const { playerId, holeIdx } = padOpen;
    setScore(playerId, holeIdx, n);
    setTimeout(() => {
      maybePromptUschi(holeIdx, playerId);
      advanceToNext();
    }, 120);
  };
  const padStrich = () => {
    if (!padOpen) return;
    const { playerId, holeIdx } = padOpen;
    setScore(playerId, holeIdx, STRICH);
    setTimeout(() => {
      maybePromptUschi(holeIdx, playerId);
      advanceToNext();
    }, 120);
  };
  const padClear = () => {
    if (!padOpen) return;
    clearScore(padOpen.playerId, padOpen.holeIdx);
  };

  // Open Uschi par-3 dialog if conditions are met
  // Called right after a score is set for `latestPlayerId` on `holeIdx`
  const maybePromptUschi = (holeIdx, latestPlayerId) => {
    if (gameMode === "stableford") return;
    const hole = holes[holeIdx];
    if (!hole || hole.par !== 3) return;
    if (par3Data[holeIdx]) return; // already have data
    // check all players have a score (valid or strich) for this hole.
    // Use latestPlayerId as a hint: treat that player as scored even if state not yet flushed.
    const allScored = players.every(p => {
      if (p.id === latestPlayerId) return true;
      const g = scores[p.id]?.[holeIdx];
      return isValid(g) || isStrich(g);
    });
    if (allScored) {
      setTimeout(() => setUschiPromptHole(holeIdx), 250);
    }
  };

  // ── Stats (uses per-player tee data + any manual PH override)
  const computeStats = (player) => {
    const tee = playerTee(player, cfg, selectedClub);
    if (!tee) return { ph: 0, hr: [], bT: 0, nT: 0, sfNT: 0, sfBT: 0, phSource: "formula", strichCount: 0 };
    const { ph, source: phSource } = resolvePlayerPH(player, cfg, selectedClub, par);
    const hr = holes.map((h, i) => {
      const g = scores[player.id]?.[i];
      const hs = holeHS(ph, h.si, cfg.numHoles);
      return { g, hs, netto: isValid(g) ? g - hs : null, sfN: sfNetto(g, hs, h.par), sfB: sfBrutto(g, h.par), par: h.par };
    });
    const played = hr.filter(h => isValid(h.g));
    const bT = played.reduce((s, h) => s + h.g, 0);
    const strichCount = hr.filter(h => isStrich(h.g)).length;
    return {
      ph, hr, bT, tee, phSource, strichCount,
      nT: played.length ? bT - ph : 0,
      sfNT: hr.reduce((s, h) => s + (h.sfN || 0), 0),
      sfBT: hr.reduce((s, h) => s + (h.sfB || 0), 0),
    };
  };

  // Memoize all player stats — single computation per render cycle, cached by dependencies.
  // This avoids redundant recomputation when the same stats are read from multiple places
  // (scoring screen, results, share image, uschi review). Major perf win on mobile Safari.
  const allStats = useMemo(() => {
    const map = {};
    players.forEach(p => { map[p.id] = computeStats(p); });
    return map;
  }, [players, cfg, selectedClub, holes, scores, par]);

  const getStats = (player) => allStats[player.id] || computeStats(player);

  // ── Uschi mode: adjusted strokes + point calculation (memoized)
  const uschiStrokes = useMemo(() => {
    if (gameMode === "stableford") return [];
    return uschiAdjustedStrokes(players, cfg, selectedClub, holes);
  }, [gameMode, players, cfg, selectedClub, holes]);

  const uschiResult = useMemo(() => {
    if (gameMode === "stableford" || uschiStrokes.length === 0) return null;
    return computeUschiPoints(players, holes, scores, uschiStrokes, par3Data);
  }, [gameMode, players, holes, scores, uschiStrokes, par3Data]);

  const teamResult = useMemo(() => {
    if (gameMode !== "uschi-team" || !uschiResult || !teams?.A?.length || !teams?.B?.length) return null;
    return computeTeamUschiPoints(uschiResult, teams);
  }, [gameMode, uschiResult, teams]);

  // ── Rounds
  const saveRound = async () => {
    let u;
    const extra = { gameMode, teams, par3Data };
    if (loadedRoundId) {
      u = rounds.map(r => r.id === loadedRoundId
        ? { ...r, cfg, holes, players, scores, ...extra, savedAt: new Date().toISOString() }
        : r);
    } else {
      const newR = { id: uid(), cfg, holes, players, scores, ...extra, savedAt: new Date().toISOString() };
      u = [newR, ...rounds].slice(0, 50);
      setLoadedRoundId(newR.id);
    }
    setRounds(u);
    try { await window.storage.set("golf-rounds", JSON.stringify(u)); } catch {}
  };

  // ── Navigation: go home, but auto-save any in-progress setup ──
  // If the user has started preparing a round (club + at least one player),
  // we persist it as a "läuft" round so it appears on the home screen and
  // can be resumed. Otherwise the setup state silently disappears.
  const goHome = async () => {
    const isInSetup = view === "setup" || view === "scoring";
    const hasContent = cfg?.clubName && players && players.length > 0;
    if (isInSetup && hasContent) {
      // Save current setup state silently (skip if it's already a saved round)
      await saveRound();
    }
    setView("home");
  };
  const loadRound = r => {
    setLoadedRoundId(r.id);
    setCfg(r.cfg); setHoles(r.holes); setPlayers(r.players); setScores(r.scores);
    setGameMode(r.gameMode || "stableford");
    setTeams(r.teams || null);
    setPar3Data(r.par3Data || r.uschiInputs || {});
    // If incomplete, jump into scoring so user can continue where they left off.
    const progress = getRoundProgress(r);
    if (progress.notStarted) {
      setCurrentHole(0); setScoringMode("batch");
      setView("setup");
    } else if (!progress.complete) {
      // Jump to first hole with any missing score
      let firstMissing = 0;
      for (let i = 0; i < r.holes.length; i++) {
        const allDone = r.players.every(p => {
          const v = r.scores[p.id]?.[i];
          return isValid(v) || isStrich(v);
        });
        if (!allDone) { firstMissing = i; break; }
      }
      setCurrentHole(firstMissing);
      setScoringMode("live");
      setView("scoring");
    } else {
      setCurrentHole(0); setScoringMode("batch");
      setView("results");
    }
  };
  // Show undo toast — fires an action that can be reverted within N seconds.
  const showUndoToast = (message, undoFn) => {
    clearTimeout(undoTimerRef.current);
    setUndoAction({ message, undo: undoFn });
    undoTimerRef.current = setTimeout(() => setUndoAction(null), 6000);
  };

  const deleteRound = async (id) => {
    const deletedRound = rounds.find(r => r.id === id);
    const updated = rounds.filter(r => r.id !== id);
    setRounds(updated);
    if (id === loadedRoundId) setLoadedRoundId(null);
    try { await window.storage.set("golf-rounds", JSON.stringify(updated)); } catch {}

    // Show undo toast
    if (deletedRound) {
      showUndoToast(`Runde "${deletedRound.cfg?.clubName || "Runde"}" gelöscht`, async () => {
        const restored = [deletedRound, ...updated].slice(0, 50);
        setRounds(restored);
        try { await window.storage.set("golf-rounds", JSON.stringify(restored)); } catch {}
        setUndoAction(null);
      });
    }
  };

  const newRound = () => {
    setLoadedRoundId(null);
    setCfg({ name: "", date: toDay(), numHoles: 18, clubName: "", defaultTeeName: "" });
    setHoles(makeHoles(72, 18)); setPlayers([]); setScores({});
    setGameMode("stableford"); setTeams(null); setPar3Data({});
    setClubQ(""); setPickedClub(null);
    setCurrentHole(0); setScoringMode("batch");
    setView("setup");
  };

  // Copy last completed round's setup: club, tee, players (with current HCPs), game mode.
  // Scores and par3Data are reset — it's a fresh round, same people/course.
  const copyLastRound = () => {
    const last = rounds[0];
    if (!last) {
      alert("Keine vorherige Runde zum Kopieren vorhanden.");
      return;
    }
    // Refresh player HCPs from friends list (HCPs might have changed)
    const refreshedPlayers = (last.players || []).map(p => {
      const friend = friends.find(f => f.name === p.name);
      return {
        ...p,
        hcp: friend ? friend.hcp : p.hcp,
      };
    });

    setLoadedRoundId(null);
    setCfg({
      ...last.cfg,
      date: toDay(),        // today's date
      name: "",             // fresh name
    });
    setHoles(last.holes);
    setPlayers(refreshedPlayers);
    setScores({});          // no scores yet
    setGameMode(last.gameMode || "stableford");
    setTeams(last.teams || null);
    setPar3Data({});        // no par-3 data yet
    setClubQ("");
    setPickedClub(null);
    setCurrentHole(0);
    setScoringMode("batch");
    setView("setup");

    showUndoToast(
      `🔁 Runde kopiert von ${fmtDate(last.cfg?.date)} (${last.cfg?.clubName || "Runde"})`,
      () => {}
    );
  };

  // ── Import / sync
  const importClub = async () => {
    try {
      let text = importText.trim();
      text = text.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "");
      const raw = JSON.parse(text);
      // Auto-convert Birdiebook-style format to app format
      const parsed = normalizeBirdiebookFormat(raw);
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
    if (!isValidSyncCode(clean)) {
      alert("Ungültiger Code. Er muss mindestens 4 Zeichen lang sein (Buchstaben, Zahlen, Bindestrich).");
      return false;
    }

    // Pull existing cloud data BEFORE touching anything locally
    if (SYNC_ENABLED) {
      const cloud = await cloudPull(clean);
      const cloudRounds = (cloud && cloud.data && Array.isArray(cloud.data.rounds)) ? cloud.data.rounds : [];
      const cloudHasData = cloud && cloud.data && (cloudRounds.length > 0 || (cloud.data.friends || []).length > 0 || (cloud.data.customClubs || []).length > 0);
      const localRoundsCount = rounds.length;

      // ── SAFETY CHECK: Existing code with significantly fewer rounds than local ──
      // Same protection as initial pull: don't silently overwrite valuable local data.
      const cloudIsSuspicious = (
        localRoundsCount > 0 &&
        cloudRounds.length < Math.max(1, Math.floor(localRoundsCount * 0.5))
      );

      if (cloudIsSuspicious) {
        // Show conflict modal — let user decide BEFORE switching the code
        // Note: We don't switch the code yet — only commit the change after user decides
        setSyncConflict({
          localRounds: rounds,
          cloudData: cloud.data,
          cloudUpdatedAt: cloud.updated_at,
          type: "manual-code-entry",
          pendingCode: clean, // remember which code the user wants to set
        });
        // Don't close the sync modal yet — user might cancel
        return false;
      }

      if (cloud && cloud.data && cloudHasData) {
        // ── Existing code with non-empty data → SMART MERGE (don't overwrite) ──
        const cloudIds = new Set(cloudRounds.map(r => r.id));
        const localOnlyRounds = rounds.filter(r => !cloudIds.has(r.id));
        // Also dedup by content fingerprint (handles legacy rounds with mismatched IDs)
        const fingerprint = r => {
          const date = r.cfg?.date || r.savedAt || 0;
          const club = r.cfg?.clubName || "";
          const playerNames = (r.players || []).map(p => p.name).sort().join("|");
          const holesCount = (r.holes || []).length;
          return `${club}::${date}::${playerNames}::${holesCount}`;
        };
        const cloudFingerprints = new Set(cloudRounds.map(fingerprint));
        const trulyLocalOnly = localOnlyRounds.filter(r => !cloudFingerprints.has(fingerprint(r)));
        const merged = [...cloudRounds, ...trulyLocalOnly].sort((a, b) =>
          (b.savedAt || 0) - (a.savedAt || 0)
        );

        const cloudFriends = Array.isArray(cloud.data.friends) ? cloud.data.friends : [];
        const cloudFriendNames = new Set(cloudFriends.map(f => f.name));
        const mergedFriends = [...cloudFriends, ...friends.filter(f => !cloudFriendNames.has(f.name))];

        const cloudClubs = Array.isArray(cloud.data.customClubs) ? cloud.data.customClubs : [];
        const cloudClubNames = new Set(cloudClubs.map(c => c.name));
        const mergedClubs = [...cloudClubs, ...customClubs.filter(c => !cloudClubNames.has(c.name))];

        // Now apply the change
        setSyncCode(clean);
        try { await window.storage.set("golf-sync-code", clean); } catch {}
        try { await window.storage.set("golf-last-sync", "0"); } catch {} // force re-push of merged state

        setRounds(merged);
        setFriends(mergedFriends);
        setCustomClubs(mergedClubs);

        setShowSyncModal(false);
        const addedFromCloud = cloudRounds.length;
        const keptLocal = localOnlyRounds.length;
        if (keptLocal > 0) {
          showUndoToast(`✓ Verbunden mit "${clean}" — ${addedFromCloud} aus Cloud, ${keptLocal} lokal behalten`, () => {});
        } else {
          showUndoToast(`✓ Verbunden mit "${clean}" — ${addedFromCloud} Runden geladen`, () => {});
        }
      } else {
        // ── New code (no cloud data) → keep local, will push on next change ──
        setSyncCode(clean);
        try { await window.storage.set("golf-sync-code", clean); } catch {}
        try { await window.storage.set("golf-last-sync", "0"); } catch {} // force push

        setShowSyncModal(false);
        if (localRoundsCount > 0) {
          showUndoToast(`✓ Neuer Code "${clean}" angelegt — ${localRoundsCount} Runden werden hochgeladen`, () => {});
        } else {
          showUndoToast(`✓ Neuer Code "${clean}" angelegt`, () => {});
        }
      }
    } else {
      setSyncCode(clean);
      try { await window.storage.set("golf-sync-code", clean); } catch {}
      setShowSyncModal(false);
    }
    return true;
  };

  const disconnectSync = async () => {
    setSyncCode(null);
    try { await window.storage.delete("golf-sync-code"); } catch {}
    try { await window.storage.delete("golf-last-sync"); } catch {}
    setShowSyncModal(false);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // JSON EXPORT / IMPORT — Local backup independent of Supabase
  // ═══════════════════════════════════════════════════════════════════════════
  const exportAllData = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      app: "Fairway",
      data: {
        rounds,
        friends,
        customClubs,
      },
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    a.href = url;
    a.download = `fairway-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showUndoToast(`✓ Backup exportiert (${rounds.length} Runden, ${friends.length} Freunde, ${customClubs.length} Clubs)`, () => {});
  };

  // Parse imported JSON, validate shape, return { ok, data, error }
  const parseImportJson = (text) => {
    try {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object") return { ok: false, error: "Datei ist kein gültiges JSON-Objekt." };
      if (!parsed.data || typeof parsed.data !== "object") return { ok: false, error: "Keine gültigen Fairway-Daten gefunden." };
      const d = parsed.data;
      const rounds = Array.isArray(d.rounds) ? d.rounds : [];
      const friends = Array.isArray(d.friends) ? d.friends : [];
      const customClubs = Array.isArray(d.customClubs) ? d.customClubs : [];
      return { ok: true, data: { rounds, friends, customClubs }, meta: { exportedAt: parsed.exportedAt } };
    } catch (e) {
      return { ok: false, error: "Datei konnte nicht gelesen werden: " + (e.message || "unbekannter Fehler") };
    }
  };

  // Import handler called from file input. Asks user for Merge vs Replace.
  const handleImportFile = async (file) => {
    if (!file) return;
    const text = await file.text();
    const result = parseImportJson(text);
    if (!result.ok) {
      alert("❌ Import fehlgeschlagen\n\n" + result.error);
      return;
    }
    const d = result.data;
    const summary = `📥 Import bereit:\n\n• ${d.rounds.length} Runden\n• ${d.friends.length} Freunde\n• ${d.customClubs.length} Custom-Clubs`;

    // Ask Merge or Replace
    const hasLocal = rounds.length > 0 || friends.length > 0 || customClubs.length > 0;
    let mode;
    if (!hasLocal) {
      if (!confirm(summary + "\n\nImportieren?")) return;
      mode = "replace";
    } else {
      const choice = prompt(
        summary +
        `\n\nAktuell sind vorhanden:\n• ${rounds.length} Runden\n• ${friends.length} Freunde\n• ${customClubs.length} Custom-Clubs\n\nTippe:\n  M = MERGE (beides behalten)\n  R = REPLACE (lokale Daten überschreiben)\n  Abbrechen = Import stoppen`,
        "M"
      );
      if (choice === null) return;
      const c = choice.trim().toUpperCase();
      if (c !== "M" && c !== "R") {
        alert("Ungültige Eingabe. Import abgebrochen.");
        return;
      }
      mode = c === "R" ? "replace" : "merge";
    }

    // Save backup for undo
    const backup = { rounds, friends, customClubs };

    let newRounds, newFriends, newClubs;
    if (mode === "replace") {
      newRounds = d.rounds;
      newFriends = d.friends;
      newClubs = d.customClubs;
    } else {
      // MERGE: rounds by id, friends by name, clubs by name
      const roundIds = new Set(rounds.map(r => r.id));
      newRounds = [...rounds, ...d.rounds.filter(r => !roundIds.has(r.id))].slice(0, 50);
      const friendNames = new Set(friends.map(f => f.name));
      newFriends = [...friends, ...d.friends.filter(f => !friendNames.has(f.name))];
      const clubNames = new Set(customClubs.map(c => c.name));
      newClubs = [...customClubs, ...d.customClubs.filter(c => !clubNames.has(c.name))];
    }

    setRounds(newRounds);
    setFriends(newFriends);
    setCustomClubs(newClubs);
    try {
      await window.storage.set("golf-rounds", JSON.stringify(newRounds));
      await window.storage.set("golf-friends", JSON.stringify(newFriends));
      await window.storage.set("golf-custom-clubs", JSON.stringify(newClubs));
    } catch {}

    // Show undo
    showUndoToast(
      `✓ Import erfolgreich (${mode === "replace" ? "ersetzt" : "zusammengeführt"})`,
      async () => {
        setRounds(backup.rounds);
        setFriends(backup.friends);
        setCustomClubs(backup.customClubs);
        try {
          await window.storage.set("golf-rounds", JSON.stringify(backup.rounds));
          await window.storage.set("golf-friends", JSON.stringify(backup.friends));
          await window.storage.set("golf-custom-clubs", JSON.stringify(backup.customClubs));
        } catch {}
        setUndoAction(null);
      }
    );
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
      paddingTop: "calc(14px + env(safe-area-inset-top))",
      paddingBottom: "14px",
      paddingLeft: "calc(16px + env(safe-area-inset-left))",
      paddingRight: "calc(16px + env(safe-area-inset-right))",
      borderBottom: `1px solid ${T.line}`, background: T.canvas,
      position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", gap: "10px",
    }}>
      <button
        onClick={goHome}
        aria-label="Zurück zum Hauptmenü"
        style={{
          background: "transparent", border: "none",
          padding: "6px 4px",
          margin: "-6px -4px",
          display: "flex", alignItems: "center", gap: "10px",
          flex: 1, minWidth: 0, cursor: "pointer", textAlign: "left",
          minHeight: "44px",
        }}>
        <LogoMark size={22} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="serif" style={{ fontSize: "18px", color: T.text }}>Fairway</div>
          {view !== "home" && (
            <div style={{
              fontSize: "11px", color: T.textSoft, marginTop: "1px",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {cfg.clubName || "Neue Runde"}
            </div>
          )}
        </div>
      </button>
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
        <button onClick={goHome} className="btn-hover" style={{ ...S.btnGhost, padding: "7px 12px" }}>
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
  // ═══════════════════════════════════════════════════════════════════════════
  // STATS TAB — Club-level + per-player drill-down with strike handling
  // ═══════════════════════════════════════════════════════════════════════════

  // Combined rounds = local rounds + any imported via sync-code
  const allRoundsForStats = useMemo(() => {
    return [...rounds, ...statsImportedRounds];
  }, [rounds, statsImportedRounds]);

  const renderStatsTab = () => {
    const clubsPlayed = Array.from(new Set(allRoundsForStats.map(r => r.cfg?.clubName).filter(Boolean)));

    if (clubsPlayed.length === 0) {
      return (
        <div>
          <EmptyState
            icon="📊"
            title="Noch keine Daten"
            sub="Spiele ein paar Runden auf einem Club, dann erscheinen hier deine Statistiken. Ab 3 Runden werden die Zahlen richtig aussagekräftig." />
          <button onClick={() => setShowStatsImport(true)}
            style={{ ...S.btnSecondary, width: "100%", marginTop: "14px", fontSize: "12px" }}>
            👥 Stats aus anderem Sync-Code importieren
          </button>
        </div>
      );
    }

    const activeClub = statsClubName && clubsPlayed.includes(statsClubName) ? statsClubName : clubsPlayed[0];
    const stats = aggregateClubStats(activeClub, allRoundsForStats);

    // Active focus player — must exist in stats for this club
    const availablePlayers = stats?.playerStats.map(p => p.name) || [];
    const focusPlayerName = statsFocusPlayer && availablePlayers.includes(statsFocusPlayer) ? statsFocusPlayer : null;
    const focusPlayerData = focusPlayerName ? stats.playerStats.find(p => p.name === focusPlayerName) : null;

    return (
      <div>
        {/* Club selector */}
        <div style={{ marginBottom: "12px" }}>
          <div style={{ ...S.eyebrow, marginBottom: "6px" }}>🏌️ Club</div>
          <select
            value={activeClub}
            onChange={(e) => { setStatsClubName(e.target.value); setStatsFocusPlayer(null); }}
            style={{ ...S.input, padding: "10px 12px", fontSize: "13px", width: "100%" }}>
            {clubsPlayed.map(name => {
              const count = allRoundsForStats.filter(r => r.cfg?.clubName === name).length;
              return <option key={name} value={name}>{name} ({count} Runde{count === 1 ? "" : "n"})</option>;
            })}
          </select>
        </div>

        {/* Focus player selector */}
        {stats && stats.playerStats.length > 0 && (
          <div style={{ marginBottom: "14px" }}>
            <div style={{ ...S.eyebrow, marginBottom: "6px" }}>👤 Perspektive</div>
            <select
              value={focusPlayerName || ""}
              onChange={(e) => setStatsFocusPlayer(e.target.value || null)}
              style={{ ...S.input, padding: "10px 12px", fontSize: "13px", width: "100%" }}>
              <option value="">🌐 Alle Spieler (Team-Durchschnitt)</option>
              {stats.playerStats.map(p => (
                <option key={p.name} value={p.name}>
                  👤 {p.name} ({p.roundsPlayed} Runde{p.roundsPlayed === 1 ? "" : "n"})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Imported-data banner */}
        {statsImportedRounds.length > 0 && (
          <div style={{
            padding: "8px 12px", marginBottom: "12px",
            background: `${T.sage}15`, border: `1px solid ${T.sage}40`,
            borderRadius: "8px", fontSize: "11px", color: T.sage,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px",
          }}>
            <span>👥 Inklusive {statsImportedRounds.length} importierte{statsImportedRounds.length === 1 ? "" : ""} Runde{statsImportedRounds.length === 1 ? "" : "n"} aus anderen Codes</span>
            <button onClick={() => setStatsImportedRounds([])}
              style={{ background: "transparent", border: "none", color: T.sage, fontSize: "14px", padding: "2px 6px", cursor: "pointer" }}>×</button>
          </div>
        )}

        {!stats && (
          <EmptyState icon="📊" title="Keine Daten für diesen Club" sub="Noch keine abgeschlossenen Runden." />
        )}

        {stats && (
          <>
            {/* Reliability warning */}
            {stats.roundsCount < 3 && (
              <div style={{
                padding: "10px 12px", marginBottom: "14px",
                background: `${T.gold}10`, border: `1px solid ${T.gold}40`,
                borderRadius: "8px", fontSize: "11px", color: T.gold, lineHeight: 1.4,
              }}>
                ⚠️ Nur {stats.roundsCount} Runde{stats.roundsCount === 1 ? "" : "n"} — Stats werden erst ab 3 Runden richtig aussagekräftig.
              </div>
            )}

            {/* Hall of Fame — only shown in "all players" mode */}
            {!focusPlayerName && (
              <div style={{ ...S.card, padding: "12px 14px", marginBottom: "14px" }}>
                <div style={{ ...S.eyebrow, marginBottom: "10px", color: T.gold, display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>🏆 Hall of Fame</span>
                  <span style={{ fontSize: "10px", color: T.textDim, textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>· Team-weit</span>
                </div>

                {stats.hallOfFame.bestHole && (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "16px" }}>🟢</span>
                    <span style={{ color: T.textSoft }}>Lieblingsloch:</span>
                    <span style={{ color: T.text, fontWeight: 600 }}>Loch {stats.hallOfFame.bestHole.idx + 1}</span>
                    <span className="mono" style={{ color: T.gold, fontSize: "11px", marginLeft: "auto" }}>
                      {stats.hallOfFame.bestHole.avg > 0 ? "+" : ""}{stats.hallOfFame.bestHole.avg.toFixed(1)} ⌀
                    </span>
                  </div>
                )}

                {stats.hallOfFame.worstHole && (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "16px" }}>💀</span>
                    <span style={{ color: T.textSoft }}>Angstloch:</span>
                    <span style={{ color: T.text, fontWeight: 600 }}>Loch {stats.hallOfFame.worstHole.idx + 1}</span>
                    <span className="mono" style={{ color: T.double, fontSize: "11px", marginLeft: "auto" }}>
                      {stats.hallOfFame.worstHole.avg > 0 ? "+" : ""}{stats.hallOfFame.worstHole.avg.toFixed(1)} ⌀
                    </span>
                  </div>
                )}

                {stats.hallOfFame.birdieKing && (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "16px" }}>🎯</span>
                    <span style={{ color: T.textSoft }}>Birdie-King:</span>
                    <span style={{ color: T.text, fontWeight: 600 }}>{stats.hallOfFame.birdieKing.name}</span>
                    <span className="mono" style={{ color: T.gold, fontSize: "11px", marginLeft: "auto" }}>
                      {stats.hallOfFame.birdieKing.count} Birdies
                    </span>
                  </div>
                )}

                {stats.hallOfFame.uschiMaster && (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px" }}>
                    <span style={{ fontSize: "16px" }}>💧</span>
                    <span style={{ color: T.textSoft }}>Uschi-Master:</span>
                    <span style={{ color: T.text, fontWeight: 600 }}>{stats.hallOfFame.uschiMaster.name}</span>
                    <span className="mono" style={{ color: T.gold, fontSize: "11px", marginLeft: "auto" }}>
                      {stats.hallOfFame.uschiMaster.points > 0 ? "+" : ""}{stats.hallOfFame.uschiMaster.points} Punkte
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Personal Hall of Fame for focus player */}
            {focusPlayerName && focusPlayerData && (() => {
              const perHole = focusPlayerData.perHole.filter(h => h.samplesSize > 0);
              if (perHole.length === 0) return null;
              const bestH = perHole.reduce((min, h) => h.avgVsPar < min.avgVsPar ? h : min, perHole[0]);
              const worstH = perHole.reduce((max, h) => h.avgVsPar > max.avgVsPar ? h : max, perHole[0]);
              return (
                <div style={{ ...S.card, padding: "12px 14px", marginBottom: "14px" }}>
                  <div style={{ ...S.eyebrow, marginBottom: "10px", color: T.gold }}>🏆 {focusPlayerName}s Highlights</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "16px" }}>🟢</span>
                    <span style={{ color: T.textSoft }}>Dein Lieblingsloch:</span>
                    <span style={{ color: T.text, fontWeight: 600 }}>Loch {bestH.holeIdx + 1}</span>
                    <span className="mono" style={{ color: T.gold, fontSize: "11px", marginLeft: "auto" }}>
                      {bestH.avgVsPar > 0 ? "+" : ""}{bestH.avgVsPar.toFixed(1)} ⌀
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "16px" }}>💀</span>
                    <span style={{ color: T.textSoft }}>Dein Angstloch:</span>
                    <span style={{ color: T.text, fontWeight: 600 }}>Loch {worstH.holeIdx + 1}</span>
                    <span className="mono" style={{ color: T.double, fontSize: "11px", marginLeft: "auto" }}>
                      {worstH.avgVsPar > 0 ? "+" : ""}{worstH.avgVsPar.toFixed(1)} ⌀
                    </span>
                  </div>
                  {focusPlayerData.strichCount > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px" }}>
                      <span style={{ fontSize: "16px" }}>✗</span>
                      <span style={{ color: T.textSoft }}>Striche gesetzt:</span>
                      <span className="mono" style={{ color: T.double, fontSize: "11px", marginLeft: "auto" }}>
                        {focusPlayerData.strichCount}×
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Player overview (clickable for drill-down) */}
            {!focusPlayerName && (
              <div style={{ ...S.card, padding: "12px 14px", marginBottom: "14px" }}>
                <div style={{ ...S.eyebrow, marginBottom: "12px" }}>
                  Spieler-Übersicht <span style={{ fontSize: "10px", color: T.textDim, textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>· tap für Details</span>
                </div>
                {stats.playerStats.map((p, i) => (
                  <button key={p.name}
                    onClick={() => setStatsPlayerDetail(p.name)}
                    style={{
                      width: "100%", textAlign: "left",
                      padding: "10px 12px",
                      paddingBottom: "10px", marginBottom: "8px",
                      background: T.surface2, border: `1px solid ${T.line}`,
                      borderRadius: "8px", color: T.text, cursor: "pointer",
                    }}>
                    <div style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}>
                      <div style={{ fontWeight: 600, fontSize: "14px", color: T.text, flex: 1 }}>{p.name}</div>
                      <div style={{ fontSize: "11px", color: T.textDim, marginRight: "8px" }}>
                        {p.roundsPlayed} Rd
                      </div>
                      <span style={{ color: T.textDim, fontSize: "14px" }}>›</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", marginBottom: "6px" }}>
                      <div style={{ textAlign: "center", padding: "5px 4px", background: T.surface1, borderRadius: "5px" }}>
                        <div className="mono" style={{ fontSize: "14px", fontWeight: 700, color: T.gold }}>{p.bestSF}</div>
                        <div style={{ fontSize: "9px", color: T.textDim }}>BEST</div>
                      </div>
                      <div style={{ textAlign: "center", padding: "5px 4px", background: T.surface1, borderRadius: "5px" }}>
                        <div className="mono" style={{ fontSize: "14px", fontWeight: 700, color: T.text }}>{p.avgSF}</div>
                        <div style={{ fontSize: "9px", color: T.textDim }}>⌀ SF</div>
                      </div>
                      <div style={{ textAlign: "center", padding: "5px 4px", background: T.surface1, borderRadius: "5px" }}>
                        <div className="mono" style={{ fontSize: "14px", fontWeight: 700, color: T.textDim }}>{p.worstSF}</div>
                        <div style={{ fontSize: "9px", color: T.textDim }}>WORST</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "10px", fontSize: "10px", color: T.textSoft, flexWrap: "wrap" }}>
                      <span>🎯 {p.birdies}</span>
                      <span>⛳ {p.pars}</span>
                      <span>⚠️ {p.bogeys}</span>
                      <span>💀 {p.doubles}</span>
                      {p.strichCount > 0 && <span style={{ color: T.double }}>✗ {p.strichCount}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Focus-player key stats */}
            {focusPlayerName && focusPlayerData && (
              <div style={{ ...S.card, padding: "12px 14px", marginBottom: "14px" }}>
                <div style={{ ...S.eyebrow, marginBottom: "10px" }}>{focusPlayerName}s Zahlen</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", marginBottom: "10px" }}>
                  <div style={{ textAlign: "center", padding: "8px 4px", background: T.surface2, borderRadius: "6px" }}>
                    <div className="mono" style={{ fontSize: "18px", fontWeight: 700, color: T.gold }}>{focusPlayerData.bestSF}</div>
                    <div style={{ fontSize: "9px", color: T.textDim, marginTop: "2px" }}>BEST SF</div>
                  </div>
                  <div style={{ textAlign: "center", padding: "8px 4px", background: T.surface2, borderRadius: "6px" }}>
                    <div className="mono" style={{ fontSize: "18px", fontWeight: 700, color: T.text }}>{focusPlayerData.avgSF}</div>
                    <div style={{ fontSize: "9px", color: T.textDim, marginTop: "2px" }}>⌀ SF</div>
                  </div>
                  <div style={{ textAlign: "center", padding: "8px 4px", background: T.surface2, borderRadius: "6px" }}>
                    <div className="mono" style={{ fontSize: "18px", fontWeight: 700, color: T.textDim }}>{focusPlayerData.worstSF}</div>
                    <div style={{ fontSize: "9px", color: T.textDim, marginTop: "2px" }}>WORST SF</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "12px", fontSize: "11px", color: T.textSoft, flexWrap: "wrap", justifyContent: "center" }}>
                  <span>🎯 {focusPlayerData.birdies} Birdies</span>
                  <span>⛳ {focusPlayerData.pars} Pars</span>
                  <span>⚠️ {focusPlayerData.bogeys} Bogeys</span>
                  <span>💀 {focusPlayerData.doubles} Doubles+</span>
                  {focusPlayerData.strichCount > 0 && <span style={{ color: T.double }}>✗ {focusPlayerData.strichCount} Striche</span>}
                </div>
              </div>
            )}

            {/* Per-hole breakdown (global or focus player) */}
            <div style={{ ...S.card, padding: "12px 14px", marginBottom: "14px" }}>
              <div style={{ ...S.eyebrow, marginBottom: "10px" }}>
                {focusPlayerName ? `${focusPlayerName}s Löcher` : "Pro Loch"}
                <span style={{ fontSize: "10px", color: T.textDim, textTransform: "none", letterSpacing: 0, fontWeight: 400 }}> · tap für Details</span>
              </div>
              <div style={{ fontSize: "10px", color: T.textDim, marginBottom: "10px", lineHeight: 1.4 }}>
                {focusPlayerName
                  ? "Persönlicher Durchschnitt. Striche zählen als persönliches Netto-Doppelbogey (die Regel: man hebt auf sobald keine SF-Punkte mehr möglich sind)."
                  : "Durchschnitt aller Spieler. Striche werden als persönliches Netto-Doppelbogey gewertet — fair für jeden Handicap-Spieler."}
              </div>
              <div style={{ overflow: "hidden", borderRadius: "8px", border: `1px solid ${T.line}` }}>
                <div style={{ display: "grid", gridTemplateColumns: "24px 22px 1fr 54px", gap: "6px", padding: "7px 10px", background: T.surface2, fontSize: "9px", color: T.textDim, fontWeight: 600, letterSpacing: "0.04em" }}>
                  <div>L</div>
                  <div style={{ textAlign: "center" }}>PAR</div>
                  <div>VERT.</div>
                  <div style={{ textAlign: "right" }}>⌀ vs Par</div>
                </div>
                {(focusPlayerName ? focusPlayerData.perHole : stats.holeStats).map((h, i) => {
                  if (h.samplesSize === 0) {
                    return (
                      <div key={i} onClick={() => setStatsHoleDetail(h.holeIdx)}
                        style={{ display: "grid", gridTemplateColumns: "24px 22px 1fr 54px", gap: "6px", padding: "7px 10px", borderTop: `1px solid ${T.line}`, alignItems: "center", cursor: "pointer" }}>
                        <div className="mono" style={{ fontSize: "11px", color: T.gold, fontWeight: 600 }}>{i + 1}</div>
                        <div className="mono" style={{ fontSize: "10px", color: T.textSoft, textAlign: "center" }}>{h.par}</div>
                        <div style={{ fontSize: "10px", color: T.textDim, fontStyle: "italic" }}>—</div>
                        <div style={{ fontSize: "10px", color: T.textDim, textAlign: "right" }}>—</div>
                      </div>
                    );
                  }
                  const total = h.birdieCount + h.parCount + h.bogeyCount + h.doubleCount + h.strichCount;
                  const avgColor = h.avgVsPar <= 0 ? T.gold : h.avgVsPar < 1 ? T.text : h.avgVsPar < 2 ? T.bogey : T.double;
                  const isLowSample = h.samplesSize === 1;
                  return (
                    <div key={i} onClick={() => setStatsHoleDetail(h.holeIdx)}
                      style={{ display: "grid", gridTemplateColumns: "24px 22px 1fr 54px", gap: "6px", padding: "7px 10px", borderTop: `1px solid ${T.line}`, alignItems: "center", cursor: "pointer" }}>
                      <div className="mono" style={{ fontSize: "11px", color: T.gold, fontWeight: 700 }}>{i + 1}</div>
                      <div className="mono" style={{ fontSize: "10px", color: T.textSoft, textAlign: "center" }}>{h.par}</div>
                      <div style={{ display: "flex", height: "10px", borderRadius: "3px", overflow: "hidden", background: T.surface2 }}>
                        {h.birdieCount > 0 && <div style={{ width: `${(h.birdieCount / total) * 100}%`, background: T.gold }} title={`${h.birdieCount} Birdie(s)`} />}
                        {h.parCount > 0 && <div style={{ width: `${(h.parCount / total) * 100}%`, background: T.sage }} title={`${h.parCount} Par(s)`} />}
                        {h.bogeyCount > 0 && <div style={{ width: `${(h.bogeyCount / total) * 100}%`, background: T.bogey }} title={`${h.bogeyCount} Bogey(s)`} />}
                        {h.doubleCount > 0 && <div style={{ width: `${(h.doubleCount / total) * 100}%`, background: T.double }} title={`${h.doubleCount} Double+`} />}
                        {h.strichCount > 0 && <div style={{ width: `${(h.strichCount / total) * 100}%`, background: "#3a1f1f", backgroundImage: "repeating-linear-gradient(45deg, #3a1f1f, #3a1f1f 3px, #5a2a2a 3px, #5a2a2a 6px)" }} title={`${h.strichCount} Strich(e)`} />}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span className="mono" style={{ fontSize: "11px", color: avgColor, fontWeight: 600 }}>
                          {h.avgVsPar > 0 ? "+" : ""}{h.avgVsPar.toFixed(1)}
                        </span>
                        {isLowSample && <span style={{ fontSize: "9px", color: T.textDim, display: "block" }}>1×</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: "9px", color: T.textDim, marginTop: "8px", display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
                <span>🟡 Birdies</span>
                <span>🟢 Pars</span>
                <span>🟠 Bogeys</span>
                <span>🔴 Doubles+</span>
                <span>✗ Striche</span>
              </div>
            </div>

            {/* Uschi stats — only shown if any uschi data exists */}
            {(() => {
              const uschiPlayers = stats.playerStats.filter(p => p.uschi.total !== 0 || p.uschi.par3Wins > 0);
              if (uschiPlayers.length === 0) return null;
              const sortedByUschi = [...uschiPlayers].sort((a, b) => b.uschi.total - a.uschi.total);
              return (
                <div style={{ ...S.card, padding: "12px 14px", marginBottom: "14px" }}>
                  <div style={{ ...S.eyebrow, marginBottom: "10px", color: T.gold }}>💧 Uschi-Statistik</div>
                  {sortedByUschi.map((p, i) => {
                    const pts = p.uschi.total;
                    const ptsColor = pts >= 0 ? T.gold : T.double;
                    return (
                      <div key={p.name} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", padding: "8px 0", borderTop: i > 0 ? `1px solid ${T.line}` : "none" }}>
                        <span style={{ fontSize: "14px", width: "20px" }}>{i === 0 ? "🏆" : ""}</span>
                        <span style={{ color: T.text, fontWeight: 600, flex: 1 }}>{p.name}</span>
                        <span className="mono" style={{ color: ptsColor, fontSize: "13px", fontWeight: 700, minWidth: "36px", textAlign: "right" }}>
                          {pts > 0 ? "+" : ""}{pts}
                        </span>
                        <span style={{ fontSize: "10px", color: T.textSoft }}>
                          {p.uschi.par3Wins > 0 && <span>🎯{p.uschi.par3Wins}</span>}
                          {p.uschi.burntCount > 0 && <span style={{ color: T.double, marginLeft: "6px" }}>🔥{p.uschi.burntCount}</span>}
                        </span>
                      </div>
                    );
                  })}
                  <div style={{ fontSize: "9px", color: T.textDim, marginTop: "8px", textAlign: "center", fontStyle: "italic" }}>
                    🎯 Par-3 Uschis gewonnen · 🔥 Uschis verbrannt
                  </div>
                </div>
              );
            })()}

            {/* Import button */}
            <button onClick={() => setShowStatsImport(true)}
              style={{ ...S.btnSecondary, width: "100%", marginTop: "4px", marginBottom: "14px", fontSize: "12px", padding: "10px" }}>
              👥 Stats aus anderem Sync-Code importieren
            </button>
          </>
        )}
      </div>
    );
  };

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
            WHS Handicap · Stableford · Uschi 2v2
          </p>
          <button onClick={newRound} className="gold-hover"
            style={{ ...S.btnPrimary, width: "100%", padding: "18px", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Neue Runde starten</span>
            <span style={{ fontSize: "18px" }}>→</span>
          </button>

          {rounds.length > 0 && (
            <button onClick={copyLastRound}
              style={{
                width: "100%", marginTop: "8px",
                padding: "12px 16px",
                background: T.surface2,
                color: T.text,
                border: `1px solid ${T.line}`,
                borderRadius: "10px",
                fontSize: "13px",
                fontFamily: "Inter, sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                cursor: "pointer",
              }}>
              <span>🔁</span>
              <span>Wie letztes Mal — gleiche Besetzung</span>
            </button>
          )}

          {/* Live rounds: own round at top (clickable to score), then community */}
          {(() => {
            // Build the displayed list:
            // 1. Own active live round (if any) — directly editable, special styling
            // 2. Other community rounds (sorted by recency)
            const ownLive = activeLiveRounds.find(r => r.code === liveCode);
            const others = activeLiveRounds.filter(r => r.code !== liveCode);
            const allToShow = [
              ...(ownLive ? [{ ...ownLive, _isOwn: true }] : []),
              ...others.map(r => ({ ...r, _isOwn: false })),
            ];
            if (allToShow.length === 0) return null;
            return (
              <div style={{ marginTop: "12px" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  fontSize: "11px", color: T.textDim, fontWeight: 600, letterSpacing: "0.05em",
                  marginBottom: "8px", padding: "0 4px",
                }}>
                  <span style={{
                    display: "inline-block", width: "6px", height: "6px",
                    borderRadius: "50%", background: "#ff4444",
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}/>
                  <span>LIVE GERADE · {allToShow.length} Runde{allToShow.length === 1 ? "" : "n"}</span>
                </div>
                {allToShow.slice(0, 4).map(live => {
                  const data = live.data || {};
                  const clubName = data.cfg?.clubName || "Unbekannter Club";
                  const playerNames = (data.players || []).map(p => p.name).join(", ") || "—";
                  // Compute holes played: highest hole index with any score across all players
                  let holesPlayed = 0;
                  const totalHoles = (data.holes || []).length || 18;
                  if (data.scores && data.players) {
                    let maxHole = 0;
                    data.players.forEach(p => {
                      const ps = data.scores[p.id] || {};
                      Object.keys(ps).forEach(idx => {
                        const v = ps[idx];
                        if ((typeof v === "number" && v > 0) || v === null) {
                          maxHole = Math.max(maxHole, parseInt(idx) + 1);
                        }
                      });
                    });
                    holesPlayed = maxHole;
                  }
                  // Time since last update
                  const ageMs = Date.now() - new Date(live.updated_at).getTime();
                  const ageLabel = ageMs < 60000 ? "gerade eben"
                    : ageMs < 3600000 ? `vor ${Math.floor(ageMs / 60000)} Min`
                    : `vor ${Math.floor(ageMs / 3600000)} Std`;

                  // Click handler: own → continue scoring; other → open viewer
                  const handleClick = (e) => {
                    if (live._isOwn) {
                      e.preventDefault();
                      // Find local round matching this live code, jump back to scoring
                      const matchingRound = rounds.find(r => {
                        const p = getRoundProgress(r);
                        return !p.complete && !p.notStarted;
                      });
                      if (matchingRound) {
                        loadRound(matchingRound);
                      } else {
                        // Fallback: open viewer
                        window.open(`/live.html#${live.code}`, "_blank");
                      }
                    }
                    // Otherwise the link navigates normally
                  };

                  return (
                    <a
                      key={live.code}
                      href={live._isOwn ? "#" : `/live.html#${live.code}`}
                      target={live._isOwn ? "_self" : "_blank"}
                      rel="noopener noreferrer"
                      onClick={handleClick}
                      style={{
                        display: "block", textDecoration: "none",
                        marginBottom: "6px",
                        padding: "12px 14px",
                        background: live._isOwn ? `${T.gold}15` : T.surface2,
                        border: `1px solid ${live._isOwn ? T.gold + "60" : T.line}`,
                        borderRadius: "10px",
                        cursor: "pointer",
                      }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{
                          display: "inline-block", width: "8px", height: "8px",
                          borderRadius: "50%", background: "#ff4444", flexShrink: 0,
                          animation: "pulse 1.5s ease-in-out infinite",
                        }}/>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: "13px", fontWeight: 600, color: T.text,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            display: "flex", alignItems: "center", gap: "6px",
                          }}>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{clubName}</span>
                            {live._isOwn && (
                              <span style={{
                                fontSize: "9px", padding: "2px 6px",
                                background: T.gold, color: T.canvas,
                                borderRadius: "4px", fontWeight: 700, letterSpacing: "0.04em",
                                flexShrink: 0,
                              }}>✏️ DU SCORST</span>
                            )}
                          </div>
                          <div style={{
                            fontSize: "11px", color: T.textSoft, marginTop: "2px",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {playerNames}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div className="mono" style={{ fontSize: "12px", color: T.gold, fontWeight: 700 }}>
                            {holesPlayed}/{totalHoles}
                          </div>
                          <div style={{ fontSize: "9px", color: T.textDim, marginTop: "2px" }}>
                            {ageLabel}
                          </div>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            );
          })()}

          {/* Continuation hint for incomplete rounds */}
          {(() => {
            const running = rounds.find(r => {
              const p = getRoundProgress(r);
              return !p.complete && !p.notStarted;
            });
            if (!running) return null;
            const p = getRoundProgress(running);
            return (
              <button onClick={() => loadRound(running)}
                style={{
                  width: "100%", marginTop: "8px",
                  padding: "14px 16px",
                  background: `${T.gold}12`,
                  color: T.text,
                  border: `1px solid ${T.gold}60`,
                  borderRadius: "10px",
                  fontSize: "13px",
                  fontFamily: "Inter, sans-serif",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  cursor: "pointer",
                  textAlign: "left",
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: "18px" }}>📝</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: T.gold, fontSize: "12px" }}>LAUFENDE RUNDE</div>
                    <div style={{ fontSize: "12px", color: T.textSoft, marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {running.cfg.clubName || "Runde"} · Loch {p.holesPlayed}/{p.totalHoles}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: "16px", color: T.gold }}>→</span>
              </button>
            );
          })()}

          <button
            onClick={() => { setWelcomeSlide(0); setShowWelcome(true); }}
            style={{
              width: "100%", marginTop: "10px",
              padding: "12px 16px",
              background: "transparent",
              color: T.textSoft,
              border: `1px dashed ${T.line}`,
              borderRadius: "10px",
              fontSize: "12px",
              fontFamily: "Inter, sans-serif",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              cursor: "pointer",
            }}>
            <span>ℹ️</span>
            <span>Hilfe & Spielregeln</span>
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
          {[{k:"rounds",l:"Runden"},{k:"friends",l:"Freunde"},{k:"stats",l:"📊 Stats"},{k:"history",l:"Verlauf"}].map(({k,l}) => (
            <button key={k} onClick={() => setTab(k)} style={{
              flex: 1, padding: "10px 0",
              background: tab === k ? T.surface2 : "transparent",
              color: tab === k ? T.text : T.textSoft,
              border: `1px solid ${tab === k ? T.lineStrong : "transparent"}`,
              borderRadius: "10px", fontSize: "12px",
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

          {tab === "stats" && renderStatsTab()}

          {tab === "history" && (
            rounds.length === 0
              ? <EmptyState icon="📊" title="Kein Verlauf" sub="Sobald du Runden gespielt hast, siehst du hier deine Entwicklung." />
              : rounds.map(r => renderRoundCard(r, true))
          )}
        </div>

        {/* Feedback footer */}
        <div style={{
          padding: "24px 16px 32px",
          borderTop: `1px solid ${T.line}`,
          marginTop: "12px",
          textAlign: "center",
        }}>
          <a
            href="mailto:bodowin@gmail.com?subject=Fairway%20Feedback&body=Hallo%20Bodo%2C%0A%0AIch%20habe%20Feedback%20zur%20Fairway-App%3A%0A%0A"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              color: T.textDim,
              fontSize: "11px",
              textDecoration: "none",
              padding: "8px 14px",
              border: `1px dashed ${T.line}`,
              borderRadius: "8px",
            }}>
            <span>💬</span>
            <span>Feedback oder Bug gefunden?</span>
          </a>
          <div style={{ fontSize: "10px", color: T.textDim, marginTop: "10px", fontStyle: "italic" }}>
            Fairway · Made with ⛳ by Bodo
          </div>
        </div>
      </div>
    );
  };

  // Round card (inline, not a sub-component to avoid remounts)
  const renderRoundCard = (r, showFull) => {
    const rClub = allClubs.find(c => c.name === r.cfg.clubName);
    const progress = getRoundProgress(r);
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
    const isRunning = !progress.complete && !progress.notStarted;
    const isNotStarted = progress.notStarted;

    return (
      <div key={r.id} onClick={() => loadRound(r)} className="card-hover"
        style={{
          ...S.card, cursor: "pointer", padding: "14px 16px", marginBottom: "10px", position: "relative",
          paddingRight: "92px", // reserve space for action buttons on the right
          border: isRunning ? `1px solid ${T.gold}60` : S.card.border,
          background: isRunning ? `${T.gold}08` : S.card.background,
        }}>
        {/* Action buttons stacked vertically on the right */}
        <div style={{
          position: "absolute", top: "8px", right: "8px",
          display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end",
        }}>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={e => { e.stopPropagation(); setRoundAnalysisId(r.id); }}
              aria-label="Runden-Analyse"
              title="Runden-Analyse öffnen"
              style={{
                width: "32px", height: "32px",
                background: T.surface2,
                border: `1px solid ${T.line}`,
                borderRadius: "8px",
                color: T.gold,
                fontSize: "14px",
                display: "flex", alignItems: "center", justifyContent: "center",
                lineHeight: 1,
                padding: 0,
              }}>📖</button>
            <button
              onClick={e => { e.stopPropagation(); confirmDelete(r); }}
              aria-label="Runde löschen"
              style={{
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
          {/* SF-Netto value below the buttons (when there's a top score) */}
          {top && !isNotStarted && (
            <div style={{ textAlign: "right", marginTop: "4px" }}>
              <div className="mono" style={{ fontSize: "20px", fontWeight: 700, color: T.gold, lineHeight: 1 }}>{top.sfNT}</div>
              <div style={{ fontSize: "9px", color: T.textDim, letterSpacing: "0.06em", marginTop: "2px" }}>SF NETTO</div>
            </div>
          )}
        </div>

        {/* Running/incomplete badge — positioned BELOW the action buttons */}
        {isRunning && (
          <div style={{
            display: "inline-block", marginBottom: "6px",
            fontSize: "10px", fontWeight: 700, color: T.gold,
            background: `${T.gold}20`, border: `1px solid ${T.gold}60`,
            padding: "2px 8px", borderRadius: "4px",
            letterSpacing: "0.04em",
          }}>
            📝 LÄUFT · {progress.holesPlayed}/{progress.totalHoles}
          </div>
        )}
        {isNotStarted && (
          <div style={{
            display: "inline-block", marginBottom: "6px",
            fontSize: "10px", fontWeight: 700, color: T.textDim,
            background: T.surface3, border: `1px solid ${T.line}`,
            padding: "2px 8px", borderRadius: "4px",
            letterSpacing: "0.04em",
          }}>
            · LEER
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: "24px" }}>
            <div style={{ fontSize: "14px", fontWeight: 600, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: "3px" }}>
              {r.cfg.clubName || r.cfg.name || "Runde"}
            </div>
            <div style={{ fontSize: "11px", color: T.textSoft }}>
              {fmtDate(r.cfg.date)} · {r.cfg.numHoles}L · {r.players.length} {r.players.length === 1 ? "Spieler" : "Spieler"}
            </div>
          </div>
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
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // GAME MODE CARD (Setup sub-component)
  // ═══════════════════════════════════════════════════════════════════════════
  const renderGameModeCard = () => {
    const canTeam = players.length === 4;
    const modes = [
      { k: "stableford",  l: "Stableford Netto",  sub: "Klassisch, Punkte pro Loch",     emoji: "⛳" },
      { k: "uschi-single",l: "Uschi (Einzel)",    sub: "Low/Best Ball · Birdies · Uschi", emoji: "🎯" },
      { k: "uschi-team",  l: "Uschi (2 vs 2)",    sub: "Teamwertung · nur bei 4 Spielern", emoji: "🎯🤝", disabled: !canTeam },
    ];

    return (
      <div style={{ ...S.card, marginTop: "12px" }}>
        <div style={{ ...S.eyebrow, marginBottom: "12px" }}>04 · Spielmodus</div>
        <div style={{ display: "grid", gap: "8px" }}>
          {modes.map(m => {
            const active = gameMode === m.k;
            return (
              <button key={m.k}
                onClick={() => {
                  if (m.disabled) return;
                  setGameMode(m.k);
                  if (m.k === "uschi-team" && canTeam && !teams) {
                    // Auto-assign teams by default
                    const strokes = uschiAdjustedStrokes(players, cfg, selectedClub, holes);
                    setTeams(autoAssignTeams(strokes));
                  }
                  if (m.k === "stableford") setTeams(null);
                }}
                disabled={m.disabled}
                style={{
                  padding: "14px 16px", textAlign: "left",
                  background: active ? `${T.gold}15` : T.surface2,
                  color: active ? T.text : (m.disabled ? T.textDim : T.text),
                  border: `1.5px solid ${active ? T.gold : T.line}`,
                  borderRadius: "12px",
                  fontFamily: "Inter, sans-serif",
                  opacity: m.disabled ? 0.5 : 1,
                  display: "flex", alignItems: "center", gap: "12px",
                }}>
                <span style={{ fontSize: "22px" }}>{m.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "2px" }}>{m.l}</div>
                  <div style={{ fontSize: "11px", color: active ? T.textSoft : T.textDim }}>{m.sub}</div>
                </div>
                {active && <span style={{ color: T.gold, fontSize: "18px" }}>✓</span>}
              </button>
            );
          })}
        </div>

        {/* Uschi Strokes Preview */}
        {gameMode !== "stableford" && players.length >= 2 && renderUschiStrokesPreview()}

        {/* Team Assignment UI */}
        {gameMode === "uschi-team" && canTeam && renderTeamAssignmentUI()}
      </div>
    );
  };

  const renderUschiStrokesPreview = () => {
    const strokes = uschiAdjustedStrokes(players, cfg, selectedClub, holes);
    if (strokes.length < 2) return null;
    const sorted = [...strokes].sort((a, b) => a.ch - b.ch);
    const best = sorted[0];
    const bestPlayer = players.find(p => p.id === best.playerId);

    return (
      <div style={{ marginTop: "14px", padding: "14px", background: T.surface1, border: `1px solid ${T.line}`, borderRadius: "10px" }}>
        <div style={{ ...S.eyebrow, marginBottom: "8px" }}>Angepasste Strokes</div>
        <div style={{ fontSize: "11px", color: T.textDim, marginBottom: "10px", lineHeight: 1.5 }}>
          <span style={{ color: T.gold, fontWeight: 600 }}>{bestPlayer?.name || "Scratch"}</span> (CH {best.ch}) ist der Maßstab. Andere bekommen Strokes = <span className="mono">Diff × 0.8</span> gerundet, auf den schwersten Löchern.
        </div>
        {sorted.map(s => {
          const p = players.find(pl => pl.id === s.playerId);
          if (!p) return null;
          const isRef = s.playerId === best.playerId;
          return (
            <div key={s.playerId} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 0", borderBottom: `1px solid ${T.line}`, fontSize: "12px" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: `${T.gold}20`, border: `1px solid ${T.gold}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: T.gold }}>
                {p.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ color: T.text, fontWeight: 500 }}>{p.name}</span>
                <span style={{ color: T.textDim, marginLeft: "6px" }}>CH {s.ch}</span>
              </div>
              {isRef ? (
                <span style={{ fontSize: "10px", color: T.gold, fontWeight: 600, letterSpacing: "0.05em" }}>MASSSTAB</span>
              ) : (
                <span className="mono" style={{ fontSize: "12px", color: T.gold, fontWeight: 700 }}>
                  +{s.strokes} {s.strokes === 1 ? "Stroke" : "Strokes"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderTeamAssignmentUI = () => {
    const strokes = uschiAdjustedStrokes(players, cfg, selectedClub, holes);
    const teamA = teams?.A || [];
    const teamB = teams?.B || [];
    const inTeam = (pid) => teamA.includes(pid) ? "A" : teamB.includes(pid) ? "B" : null;

    const togglePlayer = (pid) => {
      const cur = inTeam(pid);
      let newA = [...teamA], newB = [...teamB];
      if (cur === "A") { newA = newA.filter(x => x !== pid); if (newB.length < 2) newB.push(pid); }
      else if (cur === "B") { newB = newB.filter(x => x !== pid); if (newA.length < 2) newA.push(pid); }
      else { if (newA.length < 2) newA.push(pid); else if (newB.length < 2) newB.push(pid); }
      setTeams({ A: newA, B: newB });
    };

    return (
      <div style={{ marginTop: "14px", padding: "14px", background: T.surface1, border: `1px solid ${T.line}`, borderRadius: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ ...S.eyebrow }}>Teams</div>
          <button onClick={() => setTeams(autoAssignTeams(strokes))} className="btn-hover"
            style={{ ...S.btnGhost, fontSize: "11px", padding: "5px 9px" }}>
            🎲 Auto: Bester+Schlechtester
          </button>
        </div>
        <div style={{ fontSize: "11px", color: T.textDim, marginBottom: "10px" }}>
          Tap auf einen Spieler um sein Team zu wechseln.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {[["A", teamA], ["B", teamB]].map(([label, members]) => (
            <div key={label} style={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: "8px", padding: "10px", minHeight: "80px" }}>
              <div style={{ ...S.eyebrow, color: label === "A" ? T.gold : T.sage, marginBottom: "6px" }}>Team {label}</div>
              {members.length === 0 && (
                <div style={{ fontSize: "11px", color: T.textDim, fontStyle: "italic" }}>leer</div>
              )}
              {members.map(pid => {
                const p = players.find(pl => pl.id === pid);
                if (!p) return null;
                return (
                  <div key={pid} onClick={() => togglePlayer(pid)}
                    style={{
                      padding: "6px 8px", background: T.surface3, borderRadius: "6px",
                      fontSize: "12px", color: T.text, fontWeight: 500,
                      marginTop: "4px", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: "6px",
                    }}>
                    <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: `${T.gold}20`, border: `1px solid ${T.gold}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 700, color: T.gold }}>
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span>{p.name}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {/* Unassigned players */}
        {players.some(p => !inTeam(p.id)) && (
          <div style={{ marginTop: "10px" }}>
            <div style={{ fontSize: "10px", color: T.textDim, marginBottom: "4px" }}>Nicht zugewiesen:</div>
            <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
              {players.filter(p => !inTeam(p.id)).map(p => (
                <button key={p.id} onClick={() => togglePlayer(p.id)}
                  style={{ padding: "4px 9px", borderRadius: "12px", border: `1px dashed ${T.line}`, background: "transparent", color: T.textSoft, fontSize: "11px" }}>
                  + {p.name}
                </button>
              ))}
            </div>
          </div>
        )}
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

          {/* No results hint + Add new club */}
          {showDD && clubQ.length > 0 && filteredClubs.length === 0 && (
            <div style={{ marginTop: "8px", padding: "14px", background: T.surface2, border: `1px solid ${T.line}`, borderRadius: "12px", textAlign: "center" }}>
              <div style={{ fontSize: "13px", color: T.textSoft, marginBottom: "10px" }}>
                Kein Club gefunden mit "{clubQ}"
              </div>
              <button onClick={() => setShowAddClub(true)} className="gold-hover"
                style={{ ...S.btnPrimary, padding: "10px 16px", fontSize: "13px" }}>
                ➕ Neuen Club hinzufügen
              </button>
            </div>
          )}

          {/* Always visible "+ Neuer Club" button when no club picked yet */}
          {!pickedClub && !cfg.clubName && clubQ.length === 0 && (
            <button onClick={() => setShowAddClub(true)}
              style={{
                marginTop: "10px", width: "100%",
                background: "transparent", color: T.textSoft,
                border: `1px dashed ${T.line}`, borderRadius: "10px",
                padding: "10px", fontSize: "12px",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              }}>
              ➕ Neuen Club manuell hinzufügen
            </button>
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
                const phResult = tee ? resolvePlayerPH(p, cfg, selectedClub, par) : { ph: "—", source: "formula" };
                const ph = phResult.ph;
                const phSource = phResult.source;
                const isFriend = !!friends.find(f => f.name === p.name);
                const teeCount = selectedClub ? Object.keys(selectedClub.tees).length : 0;
                const isEditing = phEditingFor === p.id;
                return (
                  <div key={p.id} style={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: "12px", padding: "12px 14px", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: `${T.gold}20`, border: `1px solid ${T.gold}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: T.gold }}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: "14px", color: T.text }}>{p.name}</div>
                        <div style={{ fontSize: "11px", color: T.textSoft, marginTop: "1px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <span>HCP <span className="mono">{p.hcp}</span></span>
                          <span>·</span>
                          <span>Vorgabe <span className="mono" style={{ color: T.gold, fontWeight: 700 }}>{ph}</span></span>
                          {phSource === "manual" && (
                            <span style={{ fontSize: "9px", color: T.gold, background: `${T.gold}15`, padding: "1px 5px", borderRadius: "3px", fontWeight: 600, letterSpacing: "0.04em" }}>MANUELL</span>
                          )}
                          {phSource === "table" && (
                            <span style={{ fontSize: "9px", color: T.sage, background: `${T.sage}15`, padding: "1px 5px", borderRadius: "3px", fontWeight: 600, letterSpacing: "0.04em" }}>OFFIZIELL</span>
                          )}
                          <button onClick={() => setPhEditingFor(isEditing ? null : p.id)}
                            title="Vorgabe manuell anpassen"
                            style={{ background: "transparent", border: "none", color: T.textDim, fontSize: "11px", padding: "1px 3px", cursor: "pointer" }}>
                            ✏️
                          </button>
                        </div>
                      </div>
                      {!isFriend && (
                        <button onClick={() => saveFriend(p)} title="Als Freund speichern"
                          style={{ background: "transparent", border: `1px solid ${T.line}`, borderRadius: "6px", color: T.textDim, padding: "4px 8px", fontSize: "11px" }}>☆</button>
                      )}
                      <button onClick={() => setPlayers(pl => pl.filter(x => x.id !== p.id))}
                        style={{ background: "transparent", border: "none", color: T.double, fontSize: "18px", padding: "4px 8px", opacity: 0.7 }}>×</button>
                    </div>

                    {/* Manual PH override editor */}
                    {isEditing && (
                      <div className="fade-in" style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px solid ${T.line}` }}>
                        <div style={{ fontSize: "10px", color: T.textDim, marginBottom: "6px", letterSpacing: "0.06em", fontWeight: 600 }}>VORGABE ANPASSEN</div>
                        <div style={{ fontSize: "11px", color: T.textSoft, marginBottom: "8px", lineHeight: 1.4 }}>
                          {tee && (
                            <>Berechnung: <span className="mono">{p.hcp} × {tee.slope}/113 + ({tee.cr} − {tee.par || par}) = {calcPH(p.hcp, tee.slope, tee.cr, tee.par || par)}</span></>
                          )}
                        </div>
                        <div style={{ fontSize: "10px", color: T.gold, marginBottom: "8px", lineHeight: 1.4, fontStyle: "italic" }}>
                          💡 Bei Turnieren werden manchmal andere Vorgaben verteilt. Hier kannst du den Wert für diese Runde überschreiben — nur diese Runde, deine HCP bleibt gespeichert.
                        </div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <input type="number"
                            defaultValue={ph}
                            id={`ph-override-${p.id}`}
                            style={{ ...S.input, width: "80px", textAlign: "center", padding: "8px 10px" }}
                            autoFocus/>
                          <button onClick={() => {
                              const input = document.getElementById(`ph-override-${p.id}`);
                              const val = parseInt(input?.value);
                              if (!isNaN(val)) {
                                setPlayers(pl => pl.map(x => x.id === p.id ? { ...x, phOverride: val } : x));
                              }
                              setPhEditingFor(null);
                            }}
                            className="gold-hover"
                            style={{ ...S.btnPrimary, padding: "8px 14px", fontSize: "12px" }}>
                            Speichern
                          </button>
                          {typeof p.phOverride === "number" && (
                            <button onClick={() => {
                                setPlayers(pl => pl.map(x => {
                                  if (x.id !== p.id) return x;
                                  const { phOverride, ...rest } = x;
                                  return rest;
                                }));
                                setPhEditingFor(null);
                              }}
                              style={{ ...S.btnGhost, padding: "8px 12px", fontSize: "11px", color: T.textSoft }}>
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                    )}

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

        {/* SPIELMODUS */}
        {players.length > 0 && cfg.clubName && renderGameModeCard()}

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
    // Validation
    const sis = holes.map(h => h.si);
    const duplicateSis = sis.filter((si, i) => sis.indexOf(si) !== i);
    const missingSis = [];
    for (let i = 1; i <= cfg.numHoles; i++) if (!sis.includes(i)) missingSis.push(i);
    const teePar = playerTee(players[0] || {}, cfg, selectedClub)?.par;
    const parMismatch = teePar && par !== teePar;
    const hasWarnings = duplicateSis.length > 0 || missingSis.length > 0 || parMismatch;

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

          {hasWarnings && (
            <div style={{ padding: "10px 14px", background: `${T.bogey}15`, border: `1px solid ${T.bogey}40`, borderRadius: "12px", marginBottom: "14px", fontSize: "12px", color: T.bogey, lineHeight: 1.5 }}>
              <div style={{ fontWeight: 700, marginBottom: "4px" }}>⚠️ Achtung:</div>
              {duplicateSis.length > 0 && <div>• Vorgabenwerte doppelt: {[...new Set(duplicateSis)].join(", ")}</div>}
              {missingSis.length > 0 && <div>• Vorgabenwerte fehlen: {missingSis.join(", ")}</div>}
              {parMismatch && <div>• Par-Summe ({par}) passt nicht zum Tee-Par ({teePar})</div>}
            </div>
          )}

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

          {/* Action buttons: Uschi protocol + Share + Live */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "14px", flexWrap: "wrap" }}>
            {gameMode !== "stableford" && (
              <button onClick={() => setShowUschiReview(true)}
                style={{
                  flex: "1 1 140px",
                  background: `${T.gold}12`,
                  color: T.gold,
                  border: `1px solid ${T.gold}40`,
                  borderRadius: "10px",
                  padding: "10px 12px",
                  fontSize: "13px", fontWeight: 600,
                  fontFamily: "Inter, sans-serif",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                }}>
                🎯 Uschi-Protokoll
              </button>
            )}
            <button onClick={shareResults}
              style={{
                flex: "1 1 140px",
                background: `${T.sage}15`,
                color: T.sage,
                border: `1px solid ${T.sage}40`,
                borderRadius: "10px",
                padding: "10px 12px",
                fontSize: "13px", fontWeight: 600,
                fontFamily: "Inter, sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              }}>
              📸 Zwischenstand teilen
            </button>
            <button onClick={() => setShowLiveModal(true)}
              style={{
                flex: "1 1 140px",
                background: liveCode ? `${T.gold}20` : "transparent",
                color: liveCode ? T.gold : T.textSoft,
                border: `1px solid ${liveCode ? T.gold + "60" : T.line}`,
                borderRadius: "10px",
                padding: "10px 12px",
                fontSize: "13px", fontWeight: 600,
                fontFamily: "Inter, sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              }}>
              {liveCode ? (
                <>
                  <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: T.gold, display: "inline-block", boxShadow: `0 0 6px ${T.gold}` }}/>
                  Live aktiv
                </>
              ) : (
                <>📡 Live-Ticker</>
              )}
            </button>
          </div>

          {scoringMode === "batch" ? renderBatchMode() : renderLiveMode()}

          {/* Live totals card */}
          <div style={{ ...S.card, marginTop: "14px", marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ ...S.eyebrow }}>Zwischenstand</div>
              {gameMode !== "stableford" && uschiResult && (
                <div style={{ fontSize: "9px", color: T.gold, letterSpacing: "0.08em", fontWeight: 600 }}>🎯 USCHI-MODUS</div>
              )}
            </div>
            {/* Sort by uschi points if in uschi mode, else by sf netto */}
            {(() => {
              const withStats = players.map(p => ({ p, s: getStats(p), uschiTotal: uschiResult?.totals?.[p.id]?.total ?? 0 }));
              const sorted = gameMode !== "stableford" && uschiResult
                ? [...withStats].sort((a, b) => b.uschiTotal - a.uschiTotal)
                : [...withStats].sort((a, b) => b.s.sfNT - a.s.sfNT);
              return sorted.map((item, i) => {
                const p = item.p;
                const s = item.s;
                const isUschi = gameMode !== "stableford" && uschiResult;
                const uschiTotal = item.uschiTotal;
                return (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: i < sorted.length - 1 ? `1px solid ${T.line}` : "none" }}>
                    <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: `${T.gold}20`, border: `1px solid ${T.gold}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: T.gold, flexShrink: 0 }}>
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "14px", color: T.text, display: "flex", alignItems: "center", gap: "6px" }}>
                        {p.name}
                        {s.tee?.teeName && <TeeDot name={s.tee.teeName} size={8} />}
                        {i === 0 && isUschi && <span style={{ fontSize: "14px" }}>👑</span>}
                      </div>
                      <div style={{ fontSize: "11px", color: T.textSoft }}>
                        {isUschi ? (
                          <>SF <span className="mono">{s.sfNT}</span> · Brutto <span className="mono">{s.bT || "—"}{s.strichCount > 0 ? "*" : ""}</span></>
                        ) : (
                          <>Vorgabe <span className="mono">{s.ph}</span> · Brutto <span className="mono">{s.bT || "—"}{s.strichCount > 0 ? "*" : ""}</span></>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {isUschi ? (
                        <>
                          <div className="mono" style={{ fontSize: "22px", fontWeight: 800, color: uschiTotal >= 0 ? T.gold : T.double, lineHeight: 1 }}>
                            {uschiTotal > 0 ? "+" : ""}{uschiTotal}
                          </div>
                          <div style={{ fontSize: "9px", color: T.textDim, marginTop: "2px" }}>USCHI</div>
                        </>
                      ) : (
                        <>
                          <div className="mono" style={{ fontSize: "22px", fontWeight: 800, color: T.gold, lineHeight: 1 }}>{s.sfNT}</div>
                          <div style={{ fontSize: "9px", color: T.textDim, marginTop: "2px" }}>SF NETTO</div>
                        </>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
            {/* Team totals if in team mode */}
            {gameMode === "uschi-team" && teamResult && teams?.A?.length === 2 && teams?.B?.length === 2 && (
              <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px solid ${T.lineStrong}` }}>
                <div style={{ fontSize: "9px", color: T.textDim, letterSpacing: "0.08em", fontWeight: 600, marginBottom: "6px" }}>TEAM-STAND</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {["A", "B"].map(k => {
                    const names = (teams[k] || []).map(pid => players.find(p => p.id === pid)?.name).filter(Boolean).join(" + ");
                    const total = teamResult.teamTotals[k];
                    return (
                      <div key={k} style={{ background: T.surface2, borderRadius: "8px", padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: "11px", color: T.textSoft, fontWeight: 500 }}>{names}</div>
                        <div className="mono" style={{ fontSize: "16px", fontWeight: 700, color: total >= 0 ? T.gold : T.double }}>
                          {total > 0 ? "+" : ""}{total}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
                  {gameMode !== "stableford" && hole.par === 3 && (
                    <button onClick={e => { e.stopPropagation(); setUschiPromptHole(i); }}
                      title="Uschi-Daten"
                      style={{
                        marginLeft: "6px",
                        background: par3Data[i] ? `${T.gold}20` : "transparent",
                        border: `1px solid ${par3Data[i] ? T.gold + "60" : T.line}`,
                        color: par3Data[i] ? T.gold : T.textDim,
                        borderRadius: "5px", padding: "2px 5px",
                        fontSize: "11px", lineHeight: 1,
                      }}>🎯</button>
                  )}
                </td>
                <td className="mono" style={{ padding: "8px 8px", textAlign: "center", fontSize: "13px", color: T.textSoft }}>{hole.par}</td>
                {players.map(p => {
                  const g = scores[p.id]?.[i];
                  const tee = playerTee(p, cfg, selectedClub);
                  const ph = tee ? resolvePlayerPH(p, cfg, selectedClub, par).ph : 0;
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
            const ph = tee ? resolvePlayerPH(p, cfg, selectedClub, par).ph : 0;
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
                      {/* Uschi stroke advantage badge inline next to name */}
                      {gameMode !== "stableford" && (() => {
                        const playerStrokes = uschiStrokes.find(s => s.playerId === p.id);
                        if (!playerStrokes) return null;
                        const strokesOnThisHole = playerStrokes.perHole[currentHole] || 0;
                        const maxOnHole = Math.max(0, ...uschiStrokes.map(s => s.perHole[currentHole] || 0));
                        const isMaxOnHole = strokesOnThisHole === maxOnHole && strokesOnThisHole > 0;
                        const isBestOverall = playerStrokes.strokes === Math.min(...uschiStrokes.map(s => s.strokes));
                        if (isBestOverall && strokesOnThisHole === 0) {
                          return (
                            <span style={{ fontSize: "9px", color: T.sage, background: `${T.sage}15`, padding: "2px 5px", borderRadius: "3px", fontWeight: 700, letterSpacing: "0.04em" }}>🎯 MASSSTAB</span>
                          );
                        }
                        if (strokesOnThisHole > 0) {
                          return (
                            <span style={{ fontSize: "10px", color: isMaxOnHole ? T.gold : T.sage, background: isMaxOnHole ? `${T.gold}20` : `${T.sage}15`, padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>
                              🎯 {strokesOnThisHole === 1 ? "1 vor" : `${strokesOnThisHole} vor`}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <div style={{ fontSize: "11px", color: T.textSoft, marginTop: "2px" }}>
                      HCP <span className="mono">{p.hcp}</span>
                      {hs > 0 && <> · <span style={{ color: T.gold, fontWeight: 600 }}>Pers. Par {personalPar}</span></>}
                    </div>
                  </div>
                </div>

                <button onClick={() => {
                    // Correction mode: entering this hole when it's already fully scored?
                    const isFullyScored = players.every(pp => {
                      const g = scores[pp.id]?.[currentHole];
                      return isValid(g) || isStrich(g);
                    });
                    setPadOpen({ playerId: p.id, holeIdx: currentHole, correctionMode: isFullyScored });
                  }}
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
  // USCHI RANKING (called from results)
  // ═══════════════════════════════════════════════════════════════════════════
  const renderUschiRanking = () => {
    if (!uschiResult) return null;
    const medals = ["🥇", "🥈", "🥉"];

    // Individual ranking
    const individual = players.map(p => ({
      p,
      total: uschiResult.totals[p.id]?.total || 0,
      best: uschiResult.totals[p.id]?.best || 0,
      worst: uschiResult.totals[p.id]?.worst || 0,
      birdies: uschiResult.totals[p.id]?.birdies || 0,
      uschi: uschiResult.totals[p.id]?.uschi || 0,
    })).sort((a, b) => b.total - a.total);

    // Team ranking if applicable
    const showTeam = gameMode === "uschi-team" && teamResult && teams?.A?.length === 2 && teams?.B?.length === 2;
    const teamNames = (tkey) => {
      const ids = teams[tkey] || [];
      return ids.map(id => players.find(p => p.id === id)?.name).filter(Boolean).join(" + ");
    };

    // Pending uschi holes
    const openCount = uschiResult.openUschi?.length || 0;

    return (
      <>
        {showTeam && (
          <div style={{ ...S.card, background: `linear-gradient(135deg, ${T.surface3}, ${T.surface2})`, border: `2px solid ${T.gold}`, marginBottom: "14px" }}>
            <div style={{ ...S.eyebrow, color: T.gold, marginBottom: "14px" }}>🏆 🤝 Team-Wertung</div>
            {[
              { k: "A", color: T.gold },
              { k: "B", color: T.sage },
            ].sort((a, b) => teamResult.teamTotals[b.k] - teamResult.teamTotals[a.k]).map((t, i) => (
              <div key={t.k} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 0", borderBottom: i === 0 ? `1px solid ${T.line}` : "none" }}>
                <div style={{ fontSize: "28px", width: "34px", textAlign: "center" }}>
                  {medals[i]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ ...S.eyebrow, color: t.color, marginBottom: "3px" }}>Team {t.k}</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: T.text }}>{teamNames(t.k) || `(${t.k})`}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="mono serif" style={{ fontSize: "36px", fontWeight: 700, color: teamResult.teamTotals[t.k] >= 0 ? T.gold : T.double, lineHeight: 1 }}>
                    {teamResult.teamTotals[t.k] > 0 ? "+" : ""}{teamResult.teamTotals[t.k]}
                  </div>
                  <div style={{ fontSize: "9px", color: T.textDim, marginTop: "2px" }}>PUNKTE</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ ...S.card, background: `linear-gradient(135deg, ${T.surface2}, ${T.surface1})`, border: `1px solid ${T.gold}40`, marginBottom: "14px" }}>
          <div style={{ ...S.eyebrow, color: T.gold, marginBottom: "14px" }}>
            🎯 {showTeam ? "Einzelpunkte" : "Uschi-Ranking"}
          </div>
          {individual.map((s, i) => (
            <div key={s.p.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: i < individual.length - 1 ? `1px solid ${T.line}` : "none" }}>
              <div style={{ fontSize: "24px", width: "30px", textAlign: "center" }}>
                {(!showTeam && medals[i]) || <span className="mono" style={{ fontSize: "15px", color: T.textSoft, fontWeight: 700 }}>{i+1}.</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "15px", color: T.text }}>{s.p.name}</div>
                <div style={{ fontSize: "10px", color: T.textSoft, marginTop: "3px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {s.best > 0 && <span style={{ color: T.sage }}>★{s.best}</span>}
                  {s.worst < 0 && <span style={{ color: T.double }}>☆{s.worst}</span>}
                  {s.birdies > 0 && <span style={{ color: T.birdie }}>🐦{s.birdies}</span>}
                  {s.uschi > 0 && <span style={{ color: T.gold }}>🎯{s.uschi}</span>}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="mono serif" style={{ fontSize: "30px", fontWeight: 700, color: s.total >= 0 ? T.gold : T.double, lineHeight: 1 }}>
                  {s.total > 0 ? "+" : ""}{s.total}
                </div>
                <div style={{ fontSize: "9px", color: T.textDim, marginTop: "2px" }}>PUNKTE</div>
              </div>
            </div>
          ))}
        </div>

        {openCount > 0 && (
          <div onClick={() => setShowUschiReview(true)}
            style={{ background: `${T.bogey}15`, border: `1px solid ${T.bogey}50`, borderRadius: "12px", padding: "14px", marginBottom: "14px", fontSize: "13px", color: T.bogey, cursor: "pointer", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: "2px" }}>{openCount} Par-3 ohne Uschi-Daten</div>
              <div style={{ fontSize: "11px", color: T.textSoft }}>Tap zum Vervollständigen — betrifft die Endpunkte.</div>
            </div>
            <span style={{ color: T.bogey, fontSize: "18px" }}>›</span>
          </div>
        )}
      </>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SHARE IMAGE (PNG generation via Canvas for WhatsApp etc.)
  // ═══════════════════════════════════════════════════════════════════════════
  const generateShareImage = async () => {
    const all = players.map(p => ({ p, ...getStats(p) }));
    const ranked = [...all].sort((a, b) => b.sfNT - a.sfNT);
    const isUschi = gameMode !== "stableford";

    // Detect if this is an in-progress round (not all holes scored by all players)
    // Count maximum holes played by any player
    const holesPlayed = Math.max(0, ...all.map(s =>
      holes.filter((_, i) => {
        const g = scores[s.p.id]?.[i];
        return isValid(g) || isStrich(g);
      }).length
    ));
    const isInProgress = holesPlayed > 0 && holesPlayed < holes.length;

    // Team mode data (only relevant in uschi-team)
    const isTeamMode = gameMode === "uschi-team" && teamResult && teams?.A?.length === 2 && teams?.B?.length === 2;
    const teamMap = {}; // playerId -> "A" or "B"
    if (isTeamMode) {
      (teams.A || []).forEach(pid => { teamMap[pid] = "A"; });
      (teams.B || []).forEach(pid => { teamMap[pid] = "B"; });
    }

    // Calculate dimensions — tall portrait like a story post
    const W = 1080;
    const rowH = 130;
    const headerH = 320;
    const footerH = 100;
    const teamBlockH = isTeamMode ? 260 : 0; // extra space for team ranking at top
    const H = headerH + teamBlockH + rowH * players.length + footerH + (isUschi ? 140 : 0);

    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0a1410");
    bg.addColorStop(0.5, "#101e16");
    bg.addColorStop(1, "#0a1410");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Gold accent line at top
    ctx.fillStyle = "#c9a85c";
    ctx.fillRect(0, 0, W, 6);

    // Logo mark (simple golf flag)
    ctx.save();
    ctx.translate(70, 80);
    ctx.strokeStyle = "#c9a85c";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(30, 30, 24, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#c9a85c";
    ctx.beginPath(); ctx.arc(30, 30, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(28, 6, 4, 18);
    ctx.beginPath(); ctx.moveTo(32, 6); ctx.lineTo(48, 10); ctx.lineTo(32, 14); ctx.closePath(); ctx.fill();
    ctx.restore();

    // "FAIRWAY" wordmark
    ctx.fillStyle = "#f0e9d3";
    ctx.font = "italic 56px 'Instrument Serif', Georgia, serif";
    ctx.fillText("Fairway", 150, 95);

    // Live indicator if in-progress
    if (isInProgress) {
      ctx.fillStyle = "rgba(201, 168, 92, 0.18)";
      ctx.fillRect(310, 55, 230, 50);
      ctx.fillStyle = "#c9a85c";
      ctx.font = "700 22px 'Inter', sans-serif";
      ctx.fillText(`● LIVE · Loch ${holesPlayed}/${holes.length}`, 330, 88);
    }

    // Club & date
    ctx.fillStyle = "#a2bfa2";
    ctx.font = "500 32px 'Inter', sans-serif";
    const title = cfg.clubName || cfg.name || "Runde";
    ctx.fillText(title, 70, 170);

    ctx.fillStyle = "#7a9281";
    ctx.font = "400 24px 'Inter', sans-serif";
    ctx.fillText(`${fmtDate(cfg.date)} · ${cfg.numHoles} Loch · Par ${par}`, 70, 210);

    // Mode badge
    if (isUschi) {
      ctx.fillStyle = "rgba(201, 168, 92, 0.15)";
      ctx.fillRect(70, 240, 280, 44);
      ctx.fillStyle = "#c9a85c";
      ctx.font = "600 20px 'Inter', sans-serif";
      const badge = gameMode === "uschi-team" ? "🎯 Uschi 2 vs 2" : "🎯 Uschi-Modus";
      ctx.fillText(badge, 88, 270);
    }

    // Separator
    ctx.strokeStyle = "#213629";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(70, headerH - 10); ctx.lineTo(W - 70, headerH - 10); ctx.stroke();

    let y = headerH + 20;
    const medals = ["🥇", "🥈", "🥉"];

    // === TEAM RANKING BLOCK (only for uschi-team) ===
    if (isTeamMode) {
      // Heading
      ctx.fillStyle = "#c9a85c";
      ctx.font = "700 22px 'Inter', sans-serif";
      ctx.fillText("🏆 TEAM-WERTUNG", 70, y);
      y += 40;

      const teamData = [
        { k: "A", color: "#c9a85c", total: teamResult.teamTotals.A, members: teams.A },
        { k: "B", color: "#7ea88a", total: teamResult.teamTotals.B, members: teams.B },
      ].sort((a, b) => b.total - a.total);

      teamData.forEach((t, i) => {
        const memberNames = t.members.map(pid => players.find(p => p.id === pid)?.name || "?").join(" + ");
        const isLead = i === 0 && teamData[0].total !== teamData[1].total;

        // Background for winning team
        if (isLead) {
          ctx.fillStyle = "rgba(201, 168, 92, 0.10)";
          ctx.fillRect(60, y - 10, W - 120, 90);
        }

        // Medal or position
        ctx.font = "bold 42px sans-serif";
        if (medals[i]) ctx.fillText(medals[i], 70, y + 40);

        // Team label (A/B colored dot)
        ctx.fillStyle = t.color;
        ctx.beginPath(); ctx.arc(170, y + 35, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#0a1410";
        ctx.font = "bold 22px 'Inter', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(t.k, 170, y + 43);
        ctx.textAlign = "left";

        // Team members
        ctx.fillStyle = "#f0e9d3";
        ctx.font = "600 28px 'Inter', sans-serif";
        ctx.fillText(memberNames, 210, y + 25);

        ctx.fillStyle = "#7a9281";
        ctx.font = "500 18px 'Inter', sans-serif";
        ctx.fillText(`Team ${t.k}`, 210, y + 52);

        // Points (big)
        ctx.textAlign = "right";
        ctx.fillStyle = t.total >= 0 ? "#c9a85c" : "#d67a5c";
        ctx.font = "bold 72px 'Instrument Serif', Georgia, serif";
        const sign = t.total > 0 ? "+" : "";
        ctx.fillText(`${sign}${t.total}`, W - 70, y + 55);
        ctx.textAlign = "left";

        y += 100;
      });
      y += 20; // gap before individual ranking
    }

    // === INDIVIDUAL RANKING ===
    // Rank header
    ctx.fillStyle = "#5d6e63";
    ctx.font = "600 18px 'Inter', sans-serif";
    if (isTeamMode) {
      ctx.fillText("EINZELPUNKTE", 70, y);
    } else {
      ctx.fillText("RANG", 70, y);
      ctx.fillText("SPIELER", 200, y);
    }
    ctx.textAlign = "right";
    ctx.fillText(isUschi ? "USCHI" : "SF NETTO", W - 70, y);
    ctx.textAlign = "left";
    y += 35;

    // For uschi mode, also get uschi ranking
    const uschiRanked = isUschi && uschiResult
      ? players.map(p => ({
          p,
          total: uschiResult.totals[p.id]?.total || 0,
        })).sort((a, b) => b.total - a.total)
      : null;

    const rankingData = uschiRanked || ranked.map(s => ({ p: s.p, total: s.sfNT }));

    rankingData.forEach((item, i) => {
      const s = all.find(a => a.p.id === item.p.id);
      const isWinner = i === 0 && !isTeamMode; // in team mode, don't highlight individual winner
      const teamLetter = isTeamMode ? teamMap[item.p.id] : null;
      const teamColor = teamLetter === "A" ? "#c9a85c" : teamLetter === "B" ? "#7ea88a" : null;

      // Row background for winner
      if (isWinner) {
        ctx.fillStyle = "rgba(201, 168, 92, 0.08)";
        ctx.fillRect(60, y - 10, W - 120, rowH - 10);
      }

      // Medal / rank number / or in team mode: team letter badge
      if (isTeamMode && teamColor) {
        // Team color dot with letter
        ctx.fillStyle = teamColor;
        ctx.beginPath(); ctx.arc(110, y + 40, 22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#0a1410";
        ctx.font = "bold 24px 'Inter', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(teamLetter, 110, y + 49);
        ctx.textAlign = "left";
      } else {
        ctx.font = "bold 48px sans-serif";
        if (medals[i]) {
          ctx.fillText(medals[i], 70, y + 50);
        } else {
          ctx.fillStyle = "#7a9281";
          ctx.font = "700 42px 'Inter', sans-serif";
          ctx.fillText(`${i + 1}.`, 80, y + 45);
        }
      }

      // Player avatar circle
      ctx.fillStyle = "rgba(201, 168, 92, 0.18)";
      ctx.beginPath(); ctx.arc(225, y + 40, 30, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(201, 168, 92, 0.4)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#c9a85c";
      ctx.font = "700 28px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(item.p.name.charAt(0).toUpperCase(), 225, y + 50);
      ctx.textAlign = "left";

      // Name
      ctx.fillStyle = "#f0e9d3";
      ctx.font = "600 32px 'Inter', sans-serif";
      ctx.fillText(item.p.name, 275, y + 35);

      // HCP / Vorgabe / Brutto
      ctx.fillStyle = "#7a9281";
      ctx.font = "400 20px 'Inter', sans-serif";
      const teeName = s.tee?.teeName ? ` · ${s.tee.teeName.split(" ")[0]}` : "";
      ctx.fillText(`HCP ${s.p.hcp} · Vorgabe ${s.ph}${teeName}`, 275, y + 62);

      if (s.bT) {
        const bruttoStar = s.strichCount > 0 ? "*" : "";
        ctx.fillText(`Brutto ${s.bT}${bruttoStar} · SF Brutto ${s.sfBT}`, 275, y + 86);
      }

      // Points (big, gold)
      ctx.textAlign = "right";
      ctx.fillStyle = isWinner ? "#ddb970" : "#c9a85c";
      ctx.font = "bold 64px 'Instrument Serif', Georgia, serif";
      const mainScore = isUschi ? (item.total > 0 ? `+${item.total}` : `${item.total}`) : `${s.sfNT}`;
      ctx.fillText(mainScore, W - 70, y + 55);
      ctx.fillStyle = "#5d6e63";
      ctx.font = "500 16px 'Inter', sans-serif";
      ctx.fillText(isUschi ? "PUNKTE" : "PUNKTE", W - 70, y + 85);
      ctx.textAlign = "left";

      y += rowH;
    });

    // If Uschi mode, also show SF Netto as secondary
    if (isUschi) {
      ctx.fillStyle = "#213629";
      ctx.fillRect(70, y + 10, W - 140, 1);
      y += 30;
      ctx.fillStyle = "#a2bfa2";
      ctx.font = "600 18px 'Inter', sans-serif";
      ctx.fillText("STABLEFORD NETTO (NEBENWERTUNG)", 70, y);
      y += 40;
      ranked.forEach((s, i) => {
        ctx.fillStyle = "#7a9281";
        ctx.font = "500 22px 'Inter', sans-serif";
        ctx.fillText(`${i + 1}. ${s.p.name}`, 70, y);
        ctx.textAlign = "right";
        ctx.fillStyle = "#c9a85c";
        ctx.fillText(`${s.sfNT}`, W - 70, y);
        ctx.textAlign = "left";
        y += 32;
      });
    }

    // Footer
    ctx.fillStyle = "#5d6e63";
    ctx.font = "italic 22px 'Instrument Serif', Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("Fairway · Golf Scorecard", W / 2, H - 40);
    ctx.textAlign = "left";

    // Gold bottom line
    ctx.fillStyle = "#c9a85c";
    ctx.fillRect(0, H - 6, W, 6);

    return new Promise(resolve => {
      canvas.toBlob(blob => resolve(blob), "image/png", 0.95);
    });
  };

  // Share flow: 1) generate image, 2) show preview modal, 3) user confirms -> share
  const shareResults = async () => {
    try {
      const blob = await generateShareImage();
      if (!blob) { alert("Bild konnte nicht erstellt werden."); return; }
      const url = URL.createObjectURL(blob);
      setSharePreview({ blob, url });
    } catch (err) {
      console.error("Share failed:", err);
      alert("Bild konnte nicht erstellt werden. Bitte nochmal versuchen.");
    }
  };

  // Called from preview modal's "Teilen" button
  const confirmShare = async () => {
    if (!sharePreview?.blob) return;
    const { blob } = sharePreview;
    const file = new File([blob], `fairway-${cfg.clubName || "runde"}-${cfg.date}.png`, { type: "image/png" });

    try {
      // Try Web Share API first (iOS/Android modern browsers)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `${cfg.clubName || "Runde"} · ${fmtDate(cfg.date)}`,
          });
          closeSharePreview();
          return;
        } catch (err) {
          if (err.name === "AbortError") return; // user cancelled share sheet, keep preview open
        }
      }
      // Fallback: download
      const a = document.createElement("a");
      a.href = sharePreview.url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      closeSharePreview();
    } catch (err) {
      console.error("Share failed:", err);
      alert("Teilen hat nicht geklappt. Bitte nochmal versuchen.");
    }
  };

  const closeSharePreview = () => {
    if (sharePreview?.url) {
      setTimeout(() => URL.revokeObjectURL(sharePreview.url), 100);
    }
    setSharePreview(null);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RESULTS
  // ═══════════════════════════════════════════════════════════════════════════
  const renderResults = () => {
    const all = players.map(p => ({ p, ...getStats(p) }));
    const ranked = [...all].sort((a,b) => b.sfNT - a.sfNT);
    const medals = ["🥇", "🥈", "🥉"];
    const isUschi = gameMode !== "stableford";

    return (
      <div className="fade-in">
        {renderProgressBar()}
        <div style={S.page}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "6px" }}>
            <h2 className="serif" style={{ fontSize: "28px", margin: 0, color: T.text }}>Auswertung</h2>
            <button onClick={shareResults} className="gold-hover"
              style={{
                background: T.gold, color: T.canvas,
                border: "none", borderRadius: "10px",
                padding: "10px 14px",
                fontSize: "13px", fontWeight: 700,
                fontFamily: "Inter, sans-serif",
                display: "flex", alignItems: "center", gap: "6px",
                whiteSpace: "nowrap",
              }}>
              📸 Teilen
            </button>
          </div>
          <div style={{ fontSize: "12px", color: T.textSoft, marginBottom: "20px" }}>
            {cfg.clubName || cfg.name || "Runde"} · {fmtDate(cfg.date)} · Par {par}
            {isUschi && <span style={{ color: T.gold, marginLeft: "6px" }}>· 🎯 Uschi-Modus{gameMode === "uschi-team" ? " (2v2)" : ""}</span>}
          </div>

          {/* USCHI RANKING (only in uschi mode) */}
          {isUschi && uschiResult && renderUschiRanking()}

          {/* Standard Stableford Netto Ranking */}
          <div style={{ ...S.card, background: `linear-gradient(135deg, ${T.surface2}, ${T.surface1})`, border: `1px solid ${T.gold}40`, marginBottom: "20px" }}>
            <div style={{ ...S.eyebrow, color: T.gold, marginBottom: "14px" }}>
              {isUschi ? "📊 Stableford Netto (Nebenwertung)" : "🏆 Stableford Netto"}
            </div>
            {ranked.map((s,i) => (
              <div key={s.p.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: i < ranked.length - 1 ? `1px solid ${T.line}` : "none" }}>
                <div style={{ fontSize: "24px", width: "30px", textAlign: "center" }}>
                  {!isUschi && medals[i] || <span className="mono" style={{ fontSize: "15px", color: T.textSoft, fontWeight: 700 }}>{i+1}.</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: "15px", color: T.text, display: "flex", alignItems: "center", gap: "6px" }}>
                    {s.p.name}
                    {s.tee?.teeName && <TeeDot name={s.tee.teeName} size={9} />}
                  </div>
                  <div style={{ fontSize: "11px", color: T.textSoft, marginTop: "1px" }}>
                    HCP <span className="mono">{s.p.hcp}</span> · Vorgabe <span className="mono">{s.ph}</span> · Brutto <span className="mono">{s.bT || "—"}{s.strichCount > 0 ? "*" : ""}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="mono serif" style={{ fontSize: "32px", fontWeight: 700, color: T.gold, lineHeight: 1 }}>{s.sfNT}</div>
                  <div style={{ fontSize: "9px", color: T.textDim, marginTop: "2px" }}>PUNKTE</div>
                </div>
              </div>
            ))}
            {all.some(s => s.strichCount > 0) && (
              <div style={{ fontSize: "10px", color: T.textDim, marginTop: "12px", paddingTop: "10px", borderTop: `1px dashed ${T.line}`, fontStyle: "italic", lineHeight: 1.5 }}>
                * Brutto ohne gestrichene Löcher — {all.filter(s => s.strichCount > 0).map(s => `${s.p.name}: ${s.strichCount}`).join(", ")}
              </div>
            )}
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
                  { l: s.strichCount > 0 ? "Brutto Strokeplay *" : "Brutto Strokeplay", v: s.bT },
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
              onClick={() => {
                const r = rounds.find(rr => rr.id === loadedRoundId);
                if (r) confirmDelete(r);
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

          {/* Runden-Analyse Button — only show if round has data */}
          {loadedRoundId && (
            <button
              onClick={() => setRoundAnalysisId(loadedRoundId)}
              className="gold-hover"
              style={{
                width: "100%", marginTop: "10px",
                background: `${T.gold}10`,
                color: T.gold,
                border: `1px solid ${T.gold}40`,
                borderRadius: "12px",
                padding: "14px",
                fontSize: "13px",
                fontWeight: 600,
                fontFamily: "Inter, sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              }}>
              <span>📖</span>
              <span>Runden-Analyse anzeigen</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // USCHI PAR-3 DIALOG
  // ═══════════════════════════════════════════════════════════════════════════
  const renderUschiPar3Dialog = () => {
    if (uschiPromptHole === null) return null;
    const holeIdx = uschiPromptHole;
    const hole = holes[holeIdx];
    if (!hole || hole.par !== 3) return null;

    const current = par3Data[holeIdx] || { greenHits: [], closest: null };
    const greenHits = current.greenHits || [];
    const closest = current.closest || null;

    const toggleGreen = (pid) => {
      const next = greenHits.includes(pid)
        ? greenHits.filter(x => x !== pid)
        : [...greenHits, pid];
      const newClosest = next.includes(closest) ? closest : null;
      setPar3Data({ ...par3Data, [holeIdx]: { greenHits: next, closest: newClosest } });
    };
    const setClosest = (pid) => {
      setPar3Data({ ...par3Data, [holeIdx]: { greenHits, closest: pid } });
    };
    const clearAll = () => {
      const next = { ...par3Data };
      delete next[holeIdx];
      setPar3Data(next);
    };

    const canClose = greenHits.length === 0 || closest !== null;

    return (
      <div onClick={() => canClose && setUschiPromptHole(null)}
        style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div onClick={e => e.stopPropagation()} className="slide-up"
          style={{ width: "100%", maxWidth: "520px", background: T.surface1, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", border: `1px solid ${T.line}`, padding: "20px 16px 28px", maxHeight: "92vh", overflowY: "auto" }}>
          <SwipeHandle onClose={() => canClose && setUschiPromptHole(null)} />

          <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "16px" }}>
            <div style={{ fontSize: "32px" }}>🎯</div>
            <div>
              <div className="serif" style={{ fontSize: "22px", color: T.text, lineHeight: 1.1 }}>
                Uschi · Loch <span style={{ color: T.gold }}>{holeIdx + 1}</span>
              </div>
              <div style={{ fontSize: "12px", color: T.textSoft, marginTop: "4px" }}>
                Par {hole.par} · SI {hole.si}
              </div>
            </div>
          </div>

          {/* Step 1: Green hits */}
          <div style={{ ...S.eyebrow, marginBottom: "8px" }}>1 · Wer hat das Grün getroffen?</div>
          <div style={{ fontSize: "11px", color: T.textDim, marginBottom: "10px" }}>
            Auch jene die Par verfehlt haben — das bestimmt ob die Uschi "verbrannt" wird.
          </div>
          <div style={{ display: "grid", gap: "6px", marginBottom: "18px" }}>
            {players.map(p => {
              const sc = scores[p.id]?.[holeIdx];
              const isStr = isStrich(sc);
              const active = greenHits.includes(p.id);
              return (
                <button key={p.id} onClick={() => !isStr && toggleGreen(p.id)}
                  disabled={isStr}
                  style={{
                    padding: "12px 14px", textAlign: "left",
                    background: active ? `${T.sage}15` : T.surface2,
                    color: isStr ? T.textDim : T.text,
                    border: `1.5px solid ${active ? T.sage : T.line}`,
                    borderRadius: "10px",
                    display: "flex", alignItems: "center", gap: "10px",
                    opacity: isStr ? 0.5 : 1,
                  }}>
                  <div style={{ width: "22px", height: "22px", borderRadius: "5px", background: active ? T.sage : "transparent", border: `1.5px solid ${active ? T.sage : T.lineStrong}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.canvas, fontSize: "13px", fontWeight: 700 }}>
                    {active ? "✓" : ""}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "14px", fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: "11px", color: T.textSoft }}>
                      Score: {isStr ? "Gestrichen" : isValid(sc) ? `${sc} (${scoreLabel(sc, hole.par)})` : "—"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Step 2: Closest - only if at least one green hit */}
          {greenHits.length > 0 && (
            <>
              <div style={{ ...S.eyebrow, marginBottom: "8px" }}>2 · Wer war am nächsten zur Fahne?</div>
              <div style={{ fontSize: "11px", color: T.textDim, marginBottom: "10px" }}>
                Nur unter denen die Grün getroffen haben.
              </div>
              <div style={{ display: "grid", gap: "6px", marginBottom: "12px" }}>
                {players.filter(p => greenHits.includes(p.id)).map(p => {
                  const active = closest === p.id;
                  return (
                    <button key={p.id} onClick={() => setClosest(p.id)}
                      style={{
                        padding: "12px 14px", textAlign: "left",
                        background: active ? `${T.gold}15` : T.surface2,
                        color: T.text,
                        border: `1.5px solid ${active ? T.gold : T.line}`,
                        borderRadius: "10px",
                        display: "flex", alignItems: "center", gap: "10px",
                      }}>
                      <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: active ? T.gold : "transparent", border: `1.5px solid ${active ? T.gold : T.lineStrong}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.canvas, fontSize: "13px", fontWeight: 700 }}>
                        {active ? "✓" : ""}
                      </div>
                      <span style={{ fontSize: "14px", fontWeight: 600 }}>{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* If no green hits */}
          {greenHits.length === 0 && (
            <div style={{ background: `${T.bogey}15`, border: `1px solid ${T.bogey}40`, borderRadius: "10px", padding: "12px 14px", marginBottom: "12px", fontSize: "12px", color: T.bogey, lineHeight: 1.4 }}>
              ⚠️ Wenn niemand das Grün getroffen hat, wird die Uschi zum nächsten Par 3 weitervererbt (Doppel-Uschi).
            </div>
          )}

          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={clearAll} style={{ ...S.btnGhost, flex: 1, color: T.textSoft }}>
              Zurücksetzen
            </button>
            <button onClick={() => {
                // CRITICAL: always persist the current state, even if nobody hit the green.
                // Without this, an empty {greenHits:[], closest:null} entry is missing
                // and the carry-over logic cannot track that this par-3 was resolved as "nobody hit".
                setPar3Data(prev => ({
                  ...prev,
                  [holeIdx]: { greenHits: [...greenHits], closest: closest || null },
                }));
                setUschiPromptHole(null);
              }}
              className={canClose ? "gold-hover" : ""}
              disabled={!canClose}
              style={{ ...S.btnPrimary, flex: 2, opacity: canClose ? 1 : 0.4 }}>
              {greenHits.length === 0 ? "Niemand trifft → Speichern" : "Speichern"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // USCHI REVIEW SCREEN (all Par-3 overview)
  // ═══════════════════════════════════════════════════════════════════════════
  const renderUschiReview = () => {
    if (!showUschiReview) return null;
    const par3Indices = holes.map((h, i) => ({ h, i })).filter(x => x.h.par === 3);

    // Build a live-round object to feed to computeUschiLiveStanding
    const liveRound = {
      players, holes, scores, par3Data,
      gameMode,
      uschiResult: uschiResult || null,
    };
    const liveStanding = computeUschiLiveStanding(liveRound);

    return (
      <div onClick={() => setShowUschiReview(false)}
        style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1050, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div onClick={e => e.stopPropagation()} className="slide-up"
          style={{ width: "100%", maxWidth: "520px", background: T.surface1, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", border: `1px solid ${T.line}`, padding: "20px 16px 28px", maxHeight: "92vh", overflowY: "auto" }}>
          <SwipeHandle onClose={() => setShowUschiReview(false)} />

          <h3 className="serif" style={{ fontSize: "24px", margin: "0 0 6px", color: T.text }}>
            🎯 Uschi-Protokoll
          </h3>
          <p style={{ fontSize: "12px", color: T.textSoft, marginBottom: "14px" }}>
            Alle Löcher und wer welche Punkte gemacht hat.
          </p>

          {/* Live Standing block */}
          {liveStanding && liveStanding.players.length > 0 && (
            <div style={{ ...S.card, padding: "12px 14px", marginBottom: "14px", border: `1px solid ${liveStanding.decided ? T.gold + "80" : T.line}` }}>
              <div style={{ ...S.eyebrow, marginBottom: "10px", color: T.gold, display: "flex", alignItems: "center", gap: "6px" }}>
                <span>📊 Live-Stand</span>
                {liveStanding.remaining.holes > 0 && (
                  <span style={{ fontSize: "10px", color: T.textDim, textTransform: "none", letterSpacing: 0, fontWeight: 400, marginLeft: "auto" }}>
                    Noch {liveStanding.remaining.holes} Loch{liveStanding.remaining.holes === 1 ? "" : "er"}
                    {liveStanding.remaining.par3Count > 0 && ` · ${liveStanding.remaining.par3Count}× Par-3`}
                  </span>
                )}
              </div>

              {liveStanding.players.map((p, i) => {
                const isLeader = i === 0;
                const pointsColor = p.current > 0 ? T.gold : p.current < 0 ? T.double : T.textSoft;
                // How much can they still gain/lose?
                const gainRange = p.max - p.current;
                const lossRange = p.current - p.min;
                // Is this player's rank fully secured vs next player?
                const isFullySecured = liveStanding.decided && isLeader;
                return (
                  <div key={p.id} style={{
                    padding: "10px 12px", marginBottom: "6px",
                    background: isFullySecured ? `${T.gold}15` : T.surface2,
                    border: `1px solid ${isFullySecured ? T.gold + "60" : T.line}`,
                    borderRadius: "8px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                      <span style={{ fontSize: "16px", width: "20px" }}>{isLeader ? "🏆" : `${i + 1}.`}</span>
                      <span style={{ color: T.text, fontSize: "13px", fontWeight: 600, flex: 1 }}>{p.name}</span>
                      <span className="mono" style={{ color: pointsColor, fontSize: "16px", fontWeight: 700 }}>
                        {p.current > 0 ? "+" : ""}{p.current}
                      </span>
                    </div>
                    {liveStanding.remaining.holes > 0 && (
                      <div style={{ fontSize: "10px", color: T.textDim, display: "flex", gap: "12px", marginLeft: "30px" }}>
                        <span>📈 max möglich: <span style={{ color: T.text, fontWeight: 600 }}>{p.max > 0 ? "+" : ""}{p.max}</span></span>
                        <span>📉 min möglich: <span style={{ color: T.text, fontWeight: 600 }}>{p.min > 0 ? "+" : ""}{p.min}</span></span>
                      </div>
                    )}
                    {isFullySecured && (
                      <div style={{ fontSize: "11px", color: T.gold, marginLeft: "30px", marginTop: "4px", fontWeight: 600 }}>
                        ✓ Sieg mathematisch sicher
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Overall status */}
              {liveStanding.remaining.holes === 0 ? (
                <div style={{ fontSize: "11px", color: T.gold, textAlign: "center", marginTop: "4px", padding: "6px", background: `${T.gold}10`, borderRadius: "6px", fontWeight: 600 }}>
                  🏁 Runde abgeschlossen!
                </div>
              ) : liveStanding.decided ? (
                <div style={{ fontSize: "11px", color: T.gold, textAlign: "center", marginTop: "4px", fontStyle: "italic" }}>
                  Sieg für {liveStanding.leader.name} steht bereits fest.
                </div>
              ) : (
                <div style={{ fontSize: "11px", color: T.textSoft, textAlign: "center", marginTop: "4px", fontStyle: "italic" }}>
                  ⚠️ Noch offen — Platzierungen können sich ändern.
                </div>
              )}

              {liveStanding.remaining.currentCarry > 1 && liveStanding.remaining.par3Count > 0 && (
                <div style={{ fontSize: "11px", color: T.sage, textAlign: "center", marginTop: "6px", padding: "4px 8px", background: `${T.sage}10`, borderRadius: "6px" }}>
                  💧 Aktueller Carry: <b>{liveStanding.remaining.currentCarry}×</b>
                </div>
              )}
            </div>
          )}

          {/* Par-3 quick access (tap to edit Uschi data) */}
          {par3Indices.length > 0 && (
            <>
              <div style={{ ...S.eyebrow, marginBottom: "8px", color: T.gold }}>PAR-3 LÖCHER (TAP ZUM BEARBEITEN)</div>
              {par3Indices.map(({ h, i }) => {
                const data = par3Data[i];
                const hasData = !!data;
                const closest = data?.closest;
                const closestPlayer = players.find(p => p.id === closest);
                const greenHits = data?.greenHits || [];
                const allScored = players.every(p => {
                  const g = scores[p.id]?.[i];
                  return isValid(g) || isStrich(g);
                });
                const uschiInfo = uschiResult?.perHole?.find(ph => ph.holeIdx === i)?.uschi;
                const multiplierText = uschiInfo?.multiplier > 1 ? ` (${uschiInfo.multiplier}×)` : "";

                const status = !allScored
                  ? { label: "Score fehlt noch", color: T.textDim }
                  : !hasData
                    ? { label: "⚠️ Uschi-Eingabe fehlt", color: T.bogey }
                    : greenHits.length === 0
                      ? { label: `↻ Niemand Grün → carry${multiplierText}`, color: T.sage }
                      : !closest
                        ? { label: "⚠️ Closest fehlt", color: T.bogey }
                        : (() => {
                            const cScore = scores[closest]?.[i];
                            if (!isValid(cScore)) return { label: "⚠️ unklar", color: T.bogey };
                            const madePar = cScore - h.par <= 0;
                            return madePar
                              ? { label: `✓ ${closestPlayer?.name || "?"} gewinnt${multiplierText}`, color: T.gold }
                              : { label: `🔥 ${closestPlayer?.name || "?"} verbrennt${multiplierText}`, color: T.double };
                          })();

                return (
                  <button key={i} onClick={() => { setShowUschiReview(false); setUschiPromptHole(i); }}
                    style={{
                      width: "100%", textAlign: "left",
                      padding: "10px 12px", marginBottom: "6px",
                      background: T.surface2,
                      border: `1px solid ${T.line}`,
                      borderRadius: "10px",
                      display: "flex", alignItems: "center", gap: "10px",
                      color: T.text,
                    }}>
                    <div className="mono serif" style={{ fontSize: "18px", color: T.gold, lineHeight: 1, minWidth: "30px" }}>{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: T.text }}>
                        Par {h.par} · SI {h.si}
                      </div>
                      <div style={{ fontSize: "11px", color: status.color, marginTop: "2px", fontWeight: 500 }}>
                        {status.label}
                      </div>
                    </div>
                    <span style={{ color: T.textDim, fontSize: "14px" }}>›</span>
                  </button>
                );
              })}
            </>
          )}

          {/* Full per-hole breakdown */}
          {uschiResult && (
            <>
              <div style={{ ...S.eyebrow, marginTop: "18px", marginBottom: "8px", color: T.sage }}>LOCH-FÜR-LOCH BREAKDOWN</div>

              <div style={{ background: T.surface2, borderRadius: "10px", border: `1px solid ${T.line}`, overflow: "hidden", marginBottom: "8px" }}>
                {/* Header row with player initials */}
                <div style={{ display: "grid", gridTemplateColumns: `28px 38px repeat(${players.length}, 1fr)`, gap: "6px", padding: "8px 10px", borderBottom: `1px solid ${T.line}`, background: T.surface3 }}>
                  <div style={{ fontSize: "9px", color: T.textDim, fontWeight: 600 }}>L</div>
                  <div style={{ fontSize: "9px", color: T.textDim, fontWeight: 600, textAlign: "center" }}>PAR</div>
                  {players.map(p => (
                    <div key={p.id} style={{ fontSize: "10px", color: T.textSoft, fontWeight: 600, textAlign: "center" }}>
                      {p.name.slice(0, 4)}
                    </div>
                  ))}
                </div>
                {holes.map((h, i) => {
                  const ph = uschiResult.perHole.find(x => x.holeIdx === i);
                  if (!ph) return null;
                  const anyPlayed = players.some(p => isValid(scores[p.id]?.[i]) || isStrich(scores[p.id]?.[i]));
                  if (!anyPlayed) return null;
                  return (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: `28px 38px repeat(${players.length}, 1fr)`, gap: "6px", padding: "8px 10px", borderBottom: i < holes.length - 1 ? `1px solid ${T.line}` : "none", alignItems: "center" }}>
                      <div className="mono" style={{ fontSize: "12px", color: T.gold, fontWeight: 700 }}>{i + 1}</div>
                      <div className="mono" style={{ fontSize: "11px", color: T.textSoft, textAlign: "center" }}>{h.par}</div>
                      {players.map(p => {
                        const gross = scores[p.id]?.[i];
                        const points = ph.holePoints?.[p.id] || 0;
                        const bd = ph.holeBreakdown?.[p.id] || {};
                        if (!isValid(gross) && !isStrich(gross)) {
                          return <div key={p.id} style={{ textAlign: "center", color: T.textDim, fontSize: "11px" }}>—</div>;
                        }
                        if (isStrich(gross)) {
                          return <div key={p.id} style={{ textAlign: "center", color: T.textDim, fontSize: "11px" }}>✗</div>;
                        }
                        // Build icons based on breakdown
                        const icons = [];
                        if (bd.best)   icons.push("🏆");
                        if (bd.birdie) icons.push("🎯");
                        if (bd.uschi > 0) icons.push(bd.uschi > 1 ? `💧${bd.uschi}` : "💧");
                        if (bd.worst)  icons.push("🔻");
                        const isPuffer = points === 0 && icons.length === 0;
                        const color = points > 0 ? T.gold : points < 0 ? T.double : T.textSoft;
                        const sign = points > 0 ? "+" : "";
                        return (
                          <div key={p.id} style={{ textAlign: "center" }}>
                            <div className="mono" style={{ fontSize: "13px", fontWeight: 700, color, lineHeight: 1 }}>
                              {sign}{points}
                            </div>
                            <div style={{ fontSize: "9px", marginTop: "2px", letterSpacing: "-0.5px" }}>
                              {isPuffer ? <span style={{ color: T.textDim }}>·</span> : icons.join("")}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div style={{ fontSize: "10px", color: T.textDim, lineHeight: 1.6, padding: "8px 4px", display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center" }}>
                <span>🏆 Bester</span>
                <span>🔻 Schlechtester</span>
                <span>🎯 Birdie</span>
                <span>💧 Uschi</span>
                <span>· Puffer</span>
              </div>
            </>
          )}

          {par3Indices.length === 0 && !uschiResult && (
            <EmptyState icon="🎯" title="Noch keine Daten" sub="Spiele ein paar Löcher um die Übersicht zu sehen." />
          )}

          <button onClick={() => setShowUschiReview(false)}
            style={{ ...S.btnSecondary, width: "100%", marginTop: "14px" }}>
            Schließen
          </button>
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
    const ph = tee ? resolvePlayerPH(player, cfg, selectedClub, par).ph : 0;
    const hs = holeHS(ph, hole.si, cfg.numHoles);

    return (
      <div onClick={() => setPadOpen(null)}
        style={{ position: "fixed", inset: 0, background: "#000000aa", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div onClick={e => e.stopPropagation()} className="slide-up"
          style={{ width: "100%", maxWidth: "500px", background: T.surface1, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", border: `1px solid ${T.line}`, borderBottom: "none", padding: "20px 16px 32px", boxShadow: "0 -20px 60px #000000dd" }}>
          <SwipeHandle onClose={() => setPadOpen(null)} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div>
              <div style={{ fontSize: "13px", color: T.textSoft, display: "flex", alignItems: "center", gap: "6px" }}>
                {player.name}
                {player.teeName && <TeeDot name={player.teeName} size={8} />}
              </div>
              <div className="serif" style={{ fontSize: "24px", color: T.text, marginTop: "2px" }}>
                Loch <span style={{ color: T.gold }}>{padOpen.holeIdx + 1}</span>
              </div>
              {/* Uschi stroke advantage indicator (only in Uschi mode) */}
              {gameMode !== "stableford" && (() => {
                const playerStrokes = uschiStrokes.find(s => s.playerId === player.id);
                if (!playerStrokes) return null;
                const strokesOnThisHole = playerStrokes.perHole[padOpen.holeIdx] || 0;
                const maxStrokesOnHole = Math.max(0, ...uschiStrokes.map(s => s.perHole[padOpen.holeIdx] || 0));
                const isBest = playerStrokes.strokes === Math.min(...uschiStrokes.map(s => s.strokes));
                if (strokesOnThisHole === 0 && !isBest) {
                  // Player has no strokes on this hole but is not the best — level playing field
                  return (
                    <div style={{ fontSize: "10px", color: T.textDim, marginTop: "4px", fontWeight: 500 }}>
                      🎯 kein Vorsprung
                    </div>
                  );
                }
                if (isBest && strokesOnThisHole === 0) {
                  // This player IS the best reference — no strokes, shown separately
                  return (
                    <div style={{ fontSize: "10px", color: T.sage, marginTop: "4px", fontWeight: 600 }}>
                      🎯 Maßstab
                    </div>
                  );
                }
                // Player has strokes on this hole
                const isMax = strokesOnThisHole === maxStrokesOnHole && strokesOnThisHole > 0;
                return (
                  <div style={{ fontSize: "10px", color: isMax ? T.gold : T.sage, marginTop: "4px", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px", background: isMax ? `${T.gold}20` : `${T.sage}15`, padding: "2px 6px", borderRadius: "4px" }}>
                    🎯 {strokesOnThisHole === 1 ? "1 vor" : `${strokesOnThisHole} vor`}
                    {isMax && <span style={{ fontSize: "9px", letterSpacing: "0.04em" }}>· BEST</span>}
                  </div>
                );
              })()}
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

  // ═══════════════════════════════════════════════════════════════════════════
  // SHARE PREVIEW MODAL
  // ═══════════════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════════════
  // ADD CLUB MODAL — quick way to add new clubs in <2 min
  // ═══════════════════════════════════════════════════════════════════════════

  // The prompt that users copy, paste into a new Claude chat with a scorecard photo
  const QUICK_CLUB_PROMPT = `Du bist ein Datenextraktions-Assistent für Golf-Scorecards.

Ich schicke dir ein Foto einer Golfplatz-Scorecard. Extrahiere die grundlegenden Daten in JSON-Format.

ERFORDERLICH:
- Clubname
- Anzahl Löcher (üblich 18)
- Mindestens 1 Tee mit: teeName (z.B. "Gelb (Herren)"), cr, slope, par
- Alle Löcher mit: par, si (Stroke Index 1-18)

OPTIONAL (nice to have):
- Weitere Tees (Weiss/Blau/Rot/Gelb für Herren/Damen)
- Region (Bundesland/Land)

AUSGABE-FORMAT (nur JSON, kein Text davor/danach):

\`\`\`json
{
  "name": "CLUB NAME",
  "region": "Land/Region",
  "numHoles": 18,
  "tees": {
    "Gelb (Herren)": { "cr": 71.5, "slope": 125, "par": 72 }
  },
  "holes": [
    { "par": 4, "si": 7 },
    { "par": 5, "si": 1 }
  ]
}
\`\`\`

WICHTIG:
- Par-Summe der Löcher muss zum Tee-Par passen
- SI 1-18 muss komplett und unique sein
- Bei Unsicherheit: setze das Feld auf null statt zu raten
- Nur gültiges JSON, keine Prosa, keine Kommentare`;

  const copyPromptToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(QUICK_CLUB_PROMPT);
      alert("✓ Prompt kopiert! Öffne einen neuen Claude-Chat, füge den Prompt ein und hänge dein Scorecard-Foto dran.");
    } catch (err) {
      alert("Kopieren hat nicht geklappt. Bitte manuell kopieren:\n\n" + QUICK_CLUB_PROMPT.slice(0, 100) + "...");
    }
  };

  const saveQuickClub = async () => {
    const { name, cr, slope, par, numHoles, teeName } = quickClubForm;
    const errors = [];
    if (!name.trim()) errors.push("Clubname fehlt");
    if (!cr || isNaN(parseFloat(cr))) errors.push("CR fehlt oder ungültig");
    if (!slope || isNaN(parseInt(slope))) errors.push("Slope fehlt oder ungültig");
    if (!par || isNaN(parseInt(par))) errors.push("Par fehlt oder ungültig");
    if (!teeName.trim()) errors.push("Tee-Name fehlt");
    if (errors.length > 0) {
      alert("Bitte korrigieren:\n" + errors.map(e => "• " + e).join("\n"));
      return;
    }
    const newClub = {
      name: name.trim(),
      region: "—",
      numHoles: parseInt(numHoles) || 18,
      tees: {
        [teeName.trim()]: {
          cr: parseFloat(cr),
          slope: parseInt(slope),
          par: parseInt(par),
        }
      }
    };
    const u = [newClub, ...customClubs];
    setCustomClubs(u);
    try { await window.storage.set("golf-clubs", JSON.stringify(u)); } catch {}
    // Pre-select this club
    setCfg(c => ({ ...c, clubName: newClub.name, defaultTeeName: teeName.trim(), numHoles: newClub.numHoles }));
    setHoles(makeHoles(parseInt(par), parseInt(numHoles) || 18));
    setShowAddClub(false);
    setAddClubMode("choose");
    setQuickClubForm({ name: "", cr: "", slope: "", par: "", numHoles: 18, teeName: "Gelb (Herren)" });
    alert(`✓ ${newClub.name} gespeichert! Du kannst die Löcher im nächsten Schritt anpassen.`);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // LIVE TICKER — share round live via URL
  // ═══════════════════════════════════════════════════════════════════════════

  const liveStart = async () => {
    if (!SYNC_ENABLED) {
      alert("Live-Ticker benötigt Cloud-Sync. Bitte in den Einstellungen aktivieren.");
      return;
    }
    // If we already have an active live code, reuse it instead of creating a duplicate
    if (liveCode && liveStatus === "active") {
      // Already active — just confirm and reset URL etc
      setShowLiveModal(true);
      return;
    }
    setLiveStatus("creating");
    const payload = {
      cfg,
      holes,
      players,
      scores,
      gameMode,
      teams,
      par3Data,
      clubName: cfg.clubName,
      selectedClubSnapshot: selectedClub ? {
        name: selectedClub.name,
        region: selectedClub.region,
        numHoles: selectedClub.numHoles,
        tees: selectedClub.tees,
        holes: selectedClub.holes,
      } : null,
    };
    const result = await liveCreate(payload);
    if (result.code) {
      setLiveCode(result.code);
      setLiveStatus("active");
    } else {
      setLiveStatus("error");
      // Helpful error messages based on error type
      if (result.status === 404 || result.detail?.includes("does not exist")) {
        alert("Live-Ticker-Tabelle existiert noch nicht in Supabase.\n\nBitte das SQL aus SUPABASE-LIVE-TICKER-SQL.md im Supabase Dashboard ausführen.");
      } else if (result.status === 401 || result.status === 403) {
        alert("Keine Berechtigung für Live-Ticker.\n\nBitte prüfen ob die RLS-Policies in Supabase angelegt sind (siehe SUPABASE-LIVE-TICKER-SQL.md).");
      } else if (result.error === "network") {
        alert("Netzwerk-Fehler. Bist du online?");
      } else {
        alert("Live-Ticker konnte nicht gestartet werden.\n\nFehler: " + (result.detail || result.error || "unbekannt"));
      }
    }
  };

  const liveEnd = async () => {
    if (!liveCode) return;
    if (!confirm("Live-Ticker wirklich beenden? Die geteilte URL wird sofort ungültig.")) return;
    await liveDelete(liveCode);
    setLiveCode(null);
    setLiveStatus("idle");
    setShowLiveModal(false);
  };

  const liveUrl = () => {
    if (!liveCode) return "";
    // Hash-based routing so no Vercel rewrites needed
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/live.html#${liveCode}`;
  };

  const copyLiveUrl = async () => {
    try {
      await navigator.clipboard.writeText(liveUrl());
      alert("✓ Live-Link kopiert!");
    } catch (err) {
      alert("Kopieren fehlgeschlagen. Bitte manuell kopieren:\n\n" + liveUrl());
    }
  };

  const shareLiveUrl = async () => {
    const url = liveUrl();
    if (!url) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Fairway · ${cfg.clubName || "Runde"} live`,
          text: `Schau meiner Runde live zu auf ${cfg.clubName || "dem Platz"}:`,
          url,
        });
      } catch (err) {
        if (err.name !== "AbortError") copyLiveUrl();
      }
    } else {
      copyLiveUrl();
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // WELCOME MODAL — shown once on first launch, explains Uschi rules + features
  // ═══════════════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════════════
  // UNDO TOAST — bottom banner shown for ~6 seconds after destructive action
  // ═══════════════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════════════
  // STATS DRILL-DOWN: Player Detail Modal
  // ═══════════════════════════════════════════════════════════════════════════
  const renderStatsPlayerDetail = () => {
    if (!statsPlayerDetail) return null;
    const playerName = statsPlayerDetail;

    // Collect all rounds across all clubs where this player played
    const playerRounds = allRoundsForStats.filter(r =>
      (r.players || []).some(p => p.name === playerName)
    );

    // Per-club stats for this player
    const clubsPlayedByPlayer = Array.from(new Set(playerRounds.map(r => r.cfg?.clubName).filter(Boolean)));
    const perClub = clubsPlayedByPlayer.map(clubName => {
      const clubStats = aggregateClubStats(clubName, allRoundsForStats);
      const me = clubStats?.playerStats.find(p => p.name === playerName);
      if (!me) return null;
      const withSamples = me.perHole.filter(h => h.samplesSize > 0);
      const bestHole = withSamples.length ? withSamples.reduce((min, h) => h.avgVsPar < min.avgVsPar ? h : min, withSamples[0]) : null;
      const worstHole = withSamples.length ? withSamples.reduce((max, h) => h.avgVsPar > max.avgVsPar ? h : max, withSamples[0]) : null;
      return { clubName, avgSF: me.avgSF, bestSF: me.bestSF, roundsPlayed: me.roundsPlayed, bestHole, worstHole, strichCount: me.strichCount };
    }).filter(Boolean);

    // Sparkline: last 10 rounds chronologically (any club)
    const lastTen = playerRounds
      .map(r => {
        const stats = aggregateClubStats(r.cfg?.clubName, [r]);
        const me = stats?.playerStats.find(p => p.name === playerName);
        return me ? { date: r.cfg?.date || r.savedAt, club: r.cfg?.clubName, sf: me.avgSF } : null;
      })
      .filter(Boolean)
      .sort((a, b) => (a.date > b.date ? 1 : -1))
      .slice(-10);

    // Sparkline SVG
    const sparklineWidth = 280;
    const sparklineHeight = 60;
    let sparklinePath = null;
    if (lastTen.length >= 2) {
      const vals = lastTen.map(x => x.sf);
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const range = max - min || 1;
      const step = sparklineWidth / (lastTen.length - 1);
      const points = lastTen.map((x, i) => {
        const y = sparklineHeight - ((x.sf - min) / range) * (sparklineHeight - 10) - 5;
        return [i * step, y];
      });
      sparklinePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    }

    return (
      <div onClick={() => setStatsPlayerDetail(null)}
        style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div onClick={e => e.stopPropagation()} className="slide-up"
          style={{ width: "100%", maxWidth: "520px", background: T.surface1, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", border: `1px solid ${T.line}`, padding: "20px 16px 28px", maxHeight: "92vh", overflowY: "auto" }}>
          <SwipeHandle onClose={() => setStatsPlayerDetail(null)} />

          <h3 className="serif" style={{ fontSize: "22px", margin: "0 0 4px", color: T.text }}>
            👤 {playerName}
          </h3>
          <p style={{ fontSize: "11px", color: T.textDim, marginBottom: "16px" }}>
            {playerRounds.length} Runden auf {clubsPlayedByPlayer.length} Club{clubsPlayedByPlayer.length === 1 ? "" : "s"}
          </p>

          {/* Sparkline */}
          {lastTen.length >= 2 && (
            <div style={{ ...S.card, padding: "12px 14px", marginBottom: "14px" }}>
              <div style={{ ...S.eyebrow, marginBottom: "8px" }}>📈 Formkurve (letzte {lastTen.length} Runden)</div>
              <svg width="100%" height={sparklineHeight + 8} viewBox={`0 0 ${sparklineWidth} ${sparklineHeight + 8}`} preserveAspectRatio="none" style={{ overflow: "visible" }}>
                {sparklinePath && <path d={sparklinePath} stroke={T.gold} strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />}
                {lastTen.map((x, i) => {
                  const step = sparklineWidth / (lastTen.length - 1);
                  const vals = lastTen.map(v => v.sf);
                  const min = Math.min(...vals);
                  const max = Math.max(...vals);
                  const range = max - min || 1;
                  const y = sparklineHeight - ((x.sf - min) / range) * (sparklineHeight - 10) - 5;
                  return <circle key={i} cx={i * step} cy={y} r="3" fill={T.gold} />;
                })}
              </svg>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: T.textDim, marginTop: "6px" }}>
                <span>⌀ {lastTen[0].sf}</span>
                <span>↔</span>
                <span>⌀ {lastTen[lastTen.length - 1].sf}</span>
              </div>
            </div>
          )}

          {/* Per club breakdown */}
          <div style={{ ...S.eyebrow, marginBottom: "10px" }}>Pro Club</div>
          {perClub.map(c => (
            <div key={c.clubName} style={{ ...S.card, padding: "12px 14px", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ fontSize: "14px", fontWeight: 600, color: T.text, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.clubName}</div>
                <div style={{ fontSize: "11px", color: T.textDim, marginLeft: "8px" }}>{c.roundsPlayed}×</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "8px" }}>
                <div style={{ padding: "6px 8px", background: T.surface2, borderRadius: "5px" }}>
                  <div style={{ fontSize: "9px", color: T.textDim }}>⌀ SF</div>
                  <div className="mono" style={{ fontSize: "14px", color: T.text, fontWeight: 700 }}>{c.avgSF}</div>
                </div>
                <div style={{ padding: "6px 8px", background: T.surface2, borderRadius: "5px" }}>
                  <div style={{ fontSize: "9px", color: T.textDim }}>BEST SF</div>
                  <div className="mono" style={{ fontSize: "14px", color: T.gold, fontWeight: 700 }}>{c.bestSF}</div>
                </div>
              </div>
              {c.bestHole && c.worstHole && (
                <div style={{ display: "flex", gap: "10px", fontSize: "10px", flexWrap: "wrap" }}>
                  <span style={{ color: T.textSoft }}>🟢 Loch {c.bestHole.holeIdx + 1} ({c.bestHole.avgVsPar > 0 ? "+" : ""}{c.bestHole.avgVsPar.toFixed(1)})</span>
                  <span style={{ color: T.textSoft }}>💀 Loch {c.worstHole.holeIdx + 1} ({c.worstHole.avgVsPar > 0 ? "+" : ""}{c.worstHole.avgVsPar.toFixed(1)})</span>
                  {c.strichCount > 0 && <span style={{ color: T.double }}>✗ {c.strichCount}</span>}
                </div>
              )}
            </div>
          ))}

          <button onClick={() => setStatsPlayerDetail(null)}
            style={{ ...S.btnSecondary, width: "100%", marginTop: "14px" }}>
            Schließen
          </button>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // STATS DRILL-DOWN: Hole Detail Modal
  // ═══════════════════════════════════════════════════════════════════════════
  const renderStatsHoleDetail = () => {
    if (statsHoleDetail === null || statsHoleDetail === undefined) return null;
    const holeIdx = statsHoleDetail;

    const activeClub = statsClubName || Array.from(new Set(allRoundsForStats.map(r => r.cfg?.clubName).filter(Boolean)))[0];
    const stats = aggregateClubStats(activeClub, allRoundsForStats);
    if (!stats) return null;

    const hole = stats.holeStats[holeIdx];
    if (!hole) return null;

    // Per-player scores on this hole
    const perPlayer = stats.playerStats.map(p => {
      const ph = p.perHole[holeIdx];
      if (!ph || ph.samplesSize === 0) return null;
      return {
        name: p.name,
        avgVsPar: ph.avgVsPar,
        samplesSize: ph.samplesSize,
        birdieCount: ph.birdieCount,
        parCount: ph.parCount,
        bogeyCount: ph.bogeyCount,
        doubleCount: ph.doubleCount,
        strichCount: ph.strichCount,
        scores: ph.scores,
      };
    }).filter(Boolean).sort((a, b) => a.avgVsPar - b.avgVsPar);

    // Highlights: all birdies/eagles ever on this hole
    const highlights = hole.scores
      .filter(s => !s.isStrich && s.gross - hole.par <= -1)
      .sort((a, b) => (a.date > b.date ? -1 : 1));

    return (
      <div onClick={() => setStatsHoleDetail(null)}
        style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div onClick={e => e.stopPropagation()} className="slide-up"
          style={{ width: "100%", maxWidth: "520px", background: T.surface1, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", border: `1px solid ${T.line}`, padding: "20px 16px 28px", maxHeight: "92vh", overflowY: "auto" }}>
          <SwipeHandle onClose={() => setStatsHoleDetail(null)} />

          <h3 className="serif" style={{ fontSize: "22px", margin: "0 0 4px", color: T.text }}>
            Loch {holeIdx + 1}
          </h3>
          <p style={{ fontSize: "11px", color: T.textDim, marginBottom: "16px" }}>
            Par {hole.par} · SI {hole.si} · {hole.samplesSize} Einträge
          </p>

          {/* Per-player comparison */}
          <div style={{ ...S.eyebrow, marginBottom: "10px" }}>👥 Pro Spieler</div>
          {perPlayer.map(p => {
            const color = p.avgVsPar <= 0 ? T.gold : p.avgVsPar < 1 ? T.text : p.avgVsPar < 2 ? T.bogey : T.double;
            return (
              <div key={p.name} style={{ ...S.card, padding: "10px 12px", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontWeight: 600, fontSize: "13px", color: T.text, flex: 1 }}>{p.name}</span>
                  <span style={{ fontSize: "10px", color: T.textDim, marginRight: "10px" }}>{p.samplesSize}×</span>
                  <span className="mono" style={{ fontSize: "14px", color, fontWeight: 700 }}>
                    {p.avgVsPar > 0 ? "+" : ""}{p.avgVsPar.toFixed(1)}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "10px", fontSize: "10px", color: T.textSoft, flexWrap: "wrap" }}>
                  {p.birdieCount > 0 && <span>🎯 {p.birdieCount}</span>}
                  {p.parCount > 0 && <span>⛳ {p.parCount}</span>}
                  {p.bogeyCount > 0 && <span>⚠️ {p.bogeyCount}</span>}
                  {p.doubleCount > 0 && <span>💀 {p.doubleCount}</span>}
                  {p.strichCount > 0 && <span style={{ color: T.double }}>✗ {p.strichCount}</span>}
                </div>
              </div>
            );
          })}

          {/* Highlights */}
          {highlights.length > 0 && (
            <>
              <div style={{ ...S.eyebrow, marginTop: "14px", marginBottom: "10px", color: T.gold }}>🎯 Highlights</div>
              <div style={{ ...S.card, padding: "10px 12px", marginBottom: "10px" }}>
                {highlights.map((h, i) => {
                  const diff = h.gross - hole.par;
                  const label = diff === -1 ? "Birdie" : diff === -2 ? "Eagle" : diff <= -3 ? "Albatross" : "Under Par";
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", padding: "4px 0", borderBottom: i < highlights.length - 1 ? `1px solid ${T.line}` : "none" }}>
                      <span>🎯</span>
                      <span style={{ color: T.text, fontWeight: 600 }}>{h.playerName}</span>
                      <span style={{ color: T.gold }}>{label}</span>
                      <span className="mono" style={{ color: T.textDim, marginLeft: "auto", fontSize: "10px" }}>{fmtDate(h.date)}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <button onClick={() => setStatsHoleDetail(null)}
            style={{ ...S.btnSecondary, width: "100%", marginTop: "14px" }}>
            Schließen
          </button>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // STATS IMPORT: Pull rounds from another sync code for stats purposes only
  // ═══════════════════════════════════════════════════════════════════════════
  const renderStatsImportModal = () => {
    if (!showStatsImport) return null;

    const handleImport = async () => {
      const code = cleanSync(statsImportInput);
      if (!isValidSyncCode(code)) {
        alert("Bitte einen gültigen Sync-Code eingeben (mind. 4 Zeichen).");
        return;
      }
      setStatsImportLoading(true);
      try {
        const cloud = await cloudPull(code);
        if (!cloud || !cloud.data) {
          alert(`Kein Sync-Code "${code}" gefunden oder keine Daten.`);
          setStatsImportLoading(false);
          return;
        }
        const importedRounds = Array.isArray(cloud.data.rounds) ? cloud.data.rounds : [];
        // Tag each round as imported (so we could visualize it if needed later)
        const tagged = importedRounds.map(r => ({ ...r, _importedFrom: code }));
        // Merge with existing imports, dedup by id
        const existingIds = new Set(statsImportedRounds.map(r => r.id));
        const newOnes = tagged.filter(r => !existingIds.has(r.id));
        setStatsImportedRounds([...statsImportedRounds, ...newOnes]);
        setStatsImportInput("");
        setShowStatsImport(false);
        showUndoToast(`✓ ${newOnes.length} Runden aus "${code}" hinzugefügt`, () => setStatsImportedRounds(statsImportedRounds));
      } catch (e) {
        alert("Fehler beim Import: " + (e.message || "unbekannt"));
      }
      setStatsImportLoading(false);
    };

    return (
      <div onClick={() => setShowStatsImport(false)}
        style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div onClick={e => e.stopPropagation()}
          style={{ width: "100%", maxWidth: "440px", background: T.surface1, borderRadius: "16px", border: `1px solid ${T.line}`, padding: "22px" }}>
          <h3 className="serif" style={{ fontSize: "20px", margin: "0 0 8px", color: T.text }}>
            👥 Stats-Import
          </h3>
          <p style={{ fontSize: "12px", color: T.textSoft, lineHeight: 1.5, marginBottom: "14px" }}>
            Füge Runden aus einem anderen Sync-Code zu deinen Statistiken hinzu. Die Daten werden nur für die Stats-Ansicht verwendet und nicht in deinen eigenen Runden gespeichert.
          </p>
          <input
            value={statsImportInput}
            onChange={e => setStatsImportInput(cleanSync(e.target.value))}
            placeholder="z.B. STAMMRUNDE-2026"
            maxLength={20}
            style={{ ...S.input, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "JetBrains Mono, monospace", marginBottom: "10px" }}/>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => setShowStatsImport(false)}
              style={{ ...S.btnSecondary, flex: 1 }}>
              Abbrechen
            </button>
            <button onClick={handleImport}
              disabled={!isValidSyncCode(statsImportInput) || statsImportLoading}
              style={{ ...S.btnPrimary, flex: 2, opacity: !isValidSyncCode(statsImportInput) || statsImportLoading ? 0.5 : 1 }}>
              {statsImportLoading ? "Lade..." : "Importieren"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ROUND ANALYSIS MODAL — post-round deep-dive into a single round
  // ═══════════════════════════════════════════════════════════════════════════
  const renderRoundAnalysis = () => {
    if (!roundAnalysisId) return null;
    const round = rounds.find(r => r.id === roundAnalysisId) || statsImportedRounds.find(r => r.id === roundAnalysisId);
    if (!round) return null;

    const analysis = analyzeRound(round);
    if (!analysis) {
      return (
        <div onClick={() => setRoundAnalysisId(null)}
          style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} className="slide-up"
            style={{ width: "100%", maxWidth: "520px", background: T.surface1, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", border: `1px solid ${T.line}`, padding: "20px 16px 28px" }}>
            <EmptyState icon="📖" title="Noch keine Daten" sub="Spiele ein paar Löcher, dann erscheint hier die Runden-Analyse." />
            <button onClick={() => setRoundAnalysisId(null)} style={{ ...S.btnSecondary, width: "100%", marginTop: "14px" }}>Schließen</button>
          </div>
        </div>
      );
    }

    const hof = analysis.hallOfFame;

    return (
      <div onClick={() => setRoundAnalysisId(null)}
        style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div onClick={e => e.stopPropagation()} className="slide-up"
          style={{ width: "100%", maxWidth: "520px", background: T.surface1, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", border: `1px solid ${T.line}`, padding: "20px 16px 28px", maxHeight: "92vh", overflowY: "auto" }}>
          <SwipeHandle onClose={() => setRoundAnalysisId(null)} />

          <h3 className="serif" style={{ fontSize: "22px", margin: "0 0 4px", color: T.text }}>
            📖 Runden-Analyse
          </h3>
          <p style={{ fontSize: "11px", color: T.textDim, marginBottom: "16px" }}>
            {round.cfg?.clubName || "Runde"} · {fmtDate(round.cfg?.date)}
            {analysis.completeness.percent < 100 && (
              <span style={{ color: T.gold, marginLeft: "8px" }}>
                · ⏳ {analysis.completeness.percent}% gespielt
              </span>
            )}
          </p>

          {/* 🏆 Hall of Fame */}
          <div style={{ ...S.card, padding: "12px 14px", marginBottom: "14px" }}>
            <div style={{ ...S.eyebrow, marginBottom: "10px", color: T.gold }}>🏆 Tages-Hall-of-Fame</div>

            {hof.bestSFRound && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", marginBottom: "8px" }}>
                <span style={{ fontSize: "16px" }}>🏆</span>
                <span style={{ color: T.textSoft }}>Bester SF-Score:</span>
                <span style={{ color: T.text, fontWeight: 600 }}>{hof.bestSFRound.playerName}</span>
                <span className="mono" style={{ color: T.gold, fontSize: "12px", marginLeft: "auto" }}>{hof.bestSFRound.sf} Pkt</span>
              </div>
            )}

            {hof.bestNettoScore && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", marginBottom: "8px" }}>
                <span style={{ fontSize: "16px" }}>🎯</span>
                <span style={{ color: T.textSoft }}>Bestes Einzelloch:</span>
                <span style={{ color: T.text, fontWeight: 600 }}>{hof.bestNettoScore.playerName}</span>
                <span className="mono" style={{ color: T.gold, fontSize: "11px", marginLeft: "auto" }}>
                  Loch {hof.bestNettoScore.holeIdx + 1} · {hof.bestNettoScore.diffVsPar <= -2 ? "Eagle" : hof.bestNettoScore.diffVsPar === -1 ? "Birdie" : "Par"}
                </span>
              </div>
            )}

            {hof.birdieStreak && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", marginBottom: "8px" }}>
                <span style={{ fontSize: "16px" }}>🔥</span>
                <span style={{ color: T.textSoft }}>Längster Netto-Par-Streak:</span>
                <span style={{ color: T.text, fontWeight: 600 }}>{hof.birdieStreak.playerName}</span>
                <span className="mono" style={{ color: T.gold, fontSize: "11px", marginLeft: "auto" }}>
                  {hof.birdieStreak.length}× (L{hof.birdieStreak.startHole + 1}–{hof.birdieStreak.endHole + 1})
                </span>
              </div>
            )}

            {hof.biggestUschi && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", marginBottom: "8px" }}>
                <span style={{ fontSize: "16px" }}>💧</span>
                <span style={{ color: T.textSoft }}>Größter Uschi:</span>
                <span style={{ color: T.text, fontWeight: 600 }}>{hof.biggestUschi.playerName}</span>
                <span className="mono" style={{ color: T.gold, fontSize: "11px", marginLeft: "auto" }}>
                  Loch {hof.biggestUschi.holeIdx + 1} · {hof.biggestUschi.carry}× Carry
                </span>
              </div>
            )}

            {hof.comebackKing && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", marginBottom: "8px" }}>
                <span style={{ fontSize: "16px" }}>📈</span>
                <span style={{ color: T.textSoft }}>Comeback-König:</span>
                <span style={{ color: T.text, fontWeight: 600 }}>{hof.comebackKing.playerName}</span>
                <span className="mono" style={{ color: T.gold, fontSize: "11px", marginLeft: "auto" }}>
                  F9 {hof.comebackKing.f9} → B9 {hof.comebackKing.b9} (+{hof.comebackKing.delta})
                </span>
              </div>
            )}

            {hof.worstGroupHole && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px" }}>
                <span style={{ fontSize: "16px" }}>💀</span>
                <span style={{ color: T.textSoft }}>Schlimmstes Gruppen-Loch:</span>
                <span style={{ color: T.text, fontWeight: 600 }}>Loch {hof.worstGroupHole.idx + 1}</span>
                <span className="mono" style={{ color: T.double, fontSize: "11px", marginLeft: "auto" }}>
                  {hof.worstGroupHole.avgVsPar > 0 ? "+" : ""}{hof.worstGroupHole.avgVsPar.toFixed(1)}
                  {hof.worstGroupHole.strichCount > 0 && ` · ${hof.worstGroupHole.strichCount}✗`}
                </span>
              </div>
            )}
          </div>

          {/* 📊 F9/B9 */}
          {analysis.f9b9 && (
            <div style={{ ...S.card, padding: "12px 14px", marginBottom: "14px" }}>
              <div style={{ ...S.eyebrow, marginBottom: "10px" }}>📊 Front 9 vs Back 9</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 40px 40px 60px", gap: "6px", padding: "4px 8px", fontSize: "9px", color: T.textDim, fontWeight: 600, letterSpacing: "0.04em" }}>
                <div>SPIELER</div>
                <div style={{ textAlign: "center" }}>F9</div>
                <div style={{ textAlign: "center" }}>B9</div>
                <div style={{ textAlign: "right" }}>Δ</div>
              </div>
              {analysis.f9b9.map(x => {
                const trendIcon = x.delta > 2 ? "📈" : x.delta < -2 ? "📉" : "≈";
                const color = x.delta > 2 ? T.gold : x.delta < -2 ? T.double : T.textSoft;
                return (
                  <div key={x.playerName} style={{ display: "grid", gridTemplateColumns: "1fr 40px 40px 60px", gap: "6px", padding: "6px 8px", alignItems: "center", borderTop: `1px solid ${T.line}` }}>
                    <div style={{ fontSize: "12px", color: T.text, fontWeight: 600 }}>{x.playerName}</div>
                    <div className="mono" style={{ fontSize: "12px", textAlign: "center", color: T.text }}>{x.f9}</div>
                    <div className="mono" style={{ fontSize: "12px", textAlign: "center", color: T.text }}>{x.b9}</div>
                    <div style={{ fontSize: "11px", textAlign: "right", color }}>
                      {trendIcon} {x.delta > 0 ? "+" : ""}{x.delta}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 🗺️ Hole difficulty */}
          {analysis.hardestHoles.length > 0 && (
            <div style={{ ...S.card, padding: "12px 14px", marginBottom: "14px" }}>
              <div style={{ ...S.eyebrow, marginBottom: "10px" }}>🗺️ Loch-Ranking des Tages</div>

              <div style={{ fontSize: "10px", color: T.textDim, marginBottom: "6px", letterSpacing: "0.04em", fontWeight: 600 }}>🔴 SCHWERSTE 3</div>
              {analysis.hardestHoles.map(h => (
                <div key={h.idx} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", padding: "4px 0" }}>
                  <span className="mono" style={{ fontSize: "13px", color: T.gold, fontWeight: 700, minWidth: "22px" }}>{h.idx + 1}</span>
                  <span style={{ color: T.textSoft, fontSize: "10px" }}>Par {h.par}</span>
                  <span style={{ color: T.textDim, fontSize: "10px", marginLeft: "auto" }}>
                    {h.strichCount > 0 && <span style={{ color: T.double, marginRight: "6px" }}>{h.strichCount}×✗</span>}
                  </span>
                  <span className="mono" style={{ fontSize: "12px", color: T.double, fontWeight: 600, minWidth: "40px", textAlign: "right" }}>
                    {h.avgVsPar > 0 ? "+" : ""}{h.avgVsPar.toFixed(1)}
                  </span>
                </div>
              ))}

              <div style={{ fontSize: "10px", color: T.textDim, marginTop: "10px", marginBottom: "6px", letterSpacing: "0.04em", fontWeight: 600 }}>🟢 LEICHTESTE 3</div>
              {analysis.easiestHoles.map(h => (
                <div key={h.idx} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", padding: "4px 0" }}>
                  <span className="mono" style={{ fontSize: "13px", color: T.gold, fontWeight: 700, minWidth: "22px" }}>{h.idx + 1}</span>
                  <span style={{ color: T.textSoft, fontSize: "10px" }}>Par {h.par}</span>
                  <span className="mono" style={{ fontSize: "12px", color: T.gold, fontWeight: 600, minWidth: "40px", textAlign: "right", marginLeft: "auto" }}>
                    {h.avgVsPar > 0 ? "+" : ""}{h.avgVsPar.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 📖 Player highlights */}
          {analysis.playerHighlights.length > 0 && (
            <div style={{ ...S.card, padding: "12px 14px", marginBottom: "14px" }}>
              <div style={{ ...S.eyebrow, marginBottom: "10px" }}>📖 Spieler-Highlights</div>
              {analysis.playerHighlights.map((ph, i) => (
                <div key={ph.playerName} style={{ paddingTop: i > 0 ? "8px" : 0, borderTop: i > 0 ? `1px solid ${T.line}` : "none" }}>
                  <div style={{ fontSize: "13px", color: T.text, fontWeight: 600, marginBottom: "4px" }}>{ph.playerName}</div>
                  {ph.lines.length === 0 ? (
                    <div style={{ fontSize: "11px", color: T.textDim, fontStyle: "italic", paddingBottom: "6px" }}>Solide Runde, keine Auffälligkeiten.</div>
                  ) : (
                    ph.lines.map((line, j) => (
                      <div key={j} style={{ fontSize: "11px", color: T.textSoft, lineHeight: 1.5, paddingBottom: j === ph.lines.length - 1 ? "6px" : 0 }}>{line}</div>
                    ))
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 📈 Uschi trend */}
          {analysis.uschiTrend && (
            <div style={{ ...S.card, padding: "12px 14px", marginBottom: "14px" }}>
              <div style={{ ...S.eyebrow, marginBottom: "10px", color: T.gold }}>📈 Uschi-Verlauf</div>
              {(() => {
                const { labels, series } = analysis.uschiTrend;
                const allValues = series.flatMap(s => s.points);
                const minY = Math.min(0, ...allValues);
                const maxY = Math.max(0, ...allValues);
                const range = maxY - minY || 1;
                const W = 300, H = 120;
                const paddingX = 8, paddingY = 14;
                const chartW = W - paddingX * 2;
                const chartH = H - paddingY * 2;
                const step = chartW / Math.max(1, labels.length - 1);
                const yOf = v => paddingY + chartH - ((v - minY) / range) * chartH;
                const colors = [T.gold, T.sage, "#c97a5c", "#8ba8c9"]; // up to 4 players
                return (
                  <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ overflow: "visible" }}>
                    {/* Zero line */}
                    {minY <= 0 && maxY >= 0 && (
                      <line x1={paddingX} y1={yOf(0)} x2={W - paddingX} y2={yOf(0)} stroke={T.line} strokeDasharray="2,2" strokeWidth="1" />
                    )}
                    {/* Player lines */}
                    {series.map((s, i) => {
                      const color = colors[i % colors.length];
                      const path = s.points.map((v, idx) => `${idx === 0 ? "M" : "L"}${(paddingX + idx * step).toFixed(1)},${yOf(v).toFixed(1)}`).join(" ");
                      const last = s.points[s.points.length - 1];
                      return (
                        <g key={s.name}>
                          <path d={path} stroke={color} strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                          <circle cx={paddingX + (s.points.length - 1) * step} cy={yOf(last)} r="3" fill={color} />
                        </g>
                      );
                    })}
                  </svg>
                );
              })()}
              {/* Legend */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "8px", fontSize: "11px" }}>
                {analysis.uschiTrend.series.map((s, i) => {
                  const colors = [T.gold, T.sage, "#c97a5c", "#8ba8c9"];
                  const last = s.points[s.points.length - 1];
                  return (
                    <div key={s.name} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <span style={{ width: "10px", height: "3px", background: colors[i % colors.length], borderRadius: "2px" }} />
                      <span style={{ color: T.textSoft }}>{s.name}</span>
                      <span className="mono" style={{ color: T.textDim, fontSize: "10px" }}>({last > 0 ? "+" : ""}{last})</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button onClick={() => setRoundAnalysisId(null)}
            style={{ ...S.btnSecondary, width: "100%", marginTop: "8px" }}>
            Schließen
          </button>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE CONFIRMATION MODAL — context-aware delete prompt for rounds
  // ═══════════════════════════════════════════════════════════════════════════
  const confirmDelete = (round) => {
    setDeleteConfirm(round);
  };

  const renderDeleteConfirm = () => {
    if (!deleteConfirm) return null;
    const r = deleteConfirm;
    const playerCount = (r.players || []).length;
    const holesCount = (r.holes || []).length;
    const dateLabel = r.cfg?.date ? fmtDate(r.cfg.date) : "Unbekanntes Datum";
    const playerNames = (r.players || []).map(p => p.name).join(", ");
    const progress = getRoundProgress(r);
    const statusLabel = progress.complete ? "Abgeschlossen"
      : progress.notStarted ? "Noch nicht begonnen"
      : `Läuft (${progress.holesPlayed}/${progress.totalHoles} Löcher)`;

    const doDelete = () => {
      const id = r.id;
      setDeleteConfirm(null);
      deleteRound(id);
    };

    return (
      <div onClick={() => setDeleteConfirm(null)}
        style={{
          position: "fixed", inset: 0, background: "#000000dd", zIndex: 1200,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
        }}>
        <div onClick={e => e.stopPropagation()}
          style={{
            width: "100%", maxWidth: "420px",
            background: T.surface1, borderRadius: "16px",
            border: `1px solid ${T.line}`, padding: "22px",
          }}>
          <div style={{ fontSize: "32px", textAlign: "center", marginBottom: "12px" }}>🗑️</div>
          <h3 className="serif" style={{ fontSize: "20px", margin: "0 0 14px", color: T.text, textAlign: "center" }}>
            Runde löschen?
          </h3>

          {/* Context details */}
          <div style={{
            background: T.surface2, padding: "14px",
            borderRadius: "10px", marginBottom: "16px",
            border: `1px solid ${T.line}`,
          }}>
            <div style={{ fontSize: "14px", fontWeight: 600, color: T.text, marginBottom: "8px" }}>
              {r.cfg?.clubName || "Runde"}
            </div>
            <div style={{ fontSize: "12px", color: T.textSoft, lineHeight: 1.6 }}>
              <div>📅 {dateLabel}</div>
              <div>⛳ {holesCount} Löcher · {playerCount} {playerCount === 1 ? "Spieler" : "Spieler"}</div>
              {playerNames && (
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  👥 {playerNames}
                </div>
              )}
              <div style={{ marginTop: "4px", color: progress.complete ? T.gold : progress.notStarted ? T.textDim : T.gold }}>
                {progress.complete ? "✓" : progress.notStarted ? "○" : "📝"} {statusLabel}
              </div>
            </div>
          </div>

          <p style={{ fontSize: "11px", color: T.textDim, lineHeight: 1.5, marginBottom: "16px", textAlign: "center" }}>
            Du kannst es danach kurz rückgängig machen über das Toast.
          </p>

          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => setDeleteConfirm(null)}
              style={{ ...S.btnSecondary, flex: 1, padding: "12px", fontSize: "13px" }}>
              Abbrechen
            </button>
            <button onClick={doDelete}
              style={{
                ...S.btnPrimary, flex: 1, padding: "12px", fontSize: "13px",
                background: T.double, color: "#fff",
              }}>
              Löschen
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SYNC CONFLICT MODAL — protects against accidental data loss when cloud
  // has fewer rounds than local (e.g., someone else pushed empty state)
  // ═══════════════════════════════════════════════════════════════════════════
  const renderSyncConflict = () => {
    if (!syncConflict) return null;
    const localCount = syncConflict.localRounds.length;
    const cloudRounds = syncConflict.cloudData.rounds || [];
    const cloudCount = cloudRounds.length;
    const cloudDate = syncConflict.cloudUpdatedAt
      ? new Date(syncConflict.cloudUpdatedAt).toLocaleString("de-AT", {
          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
        })
      : "?";

    const keepLocal = async () => {
      // User chose: keep local data
      // If this was a manual code entry, NOW commit the code switch (with local data preserved)
      if (syncConflict.pendingCode) {
        setSyncCode(syncConflict.pendingCode);
        try { await window.storage.set("golf-sync-code", syncConflict.pendingCode); } catch {}
        try { await window.storage.set("golf-last-sync", "0"); } catch {} // force push of local
        setShowSyncModal(false);
        showUndoToast(`✓ Verbunden mit "${syncConflict.pendingCode}" — ${localCount} lokale Runden behalten`, null);
      } else {
        // Initial-pull case: just keep local, push will happen on next change
        try { await window.storage.set("golf-last-sync", "0"); } catch {}
        showUndoToast(`✓ Lokale Daten behalten (${localCount} Runden)`, null);
      }
      setSyncConflict(null);
    };

    const useCloud = async () => {
      if (!confirm(`Wirklich ${localCount} lokale Runden durch ${cloudCount} Cloud-Runden ersetzen? Das kann nicht rückgängig gemacht werden!`)) return;
      const cloudData = syncConflict.cloudData;
      setRounds(cloudData.rounds || []);
      setFriends(cloudData.friends || []);
      setCustomClubs(cloudData.customClubs || []);
      // If manual code entry, commit the code switch
      if (syncConflict.pendingCode) {
        setSyncCode(syncConflict.pendingCode);
        try { await window.storage.set("golf-sync-code", syncConflict.pendingCode); } catch {}
        setShowSyncModal(false);
      }
      try { await window.storage.set("golf-last-sync", String(new Date(syncConflict.cloudUpdatedAt).getTime())); } catch {}
      setSyncConflict(null);
      showUndoToast("✓ Cloud-Daten geladen", null);
    };

    const merge = async () => {
      const cloudIds = new Set(cloudRounds.map(r => r.id));
      const localOnly = syncConflict.localRounds.filter(r => !cloudIds.has(r.id));
      // Also dedup by content fingerprint
      const fingerprint = r => {
        const date = r.cfg?.date || r.savedAt || 0;
        const club = r.cfg?.clubName || "";
        const playerNames = (r.players || []).map(p => p.name).sort().join("|");
        const holesCount = (r.holes || []).length;
        return `${club}::${date}::${playerNames}::${holesCount}`;
      };
      const cloudFingerprints = new Set(cloudRounds.map(fingerprint));
      const trulyLocalOnly = localOnly.filter(r => !cloudFingerprints.has(fingerprint(r)));
      const merged = [...cloudRounds, ...trulyLocalOnly].sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));

      // Friends + clubs merge
      const cloudFriends = syncConflict.cloudData.friends || [];
      const cloudFriendNames = new Set(cloudFriends.map(f => f.name));
      const localFriendsRaw = await window.storage.get("golf-friends");
      const localFriends = localFriendsRaw?.value ? JSON.parse(localFriendsRaw.value) : [];
      const mergedFriends = [...cloudFriends, ...localFriends.filter(f => !cloudFriendNames.has(f.name))];

      const cloudClubs = syncConflict.cloudData.customClubs || [];
      const cloudClubNames = new Set(cloudClubs.map(c => c.name));
      const localClubsRaw = await window.storage.get("golf-custom-clubs");
      const localClubs = localClubsRaw?.value ? JSON.parse(localClubsRaw.value) : [];
      const mergedClubs = [...cloudClubs, ...localClubs.filter(c => !cloudClubNames.has(c.name))];

      setRounds(merged);
      setFriends(mergedFriends);
      setCustomClubs(mergedClubs);
      // If manual code entry, commit the code switch
      if (syncConflict.pendingCode) {
        setSyncCode(syncConflict.pendingCode);
        try { await window.storage.set("golf-sync-code", syncConflict.pendingCode); } catch {}
        setShowSyncModal(false);
      }
      try { await window.storage.set("golf-last-sync", "0"); } catch {} // force re-push
      setSyncConflict(null);
      showUndoToast(`✓ Zusammengeführt: ${merged.length} Runden`, null);
    };

    return (
      <div style={{ position: "fixed", inset: 0, background: "#000000dd", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
        <div style={{ width: "100%", maxWidth: "440px", background: T.surface1, borderRadius: "16px", border: `2px solid ${T.gold}`, padding: "22px" }}>
          <div style={{ fontSize: "32px", textAlign: "center", marginBottom: "12px" }}>⚠️</div>
          <h3 className="serif" style={{ fontSize: "20px", margin: "0 0 8px", color: T.text, textAlign: "center" }}>
            Sync-Warnung
          </h3>
          <p style={{ fontSize: "12px", color: T.textSoft, lineHeight: 1.5, marginBottom: "14px" }}>
            Die Cloud hat <b style={{ color: T.gold }}>{cloudCount} Runde{cloudCount === 1 ? "" : "n"}</b>, aber dein Gerät hat <b style={{ color: T.gold }}>{localCount} Runde{localCount === 1 ? "" : "n"}</b>.
            <br /><br />
            Das kann passieren wenn jemand den gleichen Sync-Code <span style={{ color: T.text }}>{syncCode}</span> nutzt. Cloud-Update war: <span style={{ color: T.textDim }}>{cloudDate}</span>.
          </p>

          <div style={{ background: T.surface2, padding: "10px 12px", borderRadius: "8px", fontSize: "11px", color: T.textSoft, marginBottom: "16px", lineHeight: 1.5 }}>
            <b style={{ color: T.gold }}>Empfehlung:</b> "Lokal behalten" wenn du sicher bist dass deine lokalen Daten die richtigen sind — Cloud wird dann mit deinen Daten überschrieben.
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button onClick={keepLocal}
              style={{ ...S.btnPrimary, width: "100%", padding: "12px", fontSize: "13px" }}>
              🛡️ Lokal behalten ({localCount} Runden) — empfohlen
            </button>
            <button onClick={merge}
              style={{ ...S.btnSecondary, width: "100%", padding: "12px", fontSize: "13px" }}>
              🔀 Zusammenführen (Union beider Stände)
            </button>
            <button onClick={useCloud}
              style={{ ...S.btnSecondary, width: "100%", padding: "12px", fontSize: "13px", color: T.double, borderColor: `${T.double}40` }}>
              ⚠️ Cloud verwenden (lokale Daten verlieren)
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderUndoToast = () => {
    if (!undoAction) return null;
    return (
      <div
        style={{
          position: "fixed",
          bottom: "16px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1400,
          background: T.surface1,
          border: `1px solid ${T.gold}60`,
          borderRadius: "10px",
          padding: "10px 14px",
          boxShadow: "0 10px 30px #000000aa",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          minWidth: "240px",
          maxWidth: "92vw",
        }}
        className="fade-in"
      >
        <span style={{ fontSize: "16px" }}>✓</span>
        <span style={{ flex: 1, fontSize: "13px", color: T.text }}>{undoAction.message}</span>
        <button
          onClick={() => {
            clearTimeout(undoTimerRef.current);
            undoAction.undo();
          }}
          style={{
            background: "transparent",
            border: "none",
            color: T.gold,
            fontSize: "13px",
            fontWeight: 700,
            padding: "4px 10px",
            cursor: "pointer",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Rückgängig
        </button>
      </div>
    );
  };

  const renderWelcome = () => {
    if (!showWelcome) return null;

    const dismissWelcome = async () => {
      try { await window.storage.set("golf-welcome-seen", "1"); } catch {}
      setShowWelcome(false);
      setWelcomeSlide(0);
    };

    const slides = [
      {
        icon: "⛳",
        title: "Willkommen bei Fairway",
        body: (
          <>
            <p style={{ fontSize: "14px", color: T.textSoft, lineHeight: 1.6, margin: "0 0 12px" }}>
              Fairway ist ein digitaler Scorecard für deine Golfrunden. Mit drei Besonderheiten:
            </p>
            <ul style={{ fontSize: "13px", color: T.text, lineHeight: 1.8, paddingLeft: "20px", margin: 0 }}>
              <li><b>WHS-Handicap</b> — automatische Kurs-HCP-Berechnung für jeden Platz und Tee</li>
              <li><b>Stableford</b> — klassische Punktewertung Netto und Brutto</li>
              <li><b>Uschi-Modus</b> — unser einzigartiges Spiel unter Freunden (nächste Slide)</li>
            </ul>
          </>
        ),
      },
      {
        icon: "🎯",
        title: "So funktioniert Uschi",
        body: (
          <>
            <p style={{ fontSize: "13px", color: T.textSoft, lineHeight: 1.6, margin: "0 0 10px" }}>
              Pro Loch gibt's Punkte nach fairem Kurs-HCP-Ausgleich:
            </p>
            <div style={{ fontSize: "13px", color: T.text, lineHeight: 1.8, marginBottom: "12px" }}>
              <div>🏆 <b>+1</b> bester Netto-Score</div>
              <div>🔻 <b>−1</b> schlechtester Netto-Score</div>
              <div>🎯 <b>+1</b> pro Birdie (oder besser)</div>
              <div>💧 <b>+Carry</b> bei Par-3 Uschi-Dialog</div>
            </div>
            <p style={{ fontSize: "12px", color: T.textSoft, lineHeight: 1.5, margin: "0 0 6px" }}>
              <b>Par-3 Uschi</b>: Wer auf Par-3 mit Closest-to-Pin das Grün trifft und Par macht, holt den Carry.
              Trifft niemand das Grün, wandert der Carry zum nächsten Par-3 (1× → 2× → 3× …).
            </p>
            <p style={{ fontSize: "12px", color: T.textDim, lineHeight: 1.5, margin: 0, fontStyle: "italic" }}>
              Bei Uschi 2v2 werden die Einzelpunkte der Teammitglieder summiert.
            </p>
          </>
        ),
      },
      {
        icon: "⚖️",
        title: "Fairer HC-Ausgleich",
        body: (
          <>
            <p style={{ fontSize: "13px", color: T.textSoft, lineHeight: 1.6, margin: "0 0 10px" }}>
              Damit Uschi auch mit gemischten Handicaps fair bleibt, gibt's automatisch Extra-Schläge für schwächere Spieler:
            </p>
            <div style={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: "8px", padding: "12px", marginBottom: "12px" }}>
              <div style={{ fontSize: "12px", color: T.gold, fontWeight: 700, marginBottom: "6px" }}>Die Formel</div>
              <div style={{ fontSize: "12px", color: T.text, lineHeight: 1.6 }}>
                Der Spieler mit dem <b>niedrigsten Kurs-HCP</b> ist der Maßstab (0 Extra-Schläge). Alle anderen bekommen <b>80% ihres HCP-Abstands</b> zu ihm als Extra-Schläge.
              </div>
            </div>
            <div style={{ fontSize: "12px", color: T.textSoft, lineHeight: 1.6, marginBottom: "8px" }}>
              <b style={{ color: T.text }}>Beispiel:</b><br/>
              Max (HC 16) · Bodo (HC 31) · Thorsten (HC 33)<br/>
              → Max: <span className="mono">0</span> · Bodo: <span className="mono">(31−16)×0.8 = 12</span> · Thorsten: <span className="mono">14</span>
            </div>
            <p style={{ fontSize: "11px", color: T.textDim, lineHeight: 1.5, margin: 0, fontStyle: "italic" }}>
              Die Extra-Schläge werden auf die schwersten Löcher (niedrigster Stroke-Index) verteilt. Bei 9-Loch-Runden halbiert.
            </p>
          </>
        ),
      },
      {
        icon: "🔒",
        title: "Sync & Privatsphäre",
        body: (
          <>
            <p style={{ fontSize: "13px", color: T.textSoft, lineHeight: 1.6, margin: "0 0 12px" }}>
              Deine Daten werden über einen <b>Sync-Code</b> synchronisiert — vergleichbar mit einem gemeinsamen Passwort.
            </p>
            <div style={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: "8px", padding: "12px", marginBottom: "10px" }}>
              <div style={{ fontSize: "12px", color: T.gold, fontWeight: 700, marginBottom: "6px" }}>👤 Alleine spielen</div>
              <div style={{ fontSize: "12px", color: T.text, lineHeight: 1.6 }}>
                Eigenen Code wählen oder zufällig generieren lassen → deine Daten sind <b>privat</b> und nur auf deinen eigenen Geräten sichtbar.
              </div>
            </div>
            <div style={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: "8px", padding: "12px", marginBottom: "10px" }}>
              <div style={{ fontSize: "12px", color: T.gold, fontWeight: 700, marginBottom: "6px" }}>👥 In einer Gruppe</div>
              <div style={{ fontSize: "12px", color: T.text, lineHeight: 1.6 }}>
                Gemeinsamen Code teilen (z.B. <span className="mono">STAMMRUNDE-2026</span>) → alle Gruppen-Mitglieder sehen dieselben Runden, Freunde und Clubs.
              </div>
            </div>
            <p style={{ fontSize: "11px", color: T.textDim, lineHeight: 1.5, margin: 0, fontStyle: "italic" }}>
              Wichtig: Jeder mit dem Code kann Daten lesen und schreiben. Teile ihn nur mit Leuten denen du vertraust.
            </p>
          </>
        ),
      },
      {
        icon: "🚀",
        title: "Zum Loslegen",
        body: (
          <>
            <div style={{ fontSize: "13px", color: T.text, lineHeight: 1.8, marginBottom: "14px" }}>
              <div style={{ marginBottom: "10px" }}>
                <b style={{ color: T.gold }}>1.</b> Neue Runde starten, Club + Tee wählen
              </div>
              <div style={{ marginBottom: "10px" }}>
                <b style={{ color: T.gold }}>2.</b> Spieler mit HCP hinzufügen, ggf. Uschi-Modus aktivieren
              </div>
              <div style={{ marginBottom: "10px" }}>
                <b style={{ color: T.gold }}>3.</b> Während der Runde Scores eingeben — Live oder Batch
              </div>
              <div style={{ marginBottom: "10px" }}>
                <b style={{ color: T.gold }}>4.</b> <b>📸 Zwischenstand teilen</b> für WhatsApp-Bild, <b>📡 Live-Ticker</b> für Live-URL
              </div>
              <div>
                <b style={{ color: T.gold }}>5.</b> Mit Cloud-Sync über alle deine Geräte synchronisieren
              </div>
            </div>
            <p style={{ fontSize: "11px", color: T.textDim, textAlign: "center", margin: 0, fontStyle: "italic" }}>
              Viel Spaß auf dem Platz! ⛳
            </p>
          </>
        ),
      },
    ];

    const s = slides[welcomeSlide];
    const isLast = welcomeSlide === slides.length - 1;

    return (
      <div style={{ position: "fixed", inset: 0, background: "#000000dd", zIndex: 1300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div className="fade-in" style={{
          width: "100%", maxWidth: "480px",
          background: T.surface1,
          borderRadius: "20px",
          border: `1px solid ${T.line}`,
          padding: "28px 22px 22px",
          maxHeight: "88vh", overflowY: "auto",
          boxShadow: "0 20px 60px #000000bb",
        }}>
          {/* Icon */}
          <div style={{ fontSize: "44px", textAlign: "center", marginBottom: "14px" }}>{s.icon}</div>

          {/* Title */}
          <h2 className="serif" style={{ fontSize: "26px", textAlign: "center", color: T.text, margin: "0 0 14px" }}>
            {s.title}
          </h2>

          {/* Body */}
          <div>{s.body}</div>

          {/* Slide dots */}
          <div style={{ display: "flex", justifyContent: "center", gap: "6px", margin: "20px 0 14px" }}>
            {slides.map((_, i) => (
              <div key={i} style={{
                width: i === welcomeSlide ? "20px" : "6px",
                height: "6px",
                borderRadius: "3px",
                background: i === welcomeSlide ? T.gold : T.lineStrong,
                transition: "width 0.2s",
              }}/>
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: "8px" }}>
            {welcomeSlide > 0 && (
              <button onClick={() => setWelcomeSlide(welcomeSlide - 1)}
                style={{ ...S.btnSecondary, flex: 1 }}>
                ← Zurück
              </button>
            )}
            <button onClick={() => isLast ? dismissWelcome() : setWelcomeSlide(welcomeSlide + 1)} className="gold-hover"
              style={{ ...S.btnPrimary, flex: welcomeSlide > 0 ? 2 : 1 }}>
              {isLast ? "Loslegen ⛳" : "Weiter →"}
            </button>
          </div>

          {/* Skip link */}
          {!isLast && (
            <button onClick={dismissWelcome}
              style={{ background: "transparent", border: "none", color: T.textDim, fontSize: "11px", marginTop: "10px", width: "100%", padding: "6px", cursor: "pointer" }}>
              Überspringen
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderLiveModal = () => {
    if (!showLiveModal) return null;
    const active = liveStatus === "active" && liveCode;
    const url = liveUrl();
    return (
      <div onClick={() => setShowLiveModal(false)}
        style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1160, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div onClick={e => e.stopPropagation()} className="slide-up"
          style={{ width: "100%", maxWidth: "520px", background: T.surface1, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", border: `1px solid ${T.line}`, padding: "20px 16px 28px", maxHeight: "92vh", overflowY: "auto" }}>
          <SwipeHandle onClose={() => setShowLiveModal(false)} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <h3 className="serif" style={{ fontSize: "22px", margin: 0, color: T.text }}>
              📡 Live-Ticker
            </h3>
            <button onClick={() => setShowLiveModal(false)}
              style={{ background: "transparent", border: "none", color: T.textDim, fontSize: "22px", padding: "4px 8px", cursor: "pointer" }}>✕</button>
          </div>

          {!SYNC_ENABLED && (
            <div style={{ padding: "12px", background: `${T.bogey}15`, border: `1px solid ${T.bogey}40`, borderRadius: "10px", fontSize: "13px", color: T.bogey, lineHeight: 1.5 }}>
              Live-Ticker benötigt Supabase Cloud-Sync. Bitte zuerst einrichten.
            </div>
          )}

          {SYNC_ENABLED && !active && (
            <>
              <p style={{ fontSize: "13px", color: T.textSoft, lineHeight: 1.6, marginTop: 0 }}>
                Teile deine Runde live mit Freunden. Sie sehen automatisch deinen aktuellen Stand — Scores, Brutto, Uschi-Punkte — ohne App oder Login.
              </p>
              <ul style={{ fontSize: "12px", color: T.textSoft, lineHeight: 1.7, paddingLeft: "18px", marginBottom: "18px" }}>
                <li>Link in die WhatsApp-Gruppe → Freunde klicken → sehen den Live-Stand</li>
                <li>Aktualisiert sich automatisch alle 15 Sekunden</li>
                <li>Läuft nach 48 Stunden ab — danach wird die URL ungültig</li>
              </ul>
              <button onClick={liveStart} disabled={liveStatus === "creating"} className="gold-hover"
                style={{ ...S.btnPrimary, width: "100%", opacity: liveStatus === "creating" ? 0.5 : 1 }}>
                {liveStatus === "creating" ? "Wird erstellt…" : "📡 Live-Ticker starten"}
              </button>
            </>
          )}

          {SYNC_ENABLED && active && (
            <>
              <div style={{ padding: "12px 14px", background: `${T.sage}15`, border: `1px solid ${T.sage}40`, borderRadius: "10px", marginBottom: "14px", fontSize: "12px", color: T.sage, display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: T.sage, display: "inline-block" }}/>
                <span><b>Aktiv</b> — Freunde können live zuschauen</span>
              </div>

              <div style={{ background: T.surface2, border: `1px solid ${T.gold}40`, borderRadius: "12px", padding: "14px", marginBottom: "12px" }}>
                <div style={{ ...S.eyebrow, color: T.gold, marginBottom: "8px" }}>LIVE-URL</div>
                <div style={{ fontSize: "12px", color: T.text, fontFamily: "JetBrains Mono, monospace", wordBreak: "break-all", lineHeight: 1.4 }}>
                  {url}
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                <button onClick={copyLiveUrl} style={{ ...S.btnSecondary, flex: 1 }}>
                  📋 Kopieren
                </button>
                <button onClick={shareLiveUrl} className="gold-hover" style={{ ...S.btnPrimary, flex: 1 }}>
                  📤 Teilen
                </button>
              </div>

              <button onClick={liveEnd}
                style={{ ...S.btnGhost, width: "100%", color: T.bogey, borderColor: `${T.bogey}40`, marginTop: "14px" }}>
                Live-Ticker beenden
              </button>

              <div style={{ fontSize: "11px", color: T.textDim, marginTop: "10px", textAlign: "center", lineHeight: 1.5 }}>
                💡 Änderungen an Scores werden automatisch hochgeladen.<br/>Läuft nach 48 Stunden ab.
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderAddClub = () => {
    if (!showAddClub) return null;
    return (
      <div onClick={() => { setShowAddClub(false); setAddClubMode("choose"); }}
        style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1150, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div onClick={e => e.stopPropagation()} className="slide-up"
          style={{ width: "100%", maxWidth: "520px", background: T.surface1, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", border: `1px solid ${T.line}`, padding: "20px 16px 28px", maxHeight: "92vh", overflowY: "auto" }}>
          <SwipeHandle onClose={() => { setShowAddClub(false); setAddClubMode("choose"); }} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <h3 className="serif" style={{ fontSize: "22px", margin: 0, color: T.text }}>
              {addClubMode === "choose" && "➕ Neuer Club"}
              {addClubMode === "quick" && "📸 Foto-Import"}
              {addClubMode === "manual" && "⌨️ Manuell eintippen"}
              {addClubMode === "paste" && "📋 JSON einfügen"}
            </h3>
            {addClubMode !== "choose" ? (
              <button onClick={() => setAddClubMode("choose")}
                style={{ ...S.btnGhost, fontSize: "11px" }}>← Zurück</button>
            ) : (
              <button onClick={() => setShowAddClub(false)}
                style={{ background: "transparent", border: "none", color: T.textDim, fontSize: "22px", padding: "4px 8px", cursor: "pointer" }}>✕</button>
            )}
          </div>

          {/* === CHOOSE MODE === */}
          {addClubMode === "choose" && (
            <>
              <p style={{ fontSize: "13px", color: T.textSoft, lineHeight: 1.5, marginTop: 0, marginBottom: "16px" }}>
                Neuen Platz in die App aufnehmen — wähle den Weg der für dich am schnellsten geht.
              </p>
              <div style={{ display: "grid", gap: "10px" }}>
                <button onClick={() => setAddClubMode("quick")} className="card-hover"
                  style={{ padding: "16px", background: T.surface2, border: `1px solid ${T.gold}40`, borderRadius: "12px", textAlign: "left", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "24px" }}>📸</span>
                    <span style={{ fontSize: "15px", fontWeight: 700, color: T.gold }}>Foto-Import (empfohlen)</span>
                  </div>
                  <div style={{ fontSize: "12px", color: T.textSoft, lineHeight: 1.4 }}>
                    Prompt kopieren → in neuem Claude-Chat einfügen → Scorecard-Foto dranhängen → JSON zurück in die App
                  </div>
                </button>

                <button onClick={() => setAddClubMode("manual")} className="card-hover"
                  style={{ padding: "16px", background: T.surface2, border: `1px solid ${T.line}`, borderRadius: "12px", textAlign: "left", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "24px" }}>⌨️</span>
                    <span style={{ fontSize: "15px", fontWeight: 700, color: T.text }}>Manuell eintippen</span>
                  </div>
                  <div style={{ fontSize: "12px", color: T.textSoft, lineHeight: 1.4 }}>
                    Schnell-Formular: nur das Nötigste (Name, CR, Slope, Par). Loch-Details im nächsten Schritt.
                  </div>
                </button>

                <button onClick={() => setAddClubMode("paste")} className="card-hover"
                  style={{ padding: "16px", background: T.surface2, border: `1px solid ${T.line}`, borderRadius: "12px", textAlign: "left", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "24px" }}>📋</span>
                    <span style={{ fontSize: "15px", fontWeight: 700, color: T.text }}>JSON einfügen</span>
                  </div>
                  <div style={{ fontSize: "12px", color: T.textSoft, lineHeight: 1.4 }}>
                    Du hast schon ein fertiges Club-JSON (z.B. aus einem früheren Claude-Chat)? Hier einfügen.
                  </div>
                </button>
              </div>
            </>
          )}

          {/* === QUICK/PHOTO MODE === */}
          {addClubMode === "quick" && (
            <>
              <p style={{ fontSize: "13px", color: T.textSoft, lineHeight: 1.5, marginTop: 0, marginBottom: "14px" }}>
                So geht's in 3 Schritten:
              </p>
              <ol style={{ fontSize: "13px", color: T.text, paddingLeft: "20px", lineHeight: 1.7, marginBottom: "14px" }}>
                <li>Prompt unten kopieren</li>
                <li>Neuen <b>Claude-Chat</b> öffnen (App oder claude.ai) → Prompt einfügen → <b>Scorecard-Foto</b> anhängen → senden</li>
                <li>JSON kopieren → hier auf "📋 JSON einfügen" → fertig</li>
              </ol>

              <div style={{ padding: "12px", background: T.surface2, border: `1px solid ${T.line}`, borderRadius: "10px", marginBottom: "12px", fontSize: "11px", color: T.textSoft, fontFamily: "JetBrains Mono, monospace", maxHeight: "140px", overflowY: "auto", lineHeight: 1.4 }}>
                {QUICK_CLUB_PROMPT.slice(0, 200)}...
              </div>

              <button onClick={copyPromptToClipboard} className="gold-hover"
                style={{ ...S.btnPrimary, width: "100%", marginBottom: "10px" }}>
                📋 Prompt kopieren
              </button>

              <button onClick={() => setAddClubMode("paste")}
                style={{ ...S.btnSecondary, width: "100%" }}>
                Weiter zu "JSON einfügen" →
              </button>
            </>
          )}

          {/* === MANUAL MODE === */}
          {addClubMode === "manual" && (
            <>
              <p style={{ fontSize: "13px", color: T.textSoft, lineHeight: 1.5, marginTop: 0, marginBottom: "16px" }}>
                Schnell-Formular. Den Stroke-Index und Loch-Par kannst du im nächsten Schritt anpassen.
              </p>
              <div style={{ display: "grid", gap: "10px", marginBottom: "16px" }}>
                <div>
                  <label style={{ fontSize: "11px", color: T.textDim, fontWeight: 600, display: "block", marginBottom: "4px" }}>CLUB-NAME</label>
                  <input type="text" value={quickClubForm.name}
                    onChange={e => setQuickClubForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="z.B. GC Schloss Schönborn"
                    style={{ ...S.input }}/>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <label style={{ fontSize: "11px", color: T.textDim, fontWeight: 600, display: "block", marginBottom: "4px" }}>ANZAHL LÖCHER</label>
                    <select value={quickClubForm.numHoles}
                      onChange={e => setQuickClubForm(f => ({ ...f, numHoles: parseInt(e.target.value) }))}
                      style={{ ...S.input }}>
                      <option value={18}>18</option>
                      <option value={9}>9</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", color: T.textDim, fontWeight: 600, display: "block", marginBottom: "4px" }}>TEE-NAME</label>
                    <input type="text" value={quickClubForm.teeName}
                      onChange={e => setQuickClubForm(f => ({ ...f, teeName: e.target.value }))}
                      placeholder="Gelb (Herren)"
                      style={{ ...S.input }}/>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                  <div>
                    <label style={{ fontSize: "11px", color: T.textDim, fontWeight: 600, display: "block", marginBottom: "4px" }}>CR</label>
                    <input type="number" step="0.1" value={quickClubForm.cr}
                      onChange={e => setQuickClubForm(f => ({ ...f, cr: e.target.value }))}
                      placeholder="71.5"
                      style={{ ...S.input, textAlign: "center" }}/>
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", color: T.textDim, fontWeight: 600, display: "block", marginBottom: "4px" }}>SLOPE</label>
                    <input type="number" value={quickClubForm.slope}
                      onChange={e => setQuickClubForm(f => ({ ...f, slope: e.target.value }))}
                      placeholder="125"
                      style={{ ...S.input, textAlign: "center" }}/>
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", color: T.textDim, fontWeight: 600, display: "block", marginBottom: "4px" }}>PAR</label>
                    <input type="number" value={quickClubForm.par}
                      onChange={e => setQuickClubForm(f => ({ ...f, par: e.target.value }))}
                      placeholder="72"
                      style={{ ...S.input, textAlign: "center" }}/>
                  </div>
                </div>
              </div>
              <button onClick={saveQuickClub} className="gold-hover"
                style={{ ...S.btnPrimary, width: "100%" }}>
                ✓ Club speichern & auswählen
              </button>
              <div style={{ fontSize: "11px", color: T.textDim, marginTop: "10px", textAlign: "center", lineHeight: 1.4 }}>
                💡 Alle Werte findest du auf der offiziellen Scorekarte des Clubs.
              </div>
            </>
          )}

          {/* === PASTE MODE === */}
          {addClubMode === "paste" && (
            <>
              <p style={{ fontSize: "13px", color: T.textSoft, lineHeight: 1.5, marginTop: 0, marginBottom: "14px" }}>
                Füge hier das komplette JSON deines Clubs ein — kommt aus einem Claude-Chat oder einem früheren Export.
              </p>
              <button onClick={() => { setShowAddClub(false); setShowImport(true); setAddClubMode("choose"); }}
                className="gold-hover"
                style={{ ...S.btnPrimary, width: "100%" }}>
                📋 Import-Dialog öffnen
              </button>
              <div style={{ fontSize: "11px", color: T.textDim, marginTop: "10px", textAlign: "center", lineHeight: 1.4 }}>
                Im Import-Dialog kannst du das JSON einfügen und validieren.
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderSharePreview = () => {
    if (!sharePreview) return null;
    return (
      <div onClick={closeSharePreview}
        style={{ position: "fixed", inset: 0, background: "#000000ee", zIndex: 1200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
        <div onClick={e => e.stopPropagation()} className="slide-up"
          style={{
            width: "100%", maxWidth: "520px",
            background: T.surface1,
            borderTopLeftRadius: "24px", borderTopRightRadius: "24px",
            border: `1px solid ${T.line}`,
            padding: "16px 16px 20px",
            maxHeight: "92vh",
            display: "flex", flexDirection: "column",
          }}>
          <SwipeHandle onClose={closeSharePreview} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <div>
              <div className="serif" style={{ fontSize: "22px", color: T.text, lineHeight: 1.1 }}>
                Vorschau
              </div>
              <div style={{ fontSize: "11px", color: T.textSoft, marginTop: "3px" }}>
                So sieht das Bild für WhatsApp aus
              </div>
            </div>
            <button onClick={closeSharePreview}
              style={{ background: "transparent", border: "none", color: T.textDim, fontSize: "22px", padding: "6px 10px", cursor: "pointer" }}>
              ✕
            </button>
          </div>

          {/* Scrollable image preview */}
          <div style={{ flex: 1, overflowY: "auto", background: T.surface2, borderRadius: "12px", padding: "10px", marginBottom: "12px", border: `1px solid ${T.line}` }}>
            <img src={sharePreview.url} alt="Share Preview"
              style={{ width: "100%", display: "block", borderRadius: "6px" }}/>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={closeSharePreview}
              style={{ ...S.btnSecondary, flex: 1 }}>
              Abbrechen
            </button>
            <button onClick={confirmShare} className="gold-hover"
              style={{ ...S.btnPrimary, flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
              📸 Teilen
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSyncModal = () => {
    if (!showSyncModal) return null;
    return (
      <div onClick={() => setShowSyncModal(false)}
        style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div onClick={e => e.stopPropagation()} className="slide-up"
          style={{ width: "100%", maxWidth: "520px", background: T.surface1, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", border: `1px solid ${T.line}`, padding: "20px 16px 28px", maxHeight: "90vh", overflowY: "auto" }}>
          <SwipeHandle onClose={() => setShowSyncModal(false)} />
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
                placeholder="z.B. GOLF-GANG-2026"
                maxLength={20}
                style={{ ...S.input, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "JetBrains Mono, monospace" }}/>
              <div style={{ fontSize: "10px", color: T.textDim, marginTop: "4px", lineHeight: 1.4 }}>
                💡 Wähle einen eigenen Code für deine Gruppe (4-20 Zeichen: Buchstaben, Zahlen, Bindestrich).<br/>
                Jeder mit dem Code kann Daten lesen und schreiben — wie ein Passwort.
              </div>
              <button onClick={async () => await setupSync(syncInput)}
                disabled={!isValidSyncCode(syncInput)}
                style={{ ...S.btnSecondary, width: "100%", marginTop: "10px", opacity: !isValidSyncCode(syncInput) ? 0.4 : 1 }}>
                Verbinden & Daten laden
              </button>
            </>
          )}

          {/* Backup via JSON export/import — independent of cloud */}
          <div style={{ marginTop: "22px", paddingTop: "18px", borderTop: `1px solid ${T.line}` }}>
            <div style={{ ...S.eyebrow, marginBottom: "10px" }}>Lokales Backup</div>
            <p style={{ fontSize: "11px", color: T.textDim, lineHeight: 1.5, marginBottom: "10px" }}>
              Sichere alle deine Runden, Freunde und Clubs als JSON-Datei auf deinem Gerät — unabhängig von der Cloud.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <button onClick={exportAllData}
                style={{ ...S.btnSecondary, fontSize: "12px", padding: "10px" }}>
                📥 Exportieren
              </button>
              <label
                htmlFor="fairway-import-file"
                style={{ ...S.btnSecondary, fontSize: "12px", padding: "10px", textAlign: "center", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                📤 Importieren
              </label>
              <input
                id="fairway-import-file"
                type="file"
                accept="application/json,.json"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) await handleImportFile(file);
                  e.target.value = ""; // allow re-import of same file
                }}
                style={{ display: "none" }}
              />
            </div>
            <button onClick={async () => {
              // List auto-backups and let user restore
              try {
                const list = await window.storage.list("golf-rounds-backup-");
                if (!list?.keys?.length) {
                  alert("Keine Auto-Backups gefunden.");
                  return;
                }
                const sorted = [...list.keys].sort().reverse();
                let summary = "Verfügbare Auto-Backups:\n\n";
                const detailed = [];
                for (const key of sorted) {
                  const b = await window.storage.get(key);
                  if (b?.value) {
                    try {
                      const d = JSON.parse(b.value);
                      const r = typeof d.rounds === "string" ? JSON.parse(d.rounds) : d.rounds;
                      detailed.push({ key, count: r?.length || 0, data: d });
                      summary += `${key.replace("golf-rounds-backup-", "")}: ${r?.length || 0} Runden\n`;
                    } catch {}
                  }
                }
                summary += `\nWelches Backup wiederherstellen?\n(Datum eingeben, z.B. 2026-04-24)\n\nAchtung: Aktuelle ${rounds.length} lokale Runden werden ersetzt!`;
                const choice = prompt(summary);
                if (!choice) return;
                const backup = detailed.find(d => d.key.includes(choice.trim()));
                if (!backup) {
                  alert("Backup für dieses Datum nicht gefunden.");
                  return;
                }
                if (!confirm(`Wirklich ${rounds.length} aktuelle Runden durch ${backup.count} aus Backup ersetzen?`)) return;
                const r = typeof backup.data.rounds === "string" ? JSON.parse(backup.data.rounds) : backup.data.rounds;
                const f = typeof backup.data.friends === "string" ? JSON.parse(backup.data.friends) : (backup.data.friends || []);
                const c = typeof backup.data.customClubs === "string" ? JSON.parse(backup.data.customClubs) : (backup.data.customClubs || []);
                setRounds(r || []);
                setFriends(f || []);
                setCustomClubs(c || []);
                try { await window.storage.set("golf-last-sync", "0"); } catch {}
                showUndoToast(`✓ Backup vom ${choice} wiederhergestellt: ${backup.count} Runden`, null);
              } catch (e) {
                alert("Fehler beim Lesen der Backups: " + (e.message || "?"));
              }
            }}
              style={{ ...S.btnSecondary, width: "100%", fontSize: "11px", padding: "8px", marginTop: "8px", color: T.gold, borderColor: `${T.gold}40` }}>
              💾 Aus Auto-Backup wiederherstellen
            </button>
            <p style={{ fontSize: "10px", color: T.textDim, marginTop: "6px", lineHeight: 1.4, fontStyle: "italic" }}>
              Auto-Backups werden täglich automatisch erstellt (letzte 7 Tage).
            </p>
          </div>

          {/* Live ticker cleanup */}
          {SYNC_ENABLED && (
            <div style={{ marginTop: "18px", paddingTop: "16px", borderTop: `1px solid ${T.line}` }}>
              <div style={{ ...S.eyebrow, marginBottom: "8px" }}>Live-Ticker bereinigen</div>
              <p style={{ fontSize: "11px", color: T.textDim, lineHeight: 1.5, marginBottom: "10px" }}>
                Falls du mehrere Live-Einträge für die gleiche Runde erstellt hast (Doppel-Klick etc), kannst du hier alte Einträge löschen.
              </p>
              <button
                onClick={async () => {
                  const all = await liveListAll();
                  if (!all.length) {
                    alert("Keine Live-Einträge gefunden.");
                    return;
                  }
                  // Group by content fingerprint (club + first player + holes count)
                  const fingerprintFor = entry => {
                    const data = entry.data || {};
                    const club = data.cfg?.clubName || "";
                    const firstPlayer = (data.players || [])[0]?.name || "";
                    const numHoles = (data.holes || []).length;
                    return `${club}::${firstPlayer}::${numHoles}`;
                  };
                  let summary = "Live-Einträge:\n\n";
                  all.forEach(e => {
                    const data = e.data || {};
                    const club = data.cfg?.clubName || "?";
                    const playerNames = (data.players || []).map(p => p.name).join(", ") || "?";
                    const ageMs = Date.now() - new Date(e.updated_at).getTime();
                    const ageMin = Math.floor(ageMs / 60000);
                    const isOwn = e.code === liveCode ? " [DEINE]" : "";
                    summary += `${e.code}: ${club} · ${playerNames} · vor ${ageMin}min${isOwn}\n`;
                  });
                  summary += `\nWelche löschen?\n• "alle alten" - alle ausser deiner aktuellen Live-Runde\n• "<code>" - nur diesen einen Code\n• Abbrechen für Nichts`;
                  const choice = prompt(summary, "alle alten");
                  if (!choice) return;
                  if (choice.toLowerCase() === "alle alten") {
                    const toDelete = all.filter(e => e.code !== liveCode);
                    if (!toDelete.length) {
                      alert("Keine alten Einträge gefunden.");
                      return;
                    }
                    if (!confirm(`Wirklich ${toDelete.length} Live-Einträge löschen?`)) return;
                    for (const e of toDelete) {
                      await liveDelete(e.code);
                    }
                    alert(`✓ ${toDelete.length} Einträge gelöscht`);
                    // Refresh the home screen list
                    const refreshed = await liveListActive();
                    setActiveLiveRounds(refreshed);
                  } else {
                    const target = all.find(e => e.code === choice.trim());
                    if (!target) {
                      alert("Code nicht gefunden.");
                      return;
                    }
                    if (!confirm(`Wirklich Live-Eintrag "${choice.trim()}" löschen?`)) return;
                    await liveDelete(target.code);
                    alert(`✓ Gelöscht`);
                    const refreshed = await liveListActive();
                    setActiveLiveRounds(refreshed);
                  }
                }}
                style={{ ...S.btnSecondary, width: "100%", fontSize: "11px", padding: "8px" }}>
                🧹 Alte Live-Einträge bereinigen
              </button>
            </div>
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
        <SwipeHandle onClose={() => setShowImport(false)} />
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
      {!isOnline && (
        <div style={{
          padding: "8px 14px", background: `${T.gold}18`, borderBottom: `1px solid ${T.gold}40`,
          color: T.gold, fontSize: "12px", fontWeight: 500, textAlign: "center",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
        }}>
          <span>📡</span>
          <span>Offline — deine Eingaben werden lokal gespeichert und später synchronisiert</span>
        </div>
      )}
      {view === "home"    && renderHome()}
      {view === "setup"   && renderSetup()}
      {view === "holes"   && renderHoles()}
      {view === "scoring" && renderScoring()}
      {view === "results" && renderResults()}
      {padOpen && renderNumberPad()}
      {showImport && renderImportModal()}
      {renderSyncModal()}
      {renderUschiPar3Dialog()}
      {renderUschiReview()}
      {renderSharePreview()}
      {renderAddClub()}
      {renderLiveModal()}
      {renderWelcome()}
      {renderStatsPlayerDetail()}
      {renderStatsHoleDetail()}
      {renderStatsImportModal()}
      {renderRoundAnalysis()}
      {renderSyncConflict()}
      {renderDeleteConfirm()}
      {renderUndoToast()}
    </div>
  );
}
