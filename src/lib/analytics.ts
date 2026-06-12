import posthog from "posthog-js";

const KEY = "phc_tqGeNHeGCFYVk65GvPqrnZFBep8BqMd4PxNGzXCbWPdS";
const HOST = "https://app.posthog.com";

export function initAnalytics() {
  if (typeof window === "undefined" || (window as any).__ph_init) return;
  (window as any).__ph_init = true;
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false,
    session_recording: {
      maskAllInputs: true,
      maskInputOptions: { password: true, email: true },
    },
    loaded: (ph) => {
      if (import.meta.env.DEV) ph.opt_out_capturing();
    },
  });
}

export function identifyUser(userId: string, displayName: string) {
  if (typeof window === "undefined") return;
  posthog.identify(userId, { name: displayName });
}

export function resetUser() {
  if (typeof window === "undefined") return;
  posthog.reset();
}

export function track(event: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  posthog.capture(event, props);
}
