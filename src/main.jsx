import React from "react";
import ReactDOM from "react-dom/client";
import GolfApp from "./GolfApp.jsx";

// Polyfill window.storage using localStorage (for Vercel deployment).
// All operations wrapped in try/catch — protects against quota-exceeded,
// disabled storage in Safari Private Mode, embedded browsers without
// localStorage access, etc. Failed reads return null (= no value),
// failed writes are silent.
if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    async get(key) {
      try {
        const v = localStorage.getItem(key);
        return v !== null ? { value: v } : null;
      } catch (e) {
        console.warn("storage.get failed for", key, e);
        return null;
      }
    },
    async set(key, value) {
      try {
        localStorage.setItem(key, value);
        return { key, value };
      } catch (e) {
        console.warn("storage.set failed for", key, e);
        return null;
      }
    },
    async delete(key) {
      try {
        localStorage.removeItem(key);
        return { key, deleted: true };
      } catch (e) {
        console.warn("storage.delete failed for", key, e);
        return null;
      }
    },
    async list(prefix) {
      try {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (!prefix || k.startsWith(prefix))) keys.push(k);
        }
        return { keys };
      } catch (e) {
        console.warn("storage.list failed for prefix", prefix, e);
        return { keys: [] };
      }
    },
  };
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GolfApp />
  </React.StrictMode>
);
