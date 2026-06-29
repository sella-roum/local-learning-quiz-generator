"use client";

import { useEffect } from "react";

const RETIREMENT_KEY = "service-worker-retirement-v1";

export function ServiceWorkerRetirement() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(RETIREMENT_KEY) === "done") return;

    async function retireServiceWorker() {
      try {
        if ("serviceWorker" in navigator) {
          const registrations =
            await navigator.serviceWorker.getRegistrations();

          await Promise.all(
            registrations.map((registration) => registration.unregister())
          );
        }

        if ("caches" in window) {
          const cacheKeys = await caches.keys();

          await Promise.all(
            cacheKeys.map((cacheKey) => caches.delete(cacheKey))
          );
        }

        window.localStorage.setItem(RETIREMENT_KEY, "done");
      } catch {
        // Service Worker cleanup failure must not block the app.
      }
    }

    retireServiceWorker();
  }, []);

  return null;
}
