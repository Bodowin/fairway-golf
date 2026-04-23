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
    players.forEach(p => { holePoints[p.id] = 0; });

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
          if (n.netto === best)  { holePoints[n.pid] += 1; totals[n.pid].best += 1;  }
          if (n.netto === worst) { holePoints[n.pid] -= 1; totals[n.pid].worst -= 1; }
        });
      }
    }

    // Birdie bonus (per player)
    players.forEach(p => {
      const gross = scores[p.id]?.[i];
      if (isValid(gross) && gross <= hole.par - 1) {
        holePoints[p.id] += 1;
        totals[p.id].birdies += 1;
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

    perHole.push({ holeIdx: i, holePoints, uschi: uschiInfo, netto });

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
  const [phEditingFor, setPhEditingFor] = useState(null); // playerId whose PH is being edited manually
  const [sharePreview, setSharePreview] = useState(null); // { blob, url } when share preview is open
  const [showAddClub, setShowAddClub] = useState(false); // "Add new club" modal
  const [addClubMode, setAddClubMode] = useState("choose"); // "choose" | "quick" | "manual" | "paste"
  const [quickClubForm, setQuickClubForm] = useState({ name: "", cr: "", slope: "", par: "", numHoles: 18, teeName: "Gelb (Herren)" });
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
  const getStats = (player) => {
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
  const loadRound = r => {
    setLoadedRoundId(r.id);
    setCfg(r.cfg); setHoles(r.holes); setPlayers(r.players); setScores(r.scores);
    setGameMode(r.gameMode || "stableford");
    setTeams(r.teams || null);
    setPar3Data(r.par3Data || r.uschiInputs || {});
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
    setLoadedRoundId(null);
    setCfg({ name: "", date: toDay(), numHoles: 18, clubName: "", defaultTeeName: "" });
    setHoles(makeHoles(72, 18)); setPlayers([]); setScores({});
    setGameMode("stableford"); setTeams(null); setPar3Data({});
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
            WHS Handicap · Stableford · Uschi 2v2
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

          {/* Action buttons: Uschi protocol + Share */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
            {gameMode !== "stableford" && (
              <button onClick={() => setShowUschiReview(true)}
                style={{
                  flex: 1,
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
                flex: 1,
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
          <div style={{ width: "40px", height: "4px", background: T.lineStrong, borderRadius: "2px", margin: "0 auto 18px" }}/>

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

    return (
      <div onClick={() => setShowUschiReview(false)}
        style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1050, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div onClick={e => e.stopPropagation()} className="slide-up"
          style={{ width: "100%", maxWidth: "520px", background: T.surface1, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", border: `1px solid ${T.line}`, padding: "20px 16px 28px", maxHeight: "92vh", overflowY: "auto" }}>
          <div style={{ width: "40px", height: "4px", background: T.lineStrong, borderRadius: "2px", margin: "0 auto 18px" }}/>

          <h3 className="serif" style={{ fontSize: "24px", margin: "0 0 6px", color: T.text }}>
            🎯 Uschi-Protokoll
          </h3>
          <p style={{ fontSize: "12px", color: T.textSoft, marginBottom: "14px" }}>
            Alle Par-3 Löcher auf einen Blick. Tap auf ein Loch zum Nachbearbeiten.
          </p>

          {par3Indices.length === 0 && (
            <EmptyState icon="🎯" title="Keine Par-3 Löcher" sub="Dieser Platz hat keine Par 3." />
          )}

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
            // Find the uschi info from the computed result to show multiplier
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
                  padding: "12px 14px", marginBottom: "8px",
                  background: T.surface2,
                  border: `1px solid ${T.line}`,
                  borderRadius: "10px",
                  display: "flex", alignItems: "center", gap: "12px",
                  color: T.text,
                }}>
                <div className="mono serif" style={{ fontSize: "22px", color: T.gold, lineHeight: 1, minWidth: "40px" }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: T.text }}>
                    Loch {i + 1} · Par {h.par} · SI {h.si}
                  </div>
                  <div style={{ fontSize: "11px", color: status.color, marginTop: "3px", fontWeight: 500 }}>
                    {status.label}
                  </div>
                </div>
                <span style={{ color: T.textDim, fontSize: "16px" }}>›</span>
              </button>
            );
          })}

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

  const renderAddClub = () => {
    if (!showAddClub) return null;
    return (
      <div onClick={() => { setShowAddClub(false); setAddClubMode("choose"); }}
        style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1150, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div onClick={e => e.stopPropagation()} className="slide-up"
          style={{ width: "100%", maxWidth: "520px", background: T.surface1, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", border: `1px solid ${T.line}`, padding: "20px 16px 28px", maxHeight: "92vh", overflowY: "auto" }}>
          <div style={{ width: "40px", height: "4px", background: T.lineStrong, borderRadius: "2px", margin: "0 auto 18px" }}/>

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
          <div style={{ width: "40px", height: "4px", background: T.lineStrong, borderRadius: "2px", margin: "0 auto 14px" }}/>

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
      {renderUschiPar3Dialog()}
      {renderUschiReview()}
      {renderSharePreview()}
      {renderAddClub()}
    </div>
  );
}
