import { createCookie } from "react-router";

export type SentryPerformanceConsent = "granted" | "denied" | null;

const CONSENT_VERSION = "v1";
const GRANTED_VALUE = `granted-${CONSENT_VERSION}`;
const DENIED_VALUE = `denied-${CONSENT_VERSION}`;

const sentryPerformanceConsentCookie = createCookie("osem_sentry_performance", {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
});

export async function getSentryPerformanceConsent(
  request: Request,
): Promise<SentryPerformanceConsent> {
  const value = await sentryPerformanceConsentCookie.parse(request.headers.get("Cookie"));

  if (value === GRANTED_VALUE) return "granted";
  if (value === DENIED_VALUE) return "denied";
  return null;
}

export function setSentryPerformanceConsent(consent: Exclude<SentryPerformanceConsent, null>) {
  return sentryPerformanceConsentCookie.serialize(
    consent === "granted" ? GRANTED_VALUE : DENIED_VALUE,
  );
}
