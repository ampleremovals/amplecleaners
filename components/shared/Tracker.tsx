"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { readAttribution } from "@/components/shared/attribution";

/**
 * Cookie-free page-view beacon. Sends the path, any utm_* parameters in the URL
 * and the referrer's HOSTNAME (only if external). Nothing is stored on the
 * visitor's device; the server derives an anonymous daily-rotating id.
 */
export function Tracker() {
  const pathname = usePathname();
  useEffect(() => {
    try {
      let referrerHost: string | undefined;
      if (document.referrer) {
        const host = new URL(document.referrer).hostname;
        if (host && host !== window.location.hostname) referrerHost = host;
      }
      const a = readAttribution();
      const body = JSON.stringify({ path: pathname, utm_source: a.utm_source, utm_medium: a.utm_medium, utm_campaign: a.utm_campaign, referrer_host: referrerHost });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
      else void fetch("/api/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    } catch {
      /* tracking must never break a page */
    }
  }, [pathname]);
  return null;
}
