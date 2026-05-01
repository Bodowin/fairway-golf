import { useState, useEffect, useCallback, useMemo, useRef, Component } from "react";

// ═════════════════════════════════════════════════════════════════════════════
// v40: ErrorBoundary — fängt React-Crashes ab statt Schwarzbild
// ═════════════════════════════════════════════════════════════════════════════
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Fairway crash:", error, errorInfo);
    this.setState({ errorInfo });
  }
  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };
  handleClearAndReload = async () => {
    // Sicherheits-Reset: Aktive Runde verwerfen, Daten bleiben
    try {
      // Nur "lebende" Werte löschen, keine Master-Daten
      // (rounds, friends, customClubs bleiben unangetastet)
      window.location.reload();
    } catch {}
  };
  handleCopyError = () => {
    const errText = `Fairway Crash Report
─────────────────────────────────
Version: ${typeof APP_VERSION !== "undefined" ? APP_VERSION : "unknown"}
Build:   ${typeof APP_BUILD_DATE !== "undefined" ? APP_BUILD_DATE : "unknown"}
Time:    ${new Date().toISOString()}
Browser: ${typeof navigator !== "undefined" ? navigator.userAgent : "unknown"}

Error:   ${this.state.error?.message || this.state.error || "unknown"}

Stack:
${this.state.error?.stack || "no stack"}

ComponentStack:
${this.state.errorInfo?.componentStack || "no component stack"}`;
    try {
      navigator.clipboard?.writeText(errText);
      alert("✓ Fehler-Bericht kopiert. Im Chat einfügen!");
    } catch {
      alert("Konnte Fehler nicht in Zwischenablage kopieren. Mache einen Screenshot.");
    }
  };
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{
        minHeight: "100vh", background: "#0a1410", color: "#cdd5c8",
        fontFamily: "system-ui, sans-serif", padding: "24px",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          maxWidth: "480px", width: "100%",
          background: "#0f1e15", border: "1px solid #d67a5c50",
          borderRadius: "16px", padding: "24px",
        }}>
          <h1 style={{ fontSize: "22px", marginTop: 0, color: "#d67a5c" }}>
            ⚠️ Hoppla — die App ist abgestürzt
          </h1>
          <p style={{ fontSize: "13px", lineHeight: 1.6, color: "#a2bfa2" }}>
            Keine Sorge, deine Daten sind sicher. Die letzten Runden, Freunde und Clubs sind unverändert gespeichert.
          </p>
          <div style={{
            background: "#0a1410", border: "1px solid #3a4a40", borderRadius: "8px",
            padding: "10px 12px", marginTop: "12px", marginBottom: "16px",
            fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "#d67a5c",
            wordBreak: "break-word",
          }}>
            {this.state.error?.message || String(this.state.error || "Unbekannter Fehler")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button onClick={this.handleClearAndReload}
              style={{
                background: "#c9a85c", color: "#0a1410", border: "none",
                borderRadius: "10px", padding: "12px", fontSize: "14px", fontWeight: 700, cursor: "pointer",
              }}>
              🔄 App neu starten
            </button>
            <button onClick={this.handleCopyError}
              style={{
                background: "transparent", color: "#7ea88a", border: "1px solid #7ea88a40",
                borderRadius: "10px", padding: "10px", fontSize: "13px", cursor: "pointer",
              }}>
              📋 Fehler-Bericht kopieren
            </button>
            <button onClick={this.handleReset}
              style={{
                background: "transparent", color: "#5d6e63", border: "1px solid #3a4a40",
                borderRadius: "10px", padding: "10px", fontSize: "12px", cursor: "pointer",
              }}>
              Versuch's nochmal
            </button>
          </div>
          <p style={{ fontSize: "10px", color: "#5d6e63", marginTop: "16px", lineHeight: 1.5, textAlign: "center" }}>
            Falls's wiederholt passiert: Fehler-Bericht kopieren + im Chat einfügen, dann finde ich den Bug.
          </p>
        </div>
      </div>
    );
  }
}

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

// ─── v40: Stable Device-ID ──────────────────────────────────────────────────
// Jedes Gerät bekommt eine zufällige ID die persistent gespeichert wird.
// Wird genutzt um in Live-Rounds zu erkennen welches Gerät der "Scorer" ist.
async function getOrCreateDeviceId() {
  try {
    const existing = await window.storage.get("golf-device-id");
    if (existing?.value) return existing.value;
  } catch {}
  const newId = "dev_" + Math.random().toString(36).slice(2, 11);
  try { await window.storage.set("golf-device-id", newId); } catch {}
  return newId;
}

// Pull aktuellen Scorer einer Live-Round (kurz, nur scorerId + scorerName)
async function liveCheckScorer(code) {
  if (!SYNC_ENABLED || !code) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/live_rounds?code=eq.${encodeURIComponent(code)}&select=data,updated_at`,
      { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows?.length) return null;
    const d = rows[0].data || {};
    return {
      scorerId: d.scorerId || null,
      scorerName: d.scorerName || null,
      updatedAt: rows[0].updated_at,
    };
  } catch (e) { console.error("Live check scorer failed", e); return null; }
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

// ─── v33: Cloud Archive (Soft-Delete + Recovery) ─────────────────────────────
// Persistent archive of completed rounds. Survives local deletion.
// Owner-email-filtered so only the owner sees their archived rounds.
// Soft-delete = round is hidden in app but still in cloud for N days.
const ARCHIVE_OWNER_EMAIL = "bodowin@gmail.com";
const ARCHIVE_RETENTION_DAYS = 30;

async function archivePush(round, syncCode) {
  if (!SYNC_ENABLED || !round?.id) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rounds_archive`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        id: round.id,
        owner_email: ARCHIVE_OWNER_EMAIL,
        sync_code: syncCode || "",
        round_data: round,
        last_modified: new Date().toISOString(),
      }),
    });
    return res.ok;
  } catch (e) { console.error("Archive push failed", e); return false; }
}

async function archivePushBatch(roundsArr, syncCode) {
  if (!SYNC_ENABLED || !roundsArr?.length) return { ok: false, count: 0 };
  let okCount = 0;
  for (const r of roundsArr) {
    if (await archivePush(r, syncCode)) okCount++;
  }
  return { ok: okCount === roundsArr.length, count: okCount };
}

// Soft-delete: mark a round as deleted in cloud (still recoverable).
async function archiveSoftDelete(roundId) {
  if (!SYNC_ENABLED || !roundId) return false;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/rounds_archive?id=eq.${encodeURIComponent(roundId)}`,
      {
        method: "PATCH",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deleted_at: new Date().toISOString(),
          last_modified: new Date().toISOString(),
        }),
      }
    );
    return res.ok;
  } catch (e) { console.error("Archive soft-delete failed", e); return false; }
}

// Restore: clear deleted_at to bring round back.
async function archiveRestore(roundId) {
  if (!SYNC_ENABLED || !roundId) return false;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/rounds_archive?id=eq.${encodeURIComponent(roundId)}`,
      {
        method: "PATCH",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deleted_at: null,
          last_modified: new Date().toISOString(),
        }),
      }
    );
    return res.ok;
  } catch (e) { console.error("Archive restore failed", e); return false; }
}

// List soft-deleted (= "trashed") rounds for the owner. Filtered to retention window.
async function archiveListTrashed() {
  if (!SYNC_ENABLED) return [];
  try {
    const cutoff = new Date(Date.now() - ARCHIVE_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/rounds_archive?owner_email=eq.${encodeURIComponent(ARCHIVE_OWNER_EMAIL)}&deleted_at=not.is.null&deleted_at=gte.${encodeURIComponent(cutoff)}&order=deleted_at.desc&select=*`,
      { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
    );
    if (!res.ok) return [];
    return await res.json();
  } catch (e) { console.error("Archive list trashed failed", e); return []; }
}

// List ALL archived rounds (for sync diagnostics)
async function archiveListAll() {
  if (!SYNC_ENABLED) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/rounds_archive?owner_email=eq.${encodeURIComponent(ARCHIVE_OWNER_EMAIL)}&select=*`,
      { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
    );
    if (!res.ok) return [];
    return await res.json();
  } catch (e) { console.error("Archive list all failed", e); return []; }
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

// ─── v40: Versions-Marker — sichtbar im App-Footer ──────────────────────────
const APP_VERSION = "v53";
const APP_BUILD_DATE = "2026-05-02";

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

// ── v34: Cap-Wert (Pick-Up-Regel) ──
// Score >= (Par + Vorgabeschläge + 2) ist ein Auto-Strich für SF (= 0 Punkte).
// Anzeige: bei manuellem Strich wird der Cap-Wert in Klammern gezeigt, z.B. (7).
const capValue   = (par, hs) => par + hs + 2;

// Stableford netto. Auto-strich wenn g >= cap (modus-unabhängig).
// Manueller Strich (g === null) → 0 Punkte, zählt als "Pick-Up".
const sfNetto    = (g, hs, par) => {
  if (isStrich(g)) return 0;
  if (!isValid(g)) return null;
  if (g >= capValue(par, hs)) return 0; // Auto-Strich für SF
  return Math.max(0, par - (g - hs) + 2);
};
const sfBrutto   = (g, par)     => isStrich(g) ? 0 : (isValid(g) ? Math.max(0, par - g + 2) : null);

// ── v34: Total Strokes — Summe aller Schläge pro Spieler ──
// Manueller Strich zählt mit Cap-Wert (Par + Vorgabeschläge + 2).
// Manuelle Eingabe (auch ≥ Cap, z.B. 10) zählt mit echtem Wert.
// Nicht-gespielte Löcher werden ignoriert.
function totalStrokes(player, round) {
  if (!round?.holes || !round?.scores) return 0;
  const scores = round.scores[player.id] || {};
  const { ph } = resolvePlayerPH(player, round.cfg, round.selectedClubSnapshot,
    round.holes.reduce((s, h) => s + h.par, 0));
  let total = 0;
  round.holes.forEach((h, i) => {
    const g = scores[i];
    if (isStrich(g)) {
      const hs = holeHS(ph, h.si, round.holes.length);
      total += capValue(h.par, hs);
    } else if (isValid(g)) {
      total += g;
    }
  });
  return total;
}

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
// ─── TensionBar: visual indicator showing the gap between top 2 contestants ──
// Displays a horizontal bar split between two leaders/teams.
// The split position reflects the relative SF/Uschi-point difference.
//
// Usage:
//   <TensionBar topName="Bodo" topScore={32}
//               secondName="Max" secondScore={24} unit="SF" />
//
// Visualization: hard split (no gradient), middle = 50/50, tilts toward leader.
// Caps at 80/20 split to keep the loser side visible even with large gaps.
function TensionBar({ topName, topScore, secondName, secondScore, unit }) {
  if (topName === undefined || secondName === undefined) return null;
  const T_LOCAL = { gold: "#c9a85c", sage: "#7ea88a", line: "#3a4a40", textDim: "#5d6e63", textSoft: "#a2bfa2", text: "#cdd5c8" };
  const diff = Math.abs(topScore - secondScore);
  const total = Math.max(1, Math.abs(topScore) + Math.abs(secondScore));
  // Compute leader's percentage. Cap between 20% and 80% so loser is always visible.
  // If both are 0 -> 50/50.
  let leaderPct;
  if (topScore === 0 && secondScore === 0) {
    leaderPct = 50;
  } else {
    leaderPct = Math.max(20, Math.min(80, (topScore / (topScore + Math.max(0, secondScore))) * 100));
    // Handle negative scores (rare but possible in early uschi)
    if (!isFinite(leaderPct) || isNaN(leaderPct)) leaderPct = 50;
  }
  return (
    <div style={{ width: "100%", padding: "10px 0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px", fontSize: "11px" }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", gap: "6px", overflow: "hidden" }}>
          <span style={{ color: T_LOCAL.gold, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {topName}
          </span>
          <span className="mono" style={{ color: T_LOCAL.gold, fontWeight: 700, flexShrink: 0 }}>
            {topScore}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", gap: "6px", justifyContent: "flex-end", overflow: "hidden" }}>
          <span className="mono" style={{ color: T_LOCAL.sage, fontWeight: 700, flexShrink: 0 }}>
            {secondScore}
          </span>
          <span style={{ color: T_LOCAL.sage, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {secondName}
          </span>
        </div>
      </div>
      {/* Hard-split bar */}
      <div style={{
        width: "100%", height: "10px",
        background: T_LOCAL.line, borderRadius: "5px",
        position: "relative", overflow: "hidden",
        display: "flex",
      }}>
        <div style={{
          width: `${leaderPct}%`, height: "100%",
          background: T_LOCAL.gold,
          transition: "width 0.4s ease",
        }}/>
        <div style={{
          width: `${100 - leaderPct}%`, height: "100%",
          background: T_LOCAL.sage,
          transition: "width 0.4s ease",
        }}/>
      </div>
      {/* Difference label centered below */}
      <div style={{ textAlign: "center", marginTop: "6px", fontSize: "10px", color: T_LOCAL.textDim, letterSpacing: "0.04em" }}>
        {diff === 0 ? "GLEICHSTAND" : `${diff} ${unit} Differenz`}
      </div>
    </div>
  );
}

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

// ─── Race status helper ──────────────────────────────────────────────────
// Determines if a round's outcome is mathematically secured (winner cannot be caught)
// or "open" (close race with holes remaining).
//
// Returns { status: "secured" | "open" | "normal", winnerName?, leadDiff?, holesLeft? }
// - "secured": leader cannot be caught even if every remaining hole is a max-points hole for chasers
// - "open":    diff between top 2 ≤ 3 SF AND > 3 holes remaining
// - "normal":  neither case applies
//
// Stableford: max gain per hole = par + 2 strokes ahead = 4 SF (theoretical max with all strokes)
// Conservative estimate uses 3 SF per hole as max realistic gain.
function getRaceStatus(rankedStats, holesLeft) {
  if (!Array.isArray(rankedStats) || rankedStats.length < 2) {
    return { status: "normal" };
  }
  const leader = rankedStats[0];
  const second = rankedStats[1];
  const leadDiff = leader.sfNT - second.sfNT;
  // Maximum possible gain per remaining hole for a chaser = 4 SF (theoretical max).
  // Use 4 to be safe — if we can prove "even with max points each remaining hole" they can't catch up, lead is secured.
  const maxRemainingGain = holesLeft * 4;

  if (leadDiff > maxRemainingGain && holesLeft >= 0) {
    return { status: "secured", winnerName: leader.p.name, leadDiff, holesLeft };
  }
  if (leadDiff <= 3 && holesLeft > 3) {
    return { status: "open", leadDiff, holesLeft };
  }
  return { status: "normal", leadDiff, holesLeft };
}

// ─── v35: Simuliertes Handicap (Trend-HCP) ──────────────────────────────────
// Berechnet ein "Sim-HCP" basierend auf den letzten N Runden eines Spielers.
// Faustregel: 36 SF-Punkte = HCP genau richtig.
// Avg < 36 → Spieler aktuell schlechter als sein HCP → Sim-HCP höher
// Avg > 36 → Spieler aktuell besser als sein HCP → Sim-HCP niedriger
const SIM_HCP_ROUNDS = 5;       // letzte N Runden zur Berechnung
const SIM_HCP_MIN_ROUNDS = 3;   // mindestens N Runden nötig sonst keine Anzeige

function computeSimHcp(playerNameOrId, allRounds, fallbackName) {
  if (!playerNameOrId || !allRounds?.length) return null;

  // v53: Robuste Match-Logic — egal ob ID oder Name übergeben wird,
  // matche immer SOWOHL auf playerId als auch auf normName.
  // Plus: bei ID-Übergabe versuche auch den Friend-Namen zu finden für Name-Fallback.
  // fallbackName: optional — wird verwendet wenn lookupId angegeben ist aber keine Runde sie kennt
  const isId = typeof playerNameOrId === "string" && playerNameOrId.startsWith(PLAYER_ID_PREFIX);
  let lookupId = isId ? playerNameOrId : null;
  let lookupName = isId ? (fallbackName || null) : playerNameOrId;
  let lookupNormName = lookupName ? normName(lookupName) : null;

  // v53: Wenn ID übergeben, sammle alle Namen die je zu dieser ID gehörten
  // (aus den Runden selbst — falls eine Runde ID hat, lernen wir dort den Namen)
  const knownNames = new Set();
  if (isId) {
    allRounds.forEach(r => {
      (r.players || []).forEach(p => {
        if (p.playerId === lookupId && p.name) knownNames.add(normName(p.name));
      });
    });
  }
  if (lookupNormName) knownNames.add(lookupNormName);

  // Helper: matcht ein Spieler-Eintrag auf den gesuchten Spieler?
  const matches = (p) => {
    if (!p) return false;
    // 1. ID-Match (wenn beide eine ID haben)
    if (lookupId && p.playerId === lookupId) return true;
    // 2. Name-Match (immer probieren — auch wenn ID übergeben)
    if (p.name) {
      const pNorm = normName(p.name);
      if (knownNames.has(pNorm)) return true;
      if (lookupNormName && pNorm === lookupNormName) return true;
    }
    return false;
  };

  const playerRounds = allRounds
    .filter(r => (r.players || []).some(matches))
    .sort((a, b) => {
      const da = new Date(a.cfg?.date || a.savedAt || 0).getTime();
      const db = new Date(b.cfg?.date || b.savedAt || 0).getTime();
      return db - da;
    })
    .slice(0, SIM_HCP_ROUNDS);

  if (playerRounds.length < SIM_HCP_MIN_ROUNDS) {
    return {
      simHcp: null, baseHcp: null, diff: null,
      roundsUsed: playerRounds.length, hasEnoughData: false,
      failReason: `${playerRounds.length} Runden gefunden, brauche ${SIM_HCP_MIN_ROUNDS}`,
    };
  }

  const sfList = [];
  let baseHcp = null;
  let droppedRounds = []; // v53: Diagnose
  for (const r of playerRounds) {
    const player = (r.players || []).find(matches);
    if (!player) {
      droppedRounds.push({ date: r.cfg?.date, reason: "Spieler nicht gefunden" });
      continue;
    }
    if (baseHcp === null) baseHcp = parseFloat(player.hcp) || 0;
    const holes = r.holes || [];
    if (holes.length === 0) {
      droppedRounds.push({ date: r.cfg?.date, reason: "keine Löcher" });
      continue;
    }
    const par = holes.reduce((s, h) => s + h.par, 0);
    const { ph } = resolvePlayerPH(player, r.cfg, r.selectedClubSnapshot, par);
    let sfTotal = 0;
    let played = 0;
    holes.forEach((h, i) => {
      const g = r.scores?.[player.id]?.[i];
      if (!isValid(g) && !isStrich(g)) return;
      played++;
      const hs = holeHS(ph, h.si, holes.length);
      sfTotal += sfNetto(g, hs, h.par) || 0;
    });
    // v53: Lockerere Schwelle — entweder ≥50% der Runde ODER ≥5 Löcher
    const minPlayed = Math.min(Math.ceil(holes.length * 0.5), 5);
    if (played >= minPlayed) {
      const normalizedSf = holes.length === 9 ? sfTotal * 2 : sfTotal;
      sfList.push(normalizedSf);
    } else {
      droppedRounds.push({ date: r.cfg?.date, reason: `nur ${played}/${holes.length} Löcher gespielt` });
    }
  }

  if (sfList.length < SIM_HCP_MIN_ROUNDS || baseHcp === null) {
    return {
      simHcp: null, baseHcp, diff: null,
      roundsUsed: sfList.length, hasEnoughData: false,
      failReason: sfList.length < SIM_HCP_MIN_ROUNDS
        ? `Nur ${sfList.length} verwertbare Runden${droppedRounds.length > 0 ? ` (${droppedRounds.length} aussortiert)` : ""}`
        : "Kein HCP gefunden",
      droppedRounds,
    };
  }

  const avgSf = sfList.reduce((s, v) => s + v, 0) / sfList.length;
  const sfDiff = 36 - avgSf;
  const simHcp = Math.round((baseHcp + sfDiff) * 10) / 10;
  const diff = Math.round((simHcp - baseHcp) * 10) / 10;

  return {
    simHcp,
    baseHcp,
    diff,
    avgSf: Math.round(avgSf * 10) / 10,
    roundsUsed: sfList.length,
    hasEnoughData: true,
    droppedRounds, // v53: Diagnose
  };
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
    ladyCount: 0, // total # ladies across all rounds and players on this hole
    scores: [], // { playerName, gross, date, isStrich }
  }));

  rounds.forEach(r => {
    const rHoles = r.holes || [];
    const rPlayers = r.players || [];
    const rScores = r.scores || {};
    const roundDate = r.cfg?.date || r.savedAt;
    const rClub = r.selectedClubSnapshot || null;

    rPlayers.forEach(p => {
      // v39: Identity-Schlüssel — playerId wenn vorhanden, sonst normalisierter Name
      const idKey = p.playerId || `name:${normName(p.name)}`;
      if (!playerMap[idKey]) {
        playerMap[idKey] = {
          name: p.name, // letzter bekannter Name als Anzeigename
          playerId: p.playerId || null,
          roundsPlayed: 0,
          sfList: [], // {score, date, clubName} per round
          birdies: 0, pars: 0, bogeys: 0, doubles: 0, strichCount: 0,
          ladiesTotal: 0, // total # ladies across all rounds at this club
          uschi: { total: 0, par3Wins: 0, bestCarry: 0, burntCount: 0 },
          birdiesList: [],
          parsList: [],
          bogeysList: [],
          doublesList: [],
          strichList: [],
          perHole: holes.map((h, i) => ({
            holeIdx: i, par: h.par, si: h.si,
            grossList: [],
            realGrossList: [],
            birdieCount: 0, parCount: 0, bogeyCount: 0, doubleCount: 0, strichCount: 0,
            ladyCount: 0,
            scores: [],
          })),
        };
      }
      const pm = playerMap[idKey];
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
          // v37: Drilldown-Eintrag mit Loch + Score + Runden-Kontext
          const drillEntry = { holeIdx: i, gross: g, par: h.par, date: roundDate, clubName: r.cfg?.clubName || "Runde" };
          if (diff <= -1) { pm.birdies++; pm.birdiesList.push(drillEntry); }
          else if (diff === 0) { pm.pars++; pm.parsList.push(drillEntry); }
          else if (diff === 1) { pm.bogeys++; pm.bogeysList.push(drillEntry); }
          else if (diff >= 2) { pm.doubles++; pm.doublesList.push(drillEntry); }
        }
        if (isStrich_) {
          pm.strichCount++;
          pm.strichList.push({ holeIdx: i, gross: null, par: h.par, capValue: personalPar + 2, date: roundDate, clubName: r.cfg?.clubName || "Runde" });
        }

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

      // Aggregate ladies for this player from this round's ladies map
      const rLadies = r.ladies || {};
      const playerLadies = rLadies[p.id] || [];
      // Defensive: validate indices are valid integers in range before counting
      const validLadies = playerLadies.filter(holeIdx =>
        Number.isInteger(holeIdx) && holeIdx >= 0 && holeIdx < holes.length
      );
      pm.ladiesTotal += validLadies.length;
      // Increment per-hole counts (both for the player and the global hole stats)
      validLadies.forEach(holeIdx => {
        if (holeIdx < pm.perHole.length) pm.perHole[holeIdx].ladyCount++;
        if (holeIdx < holeStats.length) holeStats[holeIdx].ladyCount++;
      });

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
    // v35: Sim-HCP über ALLE Runden des Spielers (nicht nur dieser Club)
    const simHcp = computeSimHcp(pm.name, allRounds);
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
      simHcp, // v35
      // v37: Drilldown-Listen
      birdiesList: pm.birdiesList,
      parsList: pm.parsList,
      bogeysList: pm.bogeysList,
      doublesList: pm.doublesList,
      strichList: pm.strichList,
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

/**
 * v53: Aggregate Spieler-Stats über ALLE Clubs zusammen.
 * Nimmt aggregateClubStats für jeden Club, mergt die playerStats per playerId/Name.
 * Returns vereinfachte Struktur ohne holeStats (machen Cross-Club keinen Sinn).
 */
function aggregateAllClubsStats(allRounds) {
  if (!allRounds || allRounds.length === 0) return null;
  const clubsPlayed = Array.from(new Set(allRounds.map(r => r.cfg?.clubName).filter(Boolean)));
  if (clubsPlayed.length === 0) return null;

  // Pro Club aggregieren, dann Spieler per Identity-Key mergen
  const merged = {}; // idKey → mergedStats
  let totalRounds = 0;

  clubsPlayed.forEach(club => {
    const stats = aggregateClubStats(club, allRounds);
    if (!stats) return;
    totalRounds += stats.totalRounds || 0;
    (stats.playerStats || []).forEach(p => {
      const idKey = p.playerId || `name:${normName(p.name)}`;
      if (!merged[idKey]) {
        merged[idKey] = {
          name: p.name,
          playerId: p.playerId || null,
          roundsPlayed: 0,
          sfList: [],
          birdies: 0, pars: 0, bogeys: 0, doubles: 0, strichCount: 0,
          ladiesTotal: 0,
          uschi: { total: 0, par3Wins: 0, bestCarry: 0, burntCount: 0 },
          birdiesList: [],
          parsList: [],
          bogeysList: [],
          doublesList: [],
          strichList: [],
          ladiesList: [],
          clubsPlayed: new Set(),
        };
      }
      const m = merged[idKey];
      m.roundsPlayed += p.roundsPlayed || 0;
      m.sfList = m.sfList.concat(p.sfList || []);
      m.birdies += p.birdies || 0;
      m.pars += p.pars || 0;
      m.bogeys += p.bogeys || 0;
      m.doubles += p.doubles || 0;
      m.strichCount += p.strichCount || 0;
      m.ladiesTotal += p.ladiesTotal || 0;
      m.uschi.total += p.uschi?.total || 0;
      m.uschi.par3Wins += p.uschi?.par3Wins || 0;
      m.uschi.bestCarry = Math.max(m.uschi.bestCarry, p.uschi?.bestCarry || 0);
      m.uschi.burntCount += p.uschi?.burntCount || 0;
      m.birdiesList = m.birdiesList.concat(p.birdiesList || []);
      m.parsList = m.parsList.concat(p.parsList || []);
      m.bogeysList = m.bogeysList.concat(p.bogeysList || []);
      m.doublesList = m.doublesList.concat(p.doublesList || []);
      m.strichList = m.strichList.concat(p.strichList || []);
      m.ladiesList = m.ladiesList.concat(p.ladiesList || []);
      m.clubsPlayed.add(club);

      // Sim-HCP: für jeden Spieler einmal berechnen
      if (!m.simHcp) {
        m.simHcp = computeSimHcp(p.playerId || p.name, allRounds);
      }
    });
  });

  // Finalisieren: bestSF/avgSF/worstSF aus mergedSfList, clubsPlayed als Array
  const playerStats = Object.values(merged).map(m => {
    const sfScores = m.sfList.map(x => x.score);
    return {
      ...m,
      bestSF: sfScores.length ? Math.max(...sfScores) : 0,
      avgSF: sfScores.length ? Math.round(sfScores.reduce((s, v) => s + v, 0) / sfScores.length) : 0,
      worstSF: sfScores.length ? Math.min(...sfScores) : 0,
      clubsPlayed: Array.from(m.clubsPlayed),
      // perHole macht über mehrere Clubs keinen Sinn
      perHole: [],
    };
  }).sort((a, b) => b.avgSF - a.avgSF);

  return {
    clubName: null,
    isAllClubs: true,
    totalRounds: allRounds.length,
    clubsCount: clubsPlayed.length,
    playerStats,
    holeStats: [], // nicht sinnvoll cross-club
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

// ─── v39: Player Identity & HCP-History System ──────────────────────────────
// Friends bekommen playerId (stable über Namensänderungen), aliases (alle
// jemals verwendeten Namen) und hcpHistory (HCP-Werte mit Datum).
const PLAYER_ID_PREFIX = "ply_";
const newPlayerId = () => PLAYER_ID_PREFIX + Math.random().toString(36).slice(2, 11);

function normName(n) {
  return String(n || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function findFriendByNameOrAlias(friends, name) {
  if (!friends || !name) return null;
  const nn = normName(name);
  for (const f of friends) {
    if (normName(f.name) === nn) return f;
    const aliases = f.aliases || [];
    for (const a of aliases) if (normName(a) === nn) return f;
  }
  return null;
}

function migrateFriends(friends) {
  if (!Array.isArray(friends)) return [];
  return friends.map(f => {
    if (!f) return f;
    const initialHcp = typeof f.hcp === "number" ? f.hcp : parseFloat(f.hcp);
    const validHcp = Number.isFinite(initialHcp) ? initialHcp : 0;
    return {
      ...f,
      playerId: f.playerId || newPlayerId(),
      aliases: Array.isArray(f.aliases) ? f.aliases : [],
      hcpHistory: Array.isArray(f.hcpHistory) && f.hcpHistory.length > 0
        ? f.hcpHistory
        : [{ date: toDay(), hcp: validHcp }],
    };
  });
}

function attachPlayerIdsToRounds(rounds, friends) {
  if (!Array.isArray(rounds)) return [];
  return rounds.map(r => {
    if (!r?.players) return r;
    return {
      ...r,
      players: r.players.map(p => {
        if (p.playerId) return p;
        const friend = findFriendByNameOrAlias(friends, p.name);
        return friend ? { ...p, playerId: friend.playerId } : p;
      }),
    };
  });
}

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

  // v34: Total strokes per player (Striche zählen mit Cap-Wert)
  const totalStrokesPerPlayer = players.map(p => {
    const data = perPlayerHoleData[p.id];
    let total = 0;
    data.forEach(d => {
      if (!d) return;
      total += d.effectiveGross || 0;
    });
    return { playerName: p.name, total };
  }).filter(x => x.total > 0).sort((a, b) => a.total - b.total);

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
    totalStrokesPerPlayer,
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

  // Build holes array — v50: mit Loch-Längen pro Tee
  const teesArr = Object.keys(tees);
  const holes = club.scorecard.loecher.map(l => {
    const lengths = {};
    teesArr.forEach(teeName => {
      const isWomenTee = /rot|red|damen|women|ladies/.test(teeName);
      const lengthField = isWomenTee ? "d_ch" : "h_st";
      if (l[lengthField]) lengths[teeName] = l[lengthField];
    });
    return {
      par: l.par,
      si: l.hcp, // German "hcp" = Stroke Index in Austrian notation
      lengths, // { "Gelb": 340, "Rot": 320, ... }
    };
  });

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
 * v52: Normal-HCP-Strokes für Best Ball+
 * Jeder Spieler bekommt seinen vollen Course-HCP als Strokes verteilt.
 * Im Gegensatz zu uschiAdjustedStrokes wird KEIN Bester als Baseline genommen
 * und es gibt KEINE 0.8-Multiplikation.
 * Returns [{ playerId, ch, strokes, perHole: [...] }, ...]
 */
function normalHcpStrokes(players, cfg, club, holes) {
  const numHoles = holes.length;
  const par = sumPar(holes);

  const withCH = players.map(p => {
    const tee = playerTee(p, cfg, club);
    if (!tee) return { playerId: p.id, ch: p.hcp || 0 };
    const { ph } = resolvePlayerPH(p, cfg, club, par);
    return { playerId: p.id, ch: ph };
  });
  if (withCH.length === 0) return [];

  const sortedByHardness = holes.map((h, i) => ({ i, si: h.si })).sort((a, b) => a.si - b.si);

  return withCH.map(({ playerId, ch }) => {
    const strokes = Math.max(0, ch);
    const perHole = new Array(numHoles).fill(0);
    let remaining = strokes;
    let safety = 4;
    while (remaining > 0 && safety > 0) {
      for (const { i } of sortedByHardness) {
        if (remaining === 0) break;
        perHole[i]++;
        remaining--;
      }
      safety--;
    }
    return { playerId, ch, diff: ch, strokes, perHole };
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
 * v50: Best Ball+ Punkte
 * Wie Uschi, aber:
 * - Bester Netto-SF holt +1 (Tie: alle Tied bekommen +1)
 * - KEINE Worst-Minus-Punkte
 * - Optional: Birdie-Bonus (+1)
 * - Optional: Uschi-Mechanik mit Verbrennung (wie Uschi-Modus)
 *
 * config: { birdieBonus: bool, uschiBonus: bool }
 */
function computeBestBallPlusPoints(players, holes, scores, adjStrokes, par3Data, config) {
  const cfg = config || { birdieBonus: true, uschiBonus: false };
  const strokesByPid = {};
  adjStrokes.forEach(a => { strokesByPid[a.playerId] = a.perHole; });

  const totals = {};
  players.forEach(p => {
    totals[p.id] = { total: 0, best: 0, birdies: 0, uschi: 0 };
  });

  const perHole = [];
  let carry = 1;
  const openUschi = [];

  for (let i = 0; i < holes.length; i++) {
    const hole = holes[i];
    const holePoints = {};
    const holeBreakdown = {};
    players.forEach(p => {
      holePoints[p.id] = 0;
      holeBreakdown[p.id] = { best: false, birdie: false, uschi: 0 };
    });

    // Compute netto SF for each player who played this hole
    const nettoSf = {};
    const sfList = [];
    players.forEach(p => {
      const gross = scores[p.id]?.[i];
      if (isValid(gross)) {
        const s = strokesByPid[p.id]?.[i] || 0;
        const sf = sfNetto(gross, s, hole.par) || 0;
        nettoSf[p.id] = sf;
        sfList.push({ pid: p.id, sf });
      } else {
        nettoSf[p.id] = null;
      }
    });

    // v50: Bester Netto-SF holt +1 (Tie: alle Tied bekommen +1)
    if (sfList.length >= 1) {
      const bestSf = Math.max(...sfList.map(x => x.sf));
      // Nur vergeben wenn der beste > 0 ist (also wirklich Punkte gemacht wurden)
      if (bestSf > 0) {
        sfList.forEach(x => {
          if (x.sf === bestSf) {
            holePoints[x.pid] += 1;
            totals[x.pid].best += 1;
            holeBreakdown[x.pid].best = true;
          }
        });
      }
    }

    // Birdie-Bonus (optional, wenn aktiviert)
    if (cfg.birdieBonus) {
      players.forEach(p => {
        const gross = scores[p.id]?.[i];
        if (isValid(gross) && gross <= hole.par - 1) {
          holePoints[p.id] += 1;
          totals[p.id].birdies += 1;
          holeBreakdown[p.id].birdie = true;
        }
      });
    }

    // Uschi (Par 3 only) — wie im Uschi-Modus, mit Verbrennung
    let uschiInfo = null;
    if (cfg.uschiBonus && hole.par === 3) {
      const data = par3Data?.[i];
      const allPar3Scored = players.every(p => {
        const g = scores[p.id]?.[i];
        return isValid(g) || isStrich(g);
      });

      if (!data) {
        if (allPar3Scored) openUschi.push(i);
        uschiInfo = { pending: true, multiplier: carry };
      } else {
        const greenHits = data.greenHits || [];
        const closest = data.closest;

        if (greenHits.length === 0) {
          uschiInfo = { type: "carry", multiplier: carry, newMultiplier: carry + 1 };
          carry += 1;
        } else if (closest && greenHits.includes(closest)) {
          const closestGross = scores[closest]?.[i];
          if (isValid(closestGross) && closestGross <= hole.par) {
            // Won — closest hit green AND made par or better
            holePoints[closest] += carry;
            totals[closest].uschi += carry;
            holeBreakdown[closest].uschi = carry;
            uschiInfo = { type: "won", winner: closest, points: carry, multiplier: carry };
            carry = 1;
          } else {
            // Burnt
            uschiInfo = { type: "burnt", burnBy: closest, multiplier: carry };
            carry = 1;
          }
        } else {
          if (allPar3Scored) openUschi.push(i);
          uschiInfo = { pending: true, multiplier: carry };
        }
      }
    }

    perHole.push({ holeIdx: i, holePoints, holeBreakdown, uschi: uschiInfo, nettoSf });
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
  html, body { margin: 0; background: ${T.canvas}; overflow-x: hidden; max-width: 100%; }
  #root { overflow-x: hidden; max-width: 100vw; }
  input, button, textarea { font-family: inherit; max-width: 100%; }
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
  @media (hover: hover) and (pointer: fine) { .kbhint { display: block !important; } }
  .scroll-hide::-webkit-scrollbar { display: none; }
  .scroll-hide { scrollbar-width: none; }
  .btn-hover:hover { background: ${T.surface3} !important; }
  .card-hover:hover { border-color: ${T.lineStrong} !important; background: ${T.surface2} !important; }
  .gold-hover:hover { background: ${T.goldBright} !important; }
`;

const S = {
  app: { minHeight: "100vh", background: T.canvas, color: T.text, fontFamily: "Inter, system-ui, sans-serif", fontSize: "14px", paddingBottom: "100px", letterSpacing: "-0.005em", overflowX: "hidden", maxWidth: "100vw" },
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
export default function GolfAppWithBoundary(props) {
  return (
    <ErrorBoundary>
      <GolfAppInner {...props} />
    </ErrorBoundary>
  );
}

function GolfAppInner() {
  // Navigation
  const [view, setView] = useState("home");
  const [tab, setTab] = useState("rounds");
  const [statsClubName, setStatsClubName] = useState(null); // null = not yet chosen
  const [statsFocusPlayer, setStatsFocusPlayer] = useState(null); // null = "all players" (team view); name string = focused player
  const [statsPlayerDetail, setStatsPlayerDetail] = useState(null); // player name for drill-down modal
  const [statsHoleDetail, setStatsHoleDetail] = useState(null); // hole index for drill-down modal
  const [statsImportedRounds, setStatsImportedRounds] = useState([]); // rounds from other sync codes, merged into stats
  const [showStatsImport, setShowStatsImport] = useState(false);
  // v53: Clubs-Übersichts-Modal
  const [showClubsModal, setShowClubsModal] = useState(false);
  const [statsImportInput, setStatsImportInput] = useState("");
  const [statsImportLoading, setStatsImportLoading] = useState(false);
  // Round analysis modal — holds the round ID being analyzed (null = closed)
  const [roundAnalysisId, setRoundAnalysisId] = useState(null);
  // Round config
  const [cfg, setCfg] = useState({ name: "", date: toDay(), numHoles: 18, clubName: "", defaultTeeName: "" });
  const [holes, setHoles] = useState(makeHoles(72, 18));
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState({});
  // Lady tradition: per-player set of hole indices where a "Lady" was recorded.
  // A "Lady" is when a player fails to pass the women's tee box on tee shot —
  // costs them a round of beer. Stored as { [playerId]: [holeIdx, holeIdx, ...] }
  const [ladies, setLadies] = useState({});
  // Persisted data
  const [rounds, setRounds] = useState([]);
  const [friends, setFriends] = useState([]);
  const [customClubs, setCustomClubs] = useState([]);
  // Owner profile: the user's own player profile { name, hcp }.
  // Auto-added as first player in new rounds. Stored separately so the user
  // never needs to search themselves in friends list.
  const [ownerProfile, setOwnerProfile] = useState(null);
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
  // v39: Player-Manager
  const [showPlayerManager, setShowPlayerManager] = useState(false);
  const [playerManagerFocus, setPlayerManagerFocus] = useState(null); // playerId
  const [mergeTarget, setMergeTarget] = useState(null); // { fromId, toId }
  // v42: Trip-Modus
  const [trips, setTrips] = useState([]); // [{ id, name, startDate, endDate, location, syncCode, days, rules, players, hcpAdjustments, ...}]
  const [activeTripId, setActiveTripId] = useState(null);
  const [showTripSetup, setShowTripSetup] = useState(false);
  const [tripFormData, setTripFormData] = useState(null); // { name, startDate, endDate, location, dayCount, ... }
  const [showTripDetail, setShowTripDetail] = useState(false);
  // v44: Tab-View im Trip-Detail
  const [tripDetailView, setTripDetailView] = useState("overview"); // overview | stats | money
  const [aliasInput, setAliasInput] = useState("");
  // UI state
  const [clubQ, setClubQ] = useState("");
  const [showDD, setShowDD] = useState(false);
  const [pickedClub, setPickedClub] = useState(null); // club awaiting tee selection
  const [newP, setNewP] = useState({ name: "", hcp: "" });
  const [expId, setExpId] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importErrors, setImportErrors] = useState([]);
  // v37: Import-Modus — "choose" | "ai" | "wizard"
  const [importMode, setImportMode] = useState("choose");
  // v37: Wizard-State
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    name: "", region: "", numHoles: 18,
    tees: [{ teeName: "Weiß", color: "Weiß", slope: "", cr: "", par: 72 }],
    holes: [],
  });
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
  // v40: Device-ID + Scorer-Konflikt
  const [deviceId, setDeviceId] = useState(null);
  const [scorerConflict, setScorerConflict] = useState(null); // { existingScorer: "Bodos iPhone", code: "ABCD1234" }
  const [showLiveModal, setShowLiveModal] = useState(false); // controls the Live-Share modal
  // List of live rounds from anyone in the wider community (refreshed every minute)
  const [activeLiveRounds, setActiveLiveRounds] = useState([]);
  // Round-delete confirmation modal: holds the round to delete (null = closed)
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  // In-app live viewer modal: holds the live entry being viewed (null = closed).
  // When a user taps a community live round, we open this modal in-app instead
  // of opening the standalone /live.html page (which was stuck in PWA WebView).
  const [viewingLive, setViewingLive] = useState(null);
  // Backup-restore modal: list of available backups with preview + restore action
  const [showBackupRestore, setShowBackupRestore] = useState(false);
  const [backupList, setBackupList] = useState([]); // [{ key, label, count, friends, clubs, type }]
  // v37: Stat-Drilldown — { type, items, label, color, playerName }
  const [statDrilldown, setStatDrilldown] = useState(null);
  // ── v33: Cloud Archive State ──
  const [lastCloudArchive, setLastCloudArchive] = useState(0); // unix ms — last successful archive push
  const [archiveStatus, setArchiveStatus] = useState("idle"); // idle | saving | success | error
  const [showTrash, setShowTrash] = useState(false);
  const [trashedRounds, setTrashedRounds] = useState([]); // [{ id, round_data, deleted_at, ... }]
  const [trashLoading, setTrashLoading] = useState(false);
  // Last-score-undo: tracks the most recent score entry so user can undo it
  // { playerId, holeIdx, prevValue } — prevValue is undefined if hole was previously empty
  const [lastScoreEntry, setLastScoreEntry] = useState(null);
  // Rounds list search query (only visible when >= 8 rounds saved)
  const [roundsQuery, setRoundsQuery] = useState("");
  const [loadedRoundId, setLoadedRoundId] = useState(null); // track which round is being viewed/edited
  // Scoring mode
  const [scoringMode, setScoringMode] = useState("batch"); // batch | live
  const [currentHole, setCurrentHole] = useState(0);
  // v38: Loch-Schnellsprung-Modal
  const [showHoleJump, setShowHoleJump] = useState(false);
  // Game mode (Uschi)
  const [gameMode, setGameMode] = useState("stableford"); // "stableford" | "uschi-single" | "uschi-team" | "bestball-plus"
  // v48+v50+v52: Best Ball+ Config — Loch-für-Loch ohne Minus
  // Always Netto. Bonus-Toggles sind optional.
  // hcpMode: "adjusted" = 0.8-Regel (Best Ball Standard), "normal" = volle HCPs für alle
  const [bestBallConfig, setBestBallConfig] = useState({
    birdieBonus: true,    // Brutto-Birdie als +1 Bonus
    uschiBonus: false,    // Uschi-Verbrennungs-Mechanik bei Par-3 (wie Uschi-Modus)
    hcpMode: "adjusted",  // "adjusted" = 0.8-Regel | "normal" = volle HCPs
  });
  const [showBestBallExplain, setShowBestBallExplain] = useState(false);
  const [teams, setTeams] = useState(null); // { A: [pid], B: [pid], nameA?, nameB? } | null
  const [par3Data, setPar3Data] = useState({}); // { [holeIdx]: { greenHits: [pid], closest: pid } }
  const [uschiPromptHole, setUschiPromptHole] = useState(null); // holeIdx currently prompting for par-3 data
  const [showUschiReview, setShowUschiReview] = useState(false); // Uschi protocol review screen
  const touchStartX = useRef(null);
  const syncTimerRef = useRef(null);
  const livePushTimerRef = useRef(null);
  // v38: Long-press auf Score-Feld → Strich direkt
  const longPressTimerRef = useRef(null);
  const longPressTriggered = useRef(false);

  const allClubs = useMemo(() => [...customClubs, ...BUILT_IN_CLUBS], [customClubs]);
  // v36: Bei geladener Runde priorisieren wir den Club-Snapshot aus der Runde,
  // damit die Anzeige (SF, PH) konsistent bleibt — auch wenn sich die Club-Daten
  // seitdem geändert haben (z.B. ÖGV-Tabelle aktualisiert in einem Code-Update).
  const selectedClub = useMemo(() => {
    if (loadedRoundId) {
      const loaded = rounds.find(r => r.id === loadedRoundId);
      if (loaded?.selectedClubSnapshot) return loaded.selectedClubSnapshot;
    }
    return allClubs.find(c => c.name === cfg.clubName);
  }, [allClubs, cfg.clubName, loadedRoundId, rounds]);

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
  // STRICT FILTER: only shows live rounds tagged with the same sync code as the user.
  // Without a sync code, no live rounds are shown — protects privacy.
  useEffect(() => {
    if (!SYNC_ENABLED) return;
    let cancelled = false;
    let timer = null;
    const fetchOnce = async () => {
      // Without a sync code → no live rounds visible (privacy)
      if (!syncCode) {
        if (!cancelled) setActiveLiveRounds([]);
        return;
      }
      const list = await liveListActive();
      // Only show rounds tagged with the same sync code
      const filtered = list.filter(r => r.data?.syncCode === syncCode);
      if (!cancelled) {
        setActiveLiveRounds(filtered);
        // If a live viewer modal is open, auto-refresh its data too
        if (viewingLive) {
          const fresh = filtered.find(r => r.code === viewingLive.code);
          if (fresh) setViewingLive(fresh);
        }
      }
    };
    fetchOnce();
    // Poll every 60s on home, every 30s while viewing a live modal (more responsive)
    if (view === "home" || viewingLive) {
      timer = setInterval(fetchOnce, viewingLive ? 30000 : 60000);
    }
    return () => { cancelled = true; if (timer) clearInterval(timer); };
  }, [view, syncCode, viewingLive?.code]);

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
      // v39: Friends laden + zu neuem Datenmodell migrieren (playerId, aliases, hcpHistory)
      try {
        const f = await window.storage.get("golf-friends");
        if (f) {
          const raw = JSON.parse(f.value);
          const needsMigration = Array.isArray(raw) && raw.some(x => !x.playerId || !Array.isArray(x.aliases) || !Array.isArray(x.hcpHistory));
          if (needsMigration) {
            // Auto-Backup vor Migration
            try {
              await window.storage.set(
                `golf-backup-pre-v39-${Date.now()}`,
                JSON.stringify({ friends: raw, ts: new Date().toISOString() })
              );
            } catch {}
            const migrated = migrateFriends(raw);
            setFriends(migrated);
            try { await window.storage.set("golf-friends", JSON.stringify(migrated)); } catch {}
          } else {
            setFriends(raw);
          }
        }
      } catch {}
      try { const c = await window.storage.get("golf-custom-clubs"); if (c) setCustomClubs(JSON.parse(c.value)); } catch {}
      // v42: Trips laden
      try {
        const t = await window.storage.get("golf-trips");
        if (t) setTrips(JSON.parse(t.value));
      } catch {}
      try {
        const o = await window.storage.get("golf-owner-profile");
        if (o) setOwnerProfile(JSON.parse(o.value));
      } catch {}
      try { const s = await window.storage.get("golf-sync-code");    if (s?.value) setSyncCode(s.value); } catch {}
      // v33: Last cloud archive timestamp
      try {
        const la = await window.storage.get("golf-last-archive");
        if (la?.value) setLastCloudArchive(parseInt(la.value) || 0);
      } catch {}
      // v40: Device-ID laden / erstellen
      try {
        const dId = await getOrCreateDeviceId();
        setDeviceId(dId);
      } catch {}

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

              // v47.1: Trips: union by id
              const cloudTrips = Array.isArray(cloud.data.trips) ? cloud.data.trips : [];
              const localTripsRaw = await window.storage.get("golf-trips");
              const localTripsArr = localTripsRaw?.value ? JSON.parse(localTripsRaw.value) : [];
              const cloudTripIds = new Set(cloudTrips.map(t => t.id));
              const localOnlyTrips = localTripsArr.filter(t => !cloudTripIds.has(t.id));
              const mergedTrips = [...cloudTrips, ...localOnlyTrips];

              setRounds(merged);
              setFriends(mergedFriends);
              setCustomClubs(mergedClubs);
              setTrips(mergedTrips);
              try { await window.storage.set("golf-trips", JSON.stringify(mergedTrips)); } catch {}

              // v47.1: Owner-Profile aus Cloud falls keiner lokal
              const localOwnerRaw = await window.storage.get("golf-owner-profile");
              const localOwner = localOwnerRaw?.value ? JSON.parse(localOwnerRaw.value) : null;
              if (cloud.data.ownerProfile && !localOwner) {
                setOwnerProfile(cloud.data.ownerProfile);
                try { await window.storage.set("golf-owner-profile", JSON.stringify(cloud.data.ownerProfile)); } catch {}
              }

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
    if (syncConflict) return;
    clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async () => {
      setSyncStatus("syncing");
      // v47.1: trips + ownerProfile mit synchronisieren
      const ok = await cloudPush(syncCode, { rounds, friends, customClubs, trips, ownerProfile });
      setSyncStatus(ok ? "idle" : "error");
      if (ok) {
        try { await window.storage.set("golf-last-sync", String(Date.now())); } catch {}
      }
    }, 2000);
    return () => clearTimeout(syncTimerRef.current);
  }, [rounds, friends, customClubs, trips, ownerProfile, syncCode, loaded, syncConflict]);

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
        ladies,
        clubName: cfg.clubName,
        syncCode: syncCode || null,
        // v40: Scorer-Info — wer ist der aktive Scorer (Schreib-Berechtigung)
        scorerId: deviceId,
        scorerName: ownerProfile?.name || "Anonymes Gerät",
        scorerSince: new Date().toISOString(),
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
  }, [liveCode, liveStatus, cfg, holes, players, scores, gameMode, teams, par3Data, selectedClub, syncCode, ladies, deviceId, ownerProfile]);

  // ── v40: Periodic Scorer-Conflict Check ──
  // Alle 30s prüfen ob ein anderes Gerät den Scorer-Status übernommen hat.
  // Falls ja → Modal anzeigen, User muss aktiv entscheiden ob er übernimmt.
  useEffect(() => {
    if (!liveCode || liveStatus !== "active" || !deviceId) return;
    const checkInterval = setInterval(async () => {
      const cloudScorer = await liveCheckScorer(liveCode);
      if (cloudScorer?.scorerId && cloudScorer.scorerId !== deviceId) {
        setScorerConflict({
          existingScorer: cloudScorer.scorerName || "Anderes Gerät",
          existingScorerId: cloudScorer.scorerId,
          code: liveCode,
        });
      }
    }, 30000);
    return () => clearInterval(checkInterval);
  }, [liveCode, liveStatus, deviceId]);

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
  // Default tee preference: try "Gelb (Herren)" first (Bodos friend group plays Gelb).
  // Falls back to the only tee (if just 1) or shows picker for the user to choose.
  const pickClub = useCallback(club => {
    const teeKeys = Object.keys(club.tees);
    if (teeKeys.length === 1) {
      pickDefaultTee(club, teeKeys[0]);
    } else {
      // Look for "Gelb"-flavored tee key — the default for the friend group
      const gelbKey = teeKeys.find(k => /gelb/i.test(k))
        || teeKeys.find(k => /yellow/i.test(k));
      if (gelbKey) {
        pickDefaultTee(club, gelbKey);
      } else {
        setPickedClub(club);
      }
    }
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

  // Change a specific player's tee — and remember this choice in friends store
  // so the same player automatically gets the same tee next time.
  const changePlayerTee = useCallback((playerId, teeName) => {
    if (!selectedClub) return;
    const tee = selectedClub.tees[teeName];
    if (!tee) return;
    setPlayers(ps => ps.map(p => p.id === playerId ? {
      ...p, teeName, cr: tee.cr, slope: tee.slope, par: tee.par,
    } : p));
    // Persist the tee preference in friends list (so e.g. Theresa stays on Blau)
    const player = players.find(p => p.id === playerId);
    if (player?.name) {
      const updatedFriends = friends.find(f => f.name === player.name)
        ? friends.map(f => f.name === player.name ? { ...f, lastTeeName: teeName } : f)
        : [...friends, { name: player.name, hcp: player.hcp, lastTeeName: teeName }];
      setFriends(updatedFriends);
      try { window.storage.set("golf-friends", JSON.stringify(updatedFriends)); } catch {}
    }
    setTeePickerFor(null);
  }, [selectedClub, players, friends]);

  // ── Players
  const par = sumPar(holes);

  // Auto-sort players by handicap ascending (lower HCP = better player tees off first).
  // Used after adding a player to maintain proper tee-off order.
  const sortByHcp = (list) => [...list].sort((a, b) => (a.hcp ?? 99) - (b.hcp ?? 99));

  // Suggest a team name from member initials (e.g. ["Bodo","Niki"] → "BoNi")
  // Falls back to "Team A"/"Team B" if no player IDs match.
  const suggestTeamName = (memberIds, allPlayers, fallback) => {
    if (!Array.isArray(memberIds) || memberIds.length === 0) return fallback;
    const parts = memberIds.map(pid => {
      const p = allPlayers.find(x => x.id === pid);
      if (!p?.name) return "";
      // Take first 2 chars of name, capitalize first
      const cleaned = p.name.trim().replace(/[^a-zA-ZäöüÄÖÜß]/g, "");
      return cleaned.charAt(0).toUpperCase() + cleaned.charAt(1).toLowerCase();
    }).filter(Boolean);
    return parts.length > 0 ? parts.join("") : fallback;
  };
  const teamNameA = (teams?.nameA) || suggestTeamName(teams?.A, players, "Team A");
  const teamNameB = (teams?.nameB) || suggestTeamName(teams?.B, players, "Team B");

  const addPlayer = useCallback(() => {
    const name = newP.name.trim(); if (!name) return;
    const hcp = parseFloat(newP.hcp);
    const tee = selectedClub && cfg.defaultTeeName ? selectedClub.tees[cfg.defaultTeeName] : null;
    // v39: Match auf bestehenden Friend via Alias-System
    const matchedFriend = findFriendByNameOrAlias(friends, name);
    const playerData = {
      id: uid(), name, hcp: isNaN(hcp) ? 0 : hcp,
      teeName: cfg.defaultTeeName || "",
      cr: tee?.cr, slope: tee?.slope, par: tee?.par,
      // v39: Stable identity — wenn Friend gefunden, übernehmen wir dessen ID
      playerId: matchedFriend ? matchedFriend.playerId : newPlayerId(),
    };
    setPlayers(p => sortByHcp([...p, playerData]));
    setNewP({ name: "", hcp: "" });
  }, [newP, selectedClub, cfg.defaultTeeName, friends]);

  const addFromFriend = useCallback(f => {
    setPlayers(p => {
      if (p.find(x => x.playerId === f.playerId || normName(x.name) === normName(f.name))) return p;
      // Use friend's remembered tee if it exists for this club, else cfg default
      const teeName = (f.lastTeeName && selectedClub?.tees?.[f.lastTeeName])
        ? f.lastTeeName
        : (cfg.defaultTeeName || "");
      const tee = selectedClub && teeName ? selectedClub.tees[teeName] : null;
      return sortByHcp([...p, {
        id: uid(), name: f.name, hcp: f.hcp,
        teeName,
        cr: tee?.cr, slope: tee?.slope, par: tee?.par,
        playerId: f.playerId, // v39: Identity übernehmen
      }]);
    });
  }, [selectedClub, cfg.defaultTeeName]);

  const saveFriend = async (player) => {
    if (friends.find(f => f.name === player.name)) return;
    // v39: Neuer Friend mit Identity-System
    const newFriend = {
      name: player.name,
      hcp: player.hcp,
      playerId: player.playerId || newPlayerId(),
      aliases: [],
      hcpHistory: [{ date: toDay(), hcp: player.hcp }],
    };
    const updated = [...friends, newFriend];
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
    const newHcp = parseFloat(hcp) || 0;
    const updated = friends.map(f => {
      if (f.name !== name) return f;
      // v39: HCP-History pflegen — nur wenn Wert sich geändert hat
      const lastEntry = (f.hcpHistory || []).slice(-1)[0];
      const newHistory = (lastEntry && lastEntry.hcp === newHcp)
        ? (f.hcpHistory || [])
        : [...(f.hcpHistory || []), { date: toDay(), hcp: newHcp }];
      return { ...f, hcp: newHcp, hcpHistory: newHistory };
    });
    setFriends(updated);
    try { await window.storage.set("golf-friends", JSON.stringify(updated)); } catch {}
  };
  const addFriendDirect = async () => {
    const name = newP.name.trim(); if (!name) return;
    const hcp = parseFloat(newP.hcp) || 0;
    // v39: Neuer Friend bekommt sofort playerId + initiale History
    const updated = [...friends, {
      name, hcp,
      playerId: newPlayerId(),
      aliases: [],
      hcpHistory: [{ date: toDay(), hcp }],
    }];
    setFriends(updated); setNewP({ name: "", hcp: "" });
    try { await window.storage.set("golf-friends", JSON.stringify(updated)); } catch {}
  };

  // ── v39: Player-Manager-Funktionen ──
  // Alias hinzufügen / entfernen
  const addAlias = async (playerId, alias) => {
    const aliasTrimmed = alias.trim();
    if (!aliasTrimmed) return;
    const updated = friends.map(f => {
      if (f.playerId !== playerId) return f;
      const existing = f.aliases || [];
      if (existing.some(a => normName(a) === normName(aliasTrimmed))) return f;
      return { ...f, aliases: [...existing, aliasTrimmed] };
    });
    setFriends(updated);
    try { await window.storage.set("golf-friends", JSON.stringify(updated)); } catch {}
  };

  const removeAlias = async (playerId, alias) => {
    const updated = friends.map(f => {
      if (f.playerId !== playerId) return f;
      return { ...f, aliases: (f.aliases || []).filter(a => a !== alias) };
    });
    setFriends(updated);
    try { await window.storage.set("golf-friends", JSON.stringify(updated)); } catch {}
  };

  // Player-Merge: Spieler "fromId" wird in "toId" eingegliedert.
  // - Alias des "from"-Namens wird zu "to" hinzugefügt
  // - Alle Runden-Spieler mit fromId werden auf toId umgeschrieben
  // - HCP-Historien werden zusammengeführt (chronologisch)
  // - "from"-Friend wird gelöscht
  const mergePlayer = async (fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return false;
    const fromFriend = friends.find(f => f.playerId === fromId);
    const toFriend = friends.find(f => f.playerId === toId);
    if (!fromFriend || !toFriend) return false;

    // Auto-Backup
    try {
      await window.storage.set(
        `golf-backup-pre-merge-${Date.now()}`,
        JSON.stringify({ friends, rounds, ts: new Date().toISOString() })
      );
    } catch {}

    // Friends-Liste aktualisieren
    const newAliases = [
      ...(toFriend.aliases || []),
      fromFriend.name,
      ...(fromFriend.aliases || []),
    ].filter((a, i, arr) => arr.findIndex(x => normName(x) === normName(a)) === i)
     .filter(a => normName(a) !== normName(toFriend.name));

    const mergedHistory = [
      ...(toFriend.hcpHistory || []),
      ...(fromFriend.hcpHistory || []),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    const updatedFriends = friends
      .filter(f => f.playerId !== fromId)
      .map(f => f.playerId === toId ? { ...f, aliases: newAliases, hcpHistory: mergedHistory } : f);

    // Runden aktualisieren: alle players mit fromId → toId
    const updatedRounds = rounds.map(r => {
      if (!r.players) return r;
      return {
        ...r,
        players: r.players.map(p => p.playerId === fromId ? { ...p, playerId: toId } : p),
      };
    });

    setFriends(updatedFriends);
    setRounds(updatedRounds);
    try { await window.storage.set("golf-friends", JSON.stringify(updatedFriends)); } catch {}
    try { await window.storage.set("golf-rounds", JSON.stringify(updatedRounds)); } catch {}
    showUndoToast(`✓ "${fromFriend.name}" mit "${toFriend.name}" zusammengeführt`, null);
    return true;
  };

  // ─── v42: Trip-Modus Funktionen ──────────────────────────────────────────
  // Trip-Datenmodell:
  // {
  //   id, name, location, startDate, endDate, syncCode,
  //   players: [{ playerId, name, hcp, baseHcp, hcpAdjustments: { day2: -2, day3: +1 } }],
  //   days: [{ dayNumber, date, roundIds: [] }],
  //   pots: { dayWin: 10, threeDayPot: 50, weekTeamPot: 50, nearestPin: 10 },
  //   createdAt, updatedAt
  // }

  const persistTrips = async (newTrips) => {
    setTrips(newTrips);
    try { await window.storage.set("golf-trips", JSON.stringify(newTrips)); } catch {}
  };

  const createTrip = async (data) => {
    const newTrip = {
      id: uid(),
      name: data.name?.trim() || "Trip",
      location: data.location?.trim() || "",
      startDate: data.startDate || toDay(),
      endDate: data.endDate || toDay(),
      syncCode: data.syncCode?.trim() || syncCode || "",
      players: (data.players || []).map(p => ({
        playerId: p.playerId,
        name: p.name,
        hcp: p.hcp,
        baseHcp: p.hcp, // Original-HCP zum Trip-Start (für HCP-Adjustments)
        hcpAdjustments: {}, // { dayNumber: adjustment }
      })),
      days: (data.days || []).map((d, i) => ({
        dayNumber: i + 1,
        date: d.date || data.startDate,
        roundIds: [],
        // v43+v48: Flight-Allocation pro Tag — bei ≤ 4 Spielern alle in Flight A als Default
        flights: (data.players || []).length <= 4
          ? Object.fromEntries((data.players || []).map(p => [p.playerId, "A"]))
          : {},
      })),
      pots: {
        dayWin: data.pots?.dayWin || 10,
        threeDayPot: data.pots?.threeDayPot || 50,
        weekTeamPot: data.pots?.weekTeamPot || 50,
        nearestPin: data.pots?.nearestPin || 10,
      },
      // v43: HCP-Regeln
      hcpRules: data.hcpRules || {
        enabled: true,
        bestAdj: [-3, -2, -1],
        worstAdj: [1, 2, 3],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newTrip, ...trips];
    await persistTrips(updated);
    return newTrip;
  };

  const updateTrip = async (tripId, patch) => {
    const updated = trips.map(t => t.id === tripId
      ? { ...t, ...patch, updatedAt: new Date().toISOString() }
      : t
    );
    await persistTrips(updated);
  };

  const deleteTrip = async (tripId) => {
    const trip = trips.find(t => t.id === tripId);
    const updated = trips.filter(t => t.id !== tripId);
    await persistTrips(updated);
    if (activeTripId === tripId) setActiveTripId(null);
    if (trip) {
      showUndoToast(`Trip "${trip.name}" gelöscht`, async () => {
        await persistTrips([trip, ...updated]);
      });
    }
  };

  // Verbinde eine Runde mit einem Trip-Tag
  const linkRoundToTripDay = async (tripId, dayNumber, roundId) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;
    const days = trip.days.map(d => {
      if (d.dayNumber !== dayNumber) return d;
      if (d.roundIds.includes(roundId)) return d;
      return { ...d, roundIds: [...d.roundIds, roundId] };
    });
    await updateTrip(tripId, { days });
  };

  const unlinkRoundFromTrip = async (tripId, roundId) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;
    const days = trip.days.map(d => ({
      ...d,
      roundIds: d.roundIds.filter(id => id !== roundId),
    }));
    await updateTrip(tripId, { days });
  };

  // Berechne Trip-Wertung: Tagessieger pro Tag, Gesamt-Sieger
  // v43: HCP-Adjustments für einen bestimmten Tag berechnen + anwenden
  // Basis: Alle Tage VOR diesem Tag (also Tag 2 nutzt Ergebnis von Tag 1, Tag 3 nutzt Tag 1+2)
  const applyHcpAdjustmentsForDay = async (tripId, targetDayNumber) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return false;
    if (!trip.hcpRules?.enabled) {
      showUndoToast("⚠️ HCP-Adjustments sind im Trip-Setup deaktiviert", null);
      return false;
    }
    if (targetDayNumber <= 1) {
      showUndoToast("⚠️ Tag 1 ist der Start-Tag, hat keine HCP-Adjustments", null);
      return false;
    }
    // Wir berechnen Ranking aus dem direkt vorhergehenden Tag (sauber + diskutierbar)
    const prevDay = trip.days.find(d => d.dayNumber === targetDayNumber - 1);
    if (!prevDay || prevDay.roundIds.length === 0) {
      showUndoToast(`⚠️ Tag ${targetDayNumber - 1} hat noch keine Runden — erst Runden zuweisen`, null);
      return false;
    }

    // Tag-Ergebnis berechnen
    const standings = computeTripStandings(trip);
    const dayStanding = standings?.dayResults?.find(d => d.dayNumber === targetDayNumber - 1);
    if (!dayStanding?.complete) {
      showUndoToast(`⚠️ Tag ${targetDayNumber - 1} hat noch keine Ergebnisse`, null);
      return false;
    }

    const ranked = dayStanding.ranked;
    const bestAdj = trip.hcpRules.bestAdj || [-3, -2, -1];
    const worstAdj = trip.hcpRules.worstAdj || [1, 2, 3];

    // Adjustments pro Spieler bestimmen
    const adjustmentsForPlayer = {};
    ranked.forEach((p, i) => {
      const fromBest = i; // 0 = bester
      const fromWorst = ranked.length - 1 - i; // 0 = schlechtester
      let adj = 0;
      if (fromBest < bestAdj.length) {
        adj = bestAdj[fromBest];
      } else if (fromWorst < worstAdj.length) {
        adj = worstAdj[fromWorst];
      }
      const key = p.playerId || `name:${normName(p.name)}`;
      adjustmentsForPlayer[key] = adj;
    });

    // In Trip persistieren
    const updatedPlayers = trip.players.map(tp => {
      const key = tp.playerId || `name:${normName(tp.name)}`;
      const adj = adjustmentsForPlayer[key] || 0;
      return {
        ...tp,
        hcpAdjustments: { ...tp.hcpAdjustments, [targetDayNumber]: adj },
      };
    });

    await updateTrip(tripId, { players: updatedPlayers });

    const summary = ranked.slice(0, 3).map((p, i) => `${p.name} ${bestAdj[i] > 0 ? "+" : ""}${bestAdj[i]}`).join(", ");
    showUndoToast(`✓ Tag-${targetDayNumber}-HCP angewendet · Top 3: ${summary}`, null);
    return true;
  };

  // v43: Flight für einen Spieler an einem Tag setzen
  const setPlayerFlightForDay = async (tripId, dayNumber, playerId, flight) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;
    const days = trip.days.map(d => {
      if (d.dayNumber !== dayNumber) return d;
      const flights = { ...(d.flights || {}) };
      if (flight === null || flight === "") {
        delete flights[playerId];
      } else {
        flights[playerId] = flight;
      }
      return { ...d, flights };
    });
    await updateTrip(tripId, { days });
  };

  const computeTripStandings = (trip) => {
    if (!trip || !rounds.length) return null;

    const dayResults = trip.days.map(day => {
      const dayRounds = rounds.filter(r => day.roundIds.includes(r.id));
      const playerScores = {};

      dayRounds.forEach(r => {
        const par = sumPar(r.holes);
        (r.players || []).forEach(p => {
          const tee = playerTee(p, r.cfg, r.selectedClubSnapshot);
          if (!tee || !r.holes?.length) return;
          // Trip-HCP-Adjustment greift hier
          const tripPlayer = trip.players.find(tp => tp.playerId === p.playerId);
          const adjustment = tripPlayer?.hcpAdjustments?.[day.dayNumber] || 0;
          const adjustedHcp = (parseFloat(p.hcp) || 0) + adjustment;
          const adjustedPlayer = { ...p, hcp: adjustedHcp };
          const { ph } = resolvePlayerPH(adjustedPlayer, r.cfg, r.selectedClubSnapshot, par);
          let sf = 0, sfBrut = 0, realSf = 0, played = 0;
          // v47: Real-HCP-Vergleich (ohne Trip-Adjustment)
          const realFriend = friends.find(f => f.playerId === p.playerId || normName(f.name) === normName(p.name));
          const realHcp = realFriend ? parseFloat(realFriend.hcp) || 0 : (parseFloat(p.hcp) || 0);
          const realPlayer = { ...p, hcp: realHcp };
          const { ph: realPh } = resolvePlayerPH(realPlayer, r.cfg, r.selectedClubSnapshot, par);
          r.holes.forEach((h, i) => {
            const g = r.scores?.[p.id]?.[i];
            if (!isValid(g) && !isStrich(g)) return;
            played++;
            const hs = holeHS(ph, h.si, r.holes.length);
            sf += sfNetto(g, hs, h.par) || 0;
            sfBrut += sfBrutto(g, h.par) || 0;
            // Real-HCP basierte SF
            const hsReal = holeHS(realPh, h.si, r.holes.length);
            realSf += sfNetto(g, hsReal, h.par) || 0;
          });
          if (played < r.holes.length * 0.5) return;
          const key = p.playerId || `name:${normName(p.name)}`;
          playerScores[key] = {
            playerId: p.playerId,
            name: p.name,
            sf, sfBrut, realSf, hcp: p.hcp, realHcp, adjustment, adjustedHcp,
            roundId: r.id, clubName: r.cfg?.clubName,
          };
        });
      });

      const ranked = Object.values(playerScores).sort((a, b) => b.sf - a.sf);
      const winner = ranked[0] || null;
      return {
        dayNumber: day.dayNumber,
        date: day.date,
        ranked,
        winner,
        complete: dayRounds.length > 0 && ranked.length > 0,
      };
    });

    // 3-Tageswertung: Summe der besten 3 Tage
    const totalScores = {};
    dayResults.forEach(dr => {
      dr.ranked.forEach(r => {
        const key = r.playerId || `name:${normName(r.name)}`;
        if (!totalScores[key]) {
          totalScores[key] = { playerId: r.playerId, name: r.name, totalSf: 0, daysPlayed: 0 };
        }
        totalScores[key].totalSf += r.sf;
        totalScores[key].daysPlayed++;
      });
    });
    const totalRanked = Object.values(totalScores).sort((a, b) => b.totalSf - a.totalSf);

    return { dayResults, totalRanked };
  };

  // v44: Trip-Statistiken — Ladies, Flight-Historie, Geld-Bilanz
  const computeTripStats = (trip) => {
    if (!trip) return null;
    const tripRoundIds = (trip.days || []).flatMap(d => d.roundIds || []);
    const tripRounds = rounds.filter(r => tripRoundIds.includes(r.id));

    const standings = computeTripStandings(trip);

    // Pro Spieler: Ladies, Birdies, Pars, Bogeys, Striche, Flight-Historie
    const perPlayer = {};
    trip.players.forEach(tp => {
      const key = tp.playerId || `name:${normName(tp.name)}`;
      perPlayer[key] = {
        playerId: tp.playerId,
        name: tp.name,
        ladies: 0,
        birdies: 0,
        pars: 0,
        bogeys: 0,
        doubles: 0,
        strichCount: 0,
        bestSf: 0,
        worstSf: Infinity,
        avgSf: 0,
        sfHistory: [],
        flights: [],
      };
    });

    // Aggregate über alle Trip-Runden
    tripRounds.forEach(r => {
      (r.players || []).forEach(p => {
        const key = p.playerId || `name:${normName(p.name)}`;
        const pm = perPlayer[key];
        if (!pm) return;
        // Ladies
        const playerLadies = (r.ladies || {})[p.id];
        if (Array.isArray(playerLadies)) pm.ladies += playerLadies.length;
        // Score-Stats
        (r.holes || []).forEach((h, i) => {
          const g = r.scores?.[p.id]?.[i];
          if (isStrich(g)) {
            pm.strichCount++;
            return;
          }
          if (!isValid(g)) return;
          const diff = g - h.par;
          if (diff <= -1) pm.birdies++;
          else if (diff === 0) pm.pars++;
          else if (diff === 1) pm.bogeys++;
          else if (diff >= 2) pm.doubles++;
        });
      });
    });

    // SF-Historie pro Spieler aus dayResults
    standings?.dayResults?.forEach(dr => {
      dr.ranked?.forEach(r => {
        const key = r.playerId || `name:${normName(r.name)}`;
        const pm = perPlayer[key];
        if (!pm) return;
        pm.sfHistory.push({ dayNumber: dr.dayNumber, sf: r.sf, sfBrut: r.sfBrut || 0, realSf: r.realSf || 0 });
        if (r.sf > pm.bestSf) pm.bestSf = r.sf;
        if (r.sf < pm.worstSf) pm.worstSf = r.sf;
        // v45: Brutto-Total
        pm.totalBrut = (pm.totalBrut || 0) + (r.sfBrut || 0);
      });
    });

    // Flight-Historie aufbauen
    trip.days?.forEach(day => {
      Object.entries(day.flights || {}).forEach(([pid, flight]) => {
        // Find by playerId or name fallback
        const player = trip.players.find(tp => tp.playerId === pid);
        if (!player) return;
        const key = player.playerId || `name:${normName(player.name)}`;
        const pm = perPlayer[key];
        if (!pm) return;
        pm.flights.push({ dayNumber: day.dayNumber, flight });
      });
    });

    // Avg-SF berechnen
    Object.values(perPlayer).forEach(pm => {
      if (pm.sfHistory.length > 0) {
        pm.avgSf = Math.round(pm.sfHistory.reduce((s, x) => s + x.sf, 0) / pm.sfHistory.length);
      } else {
        pm.worstSf = 0;
      }
    });

    return {
      perPlayer,
      tripRounds: tripRounds.length,
      tripRoundIds,
    };
  };

  // v44: Geld-Bilanz pro Spieler
  // Berechnet wer pro Tag gewonnen hat (Tagessieger) und wie viel.
  // Tag-Sieger bekommt Pot vom Rest aller Mitspieler an dem Tag.
  const computeTripMoney = (trip) => {
    if (!trip) return null;
    const standings = computeTripStandings(trip);
    if (!standings) return null;

    const playerCount = (trip.players || []).length;
    const dayWinPerPlayer = trip.pots?.dayWin || 0;
    const totalPotPerPlayer = trip.pots?.threeDayPot || 0;

    // pro Spieler: gewonnen, verloren, netto
    const perPlayer = {};
    trip.players.forEach(tp => {
      const key = tp.playerId || `name:${normName(tp.name)}`;
      perPlayer[key] = {
        playerId: tp.playerId,
        name: tp.name,
        won: 0,
        owes: 0,
        net: 0,
        wins: [],
        paid: trip.payments?.[key] || {}, // { dayNumber: true/false } für tracking
      };
    });

    // Tagessiege auswerten
    standings.dayResults?.forEach(dr => {
      if (!dr.complete || !dr.winner) return;
      const wKey = dr.winner.playerId || `name:${normName(dr.winner.name)}`;
      const winnerWin = dayWinPerPlayer * (playerCount - 1);
      if (perPlayer[wKey]) {
        perPlayer[wKey].won += winnerWin;
        perPlayer[wKey].wins.push({ dayNumber: dr.dayNumber, sf: dr.winner.sf, prize: winnerWin });
      }
      // Alle anderen schulden je dayWinPerPlayer
      trip.players.forEach(tp => {
        const key = tp.playerId || `name:${normName(tp.name)}`;
        if (key !== wKey && perPlayer[key]) {
          perPlayer[key].owes += dayWinPerPlayer;
        }
      });
    });

    // Gesamtwertung: Sieger über alle Tage holt Gesamt-Pot
    if (standings.totalRanked?.length > 0 && totalPotPerPlayer > 0) {
      const overallWinner = standings.totalRanked[0];
      const overallKey = overallWinner.playerId || `name:${normName(overallWinner.name)}`;
      const overallWin = totalPotPerPlayer * (playerCount - 1);
      if (perPlayer[overallKey]) {
        perPlayer[overallKey].won += overallWin;
        perPlayer[overallKey].wins.push({ dayNumber: "GESAMT", sf: overallWinner.totalSf, prize: overallWin });
      }
      trip.players.forEach(tp => {
        const key = tp.playerId || `name:${normName(tp.name)}`;
        if (key !== overallKey && perPlayer[key]) {
          perPlayer[key].owes += totalPotPerPlayer;
        }
      });
    }

    // v45: Team-Wertung — beste 2er-Team-Kombi pro Tag
    // Wir nehmen für jeden Tag alle möglichen 2er-Teams + finden das Team mit der höchsten Summe der Netto-Punkte beider Spieler.
    // Pot: weekTeamPot * (playerCount - 2). Team-Sieger teilen sich den Pot fair, alle anderen schulden weekTeamPot.
    const teamPotPerPlayer = trip.pots?.weekTeamPot || 0;
    if (teamPotPerPlayer > 0) {
      // Kumuliere Netto-SF pro Spieler über alle Tage
      const cumulative = {};
      standings.dayResults?.forEach(dr => {
        if (!dr.complete) return;
        dr.ranked?.forEach(r => {
          const key = r.playerId || `name:${normName(r.name)}`;
          cumulative[key] = (cumulative[key] || 0) + r.sf;
        });
      });
      // Finde das beste 2er-Team
      const playerKeys = Object.keys(cumulative);
      if (playerKeys.length >= 2) {
        let bestTeam = null;
        let bestSum = -1;
        for (let i = 0; i < playerKeys.length; i++) {
          for (let j = i + 1; j < playerKeys.length; j++) {
            const sum = cumulative[playerKeys[i]] + cumulative[playerKeys[j]];
            if (sum > bestSum) {
              bestSum = sum;
              bestTeam = [playerKeys[i], playerKeys[j]];
            }
          }
        }
        if (bestTeam) {
          // Pot: jeder Nicht-Team-Mitglied zahlt weekTeamPot, das Team-Pärchen bekommt es geteilt
          const teamPrizeTotal = teamPotPerPlayer * (playerCount - 2);
          const teamPrizePerPlayer = Math.floor(teamPrizeTotal / 2);
          bestTeam.forEach(tk => {
            if (perPlayer[tk]) {
              perPlayer[tk].won += teamPrizePerPlayer;
              const partner = bestTeam.find(x => x !== tk);
              const partnerName = perPlayer[partner]?.name || "Partner";
              perPlayer[tk].wins.push({ dayNumber: "TEAM", sf: cumulative[tk], prize: teamPrizePerPlayer, partnerName });
            }
          });
          trip.players.forEach(tp => {
            const key = tp.playerId || `name:${normName(tp.name)}`;
            if (!bestTeam.includes(key) && perPlayer[key]) {
              perPlayer[key].owes += teamPotPerPlayer;
            }
          });
        }
      }
    }

    // v45: Nearest-to-Pin — für jeden Par-3 mit Sieger zahlen alle anderen je nearestPinPot
    const nearestPinPot = trip.pots?.nearestPin || 0;
    if (nearestPinPot > 0 && trip.nearestPins) {
      Object.entries(trip.nearestPins).forEach(([npKey, winnerPlayerId]) => {
        if (!winnerPlayerId) return;
        // Hole-Info aus key parsen
        const [roundId, holeIdxStr] = npKey.split("::");
        const winnerKey = winnerPlayerId.startsWith(PLAYER_ID_PREFIX) ? winnerPlayerId : `name:${normName(winnerPlayerId)}`;
        const npPrize = nearestPinPot * (playerCount - 1);
        if (perPlayer[winnerKey]) {
          perPlayer[winnerKey].won += npPrize;
          perPlayer[winnerKey].wins.push({
            dayNumber: "NEAREST",
            holeInfo: `Loch ${parseInt(holeIdxStr) + 1}`,
            prize: npPrize,
          });
        }
        trip.players.forEach(tp => {
          const key = tp.playerId || `name:${normName(tp.name)}`;
          if (key !== winnerKey && perPlayer[key]) {
            perPlayer[key].owes += nearestPinPot;
          }
        });
      });
    }

    // Net berechnen
    Object.values(perPlayer).forEach(pm => {
      pm.net = pm.won - pm.owes;
    });

    const ranked = Object.values(perPlayer).sort((a, b) => b.net - a.net);
    return { perPlayer, ranked };
  };

  // v44: Toggle "bezahlt"-Status für einen Spieler an einem Tag
  const togglePlayerPaid = async (tripId, playerId, dayKey) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;
    const playerKey = playerId;
    const payments = { ...(trip.payments || {}) };
    if (!payments[playerKey]) payments[playerKey] = {};
    payments[playerKey][dayKey] = !payments[playerKey][dayKey];
    await updateTrip(tripId, { payments });
  };

  // v45: Nearest-to-Pin-Sieger setzen
  // Key-Format: `${roundId}::${holeIdx}` — eindeutig pro Par-3
  const setNearestPinWinner = async (tripId, key, playerId) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;
    const np = { ...(trip.nearestPins || {}) };
    if (!playerId) {
      delete np[key];
    } else {
      np[key] = playerId;
    }
    await updateTrip(tripId, { nearestPins: np });
  };

  // v45: Liste aller Par-3-Löcher einer Trip-Runde
  const getPar3Holes = (round) => {
    if (!round?.holes) return [];
    return round.holes
      .map((h, i) => ({ holeIdx: i, par: h.par, si: h.si }))
      .filter(h => h.par === 3);
  };

  // ── Scores
  // setScore also detects when a hole is freshly completed (all players have a value)
  // and shows a small summary toast like "Loch 7: Bodo +2, Max +0, Thorsten Strich".
  const setScore = (pid, hi, val) => {
    // ── v34: Pickup-Hinweis bei Eingabe ≥ Cap-Wert ──
    // Wenn der Score netto kein Punkt mehr bringen kann, schlagen wir einen Strich (Pickup) vor.
    // Toast erscheint nur bei echter Zahl-Eingabe (nicht bei manuellem Strich).
    if (typeof val === "number" && val > 0) {
      const player = players.find(pp => pp.id === pid);
      const hole = holes[hi];
      if (player && hole) {
        const tee = playerTee(player, cfg, selectedClub);
        const ph = tee ? resolvePlayerPH(player, cfg, selectedClub, par).ph : 0;
        const hs = holeHS(ph, hole.si, cfg.numHoles);
        const cap = capValue(hole.par, hs);
        if (val >= cap) {
          // Defer slightly so toast doesn't race with pad-close animation
          setTimeout(() => {
            showUndoToast(
              `💡 Pick-Up möglich · 0 SF`,
              () => { setScore(pid, hi, null); },
              "Strich"
            );
          }, 100);
        }
      }
    }

    setScores(s => {
      const prevValue = s[pid]?.[hi]; // capture pre-change state for undo
      // Track this entry so the user can undo via the "↶ Letzten Score rückgängig" button
      setLastScoreEntry({ playerId: pid, holeIdx: hi, prevValue });
      const updated = { ...s, [pid]: { ...s[pid], [hi]: val } };
      // Check if this update completes the hole (all players have a value)
      const allDone = players.length > 0 && players.every(p => {
        const v = updated[p.id]?.[hi];
        return typeof v === "number" || v === null;
      });
      const wasDone = players.length > 0 && players.every(p => {
        const v = s[p.id]?.[hi];
        return typeof v === "number" || v === null;
      });
      // Only fire toast on freshly-completed holes (transition from incomplete → complete)
      if (allDone && !wasDone) {
        // Build summary string
        const hole = holes[hi];
        if (hole) {
          const parts = players.map(p => {
            const v = updated[p.id]?.[hi];
            if (v === null) return `${p.name} ✗`;
            const diff = v - hole.par;
            const label = diff === 0 ? "±0"
              : diff > 0 ? `+${diff}`
              : `${diff}`;
            return `${p.name} ${label}`;
          });
          // Defer the toast slightly so it doesn't race with the pad-close animation
          setTimeout(() => showUndoToast(`Loch ${hi + 1}: ${parts.join(" · ")}`, null), 50);
        }
      }
      return updated;
    });
  };

  // Undo the last score entry (restore the previous value, or clear if it was empty)
  const undoLastScore = () => {
    if (!lastScoreEntry) return;
    const { playerId, holeIdx, prevValue } = lastScoreEntry;
    if (prevValue === undefined) {
      clearScore(playerId, holeIdx);
    } else {
      setScores(s => ({ ...s, [playerId]: { ...s[playerId], [holeIdx]: prevValue } }));
    }
    setLastScoreEntry(null);
    showUndoToast("↶ Letzter Score rückgängig", null);
  };
  const clearScore = (pid, hi) => setScores(s => {
    const ps = { ...(s[pid] || {}) }; delete ps[hi];
    return { ...s, [pid]: ps };
  });

  // Owner profile: persist + update friends list to keep owner in sync
  // v41 BUG-FIX: Owner-HCP-Änderungen werden jetzt IMMER in die Friends-Liste
  // übernommen (nicht nur beim Anlegen). HCP-History wird mitgepflegt.
  const saveOwnerProfile = async (profile) => {
    setOwnerProfile(profile);
    try { await window.storage.set("golf-owner-profile", JSON.stringify(profile)); } catch {}
    if (profile?.name) {
      const newHcp = parseFloat(profile.hcp) || 0;
      const existing = friends.find(f => f.name === profile.name);
      if (!existing) {
        // v39: Neuer Friend mit Identity + History
        const newFriend = {
          name: profile.name,
          hcp: newHcp,
          isOwner: true,
          playerId: newPlayerId(),
          aliases: [],
          hcpHistory: [{ date: toDay(), hcp: newHcp }],
        };
        const updated = [...friends, newFriend];
        setFriends(updated);
        try { await window.storage.set("golf-friends", JSON.stringify(updated)); } catch {}
      } else {
        // v41: HCP-Update mit History-Tracking
        const lastEntry = (existing.hcpHistory || []).slice(-1)[0];
        const hcpChanged = !lastEntry || lastEntry.hcp !== newHcp;
        const updated = friends.map(f => {
          if (f.name !== profile.name) return f;
          return {
            ...f,
            hcp: newHcp,
            isOwner: true, // sicherstellen
            hcpHistory: hcpChanged
              ? [...(f.hcpHistory || []), { date: toDay(), hcp: newHcp }]
              : (f.hcpHistory || []),
          };
        });
        setFriends(updated);
        try { await window.storage.set("golf-friends", JSON.stringify(updated)); } catch {}
      }
    }
  };

  // Toggle the "Lady" status for a player on a hole.
  // A "Lady" = player did not pass the women's tee on tee shot (German tradition: pays a beer).
  const toggleLady = (pid, hi) => {
    setLadies(l => {
      const playerLadies = l[pid] || [];
      const has = playerLadies.includes(hi);
      const updated = has
        ? playerLadies.filter(x => x !== hi)
        : [...playerLadies, hi].sort((a, b) => a - b);
      return { ...l, [pid]: updated };
    });
  };
  const hasLady = (pid, hi) => (ladies[pid] || []).includes(hi);

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

  // Mac/desktop keyboard shortcuts for the score pad:
  // 0-9 → enter score, "S"/"s" → strich, "Backspace"/"Delete" → clear, "Escape" → close
  // Only active when padOpen is set (i.e. the pad modal is visible).
  useEffect(() => {
    if (!padOpen) return;
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input field elsewhere
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      // Number keys 0-9
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        padEnter(parseInt(e.key));
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        padStrich();
      } else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        padClear();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setPadOpen(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [padOpen, players, holes, scoringMode]);

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
    if (!tee) return { ph: 0, hr: [], bT: 0, nT: 0, sfNT: 0, sfBT: 0, totalStr: 0, phSource: "formula", strichCount: 0 };
    const { ph, source: phSource } = resolvePlayerPH(player, cfg, selectedClub, par);
    const hr = holes.map((h, i) => {
      const g = scores[player.id]?.[i];
      const hs = holeHS(ph, h.si, cfg.numHoles);
      return { g, hs, netto: isValid(g) ? g - hs : null, sfN: sfNetto(g, hs, h.par), sfB: sfBrutto(g, h.par), par: h.par };
    });
    const played = hr.filter(h => isValid(h.g));
    const bT = played.reduce((s, h) => s + h.g, 0);
    const strichCount = hr.filter(h => isStrich(h.g)).length;
    const totalStr = hr.reduce((s, h) => {
      if (isStrich(h.g)) return s + capValue(h.par, h.hs);
      if (isValid(h.g)) return s + h.g;
      return s;
    }, 0);

    // v47: Real-HCP-Berechnung wenn Trip-Spieler mit Adjustment
    let realSfNT = null, realPh = null;
    if (player.tripAdjustment && player.tripAdjustment !== 0 && typeof player.realHcp === "number") {
      // Berechne mit dem Original-HCP statt dem angepassten
      const realPlayer = { ...player, hcp: player.realHcp };
      const realPhResult = resolvePlayerPH(realPlayer, cfg, selectedClub, par);
      realPh = realPhResult.ph;
      realSfNT = holes.reduce((s, h, i) => {
        const g = scores[player.id]?.[i];
        const hsReal = holeHS(realPh, h.si, cfg.numHoles);
        return s + (sfNetto(g, hsReal, h.par) || 0);
      }, 0);
    }

    return {
      ph, hr, bT, tee, phSource, strichCount, totalStr,
      nT: played.length ? bT - ph : 0,
      sfNT: hr.reduce((s, h) => s + (h.sfN || 0), 0),
      sfBT: hr.reduce((s, h) => s + (h.sfB || 0), 0),
      realSfNT, realPh,
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

  // v48+v50+v52: Best Ball+ — Loch-für-Loch Logik (wie Uschi aber ohne Minus)
  const bestBallResult = useMemo(() => {
    if (gameMode !== "bestball-plus" || players.length < 2) return null;
    // v52: hcpMode "adjusted" = 0.8-Regel (wie Uschi), "normal" = volle HCPs
    const strokes = bestBallConfig.hcpMode === "normal"
      ? normalHcpStrokes(players, cfg, selectedClub, holes)
      : uschiStrokes;
    return computeBestBallPlusPoints(players, holes, scores, strokes, par3Data, bestBallConfig);
  }, [gameMode, players, holes, scores, uschiStrokes, par3Data, bestBallConfig, cfg, selectedClub]);

  // v52: Best Ball+ Strokes für UI-Anzeige (welche Strokes der Spieler bekommt)
  const bestBallStrokes = useMemo(() => {
    if (gameMode !== "bestball-plus" || players.length < 2) return [];
    return bestBallConfig.hcpMode === "normal"
      ? normalHcpStrokes(players, cfg, selectedClub, holes)
      : uschiStrokes;
  }, [gameMode, players, cfg, selectedClub, holes, uschiStrokes, bestBallConfig.hcpMode]);

  // ── Rounds
  const saveRound = async () => {
    let u;
    let savedRound;
    // v36: Club-Snapshot mitspeichern für Konsistenz auch bei späteren Code-Updates
    const clubSnapshot = selectedClub ? {
      name: selectedClub.name,
      region: selectedClub.region,
      numHoles: selectedClub.numHoles,
      tees: selectedClub.tees,
      holes: selectedClub.holes,
    } : null;
    const extra = { gameMode, teams, par3Data, ladies, selectedClubSnapshot: clubSnapshot, bestBallConfig: gameMode === "bestball-plus" ? bestBallConfig : null };
    if (loadedRoundId) {
      savedRound = null;
      u = rounds.map(r => {
        if (r.id === loadedRoundId) {
          // Behalte vorhandenen Snapshot wenn schon da, sonst nimm neuen
          const keepSnapshot = r.selectedClubSnapshot || clubSnapshot;
          savedRound = { ...r, cfg, holes, players, scores, ...extra, selectedClubSnapshot: keepSnapshot, savedAt: new Date().toISOString() };
          return savedRound;
        }
        return r;
      });
    } else {
      const newR = { id: uid(), cfg, holes, players, scores, ...extra, savedAt: new Date().toISOString() };
      savedRound = newR;
      u = [newR, ...rounds].slice(0, 50);
      setLoadedRoundId(newR.id);
    }
    setRounds(u);
    try { await window.storage.set("golf-rounds", JSON.stringify(u)); } catch {}

    // v47: Auto-Verlinkung mit Trip-Tag wenn cfg.tripContext gesetzt
    if (savedRound && cfg.tripContext?.tripId && cfg.tripContext?.dayNumber) {
      try {
        await linkRoundToTripDay(cfg.tripContext.tripId, cfg.tripContext.dayNumber, savedRound.id);
      } catch (e) { console.error("Trip-link failed", e); }
    }

    // ── v33: Auto-Push to cloud archive ──────────────────────────────────────
    // Only push completed rounds (or rounds with at least 1 hole scored).
    // Fire-and-forget — never block the UI.
    if (savedRound && SYNC_ENABLED) {
      const hasAnyScore = Object.values(savedRound.scores || {})
        .some(ps => Object.values(ps || {}).some(v => v !== undefined));
      if (hasAnyScore) {
        archivePush(savedRound, syncCode).then(ok => {
          if (ok) {
            const ts = Date.now();
            setLastCloudArchive(ts);
            try { window.storage.set("golf-last-archive", String(ts)); } catch {}
          }
        });
      }
    }
  };

  // ── v33: Manual full archive — pushes ALL local rounds to cloud archive ──
  const manualArchiveAll = async () => {
    if (!SYNC_ENABLED) {
      alert("Cloud-Sync ist nicht konfiguriert.");
      return;
    }
    if (!rounds.length) {
      alert("Keine Runden zum Sichern vorhanden.");
      return;
    }
    setArchiveStatus("saving");
    const result = await archivePushBatch(rounds, syncCode);
    if (result.ok) {
      const ts = Date.now();
      setLastCloudArchive(ts);
      try { await window.storage.set("golf-last-archive", String(ts)); } catch {}
      setArchiveStatus("success");
      setTimeout(() => setArchiveStatus("idle"), 3000);
      alert(`✓ ${result.count} Runden ins Cloud-Archiv gesichert`);
    } else {
      setArchiveStatus("error");
      setTimeout(() => setArchiveStatus("idle"), 3000);
      alert(`⚠ Nur ${result.count}/${rounds.length} Runden konnten gesichert werden. Online?`);
    }
  };

  // ── v33: Open trash modal — load soft-deleted rounds from cloud ──
  const openTrash = async () => {
    if (!SYNC_ENABLED) {
      alert("Cloud-Sync ist nicht konfiguriert. Papierkorb braucht eine Verbindung.");
      return;
    }
    setShowTrash(true);
    setTrashLoading(true);
    const list = await archiveListTrashed();
    setTrashedRounds(list);
    setTrashLoading(false);
  };

  // ── v33: Restore round from trash ──
  const restoreFromTrash = async (entry) => {
    if (!entry?.round_data) return;
    const round = entry.round_data;
    // Check if round already exists locally (e.g. user accidentally restored twice)
    if (rounds.find(r => r.id === round.id)) {
      alert("Diese Runde ist bereits in deiner lokalen Liste.");
      return;
    }
    // Snapshot first
    try {
      await window.storage.set(
        `golf-backup-before-restore-${Date.now()}`,
        JSON.stringify({ rounds, friends, customClubs })
      );
    } catch {}
    // Add back to local list (newest first)
    const updated = [round, ...rounds].slice(0, 50);
    setRounds(updated);
    try { await window.storage.set("golf-rounds", JSON.stringify(updated)); } catch {}
    // Clear deleted_at in cloud
    await archiveRestore(round.id);
    // Refresh trash list
    setTrashedRounds(prev => prev.filter(t => t.id !== entry.id));
    showUndoToast(`✓ Runde "${round.cfg?.clubName || "Runde"}" wiederhergestellt`, null);
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
    setLadies(r.ladies || {});
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
  const showUndoToast = (message, undoFn, actionLabel) => {
    clearTimeout(undoTimerRef.current);
    setUndoAction({ message, undo: undoFn, actionLabel: actionLabel || "Rückgängig" });
    undoTimerRef.current = setTimeout(() => setUndoAction(null), 6000);
  };

  const deleteRound = async (id) => {
    const deletedRound = rounds.find(r => r.id === id);
    const updated = rounds.filter(r => r.id !== id);
    setRounds(updated);
    if (id === loadedRoundId) setLoadedRoundId(null);
    try { await window.storage.set("golf-rounds", JSON.stringify(updated)); } catch {}

    // ── v33: Soft-delete in cloud archive (recoverable for 30 days) ──────────
    // First push current state (in case it wasn't archived yet), then mark deleted.
    if (deletedRound && SYNC_ENABLED) {
      archivePush(deletedRound, syncCode).then(() => {
        archiveSoftDelete(deletedRound.id);
      });
    }

    // Show undo toast
    if (deletedRound) {
      showUndoToast(`Runde "${deletedRound.cfg?.clubName || "Runde"}" gelöscht · 30 Tage im Papierkorb`, async () => {
        const restored = [deletedRound, ...updated].slice(0, 50);
        setRounds(restored);
        try { await window.storage.set("golf-rounds", JSON.stringify(restored)); } catch {}
        // Also undo the soft-delete in cloud
        if (SYNC_ENABLED) archiveRestore(deletedRound.id);
        setUndoAction(null);
      });
    }
  };

  const newRound = (tripContext = null) => {
    setLoadedRoundId(null);
    setCfg({
      name: "", date: toDay(), numHoles: 18, clubName: "", defaultTeeName: "",
      // v47: Trip-Kontext — wenn gesetzt, werden Spieler-HCPs bei Save mit Trip-Adjustment berechnet
      tripContext: tripContext, // { tripId, dayNumber } oder null
    });
    setHoles(makeHoles(72, 18));

    // v47: Wenn Runde zu einem Trip-Tag gehört → Spieler aus Trip übernehmen mit angepasstem HCP
    if (tripContext) {
      const trip = trips.find(t => t.id === tripContext.tripId);
      if (trip) {
        const tripPlayers = (trip.players || []).map(tp => {
          const adjustment = tp.hcpAdjustments?.[tripContext.dayNumber] || 0;
          // v47: Real-HCP = aktueller Friend-Liste-HCP (oder baseHcp falls Friend nicht mehr da)
          const friend = friends.find(f => f.playerId === tp.playerId || normName(f.name) === normName(tp.name));
          const realHcp = friend ? parseFloat(friend.hcp) || 0 : (parseFloat(tp.hcp) || 0);
          const adjustedHcp = realHcp + adjustment;
          return {
            id: uid(),
            playerId: tp.playerId,
            name: tp.name,
            hcp: adjustedHcp, // angepasster HCP für diese Runde
            realHcp: realHcp, // Original-HCP (für „Real-HCP"-Anzeige)
            tripAdjustment: adjustment, // damit wir's anzeigen können
            teeName: "",
          };
        });
        setPlayers(tripPlayers);
        setScores({});
        setGameMode("stableford"); setTeams(null); setPar3Data({});
        setLadies({});
        setClubQ(""); setPickedClub(null);
        setCurrentHole(0); setScoringMode("batch");
        setView("setup");
        return;
      }
    }

    // Auto-add owner as first player so the user doesn't have to search themselves
    if (ownerProfile?.name) {
      setPlayers([{
        id: uid(),
        name: ownerProfile.name,
        hcp: ownerProfile.hcp,
        teeName: "",
      }]);
    } else {
      setPlayers([]);
    }
    setScores({});
    setGameMode("stableford"); setTeams(null); setPar3Data({});
    setLadies({});
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
      setImportMode("choose"); setWizardStep(1);
      setWizardData({
        name: "", region: "", numHoles: 18,
        tees: [{ teeName: "Weiß", color: "Weiß", slope: "", cr: "", par: 72 }],
        holes: [],
      });
    } catch (e) {
      setImportErrors([`JSON-Fehler: ${e.message}`]);
    }
  };

  // v37: Direkter Import für Wizard — bypassed JSON-Parsing
  const importClubFromObject = async (rawObj) => {
    try {
      const parsed = normalizeBirdiebookFormat(rawObj);
      const errors = validateClub(parsed);
      if (errors.length > 0) { setImportErrors(errors); return false; }
      const existing = customClubs.findIndex(c => c.name === parsed.name);
      const updated = existing >= 0
        ? customClubs.map((c, i) => i === existing ? parsed : c)
        : [parsed, ...customClubs];
      setCustomClubs(updated);
      try { await window.storage.set("golf-custom-clubs", JSON.stringify(updated)); } catch {}
      setImportText(""); setImportErrors([]); setShowImport(false);
      setImportMode("choose"); setWizardStep(1);
      setWizardData({
        name: "", region: "", numHoles: 18,
        tees: [{ teeName: "Weiß", color: "Weiß", slope: "", cr: "", par: 72 }],
        holes: [],
      });
      showUndoToast(`✓ Club „${parsed.name}" hinzugefügt`, null);
      return true;
    } catch (e) {
      setImportErrors([`Fehler: ${e.message}`]);
      return false;
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

        // v47.1: Trips merge — by ID
        const cloudTrips = Array.isArray(cloud.data.trips) ? cloud.data.trips : [];
        const cloudTripIds = new Set(cloudTrips.map(t => t.id));
        const mergedTrips = [...cloudTrips, ...trips.filter(t => !cloudTripIds.has(t.id))];

        // v47.1: Owner-Profile aus Cloud übernehmen falls keiner lokal
        const cloudOwnerProfile = cloud.data.ownerProfile;
        if (cloudOwnerProfile && !ownerProfile?.name) {
          setOwnerProfile(cloudOwnerProfile);
          try { await window.storage.set("golf-owner-profile", JSON.stringify(cloudOwnerProfile)); } catch {}
        }

        // Now apply the change
        setSyncCode(clean);
        try { await window.storage.set("golf-sync-code", clean); } catch {}
        try { await window.storage.set("golf-last-sync", "0"); } catch {} // force re-push of merged state

        setRounds(merged);
        setFriends(mergedFriends);
        setCustomClubs(mergedClubs);
        setTrips(mergedTrips);
        try { await window.storage.set("golf-trips", JSON.stringify(mergedTrips)); } catch {}

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

  // Progress bar (v38: clickable steps with smart guards)
  const renderProgressBar = () => {
    const targets = ["setup", "holes", "scoring", "results"];
    // Welche Schritte sind erreichbar — abhängig von Setup-Stand
    const hasClub = !!cfg?.clubName;
    const hasPlayers = players && players.length > 0;
    const hasAnyScore = Object.values(scores || {}).some(ps => Object.values(ps || {}).some(v => v !== undefined));
    const canGoTo = (target) => {
      if (target === "setup") return true;
      if (target === "holes") return hasClub;
      if (target === "scoring") return hasClub && hasPlayers;
      if (target === "results") return hasClub && hasPlayers && hasAnyScore;
      return false;
    };
    return (
      <div style={{ padding: "12px 16px", background: T.canvas, borderBottom: `1px solid ${T.line}` }}>
        <div style={{ display: "flex", gap: "4px" }}>
          {["Setup", "Löcher", "Scores", "Ergebnis"].map((label, i) => {
            const target = targets[i];
            const active = stepIdx === i + 1;
            const done = stepIdx > i + 1;
            const reachable = canGoTo(target);
            return (
              <button
                key={label}
                onClick={() => { if (reachable) setView(target); }}
                disabled={!reachable}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  padding: "0",
                  cursor: reachable ? "pointer" : "default",
                  opacity: reachable ? 1 : 0.5,
                  textAlign: "left",
                  // hover-state via inline simulator: leichter Background-Effekt
                }}
                title={reachable ? `Zu „${label}" springen` : "Erst vorherige Schritte abschließen"}>
                <div style={{
                  height: "2px",
                  borderRadius: "2px",
                  background: done ? T.gold : active ? `${T.gold}aa` : T.line,
                  marginBottom: "6px",
                  transition: "background 0.3s",
                }}/>
                <div style={{
                  fontSize: "10px",
                  color: active ? T.gold : done ? T.textSoft : T.textDim,
                  fontWeight: active ? 600 : 500,
                  textAlign: "left",
                }}>{label}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

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

    // v53: "Alle Clubs"-Mode wenn statsClubName === "__ALL__"
    const isAllClubsMode = statsClubName === "__ALL__";
    const activeClub = isAllClubsMode ? null : (statsClubName && clubsPlayed.includes(statsClubName) ? statsClubName : clubsPlayed[0]);
    const stats = isAllClubsMode
      ? aggregateAllClubsStats(allRoundsForStats)
      : aggregateClubStats(activeClub, allRoundsForStats);

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
            value={isAllClubsMode ? "__ALL__" : activeClub}
            onChange={(e) => { setStatsClubName(e.target.value); setStatsFocusPlayer(null); }}
            style={{ ...S.input, padding: "10px 12px", fontSize: "13px", width: "100%" }}>
            <option value="__ALL__">🌍 Alle Clubs ({allRoundsForStats.length} Runden)</option>
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

            {/* v48: Sim-HCP-Karte für Focus-Player */}
            {focusPlayerName && focusPlayerData && (() => {
              const sim = computeSimHcp(focusPlayerName, allRoundsForStats);
              if (!sim?.hasEnoughData) return null;
              return (
                <div style={{ ...S.card, padding: "12px 14px", marginBottom: "14px", borderColor: `${T.gold}30` }}>
                  <div style={{ ...S.eyebrow, marginBottom: "10px", color: T.gold }}>📊 Aktuelle Form</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                    <div style={{ textAlign: "center", padding: "10px 6px", background: T.surface2, borderRadius: "8px" }}>
                      <div className="mono" style={{ fontSize: "20px", fontWeight: 700, color: T.textSoft, lineHeight: 1 }}>{sim.baseHcp}</div>
                      <div style={{ fontSize: "9px", color: T.textDim, marginTop: "4px", letterSpacing: "0.06em" }}>OFFIZIELL</div>
                    </div>
                    <div style={{ textAlign: "center", padding: "10px 6px", background: `${T.gold}10`, borderRadius: "8px", border: `1px solid ${T.gold}40` }}>
                      <div className="mono" style={{ fontSize: "20px", fontWeight: 700, color: T.gold, lineHeight: 1 }}>{sim.simHcp}</div>
                      <div style={{ fontSize: "9px", color: T.textDim, marginTop: "4px", letterSpacing: "0.06em" }}>AKTUELL</div>
                    </div>
                    <div style={{ textAlign: "center", padding: "10px 6px", background: T.surface2, borderRadius: "8px" }}>
                      <div className="mono" style={{
                        fontSize: "20px", fontWeight: 700, lineHeight: 1,
                        color: sim.diff > 0 ? T.double : sim.diff < 0 ? T.sage : T.textDim,
                      }}>
                        {sim.diff > 0 ? "📈" : sim.diff < 0 ? "📉" : "≈"} {sim.diff > 0 ? "+" : ""}{sim.diff}
                      </div>
                      <div style={{ fontSize: "9px", color: T.textDim, marginTop: "4px", letterSpacing: "0.06em" }}>TREND</div>
                    </div>
                  </div>
                  <div style={{ fontSize: "10px", color: T.textDim, marginTop: "8px", textAlign: "center", fontStyle: "italic" }}>
                    Basierend auf den letzten {sim.roundsUsed} Runden ({Math.round(sim.avgSf)} SF ⌀)
                  </div>
                </div>
              );
            })()}

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
                {stats.playerStats.map((p, i) => {
                  // v49: Sim-HCP für jede Spielerkarte berechnen
                  const sim = computeSimHcp(p.name, allRoundsForStats);
                  return (
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
                      <div style={{ fontWeight: 600, fontSize: "14px", color: T.text, flex: 1, display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        {p.name}
                        {/* v49: Sim-HCP Trend-Pill direkt am Namen */}
                        {sim?.hasEnoughData && (
                          <span style={{
                            fontSize: "9px", letterSpacing: "0.04em", padding: "2px 6px", borderRadius: "4px",
                            background: sim.diff > 0 ? `${T.double}15` : sim.diff < 0 ? `${T.sage}15` : `${T.textDim}15`,
                            color: sim.diff > 0 ? T.double : sim.diff < 0 ? T.sage : T.textDim,
                            fontWeight: 700,
                          }}>
                            Sim {sim.simHcp} {sim.diff > 0 ? "↑" : sim.diff < 0 ? "↓" : "→"}{sim.diff !== 0 ? Math.abs(sim.diff) : ""}
                          </span>
                        )}
                      </div>
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
                    {/* v35: Sim-HCP-Zeile */}
                    {p.simHcp?.hasEnoughData && (
                      <div style={{
                        marginTop: "8px", paddingTop: "8px",
                        borderTop: `1px dashed ${T.line}`,
                        display: "flex", alignItems: "center", gap: "8px",
                        fontSize: "11px",
                      }}>
                        <span style={{ color: T.textDim }}>HCP</span>
                        <span className="mono" style={{ color: T.textSoft, fontWeight: 600 }}>{p.simHcp.baseHcp}</span>
                        <span style={{ color: T.textDim }}>·</span>
                        <span style={{ color: T.textDim }}>Sim</span>
                        <span className="mono" style={{ color: T.gold, fontWeight: 700 }}>{p.simHcp.simHcp}</span>
                        <span style={{
                          color: p.simHcp.diff > 0 ? T.double : p.simHcp.diff < 0 ? T.sage : T.textDim,
                          fontWeight: 600,
                          marginLeft: "auto",
                        }}>
                          {p.simHcp.diff > 0 ? "📈" : p.simHcp.diff < 0 ? "📉" : "≈"} {p.simHcp.diff > 0 ? "+" : ""}{p.simHcp.diff}
                        </span>
                      </div>
                    )}
                  </button>
                  );
                })}
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
                <div style={{ display: "flex", gap: "8px", fontSize: "11px", color: T.textSoft, flexWrap: "wrap", justifyContent: "center" }}>
                  {/* v37: Tappable Stats — öffnen Drilldown-Modal */}
                  {[
                    { type: "birdies",   icon: "🎯", count: focusPlayerData.birdies,     label: "Birdies",  color: T.gold,   list: focusPlayerData.birdiesList || [] },
                    { type: "pars",      icon: "⛳", count: focusPlayerData.pars,        label: "Pars",     color: T.sage,   list: focusPlayerData.parsList || [] },
                    { type: "bogeys",    icon: "⚠️", count: focusPlayerData.bogeys,      label: "Bogeys",   color: T.textSoft, list: focusPlayerData.bogeysList || [] },
                    { type: "doubles",   icon: "💀", count: focusPlayerData.doubles,     label: "Doubles+", color: T.textSoft, list: focusPlayerData.doublesList || [] },
                    { type: "strich",    icon: "✗",  count: focusPlayerData.strichCount, label: "Striche",  color: T.double, list: focusPlayerData.strichList || [] },
                  ].filter(s => s.count > 0).map(s => (
                    <button
                      key={s.type}
                      onClick={() => setStatDrilldown({
                        type: s.type, items: s.list, label: s.label,
                        icon: s.icon, color: s.color, playerName: focusPlayerName,
                      })}
                      style={{
                        background: `${s.color}12`,
                        border: `1px solid ${s.color}40`,
                        borderRadius: "14px",
                        padding: "5px 10px",
                        fontSize: "11px",
                        color: s.color === T.textSoft ? T.text : s.color,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                      title="Tippen für Details">
                      {s.icon} {s.count} {s.label} ›
                    </button>
                  ))}
                </div>
                {/* v35: Sim-HCP-Box im Focus-Detail */}
                {focusPlayerData.simHcp?.hasEnoughData ? (
                  <div style={{
                    marginTop: "12px", paddingTop: "12px",
                    borderTop: `1px dashed ${T.line}`,
                  }}>
                    <div style={{ ...S.eyebrow, marginBottom: "8px", fontSize: "9px" }}>📈 Form-Trend</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
                      <div style={{ textAlign: "center", padding: "8px 4px", background: T.surface2, borderRadius: "6px" }}>
                        <div className="mono" style={{ fontSize: "16px", fontWeight: 700, color: T.textSoft }}>{focusPlayerData.simHcp.baseHcp}</div>
                        <div style={{ fontSize: "9px", color: T.textDim, marginTop: "2px" }}>OFFIZIELL</div>
                      </div>
                      <div style={{ textAlign: "center", padding: "8px 4px", background: T.surface2, borderRadius: "6px" }}>
                        <div className="mono" style={{ fontSize: "16px", fontWeight: 700, color: T.gold }}>{focusPlayerData.simHcp.simHcp}</div>
                        <div style={{ fontSize: "9px", color: T.textDim, marginTop: "2px" }}>SIM</div>
                      </div>
                      <div style={{ textAlign: "center", padding: "8px 4px", background: T.surface2, borderRadius: "6px" }}>
                        <div className="mono" style={{
                          fontSize: "16px", fontWeight: 700,
                          color: focusPlayerData.simHcp.diff > 0 ? T.double : focusPlayerData.simHcp.diff < 0 ? T.sage : T.textDim,
                        }}>
                          {focusPlayerData.simHcp.diff > 0 ? "📈" : focusPlayerData.simHcp.diff < 0 ? "📉" : "≈"} {focusPlayerData.simHcp.diff > 0 ? "+" : ""}{focusPlayerData.simHcp.diff}
                        </div>
                        <div style={{ fontSize: "9px", color: T.textDim, marginTop: "2px" }}>TREND</div>
                      </div>
                    </div>
                    <p style={{ fontSize: "10px", color: T.textDim, marginTop: "8px", lineHeight: 1.4, fontStyle: "italic" }}>
                      Berechnet aus den letzten {focusPlayerData.simHcp.roundsUsed} Runden · ⌀ {focusPlayerData.simHcp.avgSf} SF.
                      {focusPlayerData.simHcp.diff > 0 ? " Aktuelle Form schlechter als HCP." : focusPlayerData.simHcp.diff < 0 ? " Aktuelle Form besser als HCP — Form steigt." : " Aktuelle Form genau auf HCP-Niveau."}
                    </p>
                  </div>
                ) : focusPlayerData.simHcp && (
                  <div style={{
                    marginTop: "12px", paddingTop: "12px",
                    borderTop: `1px dashed ${T.line}`,
                    fontSize: "10px", color: T.textDim, fontStyle: "italic", textAlign: "center", lineHeight: 1.4,
                  }}>
                    📈 Sim-HCP erscheint ab {SIM_HCP_MIN_ROUNDS} aufgezeichneten Runden ({focusPlayerData.simHcp.roundsUsed}/{SIM_HCP_MIN_ROUNDS}).
                  </div>
                )}
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
      const rClub = r.selectedClubSnapshot || allClubs.find(c => c.name === r.cfg.clubName);
      const par = sumPar(r.holes);
      const stats = r.players.map(p => {
        const tee = playerTee(p, r.cfg, rClub);
        if (!tee) return 0;
        // v36: resolvePlayerPH konsistent zu allen anderen Stellen
        const ph = resolvePlayerPH(p, r.cfg, rClub, par).ph;
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

                  // Click handler:
                  // - Own live round → continue scoring (load into the editor)
                  // - Other live round → open in-app modal viewer (NOT new tab)
                  //   This prevents the PWA-stuck issue where /live.html opens
                  //   inside the WebView with no way to navigate back.
                  // We use a <button> instead of <a> to prevent any default navigation.

                  return (
                    <button
                      key={live.code}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (live._isOwn) {
                          const matchingRound = rounds.find(r => {
                            const p = getRoundProgress(r);
                            return !p.complete && !p.notStarted;
                          });
                          if (matchingRound) {
                            loadRound(matchingRound);
                            return;
                          }
                        }
                        setViewingLive(live);
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        marginBottom: "6px",
                        padding: "12px 14px",
                        background: live._isOwn ? `${T.gold}15` : T.surface2,
                        border: `1px solid ${live._isOwn ? T.gold + "60" : T.line}`,
                        borderRadius: "10px",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        color: "inherit",
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
                    </button>
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
                { label: "Runden", value: totalRounds, action: () => setTab("rounds") },
                { label: "Clubs", value: clubsPlayed, action: () => setShowClubsModal(true) },
                { label: "Bester SF", value: bestSF || "—", accent: true, action: () => setTab("stats") },
              ].map((s,i,arr) => (
                <button key={s.label}
                  onClick={s.action}
                  style={{
                    padding: "14px 8px", textAlign: "center",
                    borderRight: i < arr.length-1 ? `1px solid ${T.line}` : "none",
                    background: "transparent", border: "none",
                    cursor: "pointer", color: "inherit",
                    fontFamily: "inherit",
                  }}>
                  <div className="mono" style={{ fontSize: "22px", fontWeight: 700, color: s.accent ? T.gold : T.text }}>{s.value}</div>
                  <div style={{ ...S.eyebrow, marginTop: "4px", fontSize: "9px" }}>{s.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ padding: "0 16px 16px", display: "flex", gap: "4px" }}>
          {[{k:"rounds",l:"Runden"},{k:"friends",l:"Freunde"},{k:"stats",l:"📊 Stats"},{k:"history",l:"📈 Form"},{k:"trips",l:"🏖️ Trips"}].map(({k,l}) => (
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
                : (() => {
                    const q = roundsQuery.trim().toLowerCase();
                    const filtered = q
                      ? rounds.filter(r => {
                          const club = (r.cfg?.clubName || "").toLowerCase();
                          const playerNames = (r.players || []).map(p => p.name.toLowerCase()).join(" ");
                          return club.includes(q) || playerNames.includes(q);
                        })
                      : rounds;
                    const showSearch = rounds.length >= 8;
                    return (
                      <>
                        {showSearch && (
                          <div style={{ position: "relative", marginBottom: "12px" }}>
                            <input
                              type="text"
                              value={roundsQuery}
                              onChange={e => setRoundsQuery(e.target.value)}
                              placeholder={`🔍 Club oder Spieler suchen... (${rounds.length} Runden)`}
                              style={{
                                ...S.input, width: "100%",
                                paddingLeft: "12px", paddingRight: q ? "32px" : "12px",
                                fontSize: "13px",
                              }}/>
                            {q && (
                              <button
                                onClick={() => setRoundsQuery("")}
                                aria-label="Suche löschen"
                                style={{
                                  position: "absolute", right: "8px", top: "50%",
                                  transform: "translateY(-50%)",
                                  background: "transparent", border: "none",
                                  color: T.textDim, fontSize: "16px",
                                  width: "24px", height: "24px",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  cursor: "pointer",
                                }}>×</button>
                            )}
                          </div>
                        )}
                        <div style={{ ...S.eyebrow, marginBottom: "10px" }}>
                          {q ? `${filtered.length} Treffer` : (rounds.length <= 5 ? "Letzte Runden" : `Alle Runden (${rounds.length})`)}
                        </div>
                        {filtered.length === 0 && q ? (
                          <div style={{ padding: "20px", textAlign: "center", color: T.textDim, fontSize: "13px" }}>
                            Kein Treffer für „{roundsQuery}"
                          </div>
                        ) : (
                          (q ? filtered : filtered.slice(0, 20)).map(r => renderRoundCard(r, false))
                        )}
                      </>
                    );
                  })()}
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

          {tab === "history" && (() => {
            // ── v41: Form-Tab — Deine Form / Crew / Highlights ──
            if (rounds.length === 0) {
              return <EmptyState icon="📈" title="Noch keine Form-Daten" sub="Sobald du Runden gespielt hast, siehst du hier deine Entwicklung und HCP-Trends." />;
            }

            // Owner-Block: Deine Form
            const ownerName = ownerProfile?.name;
            const ownerSim = ownerName ? computeSimHcp(ownerName, rounds) : null;
            const ownerLastFiveSf = ownerName ? rounds
              .filter(r => (r.players || []).some(p => normName(p.name) === normName(ownerName)))
              .slice(0, 5)
              .map(r => {
                const player = (r.players || []).find(p => normName(p.name) === normName(ownerName));
                if (!player || !r.holes?.length) return null;
                const par = r.holes.reduce((s, h) => s + h.par, 0);
                const { ph } = resolvePlayerPH(player, r.cfg, r.selectedClubSnapshot, par);
                let sfTotal = 0;
                let played = 0;
                r.holes.forEach((h, i) => {
                  const g = r.scores?.[player.id]?.[i];
                  if (!isValid(g) && !isStrich(g)) return;
                  played++;
                  const hs = holeHS(ph, h.si, r.holes.length);
                  sfTotal += sfNetto(g, hs, h.par) || 0;
                });
                if (played < r.holes.length * 0.5) return null;
                const normalized = r.holes.length === 9 ? sfTotal * 2 : sfTotal;
                return { sf: normalized, date: r.cfg?.date || r.savedAt, club: r.cfg?.clubName };
              })
              .filter(Boolean) : [];

            // Crew-Block: Alle Friends — v51: Hybrid mit zwei Sektionen
            // Sektion 1: mit Sim-HCP (hasEnoughData)
            // Sektion 2: Datensammlung läuft (zeigt fehlende Runden)
            const crewWithData = [];
            const crewBuilding = [];
            friends.forEach(f => {
              const sim = computeSimHcp(f.playerId || f.name, rounds, f.name);
              if (sim?.hasEnoughData) {
                crewWithData.push({ friend: f, sim });
              } else {
                // v51+v53: Robustes Round-Count — gleiche Match-Logic wie computeSimHcp
                const fNormName = normName(f.name);
                const friendRoundCount = rounds.filter(r =>
                  (r.players || []).some(p => {
                    if (!p) return false;
                    if (f.playerId && p.playerId === f.playerId) return true;
                    if (p.name && normName(p.name) === fNormName) return true;
                    return false;
                  })
                ).length;
                crewBuilding.push({ friend: f, roundCount: friendRoundCount });
              }
            });
            crewWithData.sort((a, b) => Math.abs(b.sim.diff) - Math.abs(a.sim.diff));
            crewBuilding.sort((a, b) => b.roundCount - a.roundCount);
            const crewData = crewWithData; // legacy alias für unten

            // Highlights-Block
            const allRoundSfStats = rounds.flatMap(r => {
              const par = r.holes?.reduce((s, h) => s + h.par, 0) || 0;
              return (r.players || []).map(p => {
                const tee = playerTee(p, r.cfg, r.selectedClubSnapshot);
                if (!tee || !r.holes?.length) return null;
                const { ph } = resolvePlayerPH(p, r.cfg, r.selectedClubSnapshot, par);
                let sf = 0, played = 0;
                r.holes.forEach((h, i) => {
                  const g = r.scores?.[p.id]?.[i];
                  if (!isValid(g) && !isStrich(g)) return;
                  played++;
                  const hs = holeHS(ph, h.si, r.holes.length);
                  sf += sfNetto(g, hs, h.par) || 0;
                });
                if (played < r.holes.length * 0.5) return null;
                return {
                  sf, name: p.name, date: r.cfg?.date,
                  club: r.cfg?.clubName,
                  normalizedSf: r.holes.length === 9 ? sf * 2 : sf,
                };
              });
            }).filter(Boolean);

            const bestRound = allRoundSfStats.length > 0
              ? allRoundSfStats.reduce((b, c) => (c.sf > b.sf ? c : b), allRoundSfStats[0])
              : null;

            // v53: Rekord-Detection — bricht jemand seinen persönlichen Rekord in der NEUESTEN Runde?
            const newestRound = rounds.length > 0
              ? [...rounds].sort((a, b) => new Date(b.cfg?.date || b.savedAt || 0).getTime() - new Date(a.cfg?.date || a.savedAt || 0).getTime())[0]
              : null;
            const recordsBroken = []; // [{ name, sf, prevBest, club, date }]
            if (newestRound && newestRound.holes?.length) {
              const newPar = newestRound.holes.reduce((s, h) => s + h.par, 0);
              (newestRound.players || []).forEach(p => {
                const tee = playerTee(p, newestRound.cfg, newestRound.selectedClubSnapshot);
                if (!tee) return;
                const { ph } = resolvePlayerPH(p, newestRound.cfg, newestRound.selectedClubSnapshot, newPar);
                let sf = 0, played = 0;
                newestRound.holes.forEach((h, i) => {
                  const g = newestRound.scores?.[p.id]?.[i];
                  if (!isValid(g) && !isStrich(g)) return;
                  played++;
                  const hs = holeHS(ph, h.si, newestRound.holes.length);
                  sf += sfNetto(g, hs, h.par) || 0;
                });
                if (played < newestRound.holes.length * 0.5) return;
                const newSf = newestRound.holes.length === 9 ? sf * 2 : sf;

                // Suche bestes SF in allen ANDEREN Runden für diesen Spieler
                const playerNorm = normName(p.name);
                let prevBest = 0;
                rounds.forEach(r => {
                  if (r.id === newestRound.id) return;
                  const player = (r.players || []).find(rp =>
                    (p.playerId && rp.playerId === p.playerId) || normName(rp.name) === playerNorm
                  );
                  if (!player || !r.holes?.length) return;
                  const par = r.holes.reduce((s, h) => s + h.par, 0);
                  const { ph: prevPh } = resolvePlayerPH(player, r.cfg, r.selectedClubSnapshot, par);
                  let prevSf = 0, prevPlayed = 0;
                  r.holes.forEach((h, i) => {
                    const g = r.scores?.[player.id]?.[i];
                    if (!isValid(g) && !isStrich(g)) return;
                    prevPlayed++;
                    const hs = holeHS(prevPh, h.si, r.holes.length);
                    prevSf += sfNetto(g, hs, h.par) || 0;
                  });
                  if (prevPlayed < r.holes.length * 0.5) return;
                  const norm = r.holes.length === 9 ? prevSf * 2 : prevSf;
                  if (norm > prevBest) prevBest = norm;
                });
                if (newSf > prevBest && prevBest > 0) {
                  recordsBroken.push({
                    name: p.name,
                    sf: newSf,
                    prevBest,
                    club: newestRound.cfg?.clubName,
                    date: newestRound.cfg?.date || newestRound.savedAt,
                  });
                }
              });
            }

            // v53: Owner-Streak — wie viele Runden in Folge mit ≥36 SF
            let ownerStreak = 0;
            if (ownerName) {
              const ownerRoundsSorted = rounds
                .filter(r => (r.players || []).some(p => normName(p.name) === normName(ownerName)))
                .sort((a, b) => new Date(b.cfg?.date || b.savedAt || 0).getTime() - new Date(a.cfg?.date || a.savedAt || 0).getTime());
              for (const r of ownerRoundsSorted) {
                const player = (r.players || []).find(p => normName(p.name) === normName(ownerName));
                if (!player || !r.holes?.length) break;
                const par = r.holes.reduce((s, h) => s + h.par, 0);
                const { ph } = resolvePlayerPH(player, r.cfg, r.selectedClubSnapshot, par);
                let sf = 0, played = 0;
                r.holes.forEach((h, i) => {
                  const g = r.scores?.[player.id]?.[i];
                  if (!isValid(g) && !isStrich(g)) return;
                  played++;
                  const hs = holeHS(ph, h.si, r.holes.length);
                  sf += sfNetto(g, hs, h.par) || 0;
                });
                if (played < r.holes.length * 0.5) break;
                const norm = r.holes.length === 9 ? sf * 2 : sf;
                if (norm >= 36) ownerStreak++;
                else break;
              }
            }

            // Form-Sieger: Spieler mit niedrigster (also bestester) Sim-HCP-Diff
            const bestForm = crewData.length > 0
              ? [...crewData].sort((a, b) => a.sim.diff - b.sim.diff)[0]
              : null;
            // Form-Verlierer: höchste positive Diff
            const worstForm = crewData.length > 0
              ? [...crewData].sort((a, b) => b.sim.diff - a.sim.diff)[0]
              : null;

            return (
              <>
                {/* v53: Rekord-Banner — wenn jemand seinen persönlichen Rekord brach */}
                {recordsBroken.length > 0 && (
                  <div style={{
                    ...S.card, padding: "14px 16px", marginBottom: "14px",
                    background: `linear-gradient(135deg, ${T.gold}25 0%, ${T.gold}10 100%)`,
                    borderColor: `${T.gold}60`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "26px" }}>🏆</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "10px", color: T.gold, letterSpacing: "0.08em", fontWeight: 700, marginBottom: "2px" }}>
                          NEUER REKORD!
                        </div>
                        {recordsBroken.map((r, i) => (
                          <div key={i} style={{ fontSize: "13px", color: T.text, lineHeight: 1.4 }}>
                            <b>{r.name}</b> · <span className="mono" style={{ color: T.gold, fontWeight: 700 }}>{r.sf} SF</span> auf {r.club}
                            <div style={{ fontSize: "10px", color: T.textSoft, marginTop: "1px" }}>
                              ({r.prevBest} alter Rekord · {fmtDate(r.date)})
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* v53: Streak-Banner — wenn Owner mehrere Runden in Folge ≥36 SF */}
                {ownerStreak >= 2 && (
                  <div style={{
                    ...S.card, padding: "12px 16px", marginBottom: "14px",
                    background: `linear-gradient(135deg, ${T.double}25 0%, ${T.double}10 100%)`,
                    borderColor: `${T.double}60`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "24px" }}>🔥</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "10px", color: T.double, letterSpacing: "0.08em", fontWeight: 700, marginBottom: "2px" }}>
                          HOT STREAK
                        </div>
                        <div style={{ fontSize: "13px", color: T.text, fontWeight: 600 }}>
                          {ownerStreak} {ownerStreak === 1 ? "Runde" : "Runden"} in Folge mit ≥ 36 SF
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Top: Deine Form ── */}
                {ownerName && (
                  <div style={{ ...S.card, padding: "16px", marginBottom: "14px", borderColor: `${T.gold}30` }}>
                    <div style={{ ...S.eyebrow, marginBottom: "12px", color: T.gold }}>📊 Deine Form</div>

                    {ownerSim?.hasEnoughData ? (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                          <div style={{ textAlign: "center", padding: "10px 6px", background: T.surface2, borderRadius: "8px" }}>
                            <div className="mono" style={{ fontSize: "20px", fontWeight: 700, color: T.textSoft, lineHeight: 1 }}>{ownerSim.baseHcp}</div>
                            <div style={{ fontSize: "9px", color: T.textDim, marginTop: "4px", letterSpacing: "0.06em" }}>OFFIZIELL</div>
                          </div>
                          <div style={{ textAlign: "center", padding: "10px 6px", background: `${T.gold}10`, borderRadius: "8px", border: `1px solid ${T.gold}40` }}>
                            <div className="mono" style={{ fontSize: "20px", fontWeight: 700, color: T.gold, lineHeight: 1 }}>{ownerSim.simHcp}</div>
                            <div style={{ fontSize: "9px", color: T.textDim, marginTop: "4px", letterSpacing: "0.06em" }}>AKTUELL</div>
                          </div>
                          <div style={{ textAlign: "center", padding: "10px 6px", background: T.surface2, borderRadius: "8px" }}>
                            <div className="mono" style={{
                              fontSize: "20px", fontWeight: 700, lineHeight: 1,
                              color: ownerSim.diff > 0 ? T.double : ownerSim.diff < 0 ? T.sage : T.textDim,
                            }}>
                              {ownerSim.diff > 0 ? "📈" : ownerSim.diff < 0 ? "📉" : "≈"} {ownerSim.diff > 0 ? "+" : ""}{ownerSim.diff}
                            </div>
                            <div style={{ fontSize: "9px", color: T.textDim, marginTop: "4px", letterSpacing: "0.06em" }}>TREND</div>
                          </div>
                        </div>

                        {/* Letzte SF-Werte */}
                        {ownerLastFiveSf.length > 0 && (
                          <div style={{ paddingTop: "10px", borderTop: `1px solid ${T.line}` }}>
                            <div style={{ fontSize: "10px", color: T.textDim, letterSpacing: "0.06em", fontWeight: 600, marginBottom: "8px" }}>
                              LETZTE {ownerLastFiveSf.length} RUNDEN — SF NETTO
                            </div>
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                              {ownerLastFiveSf.map((r, i) => (
                                <div key={i} style={{
                                  flex: 1,
                                  minWidth: "0",
                                  textAlign: "center",
                                  padding: "8px 4px",
                                  background: T.surface2,
                                  borderRadius: "6px",
                                  border: `1px solid ${r.sf >= 36 ? T.sage + "40" : T.line}`,
                                }}>
                                  <div className="mono" style={{
                                    fontSize: "16px", fontWeight: 700, lineHeight: 1,
                                    color: r.sf >= 36 ? T.sage : r.sf >= 30 ? T.gold : T.textSoft,
                                  }}>{r.sf}</div>
                                  <div style={{ fontSize: "9px", color: T.textDim, marginTop: "3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {r.club ? r.club.slice(0, 10) : "—"}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div style={{ fontSize: "10px", color: T.textDim, marginTop: "8px", lineHeight: 1.4, fontStyle: "italic" }}>
                              ⌀ {ownerSim.avgSf} SF · {ownerSim.diff > 0 ? "Form unter HCP" : ownerSim.diff < 0 ? "Form über HCP — du bist heiß!" : "Genau auf HCP-Niveau"}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <p style={{ fontSize: "12px", color: T.textDim, lineHeight: 1.5, fontStyle: "italic" }}>
                        Sim-HCP erscheint ab {SIM_HCP_MIN_ROUNDS} aufgezeichneten Runden. Aktuell: {ownerSim?.roundsUsed || 0} von {SIM_HCP_MIN_ROUNDS}.
                      </p>
                    )}
                  </div>
                )}

                {/* ── Crew-Block ── v51: Hybrid */}
                {(crewWithData.length > 0 || crewBuilding.length > 0) && (
                  <div style={{ ...S.card, padding: "16px", marginBottom: "14px" }}>
                    <div style={{ ...S.eyebrow, marginBottom: "12px" }}>👥 Crew · Form-Trends</div>

                    {/* Sektion 1: mit Sim-HCP */}
                    {crewWithData.length > 0 && (
                      <>
                        <div style={{ fontSize: "10px", color: T.gold, fontWeight: 700, letterSpacing: "0.06em", marginBottom: "8px" }}>📈 MIT SIM-HCP</div>
                        <p style={{ fontSize: "10px", color: T.textDim, marginBottom: "10px", lineHeight: 1.4, fontStyle: "italic" }}>
                          Sortiert nach größter Form-Abweichung. 📈 = aktuell schlechter als HCP, 📉 = besser.
                        </p>
                        {crewWithData.map(({ friend, sim }) => (
                          <div key={friend.playerId || friend.name}
                            style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", borderTop: `1px solid ${T.line}` }}>
                            <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: `${T.gold}20`, border: `1px solid ${T.gold}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: T.gold }}>
                              {(friend.name || "?").charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "13px", fontWeight: 600, color: T.text, marginBottom: "2px", display: "flex", alignItems: "center", gap: "6px" }}>
                                {friend.name}
                                {friend.isOwner && <span style={{ fontSize: "9px", color: T.gold, background: `${T.gold}15`, padding: "1px 5px", borderRadius: "3px", fontWeight: 700, letterSpacing: "0.04em" }}>DU</span>}
                              </div>
                              <div style={{ fontSize: "10px", color: T.textSoft }}>
                                HCP <span className="mono">{sim.baseHcp}</span> · Sim <span className="mono" style={{ color: T.gold, fontWeight: 700 }}>{sim.simHcp}</span> · {sim.roundsUsed} Runden
                              </div>
                            </div>
                            <span style={{
                              fontSize: "12px",
                              fontWeight: 700,
                              color: sim.diff > 0 ? T.double : sim.diff < 0 ? T.sage : T.textDim,
                              minWidth: "60px",
                              textAlign: "right",
                              fontFamily: "JetBrains Mono, monospace",
                            }}>
                              {sim.diff > 0 ? "📈" : sim.diff < 0 ? "📉" : "≈"} {sim.diff > 0 ? "+" : ""}{sim.diff}
                            </span>
                          </div>
                        ))}
                      </>
                    )}

                    {/* Sektion 2: Datensammlung läuft */}
                    {crewBuilding.length > 0 && (
                      <>
                        <div style={{ fontSize: "10px", color: T.textDim, fontWeight: 700, letterSpacing: "0.06em", marginBottom: "8px", marginTop: crewWithData.length > 0 ? "18px" : 0 }}>⏳ DATENSAMMLUNG LÄUFT</div>
                        <p style={{ fontSize: "10px", color: T.textDim, marginBottom: "10px", lineHeight: 1.4, fontStyle: "italic" }}>
                          Brauchen noch mehr Runden für eine zuverlässige Sim-HCP-Berechnung.
                        </p>
                        {crewBuilding.map(({ friend, roundCount }) => {
                          const needed = Math.max(0, 3 - roundCount);
                          // v53: Diagnose — wenn genug Runden gefunden aber Sim-HCP fehlschlug, zeige Grund
                          const sim = computeSimHcp(friend.playerId || friend.name, rounds, friend.name);
                          const failReason = sim?.failReason;
                          const showDiagnose = roundCount >= 3 && failReason;
                          return (
                            <div key={friend.playerId || friend.name}
                              style={{ padding: "10px 0", borderTop: `1px solid ${T.line}` }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: T.surface2, border: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: T.textDim }}>
                                  {(friend.name || "?").charAt(0).toUpperCase()}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: "13px", fontWeight: 600, color: T.text, marginBottom: "2px", display: "flex", alignItems: "center", gap: "6px" }}>
                                    {friend.name}
                                    {friend.isOwner && <span style={{ fontSize: "9px", color: T.gold, background: `${T.gold}15`, padding: "1px 5px", borderRadius: "3px", fontWeight: 700, letterSpacing: "0.04em" }}>DU</span>}
                                  </div>
                                  <div style={{ fontSize: "10px", color: T.textSoft }}>
                                    HCP <span className="mono">{friend.hcp}</span> · {roundCount} {roundCount === 1 ? "Runde" : "Runden"}
                                  </div>
                                </div>
                                <span style={{
                                  fontSize: "10px",
                                  color: showDiagnose ? T.double : T.textDim,
                                  textAlign: "right",
                                  fontStyle: "italic",
                                  minWidth: "80px",
                                }}>
                                  {needed === 0 ? (showDiagnose ? "⚠️ Daten unklar" : "fast genug") : needed === 1 ? "noch 1 Runde" : `noch ${needed} Runden`}
                                </span>
                              </div>
                              {/* v53: Diagnose-Detail wenn genug Runden vorhanden aber Sim-HCP fehlschlug */}
                              {showDiagnose && (
                                <div style={{ fontSize: "10px", color: T.textDim, marginTop: "6px", marginLeft: "40px", padding: "6px 10px", background: T.surface1, borderRadius: "6px", lineHeight: 1.4 }}>
                                  💡 {failReason}
                                  {sim.droppedRounds && sim.droppedRounds.length > 0 && (
                                    <div style={{ marginTop: "4px" }}>
                                      Aussortiert: {sim.droppedRounds.map(d => `${d.date || "?"} (${d.reason})`).join(" · ")}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}

                {/* ── Highlights-Block ── */}
                {(bestRound || bestForm || worstForm) && (
                  <div style={{ ...S.card, padding: "16px", marginBottom: "14px" }}>
                    <div style={{ ...S.eyebrow, marginBottom: "12px" }}>🏆 Highlights</div>

                    {bestRound && (
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: `1px solid ${T.line}` }}>
                        <span style={{ fontSize: "20px" }}>🥇</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "10px", color: T.textDim, letterSpacing: "0.06em", fontWeight: 600 }}>BESTE RUNDE</div>
                          <div style={{ fontSize: "13px", color: T.text, fontWeight: 600 }}>
                            {bestRound.name} — <span className="mono" style={{ color: T.gold, fontWeight: 700 }}>{bestRound.sf} SF</span>
                          </div>
                          <div style={{ fontSize: "10px", color: T.textSoft }}>{bestRound.club} · {fmtDate(bestRound.date)}</div>
                        </div>
                      </div>
                    )}

                    {bestForm && bestForm.sim.diff < 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: worstForm && worstForm !== bestForm ? `1px solid ${T.line}` : "none" }}>
                        <span style={{ fontSize: "20px" }}>📉</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "10px", color: T.textDim, letterSpacing: "0.06em", fontWeight: 600 }}>FORM-SIEGER</div>
                          <div style={{ fontSize: "13px", color: T.text, fontWeight: 600 }}>
                            {bestForm.friend.name} — <span style={{ color: T.sage, fontWeight: 700 }}>{bestForm.sim.diff}</span>
                          </div>
                          <div style={{ fontSize: "10px", color: T.textSoft }}>spielt aktuell wie HCP {bestForm.sim.simHcp}</div>
                        </div>
                      </div>
                    )}

                    {worstForm && worstForm !== bestForm && worstForm.sim.diff > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0" }}>
                        <span style={{ fontSize: "20px" }}>📈</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "10px", color: T.textDim, letterSpacing: "0.06em", fontWeight: 600 }}>FORM-LADER</div>
                          <div style={{ fontSize: "13px", color: T.text, fontWeight: 600 }}>
                            {worstForm.friend.name} — <span style={{ color: T.double, fontWeight: 700 }}>+{worstForm.sim.diff}</span>
                          </div>
                          <div style={{ fontSize: "10px", color: T.textSoft }}>spielt aktuell wie HCP {worstForm.sim.simHcp}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Hinweis falls noch nichts da */}
                {!ownerName && crewWithData.length === 0 && crewBuilding.length === 0 && (
                  <EmptyState icon="📈" title="Noch zu wenig Daten" sub={`Form-Trends erscheinen ab ${SIM_HCP_MIN_ROUNDS} Runden pro Spieler. Spiele weiter — ${rounds.length} ${rounds.length === 1 ? "Runde" : "Runden"} schon im System!`} />
                )}
              </>
            );
          })()}

          {/* v42: Trips-Tab */}
          {tab === "trips" && (
            <>
              <div style={{ marginBottom: "14px" }}>
                <button
                  onClick={() => {
                    setTripFormData({
                      name: "",
                      location: "",
                      startDate: toDay(),
                      endDate: toDay(),
                      dayCount: 3,
                      syncCode: syncCode || "",
                      selectedFriendIds: [],
                      quickAddName: "",
                      quickAddHcp: "",
                      pots: { dayWin: 10, threeDayPot: 50, weekTeamPot: 50, nearestPin: 10 },
                      hcpRules: {
                        enabled: true,
                        bestAdj: [-3, -2, -1],
                        worstAdj: [1, 2, 3],
                      },
                    });
                    setShowTripSetup(true);
                  }}
                  className="gold-hover"
                  style={{ ...S.btnPrimary, width: "100%" }}>
                  ➕ Neuen Trip anlegen
                </button>
              </div>

              {trips.length === 0 ? (
                <EmptyState icon="🏖️" title="Noch keine Trips" sub="Plane deinen nächsten Golftrip mit mehreren Spieltagen, Tageswertungen und Pots." />
              ) : (
                trips.map(trip => {
                  const standings = computeTripStandings(trip);
                  const totalDays = trip.days?.length || 0;
                  const playedDays = (trip.days || []).filter(d => d.roundIds?.length > 0).length;
                  return (
                    <button key={trip.id}
                      onClick={() => { setActiveTripId(trip.id); setShowTripDetail(true); }}
                      className="card-hover"
                      style={{ ...S.card, width: "100%", padding: "14px", marginBottom: "10px", textAlign: "left", cursor: "pointer", border: `1px solid ${T.gold}30` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "8px" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "16px", fontWeight: 700, color: T.text, marginBottom: "2px" }}>
                            🏖️ {trip.name}
                          </div>
                          {trip.location && (
                            <div style={{ fontSize: "11px", color: T.textSoft, marginBottom: "4px" }}>📍 {trip.location}</div>
                          )}
                          <div style={{ fontSize: "11px", color: T.textDim }}>
                            {fmtDate(trip.startDate)} – {fmtDate(trip.endDate)} · {totalDays} Tage · {trip.players?.length || 0} Spieler
                          </div>
                        </div>
                        <span style={{
                          fontSize: "10px", padding: "3px 8px", borderRadius: "10px",
                          background: playedDays === totalDays && totalDays > 0 ? `${T.sage}20` : `${T.gold}20`,
                          color: playedDays === totalDays && totalDays > 0 ? T.sage : T.gold,
                          fontWeight: 600, whiteSpace: "nowrap",
                        }}>
                          {playedDays}/{totalDays}
                        </span>
                      </div>
                      {standings?.totalRanked?.length > 0 && (
                        <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px solid ${T.line}`, fontSize: "11px", color: T.textSoft }}>
                          🏆 Führung: <span style={{ color: T.gold, fontWeight: 700 }}>{standings.totalRanked[0].name}</span>
                          {" "}— <span className="mono">{standings.totalRanked[0].totalSf} SF</span>
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </>
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
    const rClub = r.selectedClubSnapshot || allClubs.find(c => c.name === r.cfg.clubName);
    const progress = getRoundProgress(r);
    const par = sumPar(r.holes);
    const sortedPlayers = r.players.map(p => {
      const tee = playerTee(p, r.cfg, rClub);
      // v36: resolvePlayerPH (mit Manual-Override + ÖGV-Tabelle) statt nur calcPH
      const ph = tee ? resolvePlayerPH(p, r.cfg, rClub, par).ph : 0;
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
            fontSize: "10px", fontWeight: 700, color: T.gold,
            background: `${T.gold}15`, border: `1px solid ${T.gold}40`,
            padding: "2px 8px", borderRadius: "4px",
            letterSpacing: "0.04em",
          }}>
            📅 VORBEREITET
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px", flexWrap: "wrap" }}>
              <div style={{
                fontSize: "14px", fontWeight: 600, color: T.text,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {r.cfg.clubName || r.cfg.name || "Runde"}
              </div>
              {/* Mode badge */}
              {r.gameMode && r.gameMode !== "stableford" && (
                <span style={{
                  fontSize: "9px", padding: "1px 6px",
                  background: T.surface2, color: T.gold,
                  border: `1px solid ${T.gold}40`,
                  borderRadius: "4px", letterSpacing: "0.04em", fontWeight: 700,
                  whiteSpace: "nowrap",
                }}>
                  🎯 {r.gameMode === "uschi-team" ? "USCHI 2v2" : "USCHI"}
                </span>
              )}
              {(!r.gameMode || r.gameMode === "stableford") && (
                <span style={{
                  fontSize: "9px", padding: "1px 6px",
                  background: T.surface2, color: T.textSoft,
                  border: `1px solid ${T.line}`,
                  borderRadius: "4px", letterSpacing: "0.04em", fontWeight: 700,
                  whiteSpace: "nowrap",
                }}>
                  ⛳ SF
                </span>
              )}
              {/* Lady count badge — only show if any ladies recorded in this round */}
              {(() => {
                const total = Object.values(r.ladies || {}).reduce((s, arr) => s + (arr?.length || 0), 0);
                if (total === 0) return null;
                return (
                  <span style={{
                    fontSize: "9px", padding: "1px 6px",
                    background: `${T.gold}20`, color: T.gold,
                    border: `1px solid ${T.gold}60`,
                    borderRadius: "4px", letterSpacing: "0.04em", fontWeight: 700,
                    whiteSpace: "nowrap",
                  }} title={`${total} ${total === 1 ? "Lady" : "Ladies"} in dieser Runde`}>
                    👯 {total}
                  </span>
                );
              })()}
            </div>
            <div style={{ fontSize: "11px", color: T.textSoft, marginBottom: "4px" }}>
              {fmtDate(r.cfg.date)} · {r.cfg.numHoles}L
            </div>
            {/* Player initials with winner highlighted */}
            {!isNotStarted && sortedPlayers.length > 0 && (
              <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginTop: "4px" }}>
                {sortedPlayers.map((s, i) => {
                  const initials = s.p.name.trim().split(/\s+/).map(part => part.charAt(0).toUpperCase()).join("").slice(0, 2) || "?";
                  const isWinner = i === 0 && progress.complete;
                  return (
                    <span
                      key={s.p.id}
                      title={`${s.p.name}: ${s.sfNT} SF`}
                      style={{
                        fontSize: "10px", padding: "2px 6px",
                        background: isWinner ? `${T.gold}25` : T.surface2,
                        color: isWinner ? T.gold : T.textSoft,
                        border: `1px solid ${isWinner ? T.gold + "60" : T.line}`,
                        borderRadius: "4px", fontWeight: 700,
                        fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.04em",
                      }}>
                      {isWinner && "🏆 "}{initials}
                    </span>
                  );
                })}
              </div>
            )}
            {/* If round has not started, show player names instead */}
            {isNotStarted && r.players.length > 0 && (
              <div style={{ fontSize: "10px", color: T.textDim, marginTop: "4px" }}>
                {r.players.map(p => p.name).join(", ")}
              </div>
            )}
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
    const canUschi = players.length >= 2;
    const canBestBall = players.length >= 2 && players.length <= 8;
    const modes = [
      { k: "stableford",   l: "Stableford Netto", sub: "Klassisch, Punkte pro Loch",     emoji: "⛳" },
      { k: "bestball-plus",l: "Best Ball+",       sub: canBestBall ? "Bestes Team-Ergebnis pro Loch · 2-8 Spieler" : "Braucht 2-8 Spieler", emoji: "☄️", needsMin: !canBestBall },
      { k: "uschi-single", l: "Uschi (Einzel)",   sub: canUschi ? "Low/Best Ball · Birdies · Uschi" : "Braucht ≥ 2 Spieler", emoji: "🎯", needsMin: !canUschi },
      { k: "uschi-team",   l: "Uschi (2 vs 2)",   sub: canTeam ? "Teamwertung · nur bei 4 Spielern" : "Braucht genau 4 Spieler", emoji: "🎯🤝", needsMin: !canTeam },
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
                  if (m.k === "uschi-single" && !canUschi) {
                    showUndoToast(`⚠️ Uschi braucht mindestens 2 Spieler — du hast aktuell ${players.length}`, null);
                    return;
                  }
                  if (m.k === "uschi-team" && !canTeam) {
                    showUndoToast(`⚠️ Uschi 2v2 braucht genau 4 Spieler — du hast aktuell ${players.length}`, null);
                    return;
                  }
                  if (m.k === "bestball-plus" && !canBestBall) {
                    showUndoToast(`⚠️ Best Ball+ braucht 2-8 Spieler — du hast aktuell ${players.length}`, null);
                    return;
                  }
                  setGameMode(m.k);
                  if (m.k === "uschi-team" && canTeam && !teams) {
                    const strokes = uschiAdjustedStrokes(players, cfg, selectedClub, holes);
                    setTeams(autoAssignTeams(strokes));
                  }
                  if (m.k === "stableford" || m.k === "bestball-plus") setTeams(null);
                }}
                style={{
                  padding: "14px 16px", textAlign: "left",
                  background: active ? `${T.gold}15` : T.surface2,
                  color: active ? T.text : (m.needsMin ? T.textDim : T.text),
                  border: `1.5px solid ${active ? T.gold : T.line}`,
                  borderRadius: "12px",
                  fontFamily: "Inter, sans-serif",
                  opacity: m.needsMin ? 0.65 : 1,
                  display: "flex", alignItems: "center", gap: "12px",
                  cursor: "pointer",
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

        {/* v48: Best Ball+ Configuration */}
        {gameMode === "bestball-plus" && canBestBall && renderBestBallConfig()}

        {/* Uschi Strokes Preview */}
        {(gameMode === "uschi-single" || gameMode === "uschi-team") && players.length >= 2 && renderUschiStrokesPreview()}

        {/* Team Assignment UI */}
        {gameMode === "uschi-team" && canTeam && renderTeamAssignmentUI()}
      </div>
    );
  };

  // v48+v50: Best Ball+ Config-UI im Setup
  const renderBestBallConfig = () => (
    <>
      <div style={{ marginTop: "14px", padding: "14px", background: T.surface2, borderRadius: "10px", border: `1px solid ${T.gold}40` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <div style={{ ...S.eyebrow, color: T.gold }}>☄️ Best Ball+ · Konfiguration</div>
          <button
            onClick={() => setShowBestBallExplain(true)}
            title="Was ist Best Ball+?"
            style={{ background: "transparent", border: `1px solid ${T.gold}40`, color: T.gold, borderRadius: "50%", width: "26px", height: "26px", fontSize: "13px", cursor: "pointer", fontWeight: 700 }}>
            ?
          </button>
        </div>

        <p style={{ fontSize: "11px", color: T.textSoft, lineHeight: 1.5, marginBottom: "12px", margin: "0 0 12px" }}>
          Pro Loch: Bester Netto-Stableford holt <b>+1 Punkt</b>. Bei Gleichstand bekommen alle Tied +1. Keine Minus-Punkte.
        </p>

        {/* v52: HCP-Modus-Toggle */}
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "10px", color: T.textDim, fontWeight: 700, letterSpacing: "0.04em", marginBottom: "5px" }}>HCP-MODUS</div>
          <div style={{ display: "flex", gap: "6px" }}>
            {[
              { v: "adjusted", l: "0.8-Regel", sub: "Best Ball Standard" },
              { v: "normal", l: "Voller HCP", sub: "Wie Stableford" },
            ].map(opt => (
              <button key={opt.v}
                onClick={() => setBestBallConfig(c => ({ ...c, hcpMode: opt.v }))}
                style={{
                  flex: 1, padding: "10px 6px",
                  background: bestBallConfig.hcpMode === opt.v ? `${T.gold}25` : T.surface1,
                  color: bestBallConfig.hcpMode === opt.v ? T.gold : T.textSoft,
                  border: `1px solid ${bestBallConfig.hcpMode === opt.v ? T.gold : T.line}`,
                  borderRadius: "8px", cursor: "pointer", textAlign: "center",
                }}>
                <div style={{ fontSize: "12px", fontWeight: 700 }}>{opt.l}</div>
                <div style={{ fontSize: "9px", marginTop: "2px", opacity: 0.85 }}>{opt.sub}</div>
              </button>
            ))}
          </div>
          {bestBallConfig.hcpMode === "adjusted" ? (
            <p style={{ fontSize: "10px", color: T.textDim, marginTop: "6px", lineHeight: 1.4, fontStyle: "italic" }}>
              ⚖️ Bester Spieler = Baseline. Andere bekommen <b>(Diff × 0.8)</b> Strokes auf den schwersten Löchern. Fairer für gemischte HCPs.
            </p>
          ) : (
            <p style={{ fontSize: "10px", color: T.textDim, marginTop: "6px", lineHeight: 1.4, fontStyle: "italic" }}>
              📊 Jeder spielt mit vollem Course-HCP. Wie ein normaler Stableford.
            </p>
          )}
        </div>

        {/* Add-Ons */}
        <div>
          <div style={{ fontSize: "10px", color: T.textDim, fontWeight: 700, letterSpacing: "0.04em", marginBottom: "5px" }}>OPTIONALE BONI</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <button
              onClick={() => setBestBallConfig(c => ({ ...c, birdieBonus: !c.birdieBonus }))}
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "10px 12px",
                background: bestBallConfig.birdieBonus ? `${T.gold}10` : T.surface1,
                border: `1px solid ${bestBallConfig.birdieBonus ? T.gold : T.line}`,
                borderRadius: "8px", textAlign: "left", cursor: "pointer",
              }}>
              <div style={{
                width: "18px", height: "18px", borderRadius: "4px",
                border: `2px solid ${bestBallConfig.birdieBonus ? T.gold : T.textDim}`,
                background: bestBallConfig.birdieBonus ? T.gold : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: T.canvas, fontSize: "11px", fontWeight: 700,
              }}>
                {bestBallConfig.birdieBonus && "✓"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: T.text }}>🎯 Birdie-Bonus</div>
                <div style={{ fontSize: "10px", color: T.textDim }}>Echter Brutto-Birdie (Score = Par-1) gibt +1</div>
              </div>
            </button>
            <button
              onClick={() => setBestBallConfig(c => ({ ...c, uschiBonus: !c.uschiBonus }))}
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "10px 12px",
                background: bestBallConfig.uschiBonus ? `${T.gold}10` : T.surface1,
                border: `1px solid ${bestBallConfig.uschiBonus ? T.gold : T.line}`,
                borderRadius: "8px", textAlign: "left", cursor: "pointer",
              }}>
              <div style={{
                width: "18px", height: "18px", borderRadius: "4px",
                border: `2px solid ${bestBallConfig.uschiBonus ? T.gold : T.textDim}`,
                background: bestBallConfig.uschiBonus ? T.gold : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: T.canvas, fontSize: "11px", fontWeight: 700,
              }}>
                {bestBallConfig.uschiBonus && "✓"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: T.text }}>🎀 Uschi auf Par-3</div>
                <div style={{ fontSize: "10px", color: T.textDim }}>Wie im Uschi-Modus: mit Verbrennung + Carry-Over</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* v52: Strokes-Preview — zeigt welche Strokes jeder Spieler bekommt */}
      {(() => {
        const strokes = bestBallConfig.hcpMode === "normal"
          ? normalHcpStrokes(players, cfg, selectedClub, holes)
          : uschiAdjustedStrokes(players, cfg, selectedClub, holes);
        if (strokes.length < 2) return null;
        const sorted = [...strokes].sort((a, b) => a.ch - b.ch);
        const best = sorted[0];
        const bestPlayer = players.find(p => p.id === best.playerId);
        const isAdjusted = bestBallConfig.hcpMode === "adjusted";

        return (
          <div style={{ marginTop: "10px", padding: "12px", background: T.surface1, border: `1px solid ${T.line}`, borderRadius: "10px" }}>
            <div style={{ ...S.eyebrow, marginBottom: "8px" }}>Strokes-Vorschau</div>
            <div style={{ fontSize: "11px", color: T.textDim, marginBottom: "10px", lineHeight: 1.5 }}>
              {isAdjusted ? (
                <><span style={{ color: T.gold, fontWeight: 600 }}>{bestPlayer?.name || "Scratch"}</span> (CH {best.ch}) ist der Maßstab. Andere bekommen <span className="mono">Diff × 0.8</span>.</>
              ) : (
                <>Jeder spielt mit vollem Course-HCP — keine Anpassung.</>
              )}
            </div>
            {sorted.map(s => {
              const p = players.find(pl => pl.id === s.playerId);
              if (!p) return null;
              const isRef = isAdjusted && s.playerId === best.playerId;
              return (
                <div key={s.playerId} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "5px 0", fontSize: "12px" }}>
                  <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: `${T.gold}20`, border: `1px solid ${T.gold}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, color: T.gold }}>
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
      })()}

      {/* Erklär-Modal */}
      {showBestBallExplain && (
        <div onClick={() => setShowBestBallExplain(false)}
          style={{ position: "fixed", inset: 0, background: "#000000ee", zIndex: 1300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ ...S.card, maxWidth: "440px", width: "100%", padding: "20px", borderColor: `${T.gold}50`, maxHeight: "85vh", overflowY: "auto" }}>
            <h4 className="serif" style={{ fontSize: "20px", margin: "0 0 8px", color: T.gold }}>☄️ Best Ball+</h4>
            <p style={{ fontSize: "13px", color: T.textSoft, lineHeight: 1.6, marginBottom: "12px" }}>
              Loch-für-Loch-Wettbewerb. Jeder Spieler hat seine eigenen Punkte. <b>Keine Minus-Punkte.</b>
            </p>
            <div style={{ background: T.surface2, padding: "12px", borderRadius: "8px", marginBottom: "10px" }}>
              <div style={{ fontSize: "12px", color: T.gold, fontWeight: 700, marginBottom: "4px" }}>📋 Grund-Mechanik</div>
              <div style={{ fontSize: "11px", color: T.text, lineHeight: 1.5 }}>
                Pro Loch: bester Netto-SF holt <b>+1</b>. Bei Tie bekommen alle Tied +1.
                <br/><br/>
                <b>Beispiel:</b> Bodo SF 1 · Max SF 2 · Thorsten SF 2 · Wagner SF 0
                <br/>→ Max + Thorsten bekommen je +1
              </div>
            </div>
            <div style={{ background: T.surface2, padding: "12px", borderRadius: "8px", marginBottom: "10px" }}>
              <div style={{ fontSize: "12px", color: T.gold, fontWeight: 700, marginBottom: "4px" }}>⚖️ HCP-Modus</div>
              <div style={{ fontSize: "11px", color: T.text, lineHeight: 1.5 }}>
                <b>0.8-Regel (Standard):</b> Bester Spieler ist Baseline. Andere bekommen <b>(Diff × 0.8)</b> Strokes auf den schwersten Löchern. Macht's fair bei großer HCP-Spreizung.
                <br/><br/>
                <b>Beispiel:</b> Wagner CH 13, Thorsten CH 31 → Diff 18 → Thorsten bekommt 14 Strokes (statt 18)
                <br/><br/>
                <b>Voller HCP:</b> Jeder spielt mit vollem Course-HCP wie in einem normalen Stableford.
              </div>
            </div>
            <div style={{ background: T.surface2, padding: "12px", borderRadius: "8px", marginBottom: "10px" }}>
              <div style={{ fontSize: "12px", color: T.gold, fontWeight: 700, marginBottom: "4px" }}>🎯 Birdie-Bonus</div>
              <div style={{ fontSize: "11px", color: T.text, lineHeight: 1.5 }}>
                Brutto-Birdie (Score = Par-1) bringt zusätzlich <b>+1</b>. Wenn Bodo das Loch holt UND Birdie spielt: +2.
              </div>
            </div>
            <div style={{ background: T.surface2, padding: "12px", borderRadius: "8px", marginBottom: "16px" }}>
              <div style={{ fontSize: "12px", color: T.gold, fontWeight: 700, marginBottom: "4px" }}>🎀 Uschi auf Par-3</div>
              <div style={{ fontSize: "11px", color: T.text, lineHeight: 1.5 }}>
                Auf jedem Par-3 wird ein Uschi-Punkt gespielt — startet bei <b>1×</b>.
                <br/>• Niemand auf Green → <b>verbrennt</b>, nächstes Par-3 zählt 2× (oder mehr)
                <br/>• Closest auf Green + macht Par/Birdie → <b>holt alle aufgestauten Punkte</b>
                <br/>• Closest auf Green aber Bogey/schlechter → Punkt geht verloren, Carry resettet
              </div>
            </div>
            <button onClick={() => setShowBestBallExplain(false)} className="gold-hover" style={{ ...S.btnPrimary, width: "100%" }}>
              Verstanden
            </button>
          </div>
        </div>
      )}
    </>
  );


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
          {[["A", teamA, teamNameA], ["B", teamB, teamNameB]].map(([label, members, displayName]) => (
            <div key={label} style={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: "8px", padding: "10px", minHeight: "80px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <div style={{ ...S.eyebrow, color: label === "A" ? T.gold : T.sage, margin: 0 }}>
                  {displayName}
                </div>
                <button
                  onClick={() => {
                    const current = label === "A" ? (teams?.nameA || teamNameA) : (teams?.nameB || teamNameB);
                    const next = prompt(`Team-Name für ${displayName}:`, current);
                    if (next === null) return; // cancelled
                    const cleaned = next.trim();
                    setTeams(t => ({
                      ...t,
                      [label === "A" ? "nameA" : "nameB"]: cleaned || undefined,
                    }));
                  }}
                  aria-label="Team-Name bearbeiten"
                  style={{
                    background: "transparent", border: "none",
                    color: T.textDim, cursor: "pointer",
                    padding: "0 4px", fontSize: "11px",
                  }}>✏️</button>
              </div>
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

        {/* v47: TRIP-CONTEXT-CARD */}
        {(() => {
          const activeTrip = cfg.tripContext ? trips.find(t => t.id === cfg.tripContext.tripId) : null;
          const activeDay = activeTrip?.days?.find(d => d.dayNumber === cfg.tripContext?.dayNumber);
          const availableTrips = trips.filter(t => (t.days || []).length > 0);

          // Wenn keine Trips: Card nicht anzeigen
          if (availableTrips.length === 0 && !activeTrip) return null;

          return (
            <div style={{ ...S.card, marginBottom: "12px", borderColor: activeTrip ? `${T.gold}50` : T.line, background: activeTrip ? `${T.gold}10` : T.surface1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ ...S.eyebrow, color: activeTrip ? T.gold : T.textDim }}>
                  🏖️ Trip-Zuweisung
                </div>
                {activeTrip && (
                  <button
                    onClick={() => setCfg(c => ({ ...c, tripContext: null }))}
                    style={{ background: "transparent", border: "none", color: T.textDim, fontSize: "11px", cursor: "pointer", textDecoration: "underline" }}>
                    entfernen
                  </button>
                )}
              </div>

              {!activeTrip && (
                <>
                  <p style={{ fontSize: "11px", color: T.textDim, marginBottom: "10px", lineHeight: 1.5, fontStyle: "italic" }}>
                    Gehört diese Runde zu einem Trip? Dann werden die Spieler mit angepasstem HCP automatisch geladen.
                  </p>
                  <select
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const [tripId, dayNum] = e.target.value.split("::");
                      const trip = trips.find(t => t.id === tripId);
                      if (!trip) return;
                      const dayNumber = parseInt(dayNum);

                      // Spieler aus Trip übernehmen mit angepasstem HCP
                      const tripPlayers = (trip.players || []).map(tp => {
                        const adjustment = tp.hcpAdjustments?.[dayNumber] || 0;
                        const friend = friends.find(f => f.playerId === tp.playerId || normName(f.name) === normName(tp.name));
                        const realHcp = friend ? parseFloat(friend.hcp) || 0 : (parseFloat(tp.hcp) || 0);
                        const adjustedHcp = realHcp + adjustment;
                        return {
                          id: uid(),
                          playerId: tp.playerId,
                          name: tp.name,
                          hcp: adjustedHcp,
                          realHcp: realHcp,
                          tripAdjustment: adjustment,
                          teeName: "",
                        };
                      });
                      setPlayers(tripPlayers);
                      setCfg(c => ({ ...c, tripContext: { tripId, dayNumber } }));
                      e.target.value = "";
                    }}
                    style={{ ...S.input, fontSize: "13px", padding: "10px 12px" }}
                    defaultValue="">
                    <option value="">— kein Trip ausgewählt —</option>
                    {availableTrips.map(trip =>
                      (trip.days || []).map(day => (
                        <option key={`${trip.id}::${day.dayNumber}`} value={`${trip.id}::${day.dayNumber}`}>
                          🏖️ {trip.name} — Tag {day.dayNumber} ({fmtDate(day.date)})
                        </option>
                      ))
                    )}
                  </select>
                </>
              )}

              {activeTrip && activeDay && (
                <>
                  <div style={{ fontSize: "14px", color: T.gold, fontWeight: 700, marginBottom: "4px" }}>
                    {activeTrip.name} · Tag {activeDay.dayNumber}
                  </div>
                  <div style={{ fontSize: "11px", color: T.textSoft, marginBottom: "10px" }}>
                    {fmtDate(activeDay.date)} · {activeTrip.players?.length || 0} Spieler übernommen
                  </div>
                  {/* Spieler-Vorschau mit HCP-Adjustments */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "8px", background: T.surface2, borderRadius: "6px" }}>
                    {(activeTrip.players || []).map(tp => {
                      const adj = tp.hcpAdjustments?.[activeDay.dayNumber] || 0;
                      const friend = friends.find(f => f.playerId === tp.playerId || normName(f.name) === normName(tp.name));
                      const realHcp = friend ? parseFloat(friend.hcp) || 0 : (parseFloat(tp.hcp) || 0);
                      const adjusted = realHcp + adj;
                      return (
                        <div key={tp.playerId} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
                          <span style={{ flex: 1, color: T.text, fontWeight: 600 }}>{tp.name}</span>
                          <span className="mono" style={{ color: T.textSoft }}>HCP {realHcp}</span>
                          {adj !== 0 && (
                            <>
                              <span style={{ color: T.textDim }}>→</span>
                              <span className="mono" style={{ color: T.gold, fontWeight: 700 }}>{adjusted}</span>
                              <span style={{ fontSize: "10px", color: adj > 0 ? T.double : T.sage, fontWeight: 700 }}>
                                ({adj > 0 ? "+" : ""}{adj})
                              </span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p style={{ fontSize: "10px", color: T.textDim, marginTop: "8px", lineHeight: 1.4, fontStyle: "italic" }}>
                    Beim Speichern wird die Runde automatisch diesem Trip-Tag zugewiesen.
                  </p>
                </>
              )}
            </div>
          );
        })()}

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
            ? (
              <EmptyState icon="👤" title="Noch keine Spieler" sub="Füge Freunde hinzu oder tippe unten einen Namen ein." />
            )
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
                          {/* v35: Sim-HCP-Hint */}
                          {(() => {
                            const sim = computeSimHcp(p.name, rounds);
                            if (!sim?.hasEnoughData || Math.abs(sim.diff) < 1) return null;
                            return (
                              <span style={{
                                fontSize: "9px",
                                color: sim.diff > 0 ? T.double : T.sage,
                                background: sim.diff > 0 ? `${T.double}15` : `${T.sage}15`,
                                padding: "1px 5px", borderRadius: "3px", fontWeight: 600, letterSpacing: "0.04em",
                              }}
                              title={`Form-Trend aus letzten ${sim.roundsUsed} Runden: spielt aktuell wie HCP ${sim.simHcp}`}>
                                {sim.diff > 0 ? "📈" : "📉"} SIM {sim.simHcp}
                              </span>
                            );
                          })()}
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
          <button style={{ ...S.btnPrimary, flex: 2 }}
            onClick={() => {
              if (!cfg.clubName) {
                showUndoToast("⚠️ Wähle erst einen Club im Schritt 02", null);
                return;
              }
              if (players.length === 0) {
                showUndoToast("⚠️ Füge mindestens einen Spieler hinzu", null);
                return;
              }
              setShowDD(false);
              setView("holes");
            }}
            className="gold-hover">
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

          {/* v38: Mode toggle — größer, mit Icons, klarer */}
          <div style={{ display: "flex", background: T.surface1, border: `1px solid ${T.line}`, borderRadius: "14px", padding: "4px", marginBottom: "14px", gap: "4px" }}>
            {[
              { k: "batch", l: "Tabelle",  icon: "📋", sub: "Alle Löcher auf einmal" },
              { k: "live",  l: "Live",     icon: "🎯", sub: "Loch für Loch" },
            ].map(({k,l,icon,sub}) => (
              <button key={k} onClick={() => setScoringMode(k)}
                style={{
                  flex: 1, padding: "12px 10px",
                  background: scoringMode === k ? T.gold : "transparent",
                  color: scoringMode === k ? T.canvas : T.textSoft,
                  border: "none", borderRadius: "10px",
                  fontWeight: scoringMode === k ? 700 : 500,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "3px",
                  transition: "all 0.2s ease",
                  cursor: "pointer",
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "18px" }}>{icon}</span>
                  <span style={{ fontSize: "14px" }}>{l}</span>
                </div>
                <span style={{ fontSize: "9px", opacity: 0.75, fontWeight: 500, letterSpacing: "0.02em" }}>{sub}</span>
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

          {/* Race status banner — secured win or open race */}
          {(() => {
            // Only show in stableford mode for now (Uschi has its own logic)
            if (gameMode !== "stableford") return null;
            const ranked = players.map(p => ({ p, ...getStats(p) })).sort((a, b) => b.sfNT - a.sfNT);
            // Compute holes left: max holes minus the highest hole index that has any score across players
            let maxScored = 0;
            players.forEach(p => {
              holes.forEach((_, i) => {
                const g = scores[p.id]?.[i];
                if (typeof g === "number" || g === null) maxScored = Math.max(maxScored, i + 1);
              });
            });
            const holesLeft = Math.max(0, holes.length - maxScored);
            // Don't show before the round starts or when fully done
            if (maxScored < 3 || holesLeft === 0) return null;
            const race = getRaceStatus(ranked, holesLeft);
            if (race.status === "secured") {
              return (
                <div style={{
                  marginTop: "12px", marginBottom: "4px",
                  padding: "12px 16px",
                  background: `linear-gradient(135deg, ${T.gold}30 0%, ${T.gold}15 100%)`,
                  border: `1.5px solid ${T.gold}`,
                  borderRadius: "12px",
                  display: "flex", alignItems: "center", gap: "12px",
                }}>
                  <span style={{ fontSize: "26px" }}>🏆</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "11px", color: T.gold, fontWeight: 700, letterSpacing: "0.05em", marginBottom: "2px" }}>
                      SIEG MATHEMATISCH FIX
                    </div>
                    <div style={{ fontSize: "14px", color: T.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {race.winnerName} ist nicht mehr einholbar
                    </div>
                    <div style={{ fontSize: "10px", color: T.textSoft, marginTop: "1px" }}>
                      {race.leadDiff} SF Vorsprung · {race.holesLeft} {race.holesLeft === 1 ? "Loch" : "Löcher"} verbleibend
                    </div>
                  </div>
                </div>
              );
            }
            if (race.status === "open") {
              return (
                <div style={{
                  marginTop: "12px", marginBottom: "4px",
                  padding: "10px 14px",
                  background: `${T.double}15`,
                  border: `1.5px solid ${T.double}80`,
                  borderRadius: "12px",
                  display: "flex", alignItems: "center", gap: "10px",
                }}>
                  <span style={{ fontSize: "20px" }}>🔥</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "11px", color: T.double, fontWeight: 700, letterSpacing: "0.05em", marginBottom: "2px" }}>
                      OFFENES RENNEN
                    </div>
                    <div style={{ fontSize: "12px", color: T.textSoft }}>
                      Nur {race.leadDiff} SF Differenz · {race.holesLeft} Löcher übrig — alles möglich!
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* TensionBar — shows the gap between top 2 contestants once 3+ holes scored */}
          {(() => {
            // Compute holes played
            let maxScored = 0;
            players.forEach(p => {
              holes.forEach((_, i) => {
                const g = scores[p.id]?.[i];
                if (typeof g === "number" || g === null) maxScored = Math.max(maxScored, i + 1);
              });
            });
            if (maxScored < 3 || players.length < 2) return null;

            const isTeamMode = gameMode === "uschi-team" && teams?.A?.length === 2 && teams?.B?.length === 2 && teamResult;
            if (isTeamMode) {
              // Team mode: compare team A vs team B
              return (
                <div style={{ ...S.card, marginTop: "12px", padding: "10px 14px" }}>
                  <TensionBar
                    topName={teamResult.A >= teamResult.B ? teamNameA : teamNameB}
                    topScore={Math.max(teamResult.A, teamResult.B)}
                    secondName={teamResult.A >= teamResult.B ? teamNameB : teamNameA}
                    secondScore={Math.min(teamResult.A, teamResult.B)}
                    unit="Pkt"/>
                </div>
              );
            }

            // Single mode (Stableford or Uschi-Single): top 2 players
            let ranked;
            if (gameMode === "stableford") {
              ranked = players.map(p => ({ p, score: getStats(p).sfNT })).sort((a, b) => b.score - a.score);
            } else if (uschiResult) {
              ranked = players.map(p => ({
                p,
                score: uschiResult.totals?.[p.id]?.total ?? 0,
              })).sort((a, b) => b.score - a.score);
            } else {
              return null;
            }
            if (ranked.length < 2) return null;
            return (
              <div style={{ ...S.card, marginTop: "12px", padding: "10px 14px" }}>
                <TensionBar
                  topName={ranked[0].p.name}
                  topScore={ranked[0].score}
                  secondName={ranked[1].p.name}
                  secondScore={ranked[1].score}
                  unit={gameMode === "stableford" ? "SF" : "Pkt"}/>
              </div>
            );
          })()}

          {scoringMode === "batch" ? renderBatchMode() : renderLiveMode()}

          {/* Live totals card */}
          <div style={{ ...S.card, marginTop: "14px", marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ ...S.eyebrow }}>Zwischenstand</div>
              {gameMode !== "stableford" && uschiResult && (
                <div style={{ fontSize: "9px", color: T.gold, letterSpacing: "0.08em", fontWeight: 600 }}>🎯 USCHI-MODUS</div>
              )}
            </div>
            {/* Sort by uschi/bestball points if in those modes, else by sf netto */}
            {(() => {
              // v50: Best Ball+ liefert eigene "totals" wie Uschi
              const pointsSource = gameMode === "bestball-plus" ? bestBallResult : uschiResult;
              const withStats = players.map(p => ({
                p, s: getStats(p),
                uschiTotal: pointsSource?.totals?.[p.id]?.total ?? 0,
              }));
              const useUschiSort = (gameMode !== "stableford" && uschiResult) || (gameMode === "bestball-plus" && bestBallResult);
              const sorted = useUschiSort
                ? [...withStats].sort((a, b) => b.uschiTotal - a.uschiTotal)
                : [...withStats].sort((a, b) => b.s.sfNT - a.s.sfNT);
              return sorted.map((item, i) => {
                const p = item.p;
                const s = item.s;
                // v50: Best Ball+ wird wie Uschi behandelt für Crown + uschiTotal-Anzeige
                const isUschi = (gameMode !== "stableford" && uschiResult) || (gameMode === "bestball-plus" && bestBallResult);
                const uschiTotal = item.uschiTotal;
                return (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: i < sorted.length - 1 ? `1px solid ${T.line}` : "none" }}>
                    <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: `${T.gold}20`, border: `1px solid ${T.gold}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: T.gold, flexShrink: 0 }}>
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "14px", color: T.text, display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        {p.name}
                        {s.tee?.teeName && <TeeDot name={s.tee.teeName} size={8} />}
                        {i === 0 && isUschi && <span style={{ fontSize: "14px" }}>👑</span>}
                        {/* v47: Trip-Adjustment-Badge */}
                        {p.tripAdjustment && p.tripAdjustment !== 0 && (
                          <span style={{
                            fontSize: "9px", fontWeight: 700, letterSpacing: "0.04em",
                            color: p.tripAdjustment > 0 ? T.double : T.sage,
                            background: p.tripAdjustment > 0 ? `${T.double}15` : `${T.sage}15`,
                            padding: "1px 5px", borderRadius: "3px",
                          }}>
                            TRIP {p.tripAdjustment > 0 ? "+" : ""}{p.tripAdjustment}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "11px", color: T.textSoft }}>
                        {isUschi ? (
                          <>SF <span className="mono">{s.sfNT}</span> · Brutto <span className="mono">{s.bT || "—"}{s.strichCount > 0 ? "*" : ""}</span> · Schläge <span className="mono" style={{ color: T.gold }}>{s.totalStr || "—"}</span></>
                        ) : (
                          <>Vorgabe <span className="mono">{s.ph}</span> · Brutto <span className="mono">{s.bT || "—"}{s.strichCount > 0 ? "*" : ""}</span> · Schläge <span className="mono" style={{ color: T.gold }}>{s.totalStr || "—"}</span></>
                        )}
                      </div>
                      {/* v48: Live-Pace-Anzeige (ab Loch 5) */}
                      {!isUschi && (() => {
                        const playedHoles = s.hr.filter(h => isValid(h.g) || isStrich(h.g)).length;
                        if (playedHoles < 5) return null;
                        const projectedSf = Math.round(s.sfNT / playedHoles * 18);
                        const sim = computeSimHcp(p.playerId || p.name, rounds);
                        const targetSf = 36; // Auf-HCP-gespielt = 36 SF
                        const trend = projectedSf > targetSf ? "📈" : projectedSf < targetSf - 5 ? "📉" : "→";
                        const trendColor = projectedSf > targetSf ? T.sage : projectedSf < targetSf - 5 ? T.double : T.textDim;
                        return (
                          <div style={{ fontSize: "10px", color: T.textDim, marginTop: "2px", fontStyle: "italic" }}>
                            {trend} <span style={{ color: trendColor, fontWeight: 600 }}>Pace {projectedSf}</span> SF
                            {sim?.hasEnoughData && (
                              <> · ⌀ <span className="mono">{Math.round(sim.avgSf)}</span></>
                            )}
                          </div>
                        );
                      })()}
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
                          {/* v45: SF Brutto direkt drunter */}
                          <div className="mono" style={{ fontSize: "13px", fontWeight: 600, color: T.textSoft, lineHeight: 1, marginTop: "4px" }}>{s.sfBT}</div>
                          <div style={{ fontSize: "8px", color: T.textDim, marginTop: "1px" }}>BRUTTO</div>
                          {/* v47: Real-HCP (offizieller HCP, ohne Trip-Adjustment) */}
                          {typeof s.realSfNT === "number" && s.realSfNT !== s.sfNT && (
                            <>
                              <div className="mono" style={{ fontSize: "11px", fontWeight: 600, color: T.textDim, lineHeight: 1, marginTop: "4px" }}>{s.realSfNT}</div>
                              <div style={{ fontSize: "8px", color: T.textDim, marginTop: "1px" }} title="Mit deinem offiziellen HCP, ohne Trip-Adjustment">REAL</div>
                            </>
                          )}
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

            {/* v50: Best Ball+ Standings (wie Uschi-Logik, ohne Minus) */}
            {gameMode === "bestball-plus" && bestBallResult && (
              <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px solid ${T.lineStrong}` }}>
                <div style={{ fontSize: "9px", color: T.textDim, letterSpacing: "0.08em", fontWeight: 600, marginBottom: "6px" }}>
                  ☄️ BEST BALL+ · LOCH-FÜR-LOCH
                </div>
                {/* Aktueller Carry-Hinweis */}
                {bestBallConfig.uschiBonus && bestBallResult.carry > 1 && (
                  <div style={{ fontSize: "10px", color: T.gold, marginBottom: "8px", padding: "6px 10px", background: `${T.gold}10`, borderRadius: "6px", border: `1px solid ${T.gold}40` }}>
                    🎀 Aktueller Uschi-Carry: <b>{bestBallResult.carry}×</b> beim nächsten Par-3
                  </div>
                )}
                {/* Ranking */}
                {[...players].sort((a, b) => (bestBallResult.totals[b.id]?.total || 0) - (bestBallResult.totals[a.id]?.total || 0)).map((p, idx) => {
                  const t = bestBallResult.totals[p.id] || {};
                  return (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 0", fontSize: "11px" }}>
                      <span style={{ width: "20px", color: idx === 0 ? T.gold : T.textDim, fontWeight: 700 }}>
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`}
                      </span>
                      <span style={{ flex: 1, color: T.text, fontWeight: 600 }}>{p.name}</span>
                      <span style={{ fontSize: "9px", color: T.textDim }}>
                        {t.best || 0}🏆
                        {t.birdies > 0 && ` · ${t.birdies}🎯`}
                        {t.uschi > 0 && ` · ${t.uschi}🎀`}
                      </span>
                      <span className="mono" style={{ color: T.gold, fontWeight: 700, minWidth: "30px", textAlign: "right" }}>
                        {t.total || 0}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* v38: Action-Buttons in 2 Zeilen — verhindert horizontales Scrollen */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
            <button
              style={{ ...S.btnSecondary, flex: 1, padding: "12px 8px", fontSize: "13px" }}
              onClick={() => setView("holes")}>← Löcher</button>
            <button
              onClick={undoLastScore}
              disabled={!lastScoreEntry}
              style={{
                ...S.btnSecondary, flex: 1, padding: "12px 8px", fontSize: "13px",
                opacity: lastScoreEntry ? 1 : 0.4,
                cursor: lastScoreEntry ? "pointer" : "not-allowed",
              }}
              title={lastScoreEntry ? "Letzte Score-Eingabe rückgängig" : "Kein Score zum Rückgängigmachen"}>
              ↶ Zurück
            </button>
            <button
              onClick={async () => { await saveRound(); setView("home"); showUndoToast("⏸️ Runde pausiert — taucht als 'läuft' auf der Home-Seite auf", null); }}
              style={{
                ...S.btnSecondary, flex: 1, padding: "12px 8px", fontSize: "13px",
                background: `${T.gold}15`, color: T.gold,
                border: `1px solid ${T.gold}50`,
              }}
              title="Runde wird automatisch gespeichert und kann später fortgesetzt werden">
              ⏸ Pause
            </button>
          </div>
          <button
            style={{ ...S.btnPrimary, width: "100%" }}
            className="gold-hover"
            onClick={() => {
              const hasAnyScore = Object.values(scores || {}).some(ps => Object.values(ps || {}).some(v => v !== undefined));
              if (!hasAnyScore) {
                showUndoToast("⚠️ Trage erst ein paar Scores ein bevor du zur Auswertung gehst", null);
                return;
              }
              saveRound();
              setView("results");
            }}>
            Auswertung →
          </button>
        </div>
      </div>
    );
  };

  // Batch mode (scorecard table)
  const renderBatchMode = () => (
    <>
      <div style={{ padding: "10px 14px", background: `${T.gold}10`, border: `1px solid ${T.gold}30`, borderRadius: "10px", marginBottom: "14px", fontSize: "12px", color: T.gold, display: "flex", alignItems: "center", gap: "8px" }}>
        <span>👆</span>
        <span>Tippen → Score-Pad · Lang drücken → Strich (Pick-Up)</span>
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
            {holes.map((hole,i) => {
              // Highlight the current/most-recently-edited hole
              const isCurrentHole = (padOpen?.holeIdx === i) || (currentHole === i && padOpen === null);
              const rowBg = isCurrentHole ? `${T.gold}10` : "transparent";
              const rowBorder = isCurrentHole ? `${T.gold}40` : T.line;
              return (
              <tr key={i} style={{ borderBottom: `1px solid ${rowBorder}`, background: rowBg }}>
                <td style={{
                  padding: "8px 12px", fontSize: "13px", fontWeight: 700,
                  color: isCurrentHole ? T.gold : T.gold,
                  position: "sticky", left: 0,
                  background: isCurrentHole ? `${T.gold}15` : T.surface1,
                  zIndex: 1, borderRight: `1px solid ${rowBorder}`,
                }}>
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
                  const display = isStrich(g) ? `(${capValue(hole.par, hs)})` : isValid(g) ? g : "—";
                  return (
                    <td key={p.id} style={{ padding: "5px 6px", textAlign: "center" }}>
                      <button
                        onClick={() => {
                          if (longPressTriggered.current) {
                            longPressTriggered.current = false;
                            return;
                          }
                          setCurrentHole(i);
                          setPadOpen({ playerId: p.id, holeIdx: i });
                        }}
                        onTouchStart={() => {
                          longPressTriggered.current = false;
                          longPressTimerRef.current = setTimeout(() => {
                            longPressTriggered.current = true;
                            if (navigator.vibrate) navigator.vibrate(50);
                            setScore(p.id, i, STRICH);
                            showUndoToast(`✗ ${p.name}: Strich · Loch ${i + 1}`,
                              () => clearScore(p.id, i), "Rückgängig");
                          }, 600);
                        }}
                        onTouchEnd={() => clearTimeout(longPressTimerRef.current)}
                        onTouchCancel={() => clearTimeout(longPressTimerRef.current)}
                        onTouchMove={() => clearTimeout(longPressTimerRef.current)}
                        onMouseDown={() => {
                          longPressTriggered.current = false;
                          longPressTimerRef.current = setTimeout(() => {
                            longPressTriggered.current = true;
                            setScore(p.id, i, STRICH);
                            showUndoToast(`✗ ${p.name}: Strich · Loch ${i + 1}`,
                              () => clearScore(p.id, i), "Rückgängig");
                          }, 600);
                        }}
                        onMouseUp={() => clearTimeout(longPressTimerRef.current)}
                        onMouseLeave={() => clearTimeout(longPressTimerRef.current)}
                        title="Tippen für Pad · Lang drücken für Strich"
                        style={{
                          position: "relative", width: "56px", height: "40px",
                          background: isEmpty ? T.surface1 : `${col}12`,
                          color: col,
                          border: `1px solid ${isEmpty ? T.line : col + "50"}`,
                          borderRadius: "8px", fontSize: "16px",
                          fontWeight: isEmpty ? 400 : 700,
                          fontFamily: "JetBrains Mono, monospace",
                          cursor: "pointer",
                          userSelect: "none",
                          WebkitUserSelect: "none",
                          WebkitTouchCallout: "none",
                        }}>
                        {hs > 0 && !isEmpty && (
                          <span style={{ position: "absolute", top: "-4px", right: "-3px", fontSize: "8px", fontWeight: 700, background: T.gold, color: T.canvas, borderRadius: "4px", padding: "1px 3px", lineHeight: 1 }}>+{hs}</span>
                        )}
                        {hasLady(p.id, i) && (
                          <span style={{ position: "absolute", bottom: "-3px", left: "-3px", fontSize: "10px", lineHeight: 1 }} title="Lady">👯</span>
                        )}
                        {display}
                      </button>
                    </td>
                  );
                })}
              </tr>
              );
            })}
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
          <button
            onClick={() => setShowHoleJump(true)}
            style={{
              flex: 1, textAlign: "center",
              background: "transparent", border: "none",
              padding: "4px 0", cursor: "pointer",
              borderRadius: "10px",
            }}
            title="Tippen zum Springen">
            <div style={{ ...S.eyebrow, fontSize: "10px" }}>Loch · tippen zum Springen</div>
            <div className="serif mono" style={{ fontSize: "36px", color: T.gold, fontWeight: 400, lineHeight: 1 }}>
              {currentHole + 1}<span style={{ color: T.textDim, fontSize: "18px" }}>/{cfg.numHoles}</span>
            </div>
          </button>
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

                <button
                  onClick={() => {
                    // Long-press wurde bereits gehandelt → click ignorieren wenn long-press getriggered
                    if (longPressTriggered.current) {
                      longPressTriggered.current = false;
                      return;
                    }
                    // Correction mode: entering this hole when it's already fully scored?
                    const isFullyScored = players.every(pp => {
                      const g = scores[pp.id]?.[currentHole];
                      return isValid(g) || isStrich(g);
                    });
                    setPadOpen({ playerId: p.id, holeIdx: currentHole, correctionMode: isFullyScored });
                  }}
                  onTouchStart={() => {
                    longPressTriggered.current = false;
                    longPressTimerRef.current = setTimeout(() => {
                      longPressTriggered.current = true;
                      // Haptic via vibrate-API
                      if (navigator.vibrate) navigator.vibrate(50);
                      setScore(p.id, currentHole, STRICH);
                      showUndoToast(`✗ ${p.name}: Strich · Loch ${currentHole + 1}`,
                        () => clearScore(p.id, currentHole), "Rückgängig");
                    }, 600);
                  }}
                  onTouchEnd={() => clearTimeout(longPressTimerRef.current)}
                  onTouchCancel={() => clearTimeout(longPressTimerRef.current)}
                  onTouchMove={() => clearTimeout(longPressTimerRef.current)}
                  onMouseDown={() => {
                    longPressTriggered.current = false;
                    longPressTimerRef.current = setTimeout(() => {
                      longPressTriggered.current = true;
                      setScore(p.id, currentHole, STRICH);
                      showUndoToast(`✗ ${p.name}: Strich · Loch ${currentHole + 1}`,
                        () => clearScore(p.id, currentHole), "Rückgängig");
                    }, 600);
                  }}
                  onMouseUp={() => clearTimeout(longPressTimerRef.current)}
                  onMouseLeave={() => clearTimeout(longPressTimerRef.current)}
                  title="Tippen für Pad · Lang drücken für Strich"
                  style={{
                    width: "100%", height: "64px",
                    background: isEmpty ? T.surface2 : `${col}15`,
                    color: col,
                    border: `1.5px solid ${isEmpty ? T.line : col + "60"}`,
                    borderRadius: "12px", fontSize: "32px",
                    fontWeight: 700,
                    fontFamily: "JetBrains Mono, monospace",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2px",
                    cursor: "pointer",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    WebkitTouchCallout: "none",
                  }}>
                  <span>{isStrich(g) ? `(${capValue(hole.par, hs)})` : isValid(g) ? g : "Tippen"}</span>
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
    // Reserve space for ladies section if any ladies recorded
    const totalLadiesPreview = Object.values(ladies || {}).reduce((s, arr) => s + (arr?.length || 0), 0);
    const playersWithLadies = players.filter(p => (ladies[p.id] || []).length > 0).length;
    const ladiesH = totalLadiesPreview > 0 ? 80 + playersWithLadies * 32 : 0;
    const H = headerH + teamBlockH + rowH * players.length + footerH + (isUschi ? 140 : 0) + ladiesH;

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

    // Ladies section — only if any ladies recorded in this round
    const totalLadies = Object.values(ladies || {}).reduce((s, arr) => s + (arr?.length || 0), 0);
    if (totalLadies > 0) {
      // Build per-player breakdown
      const ladiesPerPlayer = players
        .map(p => ({ name: p.name, count: (ladies[p.id] || []).length }))
        .filter(x => x.count > 0)
        .sort((a, b) => b.count - a.count);

      ctx.fillStyle = "#3a4a40";
      ctx.fillRect(70, y + 14, W - 140, 1);
      y += 40;
      ctx.fillStyle = "#c9a85c";
      ctx.font = "600 22px 'Inter', sans-serif";
      ctx.fillText(`👯 LADY-TRADITION · ${totalLadies} ${totalLadies === 1 ? "BIER" : "BIERE"}`, 70, y);
      y += 40;
      ladiesPerPlayer.forEach(pp => {
        ctx.fillStyle = "#cdd5c8";
        ctx.font = "500 22px 'Inter', sans-serif";
        ctx.fillText(`${pp.name}`, 70, y);
        ctx.textAlign = "right";
        ctx.fillStyle = "#c9a85c";
        ctx.fillText(`${pp.count}× 🍺`, W - 70, y);
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
                  <div style={{ fontWeight: 700, fontSize: "15px", color: T.text, display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    {s.p.name}
                    {s.tee?.teeName && <TeeDot name={s.tee.teeName} size={9} />}
                    {/* v47: Trip-Badge */}
                    {s.p.tripAdjustment && s.p.tripAdjustment !== 0 && (
                      <span style={{
                        fontSize: "9px", fontWeight: 700, letterSpacing: "0.04em",
                        color: s.p.tripAdjustment > 0 ? T.double : T.sage,
                        background: s.p.tripAdjustment > 0 ? `${T.double}15` : `${T.sage}15`,
                        padding: "1px 5px", borderRadius: "3px",
                      }}>
                        TRIP {s.p.tripAdjustment > 0 ? "+" : ""}{s.p.tripAdjustment}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "11px", color: T.textSoft, marginTop: "1px" }}>
                    HCP <span className="mono">{s.p.hcp}</span> · Vorgabe <span className="mono">{s.ph}</span> · Brutto <span className="mono">{s.bT || "—"}{s.strichCount > 0 ? "*" : ""}</span> · Schläge <span className="mono" style={{ color: T.gold }}>{s.totalStr || "—"}</span>
                  </div>
                  {/* v47: Real-HCP-Zeile (offizieller HCP, ohne Trip-Adjustment) */}
                  {typeof s.realSfNT === "number" && s.realSfNT !== s.sfNT && (
                    <div style={{ fontSize: "10px", color: T.textDim, marginTop: "2px", fontStyle: "italic" }}>
                      🌐 Mit offiziellem HCP <span className="mono">{s.p.realHcp}</span>: <span className="mono" style={{ color: T.text, fontWeight: 600 }}>{s.realSfNT} SF</span> · Vorgabe <span className="mono">{s.realPh}</span>
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="mono serif" style={{ fontSize: "32px", fontWeight: 700, color: T.gold, lineHeight: 1 }}>{s.sfNT}</div>
                  <div style={{ fontSize: "9px", color: T.textDim, marginTop: "2px" }}>NETTO</div>
                  {/* v45: SF Brutto */}
                  <div className="mono" style={{ fontSize: "14px", fontWeight: 600, color: T.textSoft, marginTop: "4px", lineHeight: 1 }}>{s.sfBT}</div>
                  <div style={{ fontSize: "9px", color: T.textDim, marginTop: "1px" }}>BRUTTO</div>
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
                            <td className="mono" style={{ padding: "6px 7px", textAlign: "center", fontWeight: 700, color: col }}>{isStrich(h.g) ? `(${capValue(holes[i].par, h.hs)})` : isValid(h.g) ? h.g : "—"}</td>
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

          {/* TensionBar in uschi review — top 2 standing */}
          {liveStanding && liveStanding.players.length >= 2 && (() => {
            const isTeamMode = gameMode === "uschi-team" && teams?.A?.length === 2 && teams?.B?.length === 2 && teamResult;
            if (isTeamMode) {
              return (
                <div style={{ ...S.card, padding: "10px 14px", marginBottom: "14px" }}>
                  <TensionBar
                    topName={teamResult.A >= teamResult.B ? teamNameA : teamNameB}
                    topScore={Math.max(teamResult.A, teamResult.B)}
                    secondName={teamResult.A >= teamResult.B ? teamNameB : teamNameA}
                    secondScore={Math.min(teamResult.A, teamResult.B)}
                    unit="Pkt"/>
                </div>
              );
            }
            const top = liveStanding.players[0];
            const second = liveStanding.players[1];
            return (
              <div style={{ ...S.card, padding: "10px 14px", marginBottom: "14px" }}>
                <TensionBar
                  topName={top.name}
                  topScore={top.points}
                  secondName={second.name}
                  secondScore={second.points}
                  unit="Pkt"/>
              </div>
            );
          })()}

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
              {/* v50: Loch-Längen pro Tee */}
              {hole.lengths && Object.keys(hole.lengths).length > 0 && (
                <div style={{ fontSize: "9px", color: T.textDim, marginTop: "4px", display: "flex", gap: "5px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                  {Object.entries(hole.lengths).map(([teeName, m]) => (
                    <span key={teeName} style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}>
                      <TeeDot name={teeName} size={6} />
                      <span className="mono">{m}m</span>
                    </span>
                  ))}
                </div>
              )}
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

          {/* Lady toggle — German tradition: did the player pass the women's tee? */}
          {(() => {
            const ladyOn = hasLady(padOpen.playerId, padOpen.holeIdx);
            return (
              <button
                onClick={() => toggleLady(padOpen.playerId, padOpen.holeIdx)}
                style={{
                  width: "100%", marginTop: "10px",
                  padding: "10px",
                  background: ladyOn ? `${T.gold}25` : T.surface2,
                  color: ladyOn ? T.gold : T.textSoft,
                  border: `1.5px solid ${ladyOn ? T.gold : T.line}`,
                  borderRadius: "12px",
                  fontSize: "13px", fontWeight: 600,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                }}
                title="Lady = Spieler hat den Damen-Abschlag nicht passiert (Bier-Tradition)">
                <span style={{ fontSize: "16px" }}>👯</span>
                <span>{ladyOn ? "LADY ✓ (1 Bier)" : "Lady markieren"}</span>
              </button>
            );
          })()}

          <button onClick={() => setPadOpen(null)} style={{ ...S.btnSecondary, width: "100%", fontSize: "13px", padding: "10px", marginTop: "8px" }}>Schließen</button>
          {/* Mac/desktop keyboard hint — only shown on devices with physical keyboard (heuristic) */}
          <div className="kbhint" style={{
            marginTop: "8px", fontSize: "10px", color: T.textDim, textAlign: "center", lineHeight: 1.5,
            display: "none",
          }}>
            ⌨ Tasten <span style={{ color: T.textSoft, fontFamily: "JetBrains Mono, monospace" }}>0–9</span> für Score · <span style={{ color: T.textSoft, fontFamily: "JetBrains Mono, monospace" }}>S</span> für Strich · <span style={{ color: T.textSoft, fontFamily: "JetBrains Mono, monospace" }}>⌫</span> löschen · <span style={{ color: T.textSoft, fontFamily: "JetBrains Mono, monospace" }}>Esc</span> schließen
          </div>
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
      showUndoToast("⚠️ Live-Ticker braucht Cloud-Sync — bitte erst in Settings → Cloud Sync aktivieren", null);
      return;
    }
    // v42: Pop-Up wenn keine Spieler/Scores
    if (players.length === 0) {
      showUndoToast("⚠️ Füge erst Spieler hinzu bevor du den Live-Ticker startest", null);
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
      ladies,
      clubName: cfg.clubName,
      // Tag this live entry with the user's sync code so that only
      // friends with the same sync code can see it on their home screen.
      syncCode: syncCode || null,
      // v40: Scorer-Lock — dieses Gerät übernimmt Schreib-Verantwortung
      scorerId: deviceId,
      scorerName: ownerProfile?.name || "Anonymes Gerät",
      scorerSince: new Date().toISOString(),
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
      return { clubName, avgSF: me.avgSF, bestSF: me.bestSF, roundsPlayed: me.roundsPlayed, bestHole, worstHole, strichCount: me.strichCount, ladiesTotal: me.ladiesTotal || 0 };
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
                  {c.ladiesTotal > 0 && <span style={{ color: T.gold }}>👯 {c.ladiesTotal}</span>}
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
            {hole.ladyCount > 0 && <span style={{ color: T.gold, marginLeft: "8px" }}>· 👯 {hole.ladyCount} Ladies</span>}
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

          {/* 🎯 v34: Total Strokes pro Spieler */}
          {analysis.totalStrokesPerPlayer && analysis.totalStrokesPerPlayer.length > 0 && (
            <div style={{ ...S.card, padding: "12px 14px", marginBottom: "14px" }}>
              <div style={{ ...S.eyebrow, marginBottom: "10px" }}>🎯 Schläge gesamt</div>
              {analysis.totalStrokesPerPlayer.map((tp, i) => (
                <div key={tp.playerName} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 0", borderTop: i > 0 ? `1px solid ${T.line}` : "none" }}>
                  <span className="mono" style={{ fontSize: "11px", color: T.textDim, minWidth: "20px" }}>{i + 1}.</span>
                  <span style={{ flex: 1, fontSize: "13px", color: T.text, fontWeight: 600 }}>{tp.playerName}</span>
                  <span className="mono" style={{ fontSize: "16px", fontWeight: 700, color: T.gold }}>{tp.total}</span>
                </div>
              ))}
              <p style={{ fontSize: "10px", color: T.textDim, marginTop: "8px", lineHeight: 1.4, fontStyle: "italic" }}>
                Striche zählen mit Pick-Up-Wert (Par + Vorgabe + 2).
              </p>
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

          {/* Ladies overview — only shown if any ladies recorded */}
          {(() => {
            const rLadies = round.ladies || {};
            const totalLadies = Object.values(rLadies).reduce((s, arr) => s + (arr?.length || 0), 0);
            if (totalLadies === 0) return null;
            // Per-player count
            const perPlayer = (round.players || []).map(p => ({
              name: p.name,
              count: (rLadies[p.id] || []).length,
              holes: rLadies[p.id] || [],
            })).filter(x => x.count > 0).sort((a, b) => b.count - a.count);
            return (
              <div style={{ ...S.card, padding: "14px", marginBottom: "10px" }}>
                <div style={{ ...S.eyebrow, marginBottom: "10px", color: T.gold }}>
                  👯 Lady-Tradition · {totalLadies} {totalLadies === 1 ? "Bier" : "Biere"}
                </div>
                {perPlayer.map(pp => (
                  <div key={pp.name} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 0", borderBottom: `1px solid ${T.line}`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: "14px" }}>👯</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: T.text }}>{pp.name}</div>
                        <div style={{ fontSize: "10px", color: T.textDim, marginTop: "2px" }}>
                          Loch {pp.holes.map(h => h + 1).join(", ")}
                        </div>
                      </div>
                    </div>
                    <div className="mono" style={{ fontSize: "16px", fontWeight: 700, color: T.gold }}>
                      {pp.count} 🍺
                    </div>
                  </div>
                ))}
                <p style={{ fontSize: "10px", color: T.textDim, marginTop: "10px", lineHeight: 1.5, fontStyle: "italic" }}>
                  Lady = Tee-Shot kommt nicht über den Damen-Abschlag. Die alte Tradition: eine Runde Bier zahlen.
                </p>
              </div>
            );
          })()}

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

  // ═══════════════════════════════════════════════════════════════════════════
  // IN-APP LIVE VIEWER MODAL — shows live round data inline, replaces opening
  // /live.html in a new tab/window which got stuck in PWA WebView.
  // Auto-refreshes every 30 seconds while open.
  // ═══════════════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════════════
  // BACKUP RESTORE MODAL — list of all available backups with preview + restore
  // ═══════════════════════════════════════════════════════════════════════════
  // ── v37: Stat-Drilldown — zeigt alle Vorkommen einer Stat-Kategorie ──
  const renderStatDrilldown = () => {
    if (!statDrilldown) return null;
    const { type, items, label, icon, color, playerName } = statDrilldown;
    // Sortiere: neueste Runden zuerst, innerhalb einer Runde nach Loch
    const sorted = [...(items || [])].sort((a, b) => {
      const da = new Date(a.date || 0).getTime();
      const db = new Date(b.date || 0).getTime();
      if (db !== da) return db - da;
      return a.holeIdx - b.holeIdx;
    });
    // Gruppiere nach Datum + Club
    const groups = {};
    sorted.forEach(item => {
      const key = `${item.date}::${item.clubName}`;
      if (!groups[key]) groups[key] = { date: item.date, clubName: item.clubName, entries: [] };
      groups[key].entries.push(item);
    });
    const groupArr = Object.values(groups);
    return (
      <div onClick={() => setStatDrilldown(null)}
        style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1150, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div onClick={e => e.stopPropagation()} className="slide-up"
          style={{ width: "100%", maxWidth: "520px", background: T.surface1, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", border: `1px solid ${T.line}`, padding: "20px 16px 28px", maxHeight: "92vh", overflowY: "auto" }}>
          <SwipeHandle onClose={() => setStatDrilldown(null)} />
          <h3 className="serif" style={{ fontSize: "22px", margin: "0 0 4px", color: T.text }}>
            {icon} {playerName}s {label}
          </h3>
          <p style={{ fontSize: "11px", color: T.textDim, marginBottom: "16px", lineHeight: 1.5 }}>
            {sorted.length === 0
              ? "Noch keine Einträge in dieser Kategorie."
              : `${sorted.length} ${sorted.length === 1 ? "Eintrag" : "Einträge"} insgesamt · gruppiert nach Runde`}
          </p>

          {sorted.length === 0 ? (
            <EmptyState icon={icon} title={`Keine ${label}`} sub={`${playerName} hat in den aufgezeichneten Runden noch keine ${label.toLowerCase()} eingetragen.`} />
          ) : (
            groupArr.map((g, gi) => (
              <div key={gi} style={{ ...S.card, padding: "12px 14px", marginBottom: "10px" }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: T.text, marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{g.clubName}</span>
                  <span style={{ fontSize: "10px", color: T.textDim, fontWeight: 400 }}>{fmtDate(g.date)}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {g.entries.map((e, ei) => (
                    <div key={ei} style={{
                      background: `${color}15`,
                      border: `1px solid ${color}40`,
                      borderRadius: "8px",
                      padding: "5px 9px",
                      fontSize: "11px",
                      color: T.text,
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}>
                      <span style={{ color: T.gold, fontWeight: 700 }}>L{e.holeIdx + 1}</span>
                      <span style={{ color: T.textDim, fontSize: "10px" }}>Par {e.par}</span>
                      <span style={{ color: color === T.textSoft ? T.text : color, fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>
                        {type === "strich" ? `(${e.capValue})` : e.gross}
                      </span>
                      {type === "birdies" && e.gross !== null && e.par - e.gross >= 2 && (
                        <span style={{ fontSize: "9px", color: T.gold, fontWeight: 700 }}>{e.par - e.gross === 2 ? "Eagle" : "Albatros"}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

          <button onClick={() => setStatDrilldown(null)}
            style={{ ...S.btnGhost, width: "100%", marginTop: "14px", fontSize: "13px" }}>Schließen</button>
        </div>
      </div>
    );
  };

  // ── v53: Clubs-Übersichts-Modal ──
  const renderClubsModal = () => {
    if (!showClubsModal) return null;
    // Aggregiere pro Club: Anzahl Runden, bester SF (Owner), letztes Datum
    const ownerName = ownerProfile?.name;
    const clubMap = {};
    rounds.forEach(r => {
      const clubName = r.cfg?.clubName;
      if (!clubName) return;
      if (!clubMap[clubName]) {
        clubMap[clubName] = { name: clubName, count: 0, lastDate: null, bestSf: null, bestSfDate: null, region: null };
      }
      const c = clubMap[clubName];
      c.count++;
      const date = r.cfg?.date || r.savedAt;
      if (!c.lastDate || new Date(date) > new Date(c.lastDate)) c.lastDate = date;
      if (!c.region && r.selectedClubSnapshot?.region) c.region = r.selectedClubSnapshot.region;

      // Bester SF des Owners auf diesem Club
      if (ownerName) {
        const player = (r.players || []).find(p => normName(p.name) === normName(ownerName));
        if (player && r.holes?.length) {
          const par = r.holes.reduce((s, h) => s + h.par, 0);
          const { ph } = resolvePlayerPH(player, r.cfg, r.selectedClubSnapshot, par);
          let sf = 0, played = 0;
          r.holes.forEach((h, i) => {
            const g = r.scores?.[player.id]?.[i];
            if (!isValid(g) && !isStrich(g)) return;
            played++;
            const hs = holeHS(ph, h.si, r.holes.length);
            sf += sfNetto(g, hs, h.par) || 0;
          });
          if (played >= r.holes.length * 0.5) {
            const normSf = r.holes.length === 9 ? sf * 2 : sf;
            if (c.bestSf === null || normSf > c.bestSf) {
              c.bestSf = normSf;
              c.bestSfDate = date;
            }
          }
        }
      }
    });
    const clubsList = Object.values(clubMap).sort((a, b) => b.count - a.count);

    return (
      <div onClick={() => setShowClubsModal(false)}
        style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div onClick={e => e.stopPropagation()} className="slide-up"
          style={{ width: "100%", maxWidth: "520px", background: T.surface1, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", border: `1px solid ${T.line}`, padding: "20px 16px 28px", maxHeight: "85vh", overflowY: "auto" }}>
          <SwipeHandle onClose={() => setShowClubsModal(false)} />
          <h3 className="serif" style={{ fontSize: "22px", margin: "0 0 4px", color: T.text }}>
            🏌️ Deine Clubs
          </h3>
          <p style={{ fontSize: "12px", color: T.textSoft, marginTop: 0, marginBottom: "16px" }}>
            {clubsList.length} {clubsList.length === 1 ? "Club" : "Clubs"} gespielt · sortiert nach Häufigkeit
          </p>

          {clubsList.length === 0 ? (
            <EmptyState icon="🏌️" title="Noch keine Clubs" sub="Spiele deine erste Runde, dann siehst du sie hier." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {clubsList.map(c => (
                <button key={c.name}
                  onClick={() => {
                    setStatsClubName(c.name);
                    setTab("stats");
                    setShowClubsModal(false);
                  }}
                  style={{
                    width: "100%", textAlign: "left",
                    padding: "14px", background: T.surface2,
                    border: `1px solid ${T.line}`, borderRadius: "12px",
                    cursor: "pointer", color: T.text, fontFamily: "inherit",
                  }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: T.text, marginBottom: "2px" }}>
                        {c.name}
                      </div>
                      {c.region && (
                        <div style={{ fontSize: "10px", color: T.textDim }}>{c.region}</div>
                      )}
                    </div>
                    <span style={{ color: T.textDim, fontSize: "16px" }}>›</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
                    <div style={{ textAlign: "center", padding: "6px 4px", background: T.surface1, borderRadius: "6px" }}>
                      <div className="mono" style={{ fontSize: "16px", fontWeight: 700, color: T.text }}>{c.count}</div>
                      <div style={{ fontSize: "9px", color: T.textDim, marginTop: "2px" }}>RUNDEN</div>
                    </div>
                    <div style={{ textAlign: "center", padding: "6px 4px", background: T.surface1, borderRadius: "6px" }}>
                      <div className="mono" style={{ fontSize: "16px", fontWeight: 700, color: c.bestSf ? T.gold : T.textDim }}>
                        {c.bestSf || "—"}
                      </div>
                      <div style={{ fontSize: "9px", color: T.textDim, marginTop: "2px" }}>BESTER SF</div>
                    </div>
                    <div style={{ textAlign: "center", padding: "6px 4px", background: T.surface1, borderRadius: "6px" }}>
                      <div className="mono" style={{ fontSize: "11px", fontWeight: 600, color: T.textSoft }}>
                        {c.lastDate ? fmtDate(c.lastDate) : "—"}
                      </div>
                      <div style={{ fontSize: "9px", color: T.textDim, marginTop: "2px" }}>ZULETZT</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <button onClick={() => setShowClubsModal(false)}
            style={{ ...S.btnGhost, width: "100%", marginTop: "16px", fontSize: "13px" }}>Schließen</button>
        </div>
      </div>
    );
  };

  // ── v38: Loch-Schnellsprung-Modal ──
  const renderHoleJump = () => {
    if (!showHoleJump) return null;
    return (
      <div onClick={() => setShowHoleJump(false)}
        style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div onClick={e => e.stopPropagation()} className="slide-up"
          style={{ width: "100%", maxWidth: "520px", background: T.surface1, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", border: `1px solid ${T.line}`, padding: "20px 16px 28px", maxHeight: "85vh", overflowY: "auto" }}>
          <SwipeHandle onClose={() => setShowHoleJump(false)} />
          <h3 className="serif" style={{ fontSize: "22px", margin: "0 0 4px", color: T.text }}>
            🎯 Loch wählen
          </h3>
          <p style={{ fontSize: "11px", color: T.textDim, marginBottom: "16px" }}>
            Tippen zum Springen · gold = aktuell · gefüllt = bereits gespielt
          </p>

          {/* Front 9 / Back 9 */}
          {(() => {
            const numHoles = cfg.numHoles || holes.length;
            const showSplit = numHoles === 18;
            const grids = showSplit
              ? [{ label: "Front 9",  range: [0, 9] }, { label: "Back 9", range: [9, 18] }]
              : [{ label: null, range: [0, numHoles] }];
            return grids.map((g, gi) => (
              <div key={gi} style={{ marginBottom: "16px" }}>
                {g.label && (
                  <div style={{ ...S.eyebrow, marginBottom: "8px", fontSize: "10px" }}>{g.label}</div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                  {Array.from({ length: g.range[1] - g.range[0] }, (_, k) => g.range[0] + k).map(i => {
                    const h = holes[i];
                    const isCurrent = i === currentHole;
                    const allDone = players.every(p => {
                      const v = scores[p.id]?.[i];
                      return isValid(v) || isStrich(v);
                    });
                    return (
                      <button
                        key={i}
                        onClick={() => { goToHole(i); setShowHoleJump(false); }}
                        style={{
                          padding: "12px 8px",
                          background: isCurrent ? T.gold : allDone ? `${T.sage}15` : T.surface2,
                          color: isCurrent ? T.canvas : allDone ? T.sage : T.textSoft,
                          border: `1px solid ${isCurrent ? T.gold : allDone ? `${T.sage}50` : T.line}`,
                          borderRadius: "10px",
                          fontSize: "12px",
                          fontWeight: 600,
                          display: "flex",
                          flexDirection: "column",
                          gap: "3px",
                          alignItems: "center",
                          cursor: "pointer",
                        }}>
                        <span className="mono" style={{ fontSize: "18px", fontWeight: 700 }}>L{i + 1}</span>
                        <span style={{ fontSize: "10px", opacity: 0.8 }}>Par {h?.par || "—"} · SI {h?.si || "—"}</span>
                        {allDone && <span style={{ fontSize: "10px", color: isCurrent ? T.canvas : T.sage, fontWeight: 700 }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ));
          })()}

          <button onClick={() => setShowHoleJump(false)}
            style={{ ...S.btnGhost, width: "100%", marginTop: "8px", fontSize: "13px" }}>Schließen</button>
        </div>
      </div>
    );
  };

  // ── v39: Player-Manager — alle Spieler verwalten (HCP, Aliase, Merge) ──
  const renderPlayerManager = () => {
    if (!showPlayerManager) return null;
    const focused = playerManagerFocus ? friends.find(f => f.playerId === playerManagerFocus) : null;
    const otherFriends = focused ? friends.filter(f => f.playerId !== focused.playerId) : [];

    return (
      <div onClick={() => { if (!mergeTarget) { setShowPlayerManager(false); setPlayerManagerFocus(null); } }}
        style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div onClick={e => e.stopPropagation()} className="slide-up"
          style={{ width: "100%", maxWidth: "520px", background: T.surface1, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", border: `1px solid ${T.line}`, padding: "20px 16px 28px", maxHeight: "92vh", overflowY: "auto" }}>
          <SwipeHandle onClose={() => { setShowPlayerManager(false); setPlayerManagerFocus(null); }} />

          {!focused && (
            <>
              <h3 className="serif" style={{ fontSize: "22px", margin: "0 0 4px", color: T.text }}>👥 Spieler verwalten</h3>
              <p style={{ fontSize: "11px", color: T.textDim, marginBottom: "16px", lineHeight: 1.5 }}>
                Tippe einen Spieler für HCP-History, Aliase oder Merge mit anderem Spieler. Alte Runden bleiben mit ihrem damaligen HCP — dein Setup für neue Runden nutzt den aktuellen.
              </p>

              {friends.length === 0 ? (
                <EmptyState icon="👤" title="Noch keine Spieler" sub="Spieler erscheinen hier sobald du welche zu Runden hinzufügst." />
              ) : friends.map(f => {
                const lastChange = (f.hcpHistory || []).slice(-1)[0];
                return (
                  <button key={f.playerId} onClick={() => { setPlayerManagerFocus(f.playerId); setAliasInput(""); }}
                    className="card-hover"
                    style={{ ...S.card, width: "100%", padding: "12px 14px", marginBottom: "8px", textAlign: "left", cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: `${T.gold}20`, border: `1px solid ${T.gold}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: T.gold }}>
                        {(f.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "14px", fontWeight: 600, color: T.text, display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          {f.name}
                          {f.isOwner && <span style={{ fontSize: "9px", color: T.gold, background: `${T.gold}15`, padding: "1px 5px", borderRadius: "3px", fontWeight: 700, letterSpacing: "0.04em" }}>OWNER</span>}
                        </div>
                        <div style={{ fontSize: "11px", color: T.textSoft, marginTop: "2px" }}>
                          HCP <span className="mono" style={{ color: T.gold, fontWeight: 700 }}>{f.hcp}</span>
                          {lastChange && lastChange.date && (
                            <span style={{ color: T.textDim }}> · seit {fmtDate(lastChange.date)}</span>
                          )}
                          {(f.aliases?.length > 0) && (
                            <span style={{ color: T.textDim }}> · {f.aliases.length} Alias{f.aliases.length === 1 ? "" : "e"}</span>
                          )}
                        </div>
                      </div>
                      <div style={{ color: T.textSoft, fontSize: "18px" }}>›</div>
                    </div>
                  </button>
                );
              })}

              <button onClick={() => { setShowPlayerManager(false); setPlayerManagerFocus(null); }}
                style={{ ...S.btnGhost, width: "100%", marginTop: "14px" }}>Schließen</button>
            </>
          )}

          {focused && (
            <>
              <button onClick={() => { setPlayerManagerFocus(null); setAliasInput(""); }}
                style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 8px", marginBottom: "12px" }}>← zurück</button>

              <h3 className="serif" style={{ fontSize: "22px", margin: "0 0 4px", color: T.text }}>{focused.name}</h3>
              <p style={{ fontSize: "11px", color: T.textDim, marginBottom: "16px" }}>
                Player-ID: <span className="mono">{focused.playerId}</span>
              </p>

              {/* Aktueller HCP + bearbeiten */}
              <div style={{ ...S.card, padding: "14px", marginBottom: "12px" }}>
                <div style={{ ...S.eyebrow, marginBottom: "8px" }}>Aktueller HCP</div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input type="number" step="0.1" value={focused.hcp}
                    onChange={e => updateFriendHcp(focused.name, e.target.value)}
                    style={{ ...S.input, fontFamily: "JetBrains Mono, monospace", fontSize: "20px", textAlign: "center", fontWeight: 700, color: T.gold, padding: "10px" }}/>
                </div>
                <p style={{ fontSize: "10px", color: T.textDim, marginTop: "8px", lineHeight: 1.4 }}>
                  Änderungen werden mit Datum gespeichert. Alte Runden behalten ihren damaligen HCP.
                </p>
              </div>

              {/* v48: Sim-HCP — aktuelle Form */}
              {(() => {
                const sim = computeSimHcp(focused.playerId || focused.name, rounds, focused.name);
                if (!sim?.hasEnoughData) return null;
                return (
                  <div style={{ ...S.card, padding: "14px", marginBottom: "12px", borderColor: `${T.gold}30` }}>
                    <div style={{ ...S.eyebrow, marginBottom: "8px", color: T.gold }}>📊 Sim-HCP · aktuelle Form</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div className="mono" style={{ fontSize: "26px", fontWeight: 700, color: T.gold }}>{sim.simHcp}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "11px", color: T.text }}>
                          Diff zum offiziellen: <span style={{ color: sim.diff > 0 ? T.double : sim.diff < 0 ? T.sage : T.textDim, fontWeight: 700 }}>
                            {sim.diff > 0 ? "📈 +" : sim.diff < 0 ? "📉 " : "≈ "}{sim.diff}
                          </span>
                        </div>
                        <div style={{ fontSize: "10px", color: T.textDim, marginTop: "2px" }}>
                          Aus letzten {sim.roundsUsed} Runden · ⌀ {Math.round(sim.avgSf)} SF
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* HCP-History */}
              {(focused.hcpHistory?.length > 0) && (
                <div style={{ ...S.card, padding: "14px", marginBottom: "12px" }}>
                  <div style={{ ...S.eyebrow, marginBottom: "10px" }}>📈 HCP-Historie</div>
                  {[...(focused.hcpHistory || [])].reverse().slice(0, 10).map((h, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderTop: i > 0 ? `1px solid ${T.line}` : "none", fontSize: "12px" }}>
                      <span style={{ color: T.textSoft }}>{fmtDate(h.date)}</span>
                      <span className="mono" style={{ color: T.gold, fontWeight: 700 }}>HCP {h.hcp}</span>
                    </div>
                  ))}
                  {focused.hcpHistory.length > 10 && (
                    <p style={{ fontSize: "10px", color: T.textDim, marginTop: "8px", textAlign: "center", fontStyle: "italic" }}>
                      {focused.hcpHistory.length - 10} ältere Einträge
                    </p>
                  )}
                </div>
              )}

              {/* Aliase */}
              <div style={{ ...S.card, padding: "14px", marginBottom: "12px" }}>
                <div style={{ ...S.eyebrow, marginBottom: "10px" }}>🏷️ Aliase</div>
                <p style={{ fontSize: "11px", color: T.textDim, marginBottom: "10px", lineHeight: 1.5 }}>
                  Andere Namen unter denen dieser Spieler bekannt ist. Wird beim Setup automatisch erkannt — z.B. „Thorsti" → „Thorsten".
                </p>
                {(focused.aliases || []).length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
                    {focused.aliases.map(a => (
                      <span key={a} style={{
                        background: `${T.sage}15`,
                        border: `1px solid ${T.sage}40`,
                        borderRadius: "6px",
                        padding: "4px 8px",
                        fontSize: "11px",
                        color: T.sage,
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}>
                        {a}
                        <button onClick={() => removeAlias(focused.playerId, a)}
                          style={{ background: "transparent", border: "none", color: T.double, fontSize: "13px", cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: "11px", color: T.textDim, fontStyle: "italic", marginBottom: "10px" }}>
                    Noch keine Aliase eingetragen.
                  </p>
                )}
                <div style={{ display: "flex", gap: "6px" }}>
                  <input value={aliasInput} onChange={e => setAliasInput(e.target.value)}
                    placeholder="Spitzname, Echtname, Variante..."
                    style={{ ...S.input, fontSize: "13px", padding: "8px 10px", flex: 1 }}/>
                  <button
                    onClick={() => {
                      if (aliasInput.trim()) {
                        addAlias(focused.playerId, aliasInput);
                        setAliasInput("");
                      }
                    }}
                    style={{ ...S.btnSecondary, padding: "8px 14px", fontSize: "13px" }}>+</button>
                </div>
              </div>

              {/* Merge mit anderem Spieler */}
              {otherFriends.length > 0 && (
                <div style={{ ...S.card, padding: "14px", marginBottom: "12px", borderColor: `${T.double}30` }}>
                  <div style={{ ...S.eyebrow, marginBottom: "10px", color: T.double }}>⚠️ Mit anderem Spieler zusammenführen</div>
                  <p style={{ fontSize: "11px", color: T.textDim, marginBottom: "10px", lineHeight: 1.5 }}>
                    Falls dieser Spieler dieselbe Person ist wie jemand anders. „{focused.name}" wird gelöscht, alle Runden auf den Ziel-Spieler umgeschrieben.
                  </p>
                  <select
                    onChange={e => {
                      const toId = e.target.value;
                      if (toId) setMergeTarget({ fromId: focused.playerId, toId });
                    }}
                    style={{ ...S.input, fontSize: "13px", padding: "10px", width: "100%" }}
                    defaultValue="">
                    <option value="">Mit welchem Spieler zusammenführen?</option>
                    {otherFriends.map(o => (
                      <option key={o.playerId} value={o.playerId}>→ {o.name} (HCP {o.hcp})</option>
                    ))}
                  </select>
                </div>
              )}

              <button onClick={() => { setPlayerManagerFocus(null); setAliasInput(""); }}
                style={{ ...S.btnGhost, width: "100%", fontSize: "13px" }}>Fertig</button>
            </>
          )}
        </div>

        {/* Merge-Bestätigung */}
        {mergeTarget && (() => {
          const fromF = friends.find(f => f.playerId === mergeTarget.fromId);
          const toF = friends.find(f => f.playerId === mergeTarget.toId);
          const affectedRounds = rounds.filter(r => r.players?.some(p => p.playerId === mergeTarget.fromId)).length;
          if (!fromF || !toF) return null;
          return (
            <div onClick={e => e.stopPropagation()}
              style={{ position: "fixed", inset: 0, background: "#000000ee", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
              <div style={{ ...S.card, maxWidth: "440px", width: "100%", padding: "20px", borderColor: T.double }}>
                <h4 className="serif" style={{ fontSize: "20px", margin: "0 0 8px", color: T.double }}>⚠️ Merge bestätigen</h4>
                <p style={{ fontSize: "13px", color: T.text, lineHeight: 1.6, marginBottom: "12px" }}>
                  „<strong>{fromF.name}</strong>" wird mit „<strong>{toF.name}</strong>" zusammengeführt.
                </p>
                <ul style={{ fontSize: "11px", color: T.textSoft, lineHeight: 1.6, marginBottom: "16px", paddingLeft: "18px" }}>
                  <li>{affectedRounds} Runde{affectedRounds === 1 ? "" : "n"} werden umgeschrieben</li>
                  <li>„{fromF.name}" wird zum Alias von „{toF.name}"</li>
                  <li>HCP-Historien werden zusammengeführt</li>
                  <li>Auto-Backup wird vor dem Merge angelegt</li>
                </ul>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => setMergeTarget(null)}
                    style={{ ...S.btnSecondary, flex: 1 }}>Abbrechen</button>
                  <button onClick={async () => {
                    await mergePlayer(mergeTarget.fromId, mergeTarget.toId);
                    setMergeTarget(null);
                    setPlayerManagerFocus(null);
                  }}
                    style={{ ...S.btnPrimary, flex: 1, background: T.double }}>Zusammenführen</button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

  // ── v40: Scorer-Conflict-Modal — wenn anderes Gerät den Scorer-Status übernommen hat
  const renderScorerConflict = () => {
    if (!scorerConflict) return null;
    return (
      <div onClick={e => e.stopPropagation()}
        style={{ position: "fixed", inset: 0, background: "#000000ee", zIndex: 1300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div style={{ ...S.card, maxWidth: "440px", width: "100%", padding: "20px", borderColor: T.double }}>
          <h4 className="serif" style={{ fontSize: "20px", margin: "0 0 8px", color: T.double }}>⚠️ Scorer-Konflikt</h4>
          <p style={{ fontSize: "13px", color: T.text, lineHeight: 1.6, marginBottom: "12px" }}>
            <strong>{scorerConflict.existingScorer}</strong> ist gerade als Scorer für diese Runde aktiv (Code: <span className="mono">{scorerConflict.code}</span>).
          </p>
          <p style={{ fontSize: "12px", color: T.textSoft, lineHeight: 1.5, marginBottom: "16px" }}>
            Wenn du jetzt scorest, überschreibst du seine Eingaben. Damit das nicht passiert: nur ein Gerät pro Runde sollte aktiv scoren.
          </p>
          <ul style={{ fontSize: "11px", color: T.textDim, lineHeight: 1.6, marginBottom: "16px", paddingLeft: "18px" }}>
            <li><strong>Beobachten</strong>: Du gehst auf den Live-Ticker (Read-Only) und siehst nur zu</li>
            <li><strong>Übernehmen</strong>: Du wirst Scorer, der andere wird zum Read-Only</li>
          </ul>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button onClick={() => {
              // Stoppe Live-Push, gehe zum Live-Viewer
              setLiveStatus("idle");
              setLiveCode(null);
              setScorerConflict(null);
              window.open(`/live.html#${scorerConflict.code}`, "_blank");
            }}
              style={{ ...S.btnSecondary, color: T.sage, borderColor: `${T.sage}40` }}>
              👁️ Beobachten (Live-Ticker öffnen)
            </button>
            <button onClick={() => {
              // Behalte aktive Live-Round → nächster Push überschreibt scorerId
              setScorerConflict(null);
            }}
              style={{ ...S.btnPrimary, background: T.double }}>
              ⚡ Scorer übernehmen
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── v42: Trip-Setup-Modal ──
  const renderTripSetup = () => {
    if (!showTripSetup || !tripFormData) return null;
    const close = () => { setShowTripSetup(false); setTripFormData(null); };
    const f = tripFormData;
    const setF = (patch) => setTripFormData(prev => ({ ...prev, ...patch }));

    return (
      <div onClick={close}
        style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div onClick={e => e.stopPropagation()} className="slide-up"
          style={{ width: "100%", maxWidth: "520px", background: T.surface1, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", border: `1px solid ${T.line}`, padding: "20px 16px 28px", maxHeight: "92vh", overflowY: "auto" }}>
          <SwipeHandle onClose={close} />
          <h3 className="serif" style={{ fontSize: "22px", margin: "0 0 4px", color: T.text }}>🏖️ Neuer Trip</h3>
          <p style={{ fontSize: "11px", color: T.textDim, marginBottom: "16px", lineHeight: 1.5 }}>
            Mehrtägige Golfreise mit Tageswertungen und Pots.
          </p>

          {/* Basis */}
          <div style={{ ...S.card, padding: "12px 14px", marginBottom: "12px" }}>
            <div style={{ ...S.eyebrow, marginBottom: "10px" }}>📍 Basis</div>
            <label style={{ fontSize: "11px", color: T.textDim, display: "block", marginBottom: "4px" }}>Trip-Name</label>
            <input value={f.name} onChange={e => setF({ name: e.target.value })}
              placeholder="z.B. Cyprus 2026" style={{ ...S.input, marginBottom: "10px" }}/>
            <label style={{ fontSize: "11px", color: T.textDim, display: "block", marginBottom: "4px" }}>Location (optional)</label>
            <input value={f.location} onChange={e => setF({ location: e.target.value })}
              placeholder="z.B. Aphrodite Hills" style={{ ...S.input, marginBottom: "10px" }}/>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
              <div>
                <label style={{ fontSize: "11px", color: T.textDim, display: "block", marginBottom: "4px" }}>Start</label>
                <input type="date" value={f.startDate} onChange={e => setF({ startDate: e.target.value })} style={{ ...S.input }}/>
              </div>
              <div>
                <label style={{ fontSize: "11px", color: T.textDim, display: "block", marginBottom: "4px" }}>Ende</label>
                <input type="date" value={f.endDate} onChange={e => setF({ endDate: e.target.value })} style={{ ...S.input }}/>
              </div>
            </div>
            <label style={{ fontSize: "11px", color: T.textDim, display: "block", marginBottom: "4px" }}>Spieltage</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "6px" }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <button key={n} onClick={() => setF({ dayCount: n })}
                  style={{
                    padding: "10px",
                    background: f.dayCount === n ? `${T.gold}20` : T.surface2,
                    color: f.dayCount === n ? T.gold : T.textSoft,
                    border: `1px solid ${f.dayCount === n ? T.gold : T.line}`,
                    borderRadius: "8px", fontWeight: 600, fontSize: "14px",
                    cursor: "pointer",
                  }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Spieler */}
          <div style={{ ...S.card, padding: "12px 14px", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <div style={{ ...S.eyebrow }}>👥 Spieler ({f.selectedFriendIds.length}/8)</div>
              {f.selectedFriendIds.length >= 7 && (
                <span style={{ fontSize: "9px", color: f.selectedFriendIds.length === 8 ? T.double : T.gold, fontWeight: 700, letterSpacing: "0.06em" }}>
                  {f.selectedFriendIds.length === 8 ? "MAX ERREICHT" : "FAST VOLL"}
                </span>
              )}
            </div>
            {friends.length === 0 ? (
              <div style={{ padding: "12px", background: `${T.gold}10`, border: `1px solid ${T.gold}40`, borderRadius: "8px", marginBottom: "10px" }}>
                <p style={{ fontSize: "12px", color: T.gold, fontWeight: 600, marginTop: 0, marginBottom: "4px" }}>
                  💡 Noch keine Friends in der Liste
                </p>
                <p style={{ fontSize: "11px", color: T.textSoft, marginBottom: 0, lineHeight: 1.5 }}>
                  Du kannst direkt unten Spieler anlegen — sie werden zur Friend-Liste hinzugefügt und im Trip ausgewählt.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {friends.map(fr => {
                  const checked = f.selectedFriendIds.includes(fr.playerId);
                  const atLimit = f.selectedFriendIds.length >= 8 && !checked;
                  return (
                    <button key={fr.playerId}
                      onClick={() => {
                        if (atLimit) {
                          showUndoToast("⚠️ Maximum erreicht — ein Trip kann höchstens 8 Spieler haben", null);
                          return;
                        }
                        setF({
                          selectedFriendIds: checked
                            ? f.selectedFriendIds.filter(id => id !== fr.playerId)
                            : [...f.selectedFriendIds, fr.playerId]
                        });
                      }}
                      style={{
                        display: "flex", alignItems: "center", gap: "10px",
                        padding: "8px 10px",
                        background: checked ? `${T.gold}10` : T.surface2,
                        border: `1px solid ${checked ? T.gold : T.line}`,
                        borderRadius: "8px",
                        textAlign: "left",
                        opacity: atLimit ? 0.4 : 1,
                        cursor: "pointer",
                      }}>
                      <div style={{
                        width: "20px", height: "20px", borderRadius: "4px",
                        border: `2px solid ${checked ? T.gold : T.textDim}`,
                        background: checked ? T.gold : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: T.canvas, fontSize: "12px", fontWeight: 700,
                      }}>
                        {checked && "✓"}
                      </div>
                      <span style={{ flex: 1, fontSize: "13px", color: T.text, fontWeight: 600 }}>{fr.name}</span>
                      <span className="mono" style={{ fontSize: "11px", color: T.textSoft }}>HCP {fr.hcp}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* v46.2: Schnell-Spieler-Hinzufügen direkt im Trip-Setup */}
            <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${T.line}` }}>
              <div style={{ ...S.eyebrow, marginBottom: "8px", fontSize: "10px" }}>➕ Neuen Spieler anlegen</div>
              <div style={{ display: "flex", gap: "6px" }}>
                <input
                  type="text"
                  value={f.quickAddName || ""}
                  onChange={e => setF({ quickAddName: e.target.value })}
                  placeholder="Name"
                  style={{ ...S.input, flex: 2, fontSize: "13px", padding: "8px 10px" }}/>
                <input
                  type="number" step="0.1"
                  value={f.quickAddHcp || ""}
                  onChange={e => setF({ quickAddHcp: e.target.value })}
                  placeholder="HCP"
                  style={{ ...S.input, flex: 1, fontSize: "13px", padding: "8px 10px", textAlign: "center", maxWidth: "70px" }}/>
                <button
                  onClick={async () => {
                    const name = (f.quickAddName || "").trim();
                    if (!name) {
                      showUndoToast("⚠️ Bitte Namen eingeben", null);
                      return;
                    }
                    if (friends.find(fr => normName(fr.name) === normName(name))) {
                      showUndoToast(`⚠️ "${name}" gibt's schon — wähle ihn aus der Liste oben`, null);
                      return;
                    }
                    if (f.selectedFriendIds.length >= 8) {
                      showUndoToast("⚠️ Maximum 8 Spieler erreicht", null);
                      return;
                    }
                    const hcp = parseFloat(f.quickAddHcp) || 0;
                    const newFriend = {
                      name,
                      hcp,
                      playerId: newPlayerId(),
                      aliases: [],
                      hcpHistory: [{ date: toDay(), hcp }],
                    };
                    const updatedFriends = [...friends, newFriend];
                    setFriends(updatedFriends);
                    try { await window.storage.set("golf-friends", JSON.stringify(updatedFriends)); } catch {}
                    // Sofort zum Trip hinzufügen
                    setF({
                      selectedFriendIds: [...f.selectedFriendIds, newFriend.playerId],
                      quickAddName: "",
                      quickAddHcp: "",
                    });
                    showUndoToast(`✓ "${name}" angelegt + zum Trip hinzugefügt`, null);
                  }}
                  className="gold-hover"
                  style={{
                    background: T.gold, color: T.canvas,
                    border: "none", borderRadius: "8px",
                    padding: "8px 14px", fontSize: "16px", fontWeight: 700,
                    cursor: "pointer",
                  }}>
                  +
                </button>
              </div>
              <p style={{ fontSize: "10px", color: T.textDim, marginTop: "6px", lineHeight: 1.4, fontStyle: "italic" }}>
                Spieler wird zur Friend-Liste hinzugefügt und automatisch im Trip ausgewählt.
              </p>
            </div>
          </div>

          {/* v43: HCP-Adjustments-Regeln */}
          <div style={{ ...S.card, padding: "12px 14px", marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ ...S.eyebrow }}>⚖️ HCP-Adjustments für Folgetage</div>
              <button
                onClick={() => setF({ hcpRules: { ...f.hcpRules, enabled: !f.hcpRules.enabled } })}
                style={{
                  background: f.hcpRules.enabled ? T.gold : T.surface2,
                  color: f.hcpRules.enabled ? T.canvas : T.textSoft,
                  border: `1px solid ${f.hcpRules.enabled ? T.gold : T.line}`,
                  borderRadius: "6px",
                  padding: "4px 10px",
                  fontSize: "10px",
                  fontWeight: 700,
                  cursor: "pointer",
                  letterSpacing: "0.04em",
                }}>
                {f.hcpRules.enabled ? "AKTIV" : "AUS"}
              </button>
            </div>
            {f.hcpRules.enabled && (
              <>
                <p style={{ fontSize: "11px", color: T.textDim, marginBottom: "10px", lineHeight: 1.5, fontStyle: "italic" }}>
                  Nach jedem Spieltag werden HCPs angepasst. Die besten 3 bekommen Abzug, die schlechtesten 3 bekommen Aufschlag. Default: Cyprus-Regeln.
                </p>
                <div style={{ background: T.surface2, borderRadius: "8px", padding: "10px", marginBottom: "8px" }}>
                  <div style={{ fontSize: "10px", color: T.gold, fontWeight: 700, marginBottom: "6px", letterSpacing: "0.04em" }}>BESTE 3 → HCP-ABZUG</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
                    {[0, 1, 2].map(i => (
                      <div key={i}>
                        <label style={{ fontSize: "9px", color: T.textDim, display: "block", marginBottom: "2px" }}>{i + 1}. Platz</label>
                        <input type="number" value={f.hcpRules.bestAdj[i]}
                          onChange={e => {
                            const v = parseInt(e.target.value) || 0;
                            const arr = [...f.hcpRules.bestAdj];
                            arr[i] = v;
                            setF({ hcpRules: { ...f.hcpRules, bestAdj: arr } });
                          }}
                          style={{ ...S.input, fontSize: "13px", padding: "6px 8px", textAlign: "center", color: T.sage, fontWeight: 700 }}/>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: T.surface2, borderRadius: "8px", padding: "10px" }}>
                  <div style={{ fontSize: "10px", color: T.double, fontWeight: 700, marginBottom: "6px", letterSpacing: "0.04em" }}>SCHLECHTESTE 3 → HCP-AUFSCHLAG</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
                    {[0, 1, 2].map(i => (
                      <div key={i}>
                        <label style={{ fontSize: "9px", color: T.textDim, display: "block", marginBottom: "2px" }}>{i + 1}. Letzter</label>
                        <input type="number" value={f.hcpRules.worstAdj[i]}
                          onChange={e => {
                            const v = parseInt(e.target.value) || 0;
                            const arr = [...f.hcpRules.worstAdj];
                            arr[i] = v;
                            setF({ hcpRules: { ...f.hcpRules, worstAdj: arr } });
                          }}
                          style={{ ...S.input, fontSize: "13px", padding: "6px 8px", textAlign: "center", color: T.double, fontWeight: 700 }}/>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Pots */}
          <div style={{ ...S.card, padding: "12px 14px", marginBottom: "16px" }}>
            <div style={{ ...S.eyebrow, marginBottom: "10px" }}>💰 Pots (€ pro Kopf)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div>
                <label style={{ fontSize: "10px", color: T.textDim, display: "block", marginBottom: "2px" }}>Tagessieg</label>
                <input type="number" value={f.pots.dayWin} onChange={e => setF({ pots: { ...f.pots, dayWin: parseInt(e.target.value) || 0 } })}
                  style={{ ...S.input, fontSize: "13px", padding: "8px 10px" }}/>
              </div>
              <div>
                <label style={{ fontSize: "10px", color: T.textDim, display: "block", marginBottom: "2px" }}>Gesamt-Wertung</label>
                <input type="number" value={f.pots.threeDayPot} onChange={e => setF({ pots: { ...f.pots, threeDayPot: parseInt(e.target.value) || 0 } })}
                  style={{ ...S.input, fontSize: "13px", padding: "8px 10px" }}/>
              </div>
              <div>
                <label style={{ fontSize: "10px", color: T.textDim, display: "block", marginBottom: "2px" }}>Team-Wertung</label>
                <input type="number" value={f.pots.weekTeamPot} onChange={e => setF({ pots: { ...f.pots, weekTeamPot: parseInt(e.target.value) || 0 } })}
                  style={{ ...S.input, fontSize: "13px", padding: "8px 10px" }}/>
              </div>
              <div>
                <label style={{ fontSize: "10px", color: T.textDim, display: "block", marginBottom: "2px" }}>Nearest-to-Pin</label>
                <input type="number" value={f.pots.nearestPin} onChange={e => setF({ pots: { ...f.pots, nearestPin: parseInt(e.target.value) || 0 } })}
                  style={{ ...S.input, fontSize: "13px", padding: "8px 10px" }}/>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={close} style={{ ...S.btnSecondary, flex: 1 }}>Abbrechen</button>
            <button
              onClick={async () => {
                // v42: Klare Pop-Ups statt stumm disabled
                if (!f.name.trim()) {
                  showUndoToast("⚠️ Bitte gib deinem Trip einen Namen", null);
                  return;
                }
                if (!f.startDate || !f.endDate) {
                  showUndoToast("⚠️ Bitte wähle Start- und End-Datum", null);
                  return;
                }
                if (f.dayCount < 1) {
                  showUndoToast("⚠️ Mindestens 1 Spieltag nötig", null);
                  return;
                }
                if (f.selectedFriendIds.length < 2) {
                  showUndoToast("⚠️ Wähle mindestens 2 Spieler — ein Trip macht alleine wenig Sinn", null);
                  return;
                }
                if (f.selectedFriendIds.length > 8) {
                  showUndoToast("⚠️ Maximum 8 Spieler pro Trip", null);
                  return;
                }
                const selectedPlayers = friends.filter(fr => f.selectedFriendIds.includes(fr.playerId));
                const startDate = new Date(f.startDate);
                const days = Array.from({ length: f.dayCount }, (_, i) => {
                  const d = new Date(startDate);
                  d.setDate(d.getDate() + i);
                  return { date: d.toISOString().slice(0, 10) };
                });
                await createTrip({
                  name: f.name, location: f.location,
                  startDate: f.startDate, endDate: f.endDate,
                  syncCode: f.syncCode,
                  players: selectedPlayers,
                  days, pots: f.pots,
                  hcpRules: f.hcpRules,
                });
                close();
                showUndoToast(`✓ Trip "${f.name}" angelegt`, null);
              }}
              className="gold-hover"
              style={{ ...S.btnPrimary, flex: 2 }}>
              Trip anlegen
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── v42: Trip-Detail-Modal ──
  const renderTripDetail = () => {
    if (!showTripDetail || !activeTripId) return null;
    const trip = trips.find(t => t.id === activeTripId);
    if (!trip) return null;
    const close = () => { setShowTripDetail(false); setActiveTripId(null); setTripDetailView("overview"); };
    const standings = computeTripStandings(trip);
    const totalPot = (trip.players?.length || 0) * (
      (trip.pots?.dayWin || 0) * (trip.days?.length || 0) +
      (trip.pots?.threeDayPot || 0) +
      (trip.pots?.weekTeamPot || 0)
    );

    return (
      <div onClick={close}
        style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div onClick={e => e.stopPropagation()} className="slide-up"
          style={{ width: "100%", maxWidth: "520px", background: T.surface1, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", border: `1px solid ${T.line}`, padding: "20px 16px 28px", maxHeight: "92vh", overflowY: "auto" }}>
          <SwipeHandle onClose={close} />
          <h3 className="serif" style={{ fontSize: "22px", margin: "0 0 4px", color: T.text }}>🏖️ {trip.name}</h3>
          <div style={{ fontSize: "12px", color: T.textSoft, marginBottom: "16px" }}>
            {trip.location && <span>📍 {trip.location} · </span>}
            {fmtDate(trip.startDate)} – {fmtDate(trip.endDate)}
          </div>

          {/* v44: Tab-Switcher */}
          <div style={{ display: "flex", background: T.surface2, borderRadius: "10px", padding: "3px", marginBottom: "14px" }}>
            {[
              { k: "overview", l: "🏆 Übersicht" },
              { k: "stats", l: "📊 Stats" },
              { k: "money", l: "💰 Geld" },
            ].map(({ k, l }) => (
              <button key={k}
                onClick={() => setTripDetailView(k)}
                style={{
                  flex: 1, padding: "8px 6px",
                  background: tripDetailView === k ? T.gold : "transparent",
                  color: tripDetailView === k ? T.canvas : T.textSoft,
                  border: "none", borderRadius: "8px",
                  fontSize: "11px", fontWeight: tripDetailView === k ? 700 : 500,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}>
                {l}
              </button>
            ))}
          </div>

          {/* Übersicht-View (= bisheriger Inhalt) */}
          {tripDetailView === "overview" && (
            <>
              {/* Pot-Summary */}
          <div style={{ ...S.card, padding: "12px 14px", marginBottom: "12px", borderColor: `${T.gold}30` }}>
            <div style={{ ...S.eyebrow, marginBottom: "8px", color: T.gold }}>💰 Pot-Übersicht</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: T.gold, marginBottom: "8px" }}>
              €{totalPot} <span style={{ fontSize: "11px", color: T.textDim, fontWeight: 500 }}>· {trip.players?.length || 0} Spieler</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px", fontSize: "10px", color: T.textSoft, lineHeight: 1.4 }}>
              <div>🥇 <strong>€{trip.pots?.dayWin}</strong> Tagessieger</div>
              <div>🏆 <strong>€{trip.pots?.threeDayPot}</strong> Gesamt</div>
              <div>🤝 <strong>€{trip.pots?.weekTeamPot}</strong> Bestes 2er-Team</div>
              <div>🎯 <strong>€{trip.pots?.nearestPin}</strong> Nearest-to-Pin</div>
            </div>
            <p style={{ fontSize: "9px", color: T.textDim, marginTop: "8px", lineHeight: 1.4, fontStyle: "italic" }}>
              Beträge sind „pro Spieler". Sieger bekommt von allen anderen je den Betrag.
            </p>
          </div>

          {/* Tageswertungen */}
          {standings?.dayResults?.length > 0 && (
            <div style={{ ...S.card, padding: "12px 14px", marginBottom: "12px" }}>
              <div style={{ ...S.eyebrow, marginBottom: "10px" }}>📅 Tageswertungen</div>
              {standings.dayResults.map(dr => (
                <div key={dr.dayNumber} style={{ padding: "8px 0", borderTop: dr.dayNumber > 1 ? `1px solid ${T.line}` : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: T.text }}>Tag {dr.dayNumber}</span>
                    <span style={{ fontSize: "10px", color: T.textDim }}>{fmtDate(dr.date)}</span>
                  </div>
                  {dr.complete && dr.winner ? (
                    <div style={{ fontSize: "11px", color: T.textSoft }}>
                      🥇 <span style={{ color: T.gold, fontWeight: 700 }}>{dr.winner.name}</span>
                      {" "}— <span className="mono">{dr.winner.sf} SF</span>
                      {" "}· €{trip.pots?.dayWin * (trip.players?.length || 0)}
                    </div>
                  ) : (
                    <div style={{ fontSize: "11px", color: T.textDim, fontStyle: "italic" }}>Noch nicht gespielt</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Gesamt-Wertung */}
          {standings?.totalRanked?.length > 0 && (
            <div style={{ ...S.card, padding: "12px 14px", marginBottom: "12px" }}>
              <div style={{ ...S.eyebrow, marginBottom: "10px" }}>🏆 Gesamt-Wertung</div>
              {standings.totalRanked.map((p, i) => (
                <div key={p.playerId || p.name} style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "6px 0",
                  borderTop: i > 0 ? `1px solid ${T.line}` : "none",
                }}>
                  <span style={{ width: "24px", color: i === 0 ? T.gold : T.textDim, fontWeight: 700, fontSize: "12px" }}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                  </span>
                  <span style={{ flex: 1, fontSize: "13px", color: T.text, fontWeight: 600 }}>{p.name}</span>
                  <span style={{ fontSize: "10px", color: T.textDim }}>{p.daysPlayed} Tage</span>
                  <span className="mono" style={{ fontSize: "13px", fontWeight: 700, color: T.gold, minWidth: "40px", textAlign: "right" }}>
                    {p.totalSf}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Tage mit Runden verlinken */}
          <div style={{ ...S.card, padding: "12px 14px", marginBottom: "12px" }}>
            <div style={{ ...S.eyebrow, marginBottom: "10px" }}>🔗 Runden zuweisen</div>
            <p style={{ fontSize: "10px", color: T.textDim, marginBottom: "10px", lineHeight: 1.4, fontStyle: "italic" }}>
              Spielt eine Runde wie gewohnt und weist sie hier dem entsprechenden Tag zu.
            </p>
            {trip.days?.map(day => {
              const dayHasAdjustments = day.dayNumber > 1 && trip.players.some(p => p.hcpAdjustments?.[day.dayNumber] !== undefined);
              return (
              <div key={day.dayNumber} style={{ marginBottom: "12px", padding: "10px", background: T.surface2, borderRadius: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: T.gold }}>Tag {day.dayNumber}</span>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    {dayHasAdjustments && (
                      <span style={{ fontSize: "9px", color: T.gold, background: `${T.gold}15`, padding: "2px 5px", borderRadius: "3px", fontWeight: 700, letterSpacing: "0.04em" }}>HCP+</span>
                    )}
                    <span style={{ fontSize: "10px", color: T.textDim }}>{fmtDate(day.date)}</span>
                  </div>
                </div>
                {day.roundIds?.length > 0 ? (
                  day.roundIds.map(rid => {
                    const r = rounds.find(x => x.id === rid);
                    if (!r) return null;
                    return (
                      <div key={rid} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 0" }}>
                        <span style={{ flex: 1, fontSize: "11px", color: T.text }}>
                          {r.cfg?.clubName || "Runde"} · {fmtDate(r.cfg?.date)}
                        </span>
                        <button onClick={() => unlinkRoundFromTrip(trip.id, rid)}
                          style={{ background: "transparent", border: "none", color: T.double, fontSize: "14px", cursor: "pointer", padding: "2px 6px" }}>×</button>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ fontSize: "10px", color: T.textDim, fontStyle: "italic", marginBottom: "6px" }}>Keine Runden zugewiesen</div>
                )}
                <select
                  onChange={async (e) => {
                    if (e.target.value) {
                      await linkRoundToTripDay(trip.id, day.dayNumber, e.target.value);
                      e.target.value = "";
                    }
                  }}
                  style={{ ...S.input, fontSize: "11px", padding: "6px 8px", width: "100%", marginTop: "4px" }}
                  defaultValue="">
                  <option value="">+ Runde hinzufügen...</option>
                  {rounds.filter(r => !day.roundIds?.includes(r.id)).map(r => (
                    <option key={r.id} value={r.id}>
                      {r.cfg?.clubName || "Runde"} · {fmtDate(r.cfg?.date)}
                    </option>
                  ))}
                </select>

                {/* v43: HCP-Adjustment-Anwenden + Flight-Allocation */}
                {day.dayNumber > 1 && trip.hcpRules?.enabled && (
                  <button
                    onClick={() => applyHcpAdjustmentsForDay(trip.id, day.dayNumber)}
                    style={{
                      ...S.btnSecondary, width: "100%", marginTop: "8px",
                      fontSize: "11px", padding: "8px 10px",
                      color: dayHasAdjustments ? T.gold : T.textSoft,
                      borderColor: dayHasAdjustments ? `${T.gold}50` : T.line,
                      background: dayHasAdjustments ? `${T.gold}10` : T.surface2,
                    }}>
                    {dayHasAdjustments ? "🔄 HCP-Adjustments aktualisieren" : "⚖️ HCP-Adjustments anwenden"}
                  </button>
                )}

                {/* Flight-Allocation pro Spieler */}
                <div style={{ marginTop: "8px" }}>
                  <div style={{ fontSize: "9px", color: T.textDim, fontWeight: 700, letterSpacing: "0.04em", marginBottom: "5px" }}>FLIGHT-ZUTEILUNG</div>
                  {/* v48: Hinweis bei ≤ 4 Spielern */}
                  {trip.players.length <= 4 && (
                    <p style={{ fontSize: "10px", color: T.textDim, marginBottom: "8px", lineHeight: 1.4, fontStyle: "italic" }}>
                      💡 Bei {trip.players.length} Spielern wird ein Flight gespielt — alle automatisch in A. Aufteilung optional.
                    </p>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {trip.players.map(tp => {
                      const flight = day.flights?.[tp.playerId] || "";
                      const adjustment = tp.hcpAdjustments?.[day.dayNumber];
                      return (
                        <div key={tp.playerId} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ flex: 1, fontSize: "11px", color: T.text }}>
                            {tp.name}
                            {adjustment !== undefined && adjustment !== 0 && (
                              <span style={{ fontSize: "10px", color: adjustment > 0 ? T.double : T.sage, marginLeft: "5px", fontWeight: 700 }}>
                                {adjustment > 0 ? "+" : ""}{adjustment}
                              </span>
                            )}
                          </span>
                          <div style={{ display: "flex", gap: "3px" }}>
                            {["A", "B", "C", ""].map(opt => (
                              <button
                                key={opt || "none"}
                                onClick={() => setPlayerFlightForDay(trip.id, day.dayNumber, tp.playerId, opt || null)}
                                style={{
                                  width: "26px", height: "26px",
                                  background: flight === opt ? T.gold : T.surface1,
                                  color: flight === opt ? T.canvas : T.textSoft,
                                  border: `1px solid ${flight === opt ? T.gold : T.line}`,
                                  borderRadius: "5px", fontSize: "10px",
                                  fontWeight: 700, cursor: "pointer",
                                }}>
                                {opt || "—"}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* v45: Nearest-to-Pin pro Par-3 in Trip-Runden */}
                {(trip.pots?.nearestPin > 0 && day.roundIds?.length > 0) && (() => {
                  // Sammle alle Par-3-Löcher aus den Runden dieses Tages
                  const par3Items = [];
                  day.roundIds.forEach(rid => {
                    const r = rounds.find(x => x.id === rid);
                    if (!r) return;
                    getPar3Holes(r).forEach(p3 => {
                      par3Items.push({
                        roundId: rid,
                        clubName: r.cfg?.clubName || "",
                        holeIdx: p3.holeIdx,
                        par: p3.par,
                      });
                    });
                  });
                  if (par3Items.length === 0) return null;
                  return (
                    <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: `1px solid ${T.line}` }}>
                      <div style={{ fontSize: "9px", color: T.textDim, fontWeight: 700, letterSpacing: "0.04em", marginBottom: "5px" }}>
                        🎯 NEAREST-TO-PIN (€{trip.pots.nearestPin}/Spieler)
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        {par3Items.map(item => {
                          const key = `${item.roundId}::${item.holeIdx}`;
                          const winnerId = trip.nearestPins?.[key] || "";
                          const winner = trip.players.find(tp => tp.playerId === winnerId);
                          return (
                            <div key={key} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontSize: "11px", color: T.text, flex: 1 }}>
                                Loch {item.holeIdx + 1} · Par {item.par}
                              </span>
                              <select
                                value={winnerId}
                                onChange={e => setNearestPinWinner(trip.id, key, e.target.value || null)}
                                style={{ ...S.input, fontSize: "11px", padding: "5px 8px", maxWidth: "150px" }}>
                                <option value="">— kein Sieger —</option>
                                {trip.players.map(tp => (
                                  <option key={tp.playerId} value={tp.playerId}>{tp.name}</option>
                                ))}
                              </select>
                              {winner && (
                                <span style={{ fontSize: "10px", color: T.gold, fontWeight: 700 }}>
                                  🏆 €{trip.pots.nearestPin * (trip.players.length - 1)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
            })}
          </div>
            </>
          )}

          {/* v44: Stats-View */}
          {tripDetailView === "stats" && (() => {
            const stats = computeTripStats(trip);
            if (!stats || stats.tripRounds === 0) {
              return <EmptyState icon="📊" title="Noch keine Trip-Stats" sub="Stats erscheinen sobald die ersten Runden den Trip-Tagen zugewiesen sind." />;
            }
            const playersList = Object.values(stats.perPlayer).sort((a, b) => b.bestSf - a.bestSf);

            return (
              <>
                <p style={{ fontSize: "11px", color: T.textDim, marginBottom: "12px", lineHeight: 1.5, fontStyle: "italic" }}>
                  Aggregierte Statistiken über alle Trip-Runden ({stats.tripRounds} Runde{stats.tripRounds === 1 ? "" : "n"}).
                </p>

                {/* Pro-Spieler-Karten */}
                {playersList.map(p => {
                  const totalScores = p.birdies + p.pars + p.bogeys + p.doubles;
                  return (
                    <div key={p.playerId || p.name} style={{ ...S.card, padding: "12px 14px", marginBottom: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                        <div style={{ fontSize: "14px", fontWeight: 700, color: T.text }}>{p.name}</div>
                        <div style={{ display: "flex", gap: "8px", fontSize: "11px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                          {p.bestSf > 0 && (
                            <span style={{ color: T.gold, fontWeight: 700 }}>Best <span className="mono">{p.bestSf}</span></span>
                          )}
                          {p.avgSf > 0 && (
                            <span style={{ color: T.textSoft }}>⌀ <span className="mono">{p.avgSf}</span></span>
                          )}
                          {p.totalBrut > 0 && (
                            <span style={{ color: T.textDim }}>Br Σ <span className="mono">{p.totalBrut}</span></span>
                          )}
                        </div>
                      </div>

                      {/* SF-Verlauf pro Tag */}
                      {p.sfHistory.length > 0 && (
                        <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
                          {p.sfHistory.map(h => (
                            <div key={h.dayNumber} style={{
                              flex: 1,
                              padding: "6px 4px",
                              background: T.surface2,
                              borderRadius: "5px",
                              border: `1px solid ${h.sf >= 36 ? T.sage + "40" : T.line}`,
                              textAlign: "center",
                            }}>
                              <div style={{ fontSize: "9px", color: T.textDim }}>T{h.dayNumber}</div>
                              <div className="mono" style={{
                                fontSize: "13px", fontWeight: 700,
                                color: h.sf >= 36 ? T.sage : h.sf >= 30 ? T.gold : T.textSoft,
                              }}>{h.sf}</div>
                              {h.sfBrut > 0 && (
                                <div className="mono" style={{ fontSize: "9px", color: T.textDim, marginTop: "1px" }}>{h.sfBrut}b</div>
                              )}
                              {/* v47: Real-SF in Klammern wenn != Trip-SF */}
                              {h.realSf > 0 && h.realSf !== h.sf && (
                                <div className="mono" style={{ fontSize: "9px", color: T.textDim, marginTop: "1px" }}>({h.realSf})</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Stats-Pills */}
                      {totalScores > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: p.flights.length > 0 ? "8px" : 0 }}>
                          {p.birdies > 0 && <span style={{ background: `${T.gold}15`, color: T.gold, padding: "3px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: 700 }}>🎯 {p.birdies} Birdies</span>}
                          <span style={{ background: T.surface2, color: T.text, padding: "3px 8px", borderRadius: "6px", fontSize: "10px" }}>⛳ {p.pars}</span>
                          <span style={{ background: T.surface2, color: T.textSoft, padding: "3px 8px", borderRadius: "6px", fontSize: "10px" }}>⚠️ {p.bogeys}</span>
                          <span style={{ background: T.surface2, color: T.textSoft, padding: "3px 8px", borderRadius: "6px", fontSize: "10px" }}>💀 {p.doubles}</span>
                          {p.strichCount > 0 && <span style={{ background: `${T.double}15`, color: T.double, padding: "3px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: 700 }}>✗ {p.strichCount}</span>}
                          {p.ladies > 0 && <span style={{ background: `${T.gold}25`, color: T.gold, padding: "3px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: 700 }}>👯 {p.ladies} Ladies</span>}
                        </div>
                      )}

                      {/* Flight-Historie */}
                      {p.flights.length > 0 && (
                        <div style={{ paddingTop: "6px", borderTop: `1px solid ${T.line}` }}>
                          <div style={{ fontSize: "9px", color: T.textDim, fontWeight: 700, letterSpacing: "0.04em", marginBottom: "4px" }}>FLIGHT-HISTORIE</div>
                          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                            {p.flights.sort((a, b) => a.dayNumber - b.dayNumber).map(f => (
                              <span key={f.dayNumber} style={{
                                background: T.surface2, color: T.gold,
                                padding: "3px 6px", borderRadius: "5px",
                                fontSize: "10px", fontWeight: 600,
                              }}>
                                T{f.dayNumber}: <strong>{f.flight}</strong>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            );
          })()}

          {/* v44: Money-View */}
          {tripDetailView === "money" && (() => {
            const money = computeTripMoney(trip);
            if (!money) return <EmptyState icon="💰" title="Noch keine Geld-Bilanz" sub="Bilanz erscheint sobald die ersten Tagesergebnisse da sind." />;
            const ranked = money.ranked;
            const maxAbs = Math.max(...ranked.map(p => Math.abs(p.net)), 1);

            return (
              <>
                <p style={{ fontSize: "11px", color: T.textDim, marginBottom: "12px", lineHeight: 1.5, fontStyle: "italic" }}>
                  Geld-Bilanz pro Spieler. Tippe ein Datum-Häkchen wenn jemand bezahlt hat.
                </p>

                {/* Bilanz-Karten */}
                {ranked.map(p => {
                  const isWin = p.net > 0;
                  const isEven = p.net === 0;
                  return (
                    <div key={p.playerId || p.name} style={{
                      ...S.card, padding: "12px 14px", marginBottom: "10px",
                      borderColor: isWin ? `${T.sage}50` : isEven ? T.line : `${T.double}50`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                        <div style={{ fontSize: "14px", fontWeight: 700, color: T.text }}>{p.name}</div>
                        <div className="mono" style={{
                          fontSize: "20px", fontWeight: 700,
                          color: isWin ? T.sage : isEven ? T.textDim : T.double,
                        }}>
                          {isWin ? "+" : ""}€{p.net}
                        </div>
                      </div>

                      {/* Bilanz-Bar */}
                      <div style={{ height: "4px", background: T.surface2, borderRadius: "2px", overflow: "hidden", marginBottom: "8px", position: "relative" }}>
                        <div style={{
                          height: "100%",
                          width: `${Math.abs(p.net) / maxAbs * 50}%`,
                          background: isWin ? T.sage : T.double,
                          marginLeft: isWin ? "50%" : `${50 - Math.abs(p.net) / maxAbs * 50}%`,
                        }}/>
                        <div style={{
                          position: "absolute", left: "50%", top: 0, bottom: 0,
                          width: "1px", background: T.line,
                        }}/>
                      </div>

                      <div style={{ fontSize: "10px", color: T.textDim, marginBottom: p.wins.length > 0 ? "8px" : 0 }}>
                        Gewonnen: <span style={{ color: T.sage, fontWeight: 600 }}>€{p.won}</span> · Schuldet: <span style={{ color: T.double, fontWeight: 600 }}>€{p.owes}</span>
                      </div>

                      {/* Wins-Liste */}
                      {p.wins.length > 0 && (
                        <div style={{ paddingTop: "8px", borderTop: `1px solid ${T.line}` }}>
                          <div style={{ fontSize: "9px", color: T.textDim, fontWeight: 700, letterSpacing: "0.04em", marginBottom: "5px" }}>SIEGE</div>
                          {p.wins.map((w, wi) => {
                            const dayKey = String(w.dayNumber) + (w.holeInfo ? `_${w.holeInfo}` : "");
                            const paid = !!p.paid[dayKey];
                            const label = w.dayNumber === "GESAMT" ? "🏆 Gesamtwertung"
                              : w.dayNumber === "TEAM" ? `🤝 Team mit ${w.partnerName || "Partner"}`
                              : w.dayNumber === "NEAREST" ? `🎯 Nearest-to-Pin · ${w.holeInfo || ""}`
                              : `Tag ${w.dayNumber}`;
                            const subInfo = typeof w.sf === "number"
                              ? ` · ${w.sf} SF`
                              : "";
                            return (
                              <div key={wi} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0" }}>
                                <span style={{ fontSize: "11px", color: T.text, flex: 1, minWidth: 0 }}>
                                  {label}
                                  <span style={{ color: T.textDim, marginLeft: "5px" }}>{subInfo}</span>
                                </span>
                                <span style={{ fontSize: "11px", color: T.gold, fontWeight: 700 }}>€{w.prize}</span>
                                <button
                                  onClick={() => togglePlayerPaid(trip.id, p.playerId || `name:${normName(p.name)}`, dayKey)}
                                  style={{
                                    width: "22px", height: "22px",
                                    background: paid ? T.sage : T.surface2,
                                    color: paid ? T.canvas : T.textSoft,
                                    border: `1px solid ${paid ? T.sage : T.line}`,
                                    borderRadius: "5px",
                                    fontSize: "13px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                  title={paid ? "Bezahlt — tippen zum Zurücksetzen" : "Tippen wenn bezahlt"}>
                                  {paid ? "✓" : ""}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Hinweis */}
                <div style={{ ...S.card, padding: "10px 12px", background: T.surface2, fontSize: "10px", color: T.textDim, lineHeight: 1.5, marginTop: "8px" }}>
                  💡 Tippe das Häkchen rechts neben einem Sieg wenn der Schuldner bezahlt hat. Die Geld-Bilanz wird basierend auf den Trip-Pots berechnet.
                </div>
              </>
            );
          })()}

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={async () => {
                if (confirm(`Trip "${trip.name}" wirklich löschen?`)) {
                  await deleteTrip(trip.id);
                  close();
                }
              }}
              style={{ ...S.btnSecondary, flex: 1, color: T.double, borderColor: `${T.double}40` }}>
              🗑️ Löschen
            </button>
            <button onClick={close} className="gold-hover" style={{ ...S.btnPrimary, flex: 2 }}>Schließen</button>
          </div>
        </div>
      </div>
    );
  };

  // ── v33: Trash modal — soft-deleted rounds recoverable for 30 days ──
  const renderTrash = () => {
    if (!showTrash) return null;
    return (
      <div onClick={() => setShowTrash(false)}
        style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div onClick={e => e.stopPropagation()} className="slide-up"
          style={{ width: "100%", maxWidth: "520px", background: T.surface1, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", border: `1px solid ${T.line}`, padding: "20px 16px 28px", maxHeight: "92vh", overflowY: "auto" }}>
          <SwipeHandle onClose={() => setShowTrash(false)} />
          <h3 className="serif" style={{ fontSize: "22px", margin: "0 0 4px", color: T.text }}>
            🗑️ Papierkorb
          </h3>
          <p style={{ fontSize: "11px", color: T.textDim, marginBottom: "16px", lineHeight: 1.5 }}>
            Gelöschte Runden bleiben 30 Tage hier wiederherstellbar. Danach werden sie endgültig entfernt.
          </p>

          {trashLoading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: T.textDim, fontSize: "13px" }}>
              ⏳ Lade aus Cloud...
            </div>
          ) : trashedRounds.length === 0 ? (
            <EmptyState icon="🗑️" title="Papierkorb ist leer" sub="Hier landen gelöschte Runden — automatisch 30 Tage geschützt." />
          ) : (
            trashedRounds.map(entry => {
              const r = entry.round_data || {};
              const deletedAt = entry.deleted_at ? new Date(entry.deleted_at) : null;
              const daysLeft = deletedAt
                ? Math.max(0, ARCHIVE_RETENTION_DAYS - Math.floor((Date.now() - deletedAt.getTime()) / (24 * 60 * 60 * 1000)))
                : ARCHIVE_RETENTION_DAYS;
              const playerNames = (r.players || []).map(p => p.name).join(", ") || "—";
              const numHoles = (r.holes || []).length;
              return (
                <div key={entry.id} style={{ ...S.card, padding: "14px", marginBottom: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "8px" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: T.text, marginBottom: "2px" }}>
                        {r.cfg?.clubName || "Runde"}
                      </div>
                      <div style={{ fontSize: "11px", color: T.textSoft, marginBottom: "4px" }}>
                        {fmtDate(r.cfg?.date)} · {numHoles} Loch
                      </div>
                      <div style={{ fontSize: "11px", color: T.textDim }}>
                        👥 {playerNames}
                      </div>
                    </div>
                    <span style={{
                      fontSize: "10px",
                      padding: "3px 8px",
                      borderRadius: "10px",
                      background: daysLeft <= 5 ? `${T.double}25` : `${T.sage}20`,
                      color: daysLeft <= 5 ? T.double : T.sage,
                      whiteSpace: "nowrap",
                      fontWeight: 600,
                    }}>
                      {daysLeft}T übrig
                    </span>
                  </div>
                  <button
                    onClick={() => restoreFromTrash(entry)}
                    style={{ ...S.btnPrimary, width: "100%", fontSize: "12px", padding: "10px", marginTop: "6px" }}>
                    ↩️ Wiederherstellen
                  </button>
                </div>
              );
            })
          )}

          <button onClick={() => setShowTrash(false)}
            style={{ ...S.btnGhost, width: "100%", marginTop: "14px", fontSize: "13px" }}>Schließen</button>
        </div>
      </div>
    );
  };

  const renderBackupRestore = () => {
    if (!showBackupRestore) return null;

    const restoreBackup = async (backup) => {
      if (!confirm(`Wirklich ${rounds.length} aktuelle Runden durch ${backup.count} aus diesem Backup ersetzen?\n\n"${backup.label}"\n\nDeine aktuelle Daten werden VORHER nochmal gesichert.`)) return;
      try {
        // Snapshot current state before replacing
        await window.storage.set(
          `golf-backup-before-restore-${Date.now()}`,
          JSON.stringify({ rounds, friends, customClubs })
        );
      } catch {}
      const b = await window.storage.get(backup.key);
      if (!b?.value) {
        alert("Backup-Datei nicht lesbar.");
        return;
      }
      const d = JSON.parse(b.value);
      const r = typeof d.rounds === "string" ? JSON.parse(d.rounds) : (d.rounds || []);
      const f = typeof d.friends === "string" ? JSON.parse(d.friends) : (d.friends || []);
      const c = typeof d.customClubs === "string" ? JSON.parse(d.customClubs) : (d.customClubs || []);
      setRounds(r);
      setFriends(f);
      setCustomClubs(c);
      try { await window.storage.set("golf-rounds", JSON.stringify(r)); } catch {}
      try { await window.storage.set("golf-friends", JSON.stringify(f)); } catch {}
      try { await window.storage.set("golf-custom-clubs", JSON.stringify(c)); } catch {}
      try { await window.storage.set("golf-last-sync", "0"); } catch {}
      setShowBackupRestore(false);
      showUndoToast(`✓ Wiederhergestellt: ${r.length} Runden, ${f.length} Freunde`, null);
    };

    return (
      <div onClick={() => setShowBackupRestore(false)}
        style={{
          position: "fixed", inset: 0, background: "#000000dd", zIndex: 1180,
          display: "flex", alignItems: "flex-end", justifyContent: "center",
        }}>
        <div onClick={e => e.stopPropagation()} className="slide-up"
          style={{
            width: "100%", maxWidth: "520px",
            background: T.surface1,
            borderTopLeftRadius: "24px", borderTopRightRadius: "24px",
            border: `1px solid ${T.line}`, padding: "20px 16px 28px",
            maxHeight: "92vh", overflowY: "auto",
          }}>
          <SwipeHandle onClose={() => setShowBackupRestore(false)} />

          <h3 className="serif" style={{ fontSize: "22px", margin: "0 0 6px", color: T.text }}>
            💾 Backup wiederherstellen
          </h3>
          <p style={{ fontSize: "11px", color: T.textSoft, marginBottom: "16px" }}>
            Wähle ein Backup das du wiederherstellen willst. Deine aktuelle Daten werden vorher automatisch nochmal gesichert.
          </p>

          {backupList.length === 0 ? (
            <div style={{ padding: "30px 20px", textAlign: "center", color: T.textDim, fontSize: "13px" }}>
              Keine Backups gefunden.
            </div>
          ) : (
            backupList.map(b => (
              <div key={b.key}
                style={{
                  ...S.card, padding: "12px 14px", marginBottom: "8px",
                  border: `1px solid ${b.type === "cloud-pull" ? T.gold + "40" : T.line}`,
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px", gap: "10px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: T.text, display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      {b.type === "cloud-pull" && (
                        <span style={{
                          fontSize: "9px", padding: "1px 5px",
                          background: `${T.gold}25`, color: T.gold,
                          border: `1px solid ${T.gold}50`,
                          borderRadius: "4px", letterSpacing: "0.04em", fontWeight: 700,
                        }}>SCHUTZ-BACKUP</span>
                      )}
                      <span>{b.label}</span>
                    </div>
                    <div style={{ fontSize: "11px", color: T.textSoft, marginTop: "4px" }}>
                      {b.count} Runden · {b.friends} Freunde · {b.clubs} Clubs
                    </div>
                    {b.latestRound && (
                      <div style={{ fontSize: "10px", color: T.textDim, marginTop: "2px" }}>
                        Neueste: {b.latestRound}
                        {b.latestDate && ` (${fmtDate(b.latestDate)})`}
                      </div>
                    )}
                  </div>
                  <button onClick={() => restoreBackup(b)}
                    style={{ ...S.btnSecondary, padding: "6px 12px", fontSize: "11px", color: T.gold, borderColor: `${T.gold}50`, flexShrink: 0 }}>
                    Laden
                  </button>
                </div>
              </div>
            ))
          )}

          <button onClick={() => setShowBackupRestore(false)}
            style={{ ...S.btnGhost, width: "100%", marginTop: "14px", fontSize: "13px" }}>
            Schließen
          </button>
        </div>
      </div>
    );
  };

  const renderLiveViewerModal = () => {
    if (!viewingLive) return null;
    const data = viewingLive.data || {};
    const livePlayers = Array.isArray(data.players) ? data.players : [];
    const liveHoles = Array.isArray(data.holes) ? data.holes : [];
    const liveScores = data.scores || {};
    const liveCfg = data.cfg || {};
    const liveLadies = data.ladies || {};
    const liveGameMode = data.gameMode || "stableford";
    const isLiveUschi = liveGameMode !== "stableford";

    // Use the snapshot of the club for tee/CR/Slope info
    const liveClub = data.selectedClubSnapshot || null;

    // Compute stats per player (mirroring live.html logic)
    const liveStats = livePlayers.map(p => {
      const teeName = p.teeName || liveCfg.defaultTeeName;
      const tee = liveClub?.tees && teeName && liveClub.tees[teeName]
        ? liveClub.tees[teeName]
        : (liveClub?.tees ? Object.values(liveClub.tees)[0] : null);
      const hcpNum = typeof p.hcp === "number" ? p.hcp : parseFloat(p.hcp) || 0;
      const ph = (typeof p.phOverride === "number")
        ? p.phOverride
        : (tee ? calcPH(hcpNum, tee.slope, tee.cr, tee.par) : 0);
      let bT = 0, sfNT = 0, strichCount = 0;
      liveHoles.forEach((h, i) => {
        const g = liveScores[p.id]?.[i];
        if (isStrich(g)) { strichCount++; return; }
        if (!isValid(g)) return;
        bT += g;
        const hs = holeHS(ph, h.si, liveHoles.length);
        sfNT += sfNetto(g, hs, h.par) || 0;
      });
      const ladyCount = (liveLadies[p.id] || []).length;
      return { p, ph, bT, sfNT, strichCount, ladyCount };
    });

    // Sort by SF (or Uschi total if available)
    const sorted = [...liveStats].sort((a, b) => b.sfNT - a.sfNT);

    // Holes played: max hole index with any score
    let maxScored = 0;
    livePlayers.forEach(p => {
      liveHoles.forEach((_, i) => {
        const g = liveScores[p.id]?.[i];
        if (typeof g === "number" || g === null) maxScored = Math.max(maxScored, i + 1);
      });
    });
    const ageMs = Date.now() - new Date(viewingLive.updated_at).getTime();
    const ageLabel = ageMs < 60000 ? "gerade eben"
      : ageMs < 3600000 ? `vor ${Math.floor(ageMs / 60000)} Min`
      : `vor ${Math.floor(ageMs / 3600000)} Std`;

    return (
      <div onClick={() => setViewingLive(null)}
        style={{
          position: "fixed", inset: 0, background: "#000000dd", zIndex: 1180,
          display: "flex", alignItems: "flex-end", justifyContent: "center",
        }}>
        <div onClick={e => e.stopPropagation()} className="slide-up"
          style={{
            width: "100%", maxWidth: "520px",
            background: T.surface1,
            borderTopLeftRadius: "24px", borderTopRightRadius: "24px",
            border: `1px solid ${T.line}`, padding: "20px 16px 28px",
            maxHeight: "92vh", overflowY: "auto",
          }}>
          <SwipeHandle onClose={() => setViewingLive(null)} />

          {/* Header */}
          <div style={{ marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{
                display: "inline-block", width: "8px", height: "8px",
                borderRadius: "50%", background: "#ff4444",
                animation: "pulse 1.5s ease-in-out infinite",
              }}/>
              <span style={{ fontSize: "10px", color: T.textDim, letterSpacing: "0.06em", fontWeight: 700 }}>
                LIVE · {ageLabel}
              </span>
            </div>
            <h3 className="serif" style={{ fontSize: "22px", margin: "0 0 4px", color: T.text }}>
              {liveCfg.clubName || "Live-Runde"}
            </h3>
            <p style={{ fontSize: "11px", color: T.textSoft }}>
              {livePlayers.map(p => p.name).join(", ")} · {maxScored}/{liveHoles.length} Löcher
            </p>
          </div>

          {/* TensionBar in modal */}
          {maxScored >= 3 && sorted.length >= 2 && (
            <div style={{ ...S.card, padding: "10px 14px", marginBottom: "12px" }}>
              <TensionBar
                topName={sorted[0].p.name}
                topScore={sorted[0].sfNT}
                secondName={sorted[1].p.name}
                secondScore={sorted[1].sfNT}
                unit={isLiveUschi ? "Pkt" : "SF"}/>
            </div>
          )}

          {/* Standings list */}
          <div style={{ ...S.card, marginBottom: "14px" }}>
            <div style={{ ...S.eyebrow, marginBottom: "10px" }}>Rangliste</div>
            {sorted.map((s, i) => (
              <div key={s.p.id} style={{
                display: "flex", alignItems: "center",
                padding: "10px 0",
                borderBottom: i < sorted.length - 1 ? `1px solid ${T.line}` : "none",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: T.text, display: "flex", alignItems: "center", gap: "6px" }}>
                    {i === 0 && "🥇 "}{s.p.name}
                  </div>
                  <div style={{ fontSize: "10px", color: T.textSoft, marginTop: "2px" }}>
                    HCP {s.p.hcp} · Vorgabe {s.ph} · Brutto {s.bT || "—"}{s.strichCount > 0 ? "*" : ""} · SF {s.sfNT}
                    {s.ladyCount > 0 && ` · 👯 ${s.ladyCount}`}
                  </div>
                </div>
                <div className="mono" style={{ fontSize: "22px", fontWeight: 700, color: T.gold, minWidth: "40px", textAlign: "right" }}>
                  {s.sfNT}
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={async () => {
              // Manual refresh: re-fetch this specific code from the active rounds list
              const fresh = activeLiveRounds.find(r => r.code === viewingLive.code);
              if (fresh) {
                setViewingLive(fresh);
              }
            }}
              style={{ ...S.btnSecondary, flex: 1, fontSize: "12px", padding: "10px" }}>
              🔄 Aktualisieren
            </button>
            <button onClick={() => setViewingLive(null)}
              className="gold-hover"
              style={{ ...S.btnPrimary, flex: 1, fontSize: "12px", padding: "10px" }}>
              Schließen
            </button>
          </div>
        </div>
      </div>
    );
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
  // OWNER SETUP MODAL — first-time prompt to capture user's own player profile
  // so they're auto-added to every new round.
  // Also reachable from Settings for editing.
  // ═══════════════════════════════════════════════════════════════════════════
  const [ownerSetupOpen, setOwnerSetupOpen] = useState(false);
  // v46: Onboarding-Choice — vor Owner-Setup zeigen
  const [showOnboardingChoice, setShowOnboardingChoice] = useState(false);
  const [onboardingMode, setOnboardingMode] = useState("choice"); // choice | sync-input | name-pick
  const [ownerForm, setOwnerForm] = useState({ name: "", hcp: "" });

  // ── v46: Onboarding-Choice — vor dem ersten Owner-Setup ──
  const renderOnboardingChoice = () => {
    if (!showOnboardingChoice) return null;

    const close = () => { setShowOnboardingChoice(false); setOnboardingMode("choice"); };
    const proceedToOwnerSetup = () => {
      setShowOnboardingChoice(false);
      setOnboardingMode("choice");
      setOwnerSetupOpen(true);
      setOwnerForm({ name: "", hcp: "" });
    };

    return (
      <div style={{ position: "fixed", inset: 0, background: "#000000ee", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div className="slide-up"
          style={{ width: "100%", maxWidth: "440px", background: T.surface1, borderRadius: "20px", border: `1px solid ${T.line}`, padding: "24px 20px", maxHeight: "92vh", overflowY: "auto" }}>

          {/* ── MODE: Choice ── */}
          {onboardingMode === "choice" && (
            <>
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <div style={{ fontSize: "40px", marginBottom: "8px" }}>👋</div>
                <h3 className="serif" style={{ fontSize: "22px", margin: "0 0 4px", color: T.text }}>Willkommen bei Fairway</h3>
                <p style={{ fontSize: "12px", color: T.textSoft, margin: 0, lineHeight: 1.5 }}>
                  Wie möchtest du starten?
                </p>
              </div>

              <button
                onClick={() => { setOnboardingMode("sync-input"); setSyncInput(""); }}
                className="card-hover"
                style={{ ...S.card, width: "100%", padding: "14px", marginBottom: "10px", textAlign: "left", cursor: "pointer", border: `1px solid ${T.gold}40` }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ fontSize: "28px" }}>☁️</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: T.gold, marginBottom: "2px" }}>
                      Sync-Code eingeben
                    </div>
                    <div style={{ fontSize: "11px", color: T.textSoft, lineHeight: 1.5 }}>
                      Wenn dich jemand aus deiner Crew eingeladen hat — du übernimmst Freunde + Clubs
                    </div>
                  </div>
                  <div style={{ color: T.gold, fontSize: "20px" }}>›</div>
                </div>
              </button>

              <button
                onClick={proceedToOwnerSetup}
                className="card-hover"
                style={{ ...S.card, width: "100%", padding: "14px", marginBottom: "16px", textAlign: "left", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ fontSize: "28px" }}>🆕</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: T.text, marginBottom: "2px" }}>
                      Neu starten
                    </div>
                    <div style={{ fontSize: "11px", color: T.textSoft, lineHeight: 1.5 }}>
                      Eigenes Profil + neuer Sync-Code für deine eigene Crew
                    </div>
                  </div>
                  <div style={{ color: T.textSoft, fontSize: "20px" }}>›</div>
                </div>
              </button>

              <button
                onClick={async () => {
                  try { await window.storage.set("golf-owner-setup-skipped", "1"); } catch {}
                  close();
                }}
                style={{ ...S.btnGhost, width: "100%", fontSize: "11px", padding: "8px" }}>
                Später · ohne Profil starten
              </button>
            </>
          )}

          {/* ── MODE: Sync-Input ── */}
          {onboardingMode === "sync-input" && (
            <>
              <button onClick={() => setOnboardingMode("choice")} style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 8px", marginBottom: "12px" }}>← zurück</button>
              <h3 className="serif" style={{ fontSize: "20px", margin: "0 0 4px", color: T.text }}>☁️ Sync-Code eingeben</h3>
              <p style={{ fontSize: "12px", color: T.textSoft, lineHeight: 1.5, marginBottom: "14px" }}>
                Tipp den Code deiner Gruppe ein. Wir laden dann Freunde + Clubs aus der Cloud.
              </p>

              <div style={{ ...S.eyebrow, marginBottom: "6px" }}>Sync-Code</div>
              <input value={syncInput}
                onChange={e => setSyncInput(cleanSync(e.target.value))}
                placeholder="z.B. FLIGHT-CLUB"
                maxLength={20}
                autoFocus
                style={{ ...S.input, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "JetBrains Mono, monospace", fontSize: "16px", marginBottom: "10px" }}/>

              <div style={{ fontSize: "10px", color: T.textDim, marginBottom: "14px", lineHeight: 1.4 }}>
                💡 Code ist 4-20 Zeichen lang. Buchstaben, Zahlen, Bindestrich. Wird wie ein Passwort behandelt.
              </div>

              <button
                onClick={async () => {
                  if (!isValidSyncCode(syncInput)) {
                    showUndoToast("⚠️ Code muss 4-20 Zeichen lang sein", null);
                    return;
                  }
                  // Setup sync first → das lädt Friends + Clubs aus der Cloud
                  await setupSync(syncInput);
                  // Dann zur Name-Auswahl wechseln
                  setOnboardingMode("name-pick");
                }}
                disabled={!isValidSyncCode(syncInput)}
                className="gold-hover"
                style={{ ...S.btnPrimary, width: "100%", opacity: !isValidSyncCode(syncInput) ? 0.4 : 1 }}>
                ☁️ Verbinden & Daten laden
              </button>
            </>
          )}

          {/* ── MODE: Name-Pick (nach Sync-Connect) ── */}
          {onboardingMode === "name-pick" && (
            <>
              <h3 className="serif" style={{ fontSize: "20px", margin: "0 0 4px", color: T.text }}>👤 Wer bist du?</h3>
              <p style={{ fontSize: "12px", color: T.textSoft, lineHeight: 1.5, marginBottom: "14px" }}>
                {friends.length > 0
                  ? `Wähle deinen Namen aus der Crew oder lege dich neu an.`
                  : `Es sind noch keine Freunde in der Cloud. Lege dein Profil an.`}
              </p>

              {friends.length > 0 && (
                <>
                  <div style={{ ...S.eyebrow, marginBottom: "8px" }}>👥 Bestehende Crew</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "14px" }}>
                    {friends.map(f => (
                      <button
                        key={f.playerId || f.name}
                        onClick={async () => {
                          const profile = { name: f.name, hcp: f.hcp };
                          await saveOwnerProfile(profile);
                          showUndoToast(`✓ Willkommen zurück, ${f.name}!`, null);
                          close();
                        }}
                        className="card-hover"
                        style={{
                          display: "flex", alignItems: "center", gap: "10px",
                          padding: "10px 12px",
                          background: T.surface2,
                          border: `1px solid ${T.line}`,
                          borderRadius: "10px",
                          textAlign: "left",
                          cursor: "pointer",
                        }}>
                        <div style={{
                          width: "32px", height: "32px", borderRadius: "50%",
                          background: `${T.gold}20`, border: `1px solid ${T.gold}40`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "13px", fontWeight: 700, color: T.gold,
                        }}>
                          {(f.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "13px", fontWeight: 600, color: T.text }}>{f.name}</div>
                          <div style={{ fontSize: "10px", color: T.textSoft }}>HCP {f.hcp}</div>
                        </div>
                        <span style={{ color: T.textSoft, fontSize: "16px" }}>›</span>
                      </button>
                    ))}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "12px 0" }}>
                    <div style={{ flex: 1, height: "1px", background: T.line }}/>
                    <div style={{ fontSize: "10px", color: T.textDim, letterSpacing: "0.06em" }}>ODER</div>
                    <div style={{ flex: 1, height: "1px", background: T.line }}/>
                  </div>
                </>
              )}

              <button
                onClick={() => {
                  setShowOnboardingChoice(false);
                  setOnboardingMode("choice");
                  setOwnerSetupOpen(true);
                  setOwnerForm({ name: "", hcp: "" });
                }}
                style={{ ...S.btnSecondary, width: "100%" }}>
                🆕 Neuen Namen anlegen
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderOwnerSetup = () => {
    if (!ownerSetupOpen) return null;
    const isEditing = !!ownerProfile;

    // v42: Lustige Pro-Golfer-Beispiele als Placeholder
    const golferExamples = [
      { name: "Tiger Woods", hcp: "+5.0" },
      { name: "Rory McIlroy", hcp: "+4.5" },
      { name: "Scottie Scheffler", hcp: "+5.5" },
      { name: "Jon Rahm", hcp: "+4.0" },
      { name: "John Daly", hcp: "5.0" },
      { name: "Phil Mickelson", hcp: "+2.5" },
      { name: "Bernhard Langer", hcp: "0.5" },
      { name: "Sergio García", hcp: "+1.5" },
    ];
    // Wähle ein Beispiel basierend auf Datum (täglich rotierend, vermeidet bei jedem Re-Render Wechsel)
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const example = golferExamples[dayOfYear % golferExamples.length];
    return (
      <div onClick={() => setOwnerSetupOpen(false)}
        style={{
          position: "fixed", inset: 0, background: "#000000dd", zIndex: 1180,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
        }}>
        <div onClick={e => e.stopPropagation()}
          style={{
            width: "100%", maxWidth: "420px",
            background: T.surface1, borderRadius: "16px",
            border: `1px solid ${T.line}`, padding: "22px",
          }}>
          <div style={{ fontSize: "32px", textAlign: "center", marginBottom: "12px" }}>👤</div>
          <h3 className="serif" style={{ fontSize: "22px", margin: "0 0 6px", color: T.text, textAlign: "center" }}>
            {isEditing ? "Mein Profil" : "Wer bist du?"}
          </h3>
          <p style={{ fontSize: "12px", color: T.textSoft, textAlign: "center", marginBottom: "18px", lineHeight: 1.5 }}>
            {isEditing
              ? "Dein Profil — wird bei jeder neuen Runde automatisch eingetragen."
              : "Wenn du dich einmal einträgst, wirst du bei jeder neuen Runde automatisch als erster Spieler hinzugefügt."}
          </p>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ ...S.eyebrow, marginBottom: "6px", display: "block" }}>Name</label>
            <input
              type="text"
              value={ownerForm.name}
              onChange={e => setOwnerForm(f => ({ ...f, name: e.target.value }))}
              placeholder={`z.B. ${example.name}`}
              autoFocus
              style={{ ...S.input, width: "100%" }}/>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ ...S.eyebrow, marginBottom: "6px", display: "block" }}>Stammvorgabe (HCP)</label>
            <input
              type="number" step="0.1"
              value={ownerForm.hcp}
              onChange={e => setOwnerForm(f => ({ ...f, hcp: e.target.value }))}
              placeholder={`z.B. ${example.hcp}`}
              style={{ ...S.input, width: "100%" }}/>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {isEditing && (
              <button
                onClick={async () => {
                  if (!confirm("Mein Profil wirklich entfernen?")) return;
                  setOwnerProfile(null);
                  try { await window.storage.delete("golf-owner-profile"); } catch {}
                  setOwnerSetupOpen(false);
                }}
                style={{ ...S.btnSecondary, flex: 1, padding: "11px", fontSize: "12px", color: T.double, borderColor: `${T.double}40` }}>
                Entfernen
              </button>
            )}
            <button onClick={async () => {
              setOwnerSetupOpen(false);
              try { await window.storage.set("golf-owner-setup-skipped", "1"); } catch {}
            }}
              style={{ ...S.btnSecondary, flex: 1, padding: "11px", fontSize: "13px" }}>
              {isEditing ? "Abbrechen" : "Später"}
            </button>
            <button
              onClick={async () => {
                const name = ownerForm.name.trim();
                if (!name) { alert("Bitte einen Namen eingeben."); return; }
                const hcp = parseFloat(ownerForm.hcp);
                await saveOwnerProfile({ name, hcp: isNaN(hcp) ? 0 : hcp });
                setOwnerSetupOpen(false);
              }}
              className="gold-hover"
              style={{ ...S.btnPrimary, flex: 2, padding: "11px", fontSize: "13px" }}>
              {isEditing ? "Speichern" : "Los geht's"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Open onboarding choice automatically once after welcome, if not yet set
  // v46: Erst Choice-Screen ("Sync-Code eingeben" oder "Neu starten"), dann Owner-Setup
  useEffect(() => {
    if (loaded && !ownerProfile && !showWelcome && !ownerSetupOpen && !showOnboardingChoice) {
      (async () => {
        try {
          const skipped = await window.storage.get("golf-owner-setup-skipped");
          if (!skipped?.value) {
            setShowOnboardingChoice(true);
            setOnboardingMode("choice");
          }
        } catch {}
      })();
    }
  }, [loaded, showWelcome]);

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
      // v47.1: Trips + Owner-Profile aus Cloud
      setTrips(cloudData.trips || []);
      try { await window.storage.set("golf-trips", JSON.stringify(cloudData.trips || [])); } catch {}
      if (cloudData.ownerProfile) {
        setOwnerProfile(cloudData.ownerProfile);
        try { await window.storage.set("golf-owner-profile", JSON.stringify(cloudData.ownerProfile)); } catch {}
      }
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

      // v47.1: Trips merge by ID
      const cloudTrips = syncConflict.cloudData.trips || [];
      const cloudTripIds = new Set(cloudTrips.map(t => t.id));
      const localTripsRaw = await window.storage.get("golf-trips");
      const localTrips = localTripsRaw?.value ? JSON.parse(localTripsRaw.value) : [];
      const mergedTrips = [...cloudTrips, ...localTrips.filter(t => !cloudTripIds.has(t.id))];
      setTrips(mergedTrips);
      try { await window.storage.set("golf-trips", JSON.stringify(mergedTrips)); } catch {}

      // v47.1: Owner-Profile aus Cloud falls keiner lokal
      if (syncConflict.cloudData.ownerProfile && !ownerProfile?.name) {
        setOwnerProfile(syncConflict.cloudData.ownerProfile);
        try { await window.storage.set("golf-owner-profile", JSON.stringify(syncConflict.cloudData.ownerProfile)); } catch {}
      }
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
          {undoAction.actionLabel || "Rückgängig"}
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
            <p style={{ fontSize: "11px", color: T.textDim, lineHeight: 1.5, margin: "0 0 12px", fontStyle: "italic" }}>
              Wichtig: Jeder mit dem Code kann Daten lesen und schreiben. Teile ihn nur mit Leuten denen du vertraust.
            </p>
            <button
              onClick={() => {
                setShowWelcome(false);
                setShowSyncModal(true);
              }}
              style={{ ...S.btnSecondary, width: "100%", color: T.gold, borderColor: `${T.gold}50`, background: `${T.gold}10`, fontSize: "12px" }}>
              ☁️ Direkt zu Sync-Settings
            </button>
          </>
        ),
      },
      {
        icon: "📊",
        title: "Stats & Form-Trends",
        body: (
          <>
            <p style={{ fontSize: "13px", color: T.textSoft, lineHeight: 1.6, margin: "0 0 12px" }}>
              Drei Tabs helfen dir den Überblick zu behalten:
            </p>
            <div style={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: "8px", padding: "12px", marginBottom: "8px" }}>
              <div style={{ fontSize: "12px", color: T.gold, fontWeight: 700, marginBottom: "4px" }}>📊 Stats-Tab</div>
              <div style={{ fontSize: "11px", color: T.text, lineHeight: 1.5 }}>
                Pro-Club-Statistiken: Birdies, Pars, Striche, schwerste Löcher. Tap auf einen Spieler für Details.
              </div>
            </div>
            <div style={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: "8px", padding: "12px", marginBottom: "8px" }}>
              <div style={{ fontSize: "12px", color: T.gold, fontWeight: 700, marginBottom: "4px" }}>📈 Form-Tab</div>
              <div style={{ fontSize: "11px", color: T.text, lineHeight: 1.5 }}>
                Sim-HCP zeigt wie du <b>aktuell</b> spielst (vs. offiziellem HCP). Top-Block: deine Form. Mittel: Crew-Trends. Unten: Highlights.
              </div>
            </div>
            <div style={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: "8px", padding: "12px" }}>
              <div style={{ fontSize: "12px", color: T.gold, fontWeight: 700, marginBottom: "4px" }}>🎯 Pick-Up-Regel</div>
              <div style={{ fontSize: "11px", color: T.text, lineHeight: 1.5 }}>
                Auto-Strich wenn dein Score so hoch ist dass keine SF-Punkte mehr drin sind. Lang drücken auf Score-Feld = Strich direkt.
              </div>
            </div>
          </>
        ),
      },
      {
        icon: "🏖️",
        title: "Trip-Modus für Reisen",
        body: (
          <>
            <p style={{ fontSize: "13px", color: T.textSoft, lineHeight: 1.6, margin: "0 0 12px" }}>
              Mehrtägige Golfreisen wie Cyprus oder Portugal werden im <b style={{ color: T.gold }}>🏖️ Trips-Tab</b> angelegt:
            </p>
            <div style={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: "8px", padding: "12px", marginBottom: "10px" }}>
              <div style={{ fontSize: "12px", color: T.gold, fontWeight: 700, marginBottom: "6px" }}>Was ein Trip macht</div>
              <ul style={{ fontSize: "12px", color: T.text, lineHeight: 1.6, paddingLeft: "18px", margin: 0 }}>
                <li>Mehrere Spieltage zusammenfassen</li>
                <li>Pots verwalten (€ pro Tagessieger, Gesamt-Wertung)</li>
                <li>Tageswertung + Gesamt-Rangliste auf einen Blick</li>
              </ul>
            </div>
            <p style={{ fontSize: "11px", color: T.textDim, lineHeight: 1.5, margin: 0, fontStyle: "italic" }}>
              Du spielst weiter <b>normale Runden</b> wie immer und weist sie dann den Trip-Tagen zu. Die App rechnet alles aus.
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <h3 className="serif" style={{ fontSize: "24px", margin: 0, color: T.text }}>☁️ Cloud Sync</h3>
            <button
              onClick={() => { setShowSyncModal(false); setWelcomeSlide(0); setShowWelcome(true); }}
              title="App-Tour & Hilfe öffnen"
              style={{ ...S.btnGhost, padding: "6px 12px", fontSize: "11px", color: T.gold, borderColor: `${T.gold}40` }}>
              ❔ Hilfe & Regeln
            </button>
          </div>

          {/* Owner profile section — appears at the top of sync settings */}
          <div style={{ marginTop: "12px", marginBottom: "16px", padding: "14px", background: T.surface2, borderRadius: "10px", border: `1px solid ${T.line}` }}>
            <div style={{ ...S.eyebrow, marginBottom: "8px" }}>👤 Mein Profil</div>
            {ownerProfile ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: T.text }}>{ownerProfile.name}</div>
                  <div style={{ fontSize: "11px", color: T.textSoft, marginTop: "2px" }}>HCP {ownerProfile.hcp}</div>
                </div>
                <button
                  onClick={() => {
                    setOwnerForm({ name: ownerProfile.name, hcp: String(ownerProfile.hcp ?? "") });
                    setOwnerSetupOpen(true);
                  }}
                  style={{ ...S.btnGhost, padding: "6px 10px", fontSize: "11px" }}>
                  ✏️ Bearbeiten
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setOwnerForm({ name: "", hcp: "" });
                  setOwnerSetupOpen(true);
                }}
                style={{ ...S.btnSecondary, width: "100%", fontSize: "12px", padding: "10px" }}>
                + Mein Profil einrichten
              </button>
            )}
            <p style={{ fontSize: "10px", color: T.textDim, marginTop: "8px", lineHeight: 1.4, fontStyle: "italic" }}>
              Wenn gesetzt, wirst du bei jeder neuen Runde automatisch als erster Spieler eingetragen.
            </p>
          </div>

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

          {/* v39: Player-Manager-Trigger */}
          <div style={{ marginTop: "22px", paddingTop: "18px", borderTop: `1px solid ${T.line}` }}>
            <div style={{ ...S.eyebrow, marginBottom: "10px", color: T.sage }}>👥 Spieler verwalten</div>
            <p style={{ fontSize: "11px", color: T.textDim, lineHeight: 1.5, marginBottom: "10px" }}>
              HCPs aktualisieren, Aliase verwalten („Thorsti" = „Thorsten"), doppelte Spieler zusammenführen.
            </p>
            <button onClick={() => { setShowSyncModal(false); setShowPlayerManager(true); setPlayerManagerFocus(null); }}
              style={{ ...S.btnSecondary, width: "100%", color: T.sage, borderColor: `${T.sage}40`, background: `${T.sage}10` }}>
              👥 Spieler-Manager öffnen ({friends.length})
            </button>
          </div>

          {/* v33: Cloud Archive (Soft-Delete + Recovery) */}
          {SYNC_ENABLED && (
            <div style={{ marginTop: "22px", paddingTop: "18px", borderTop: `1px solid ${T.line}` }}>
              <div style={{ ...S.eyebrow, marginBottom: "10px", color: T.gold }}>🛡️ Cloud-Archiv</div>
              <p style={{ fontSize: "11px", color: T.textDim, lineHeight: 1.5, marginBottom: "10px" }}>
                Abgeschlossene Runden werden automatisch sicher gespeichert. Gelöschte Runden bleiben 30 Tage im Papierkorb.
              </p>

              {/* Last archive timestamp */}
              <div style={{ background: T.surface2, borderRadius: "10px", padding: "10px 12px", marginBottom: "10px", fontSize: "11px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                <span style={{ color: T.textSoft }}>Letzte Sicherung:</span>
                <span className="mono" style={{ color: lastCloudArchive ? T.sage : T.textDim }}>
                  {(() => {
                    if (!lastCloudArchive) return "noch nie";
                    const ageMs = Date.now() - lastCloudArchive;
                    const ageMin = Math.floor(ageMs / 60000);
                    const ageHr = Math.floor(ageMin / 60);
                    const ageDay = Math.floor(ageHr / 24);
                    if (ageMin < 1) return "gerade eben ✓";
                    if (ageMin < 60) return `vor ${ageMin} Min ✓`;
                    if (ageHr < 24) return `vor ${ageHr} Std ✓`;
                    return `vor ${ageDay} Tag${ageDay === 1 ? "" : "en"} ✓`;
                  })()}
                </span>
              </div>

              {/* Manual save + Trash */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <button
                  onClick={manualArchiveAll}
                  disabled={archiveStatus === "saving"}
                  style={{
                    ...S.btnSecondary, fontSize: "12px", padding: "10px",
                    color: T.gold, borderColor: `${T.gold}40`,
                    opacity: archiveStatus === "saving" ? 0.5 : 1,
                  }}>
                  {archiveStatus === "saving" ? "⏳ Sichere..." : archiveStatus === "success" ? "✓ Gesichert" : archiveStatus === "error" ? "⚠ Fehler" : "💾 Jetzt sichern"}
                </button>
                <button
                  onClick={openTrash}
                  style={{ ...S.btnSecondary, fontSize: "12px", padding: "10px", color: T.sage, borderColor: `${T.sage}40` }}>
                  🗑️ Papierkorb
                </button>
              </div>
              <p style={{ fontSize: "10px", color: T.textDim, marginTop: "8px", lineHeight: 1.4, fontStyle: "italic" }}>
                Owner-Filter: nur {ARCHIVE_OWNER_EMAIL} sieht deine archivierten Runden.
              </p>
            </div>
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
              // Build list of backups (auto-backups + cloud-pull-backups)
              try {
                const auto = await window.storage.list("golf-rounds-backup-");
                const cloudPull = await window.storage.list("golf-backup-before-cloud-pull-");
                const allKeys = [
                  ...(auto?.keys || []).map(k => ({ key: k, type: "daily" })),
                  ...(cloudPull?.keys || []).map(k => ({ key: k, type: "cloud-pull" })),
                ];
                if (!allKeys.length) {
                  alert("Keine Backups gefunden.");
                  return;
                }
                // Sort newest first by parsing the timestamp/date in the key
                const detailed = [];
                for (const { key, type } of allKeys) {
                  const b = await window.storage.get(key);
                  if (!b?.value) continue;
                  try {
                    const d = JSON.parse(b.value);
                    const r = typeof d.rounds === "string" ? JSON.parse(d.rounds) : (d.rounds || []);
                    const f = typeof d.friends === "string" ? JSON.parse(d.friends) : (d.friends || []);
                    const c = typeof d.customClubs === "string" ? JSON.parse(d.customClubs) : (d.customClubs || []);
                    let label = "";
                    let timestamp = 0;
                    if (type === "daily") {
                      const dateStr = key.replace("golf-rounds-backup-", "");
                      label = `Auto-Backup vom ${dateStr}`;
                      // Parse YYYYMMDD
                      const yyyy = dateStr.slice(0, 4), mm = dateStr.slice(4, 6), dd = dateStr.slice(6, 8);
                      timestamp = new Date(`${yyyy}-${mm}-${dd}`).getTime();
                    } else {
                      const ts = parseInt(key.replace("golf-backup-before-cloud-pull-", ""));
                      timestamp = ts;
                      label = `Vor Cloud-Pull · ${new Date(ts).toLocaleString("de-AT", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                      })}`;
                    }
                    detailed.push({
                      key, label, type, timestamp,
                      count: r.length,
                      friends: f.length,
                      clubs: c.length,
                      latestRound: r[0]?.cfg?.clubName || null,
                      latestDate: r[0]?.cfg?.date || null,
                    });
                  } catch {}
                }
                detailed.sort((a, b) => b.timestamp - a.timestamp);
                setBackupList(detailed);
                setShowBackupRestore(true);
              } catch (e) {
                alert("Fehler beim Lesen der Backups: " + (e.message || "?"));
              }
            }}
              style={{ ...S.btnSecondary, width: "100%", fontSize: "11px", padding: "8px", marginTop: "8px", color: T.gold, borderColor: `${T.gold}40` }}>
              💾 Aus Backup wiederherstellen
            </button>
            <p style={{ fontSize: "10px", color: T.textDim, marginTop: "6px", lineHeight: 1.4, fontStyle: "italic" }}>
              Auto-Backups werden täglich automatisch erstellt (letzte 7 Tage).
            </p>
          </div>

          {/* Sync diagnose: shows cloud vs local state, with force-pull option */}
          {SYNC_ENABLED && syncCode && (
            <div style={{ marginTop: "18px", paddingTop: "16px", borderTop: `1px solid ${T.line}` }}>
              <div style={{ ...S.eyebrow, marginBottom: "8px" }}>Sync-Diagnose</div>
              <p style={{ fontSize: "11px", color: T.textDim, lineHeight: 1.5, marginBottom: "10px" }}>
                Wenn andere Geräte mit dem gleichen Code andere Runden zeigen, hier Cloud-Status prüfen oder erzwingen.
              </p>
              <button
                onClick={async () => {
                  const cloud = await cloudPull(syncCode);
                  const cloudRounds = cloud?.data?.rounds?.length || 0;
                  const cloudFriends = cloud?.data?.friends?.length || 0;
                  const cloudClubs = cloud?.data?.customClubs?.length || 0;
                  const cloudUpdated = cloud?.updated_at ? new Date(cloud.updated_at).toLocaleString("de-AT") : "—";
                  const localRounds = rounds.length;
                  const localFriends = friends.length;
                  const localClubs = customClubs.length;
                  let recommendation = "";
                  if (!cloud) {
                    recommendation = "❌ Kein Cloud-Eintrag gefunden. Drück 'Cloud erzwingen ▲' damit dein lokaler Stand hochgeladen wird.";
                  } else if (cloudRounds === 0 && localRounds > 0) {
                    recommendation = "⚠ Cloud ist leer aber du hast lokale Runden! Drück 'Cloud erzwingen ▲' um deine lokalen Runden hochzuladen.";
                  } else if (cloudRounds > 0 && localRounds === 0) {
                    recommendation = "⚠ Cloud hat Runden aber lokal sind keine. Drück 'Cloud holen ▼' um die Cloud-Runden zu laden.";
                  } else if (cloudRounds > localRounds + 2) {
                    recommendation = "ℹ Cloud hat mehr Runden als lokal. Drück 'Cloud holen ▼' falls du diese sehen möchtest.";
                  } else if (localRounds > cloudRounds + 2) {
                    recommendation = "ℹ Lokal hat mehr Runden als Cloud. Drück 'Cloud erzwingen ▲' damit andere Geräte sie sehen.";
                  } else {
                    recommendation = "✓ Beide Stände sehen ähnlich aus. Wenn andere Geräte trotzdem nicht synchron sind, beide Buttons probieren.";
                  }
                  alert(
                    `Sync-Diagnose für „${syncCode}"\n\n` +
                    `📊 Cloud-Stand:\n` +
                    `   ${cloudRounds} Runden, ${cloudFriends} Freunde, ${cloudClubs} Clubs\n` +
                    `   Zuletzt: ${cloudUpdated}\n\n` +
                    `💾 Lokaler Stand:\n` +
                    `   ${localRounds} Runden, ${localFriends} Freunde, ${localClubs} Clubs\n\n` +
                    `🔍 Empfehlung:\n${recommendation}`
                  );
                }}
                style={{ ...S.btnSecondary, width: "100%", fontSize: "11px", padding: "8px", marginBottom: "6px" }}>
                🔍 Status anzeigen
              </button>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={async () => {
                    if (!confirm("Lokalen Stand zur Cloud hochladen? Falls Cloud schon Daten hat, werden sie dadurch ersetzt.")) return;
                    setSyncStatus("syncing");
                    const ok = await cloudPush(syncCode, { rounds, friends, customClubs, trips, ownerProfile });
                    setSyncStatus(ok ? "idle" : "error");
                    if (ok) {
                      try { await window.storage.set("golf-last-sync", String(Date.now())); } catch {}
                      alert(`✓ ${rounds.length} Runden, ${friends.length} Freunde, ${customClubs.length} Clubs, ${trips.length} Trips zur Cloud hochgeladen`);
                    } else {
                      alert("Push fehlgeschlagen — bist du online?");
                    }
                  }}
                  style={{ ...S.btnSecondary, flex: 1, fontSize: "11px", padding: "8px", color: T.gold, borderColor: `${T.gold}40` }}>
                  ▲ Cloud erzwingen
                </button>
                <button
                  onClick={async () => {
                    const cloud = await cloudPull(syncCode);
                    if (!cloud || !cloud.data) {
                      alert("Cloud ist leer oder nicht erreichbar.");
                      return;
                    }
                    const cloudRounds = cloud.data.rounds || [];
                    const cloudFriends = cloud.data.friends || [];
                    const cloudClubs = cloud.data.customClubs || [];
                    if (!confirm(`Aus Cloud holen: ${cloudRounds.length} Runden, ${cloudFriends.length} Freunde, ${cloudClubs.length} Clubs.\n\nLokaler Stand wird durch den Cloud-Stand ersetzt!\n\nSicher?`)) return;
                    // Snapshot the current local state before overwriting — recoverable!
                    try {
                      await window.storage.set(
                        `golf-backup-before-cloud-pull-${Date.now()}`,
                        JSON.stringify({ rounds, friends, customClubs })
                      );
                    } catch {}
                    setRounds(cloudRounds);
                    setFriends(cloudFriends);
                    setCustomClubs(cloudClubs);
                    try { await window.storage.set("golf-rounds", JSON.stringify(cloudRounds)); } catch {}
                    try { await window.storage.set("golf-friends", JSON.stringify(cloudFriends)); } catch {}
                    try { await window.storage.set("golf-custom-clubs", JSON.stringify(cloudClubs)); } catch {}
                    try { await window.storage.set("golf-last-sync", String(new Date(cloud.updated_at).getTime())); } catch {}
                    alert(`✓ ${cloudRounds.length} Runden aus Cloud geladen\n(Backup deines vorherigen Standes gespeichert)`);
                  }}
                  style={{ ...S.btnSecondary, flex: 1, fontSize: "11px", padding: "8px", color: T.sage, borderColor: `${T.sage}40` }}>
                  ▼ Cloud holen
                </button>
              </div>
            </div>
          )}

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
  // ── v37: AI-Prompt für Club-Import (Copy-Paste in ChatGPT/Claude.ai) ──
  const AI_CLUB_IMPORT_PROMPT = `Du bekommst gleich Fotos oder Beschreibung von einer österreichischen Golf-Birdiebook-Scorekarte. Bitte konvertiere sie in folgendes JSON-Format. Antworte NUR mit dem JSON, keine Erklärungen.

Format:
{
  "name": "GC Beispiel",
  "region": "Niederösterreich",
  "numHoles": 18,
  "tees": {
    "Gelb": { "teeName": "Gelb", "color": "Gelb", "slope": 130, "cr": 71.2, "par": 72 },
    "Weiss": { "teeName": "Weiss", "color": "Weiß", "slope": 134, "cr": 72.5, "par": 72 },
    "Rot": { "teeName": "Rot", "color": "Rot", "slope": 128, "cr": 70.8, "par": 72 }
  },
  "holes": [
    { "par": 4, "si": 13 },
    { "par": 4, "si": 5 },
    { "par": 5, "si": 17 }
    // ... insgesamt 18 (oder 9) Löcher mit jeweils par + si
  ]
}

Wichtig:
- "color" muss einer von: "Gelb", "Weiß", "Blau", "Rot", "Schwarz" sein
- "slope" ist eine Zahl zwischen 100-155
- "cr" ist Course-Rating, eine Dezimalzahl
- "par" pro Loch ist 3, 4 oder 5
- "si" ist Stroke-Index (Loch-Schwierigkeit), Werte 1-18 müssen eindeutig sein
- Mindestens 1 Tee, gerne alle die im Birdiebook stehen
- Bitte achte penibel auf die Reihenfolge der Löcher (Loch 1 → 18)`;

  const renderImportModal = () => (
    <div onClick={() => { setShowImport(false); setImportMode("choose"); setWizardStep(1); }}
      style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} className="slide-up"
        style={{ width: "100%", maxWidth: "520px", background: T.surface1, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", border: `1px solid ${T.line}`, padding: "20px 16px 28px", maxHeight: "92vh", overflowY: "auto" }}>
        <SwipeHandle onClose={() => { setShowImport(false); setImportMode("choose"); setWizardStep(1); }} />
        <h3 className="serif" style={{ fontSize: "24px", margin: "0 0 6px", color: T.text }}>Club hinzufügen</h3>

        {/* ── MODE: Choose ── */}
        {importMode === "choose" && (
          <>
            <p style={{ fontSize: "13px", color: T.textSoft, marginBottom: "18px" }}>
              Wähle eine Methode — schnell mit KI-Hilfe oder Schritt-für-Schritt selbst eingeben.
            </p>
            <button
              onClick={() => setImportMode("ai")}
              className="card-hover"
              style={{ ...S.card, width: "100%", padding: "16px", marginBottom: "10px", textAlign: "left", cursor: "pointer", border: `1px solid ${T.gold}40` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ fontSize: "32px" }}>🤖</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: T.gold, marginBottom: "2px" }}>KI-Assistent</div>
                  <div style={{ fontSize: "11px", color: T.textSoft, lineHeight: 1.5 }}>
                    Prompt kopieren · in ChatGPT oder Claude.ai mit Birdiebook-Foto einfügen · JSON zurück hier reinpasten. Empfohlen.
                  </div>
                </div>
                <div style={{ color: T.gold, fontSize: "20px" }}>›</div>
              </div>
            </button>
            <button
              onClick={() => setImportMode("wizard")}
              className="card-hover"
              style={{ ...S.card, width: "100%", padding: "16px", marginBottom: "10px", textAlign: "left", cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ fontSize: "32px" }}>📝</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: T.text, marginBottom: "2px" }}>Selbst eintippen</div>
                  <div style={{ fontSize: "11px", color: T.textSoft, lineHeight: 1.5 }}>
                    Step-by-Step Wizard: Name, Tees, Loch-Daten. Funktioniert auch offline.
                  </div>
                </div>
                <div style={{ color: T.textSoft, fontSize: "20px" }}>›</div>
              </div>
            </button>
            <button
              onClick={() => setImportMode("paste")}
              style={{ ...S.btnGhost, width: "100%", padding: "12px", marginTop: "6px", fontSize: "12px" }}>
              Erfahren? JSON direkt einfügen
            </button>
          </>
        )}

        {/* ── MODE: AI Prompt ── */}
        {importMode === "ai" && (
          <>
            <button onClick={() => setImportMode("choose")} style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 8px", marginBottom: "12px" }}>← zurück</button>
            <div style={{ ...S.eyebrow, marginBottom: "8px", color: T.gold }}>Schritt 1: Prompt kopieren</div>
            <div style={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: "10px", padding: "12px", marginBottom: "12px", maxHeight: "180px", overflowY: "auto", fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: T.textSoft, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
              {AI_CLUB_IMPORT_PROMPT}
            </div>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(AI_CLUB_IMPORT_PROMPT);
                showUndoToast("✓ Prompt in Zwischenablage", null);
              }}
              style={{ ...S.btnPrimary, width: "100%", padding: "12px", marginBottom: "16px" }}>
              📋 Prompt kopieren
            </button>

            <div style={{ ...S.eyebrow, marginBottom: "8px" }}>Schritt 2: KI fragen</div>
            <p style={{ fontSize: "11px", color: T.textSoft, lineHeight: 1.6, marginBottom: "12px" }}>
              Geh auf <span style={{ color: T.gold, fontWeight: 600 }}>chatgpt.com</span> oder <span style={{ color: T.gold, fontWeight: 600 }}>claude.ai</span>, füge den Prompt ein und lade Fotos vom Birdiebook hoch (Scorekarte mit Tees + Slope/CR + alle 18 Loch).
            </p>

            <div style={{ ...S.eyebrow, marginBottom: "8px" }}>Schritt 3: JSON zurück hier rein</div>
            <textarea value={importText} onChange={e => setImportText(e.target.value)}
              placeholder={`{\n  "name": "GC ...",\n  "tees": { ... },\n  "holes": [ ... ]\n}`}
              style={{ ...S.input, fontFamily: "JetBrains Mono, monospace", fontSize: "12px", minHeight: "180px", resize: "vertical", marginBottom: "10px" }}/>
            {importErrors.length > 0 && (
              <div style={{ background: `${T.double}15`, border: `1px solid ${T.double}50`, borderRadius: "10px", padding: "10px 14px", marginBottom: "10px", fontSize: "12px", color: T.double }}>
                <div style={{ fontWeight: 700, marginBottom: "4px" }}>Fehler:</div>
                {importErrors.map((e,i) => <div key={i}>• {e}</div>)}
              </div>
            )}
            <button onClick={importClub} className="gold-hover" style={{ ...S.btnPrimary, width: "100%" }}>Importieren</button>
          </>
        )}

        {/* ── MODE: Wizard ── */}
        {importMode === "wizard" && (
          <>
            <button onClick={() => { setImportMode("choose"); setWizardStep(1); }} style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 8px", marginBottom: "12px" }}>← zurück</button>
            <div style={{ display: "flex", gap: "4px", marginBottom: "16px" }}>
              {[1, 2, 3].map(s => (
                <div key={s} style={{
                  flex: 1, height: "4px", borderRadius: "2px",
                  background: s <= wizardStep ? T.gold : T.line,
                }} />
              ))}
            </div>

            {wizardStep === 1 && (
              <>
                <div style={{ ...S.eyebrow, marginBottom: "10px", color: T.gold }}>Schritt 1/3: Club-Basis</div>
                <label style={{ fontSize: "11px", color: T.textDim, display: "block", marginBottom: "4px" }}>Club-Name</label>
                <input value={wizardData.name} onChange={e => setWizardData(d => ({ ...d, name: e.target.value }))}
                  placeholder="z.B. GC Adamstal" style={{ ...S.input, marginBottom: "10px" }} />
                <label style={{ fontSize: "11px", color: T.textDim, display: "block", marginBottom: "4px" }}>Region (optional)</label>
                <input value={wizardData.region} onChange={e => setWizardData(d => ({ ...d, region: e.target.value }))}
                  placeholder="z.B. Niederösterreich" style={{ ...S.input, marginBottom: "10px" }} />
                <label style={{ fontSize: "11px", color: T.textDim, display: "block", marginBottom: "4px" }}>Anzahl Löcher</label>
                <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                  {[9, 18].map(n => (
                    <button key={n} onClick={() => setWizardData(d => ({ ...d, numHoles: n }))}
                      style={{
                        flex: 1, padding: "12px",
                        background: wizardData.numHoles === n ? `${T.gold}20` : T.surface2,
                        color: wizardData.numHoles === n ? T.gold : T.textSoft,
                        border: `1px solid ${wizardData.numHoles === n ? T.gold : T.line}`,
                        borderRadius: "8px", fontWeight: 600, fontSize: "14px",
                      }}>
                      {n} Loch
                    </button>
                  ))}
                </div>
                <button onClick={() => setWizardStep(2)}
                  disabled={!wizardData.name.trim()}
                  style={{ ...S.btnPrimary, width: "100%", opacity: wizardData.name.trim() ? 1 : 0.4 }}>
                  Weiter →
                </button>
              </>
            )}

            {wizardStep === 2 && (
              <>
                <div style={{ ...S.eyebrow, marginBottom: "10px", color: T.gold }}>Schritt 2/3: Tees</div>
                <p style={{ fontSize: "11px", color: T.textDim, lineHeight: 1.5, marginBottom: "12px" }}>
                  Mindestens 1 Tee. Werte stehen im Birdiebook auf der Scorekarte (Slope, CR, Par).
                </p>
                {wizardData.tees.map((t, ti) => (
                  <div key={ti} style={{ ...S.card, padding: "12px", marginBottom: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <select value={t.color}
                        onChange={e => setWizardData(d => ({
                          ...d, tees: d.tees.map((x, i) => i === ti ? { ...x, color: e.target.value, teeName: e.target.value } : x)
                        }))}
                        style={{ ...S.input, padding: "6px 10px", fontSize: "12px", width: "auto" }}>
                        {["Gelb", "Weiß", "Blau", "Rot", "Schwarz"].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      {wizardData.tees.length > 1 && (
                        <button onClick={() => setWizardData(d => ({ ...d, tees: d.tees.filter((_, i) => i !== ti) }))}
                          style={{ background: "transparent", border: "none", color: T.double, fontSize: "16px", padding: "4px 8px" }}>×</button>
                      )}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                      <div>
                        <label style={{ fontSize: "9px", color: T.textDim, display: "block", marginBottom: "2px", fontWeight: 600 }}>SLOPE</label>
                        <input type="number" value={t.slope} placeholder="130"
                          onChange={e => setWizardData(d => ({ ...d, tees: d.tees.map((x, i) => i === ti ? { ...x, slope: e.target.value } : x) }))}
                          style={{ ...S.input, padding: "6px 8px", fontSize: "13px", textAlign: "center" }} />
                      </div>
                      <div>
                        <label style={{ fontSize: "9px", color: T.textDim, display: "block", marginBottom: "2px", fontWeight: 600 }}>CR</label>
                        <input type="number" step="0.1" value={t.cr} placeholder="71.5"
                          onChange={e => setWizardData(d => ({ ...d, tees: d.tees.map((x, i) => i === ti ? { ...x, cr: e.target.value } : x) }))}
                          style={{ ...S.input, padding: "6px 8px", fontSize: "13px", textAlign: "center" }} />
                      </div>
                      <div>
                        <label style={{ fontSize: "9px", color: T.textDim, display: "block", marginBottom: "2px", fontWeight: 600 }}>PAR</label>
                        <input type="number" value={t.par} placeholder="72"
                          onChange={e => setWizardData(d => ({ ...d, tees: d.tees.map((x, i) => i === ti ? { ...x, par: e.target.value } : x) }))}
                          style={{ ...S.input, padding: "6px 8px", fontSize: "13px", textAlign: "center" }} />
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={() => setWizardData(d => ({ ...d, tees: [...d.tees, { teeName: "Weiß", color: "Weiß", slope: "", cr: "", par: 72 }] }))}
                  style={{ ...S.btnSecondary, width: "100%", padding: "10px", fontSize: "12px", marginBottom: "10px" }}>
                  + Tee hinzufügen
                </button>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => setWizardStep(1)} style={{ ...S.btnSecondary, flex: 1 }}>← Zurück</button>
                  <button onClick={() => {
                    // Initialize holes if empty
                    if (wizardData.holes.length === 0) {
                      setWizardData(d => ({ ...d, holes: Array.from({ length: d.numHoles }, () => ({ par: 4, si: "" })) }));
                    }
                    setWizardStep(3);
                  }}
                    disabled={!wizardData.tees.every(t => t.slope && t.cr && t.par)}
                    style={{ ...S.btnPrimary, flex: 2, opacity: wizardData.tees.every(t => t.slope && t.cr && t.par) ? 1 : 0.4 }}>
                    Weiter →
                  </button>
                </div>
              </>
            )}

            {wizardStep === 3 && (
              <>
                <div style={{ ...S.eyebrow, marginBottom: "10px", color: T.gold }}>Schritt 3/3: Loch-Daten</div>
                <p style={{ fontSize: "11px", color: T.textDim, lineHeight: 1.5, marginBottom: "12px" }}>
                  Pro Loch: Par (3/4/5) + SI (1-{wizardData.numHoles}). SI muss eindeutig sein.
                </p>
                <div style={{ maxHeight: "55vh", overflowY: "auto", marginBottom: "12px" }}>
                  {wizardData.holes.map((h, hi) => (
                    <div key={hi} style={{ display: "grid", gridTemplateColumns: "30px 1fr 1fr", gap: "8px", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${T.line}` }}>
                      <div className="mono" style={{ fontSize: "13px", color: T.gold, fontWeight: 700 }}>{hi + 1}</div>
                      <div style={{ display: "flex", gap: "4px" }}>
                        {[3, 4, 5].map(p => (
                          <button key={p} onClick={() => setWizardData(d => ({ ...d, holes: d.holes.map((x, i) => i === hi ? { ...x, par: p } : x) }))}
                            style={{
                              flex: 1, padding: "6px 0",
                              background: h.par === p ? `${T.gold}20` : T.surface2,
                              color: h.par === p ? T.gold : T.textSoft,
                              border: `1px solid ${h.par === p ? T.gold : T.line}`,
                              borderRadius: "5px", fontSize: "12px", fontWeight: 600,
                            }}>
                            {p}
                          </button>
                        ))}
                      </div>
                      <input type="number" value={h.si} placeholder="SI"
                        min="1" max={wizardData.numHoles}
                        onChange={e => setWizardData(d => ({ ...d, holes: d.holes.map((x, i) => i === hi ? { ...x, si: e.target.value } : x) }))}
                        style={{ ...S.input, padding: "6px 8px", fontSize: "12px", textAlign: "center" }} />
                    </div>
                  ))}
                </div>
                {importErrors.length > 0 && (
                  <div style={{ background: `${T.double}15`, border: `1px solid ${T.double}50`, borderRadius: "10px", padding: "10px 14px", marginBottom: "10px", fontSize: "12px", color: T.double }}>
                    <div style={{ fontWeight: 700, marginBottom: "4px" }}>Fehler:</div>
                    {importErrors.map((e,i) => <div key={i}>• {e}</div>)}
                  </div>
                )}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => setWizardStep(2)} style={{ ...S.btnSecondary, flex: 1 }}>← Zurück</button>
                  <button onClick={() => {
                    // Build club object from wizard data
                    const teesObj = {};
                    wizardData.tees.forEach(t => {
                      teesObj[t.color] = {
                        teeName: t.color, color: t.color,
                        slope: parseInt(t.slope) || 0,
                        cr: parseFloat(t.cr) || 0,
                        par: parseInt(t.par) || 72,
                      };
                    });
                    const club = {
                      name: wizardData.name.trim(),
                      region: wizardData.region.trim() || undefined,
                      numHoles: wizardData.numHoles,
                      tees: teesObj,
                      holes: wizardData.holes.map(h => ({ par: parseInt(h.par) || 4, si: parseInt(h.si) || 0 })),
                    };
                    importClubFromObject(club);
                  }} className="gold-hover" style={{ ...S.btnPrimary, flex: 2 }}>Speichern</button>
                </div>
              </>
            )}
          </>
        )}

        {/* ── MODE: Direct Paste (Power-User) ── */}
        {importMode === "paste" && (
          <>
            <button onClick={() => setImportMode("choose")} style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 8px", marginBottom: "12px" }}>← zurück</button>
            <p style={{ fontSize: "13px", color: T.textSoft, marginBottom: "14px" }}>JSON direkt einfügen.</p>
            <textarea value={importText} onChange={e => setImportText(e.target.value)}
              placeholder={`{\n  "name": "GC ...",\n  "tees": { ... },\n  "holes": [ ... ]\n}`}
              style={{ ...S.input, fontFamily: "JetBrains Mono, monospace", fontSize: "12px", minHeight: "220px", resize: "vertical", marginBottom: "10px" }}/>
            {importErrors.length > 0 && (
              <div style={{ background: `${T.double}15`, border: `1px solid ${T.double}50`, borderRadius: "10px", padding: "10px 14px", marginBottom: "10px", fontSize: "12px", color: T.double }}>
                <div style={{ fontWeight: 700, marginBottom: "4px" }}>Fehler:</div>
                {importErrors.map((e,i) => <div key={i}>• {e}</div>)}
              </div>
            )}
            <button onClick={importClub} className="gold-hover" style={{ ...S.btnPrimary, width: "100%" }}>Importieren</button>
          </>
        )}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ ...S.app, width: "100%", overflowX: "hidden", position: "relative" }}>
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
      {renderLiveViewerModal()}
      {renderBackupRestore()}
      {renderTrash()}
      {renderTripSetup()}
      {renderTripDetail()}
      {renderScorerConflict()}
      {renderPlayerManager()}
      {renderHoleJump()}
      {renderStatDrilldown()}
      {renderOwnerSetup()}
      {renderOnboardingChoice()}
      {renderClubsModal()}
      {renderUndoToast()}

      {/* v40: Versions-Footer — sichtbar in jeder Crew, hilft beim Bug-Reporting */}
      <div style={{
        textAlign: "center",
        padding: "16px 16px 24px",
        fontSize: "10px",
        color: T.textDim,
        letterSpacing: "0.04em",
        fontFamily: "JetBrains Mono, monospace",
        opacity: 0.5,
      }}>
        Fairway {APP_VERSION} · {APP_BUILD_DATE}
      </div>
    </div>
  );
}
