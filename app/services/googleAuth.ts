// googleAuth.ts — Google OAuth flow for Expo Go.
//
// HOW THIS WORKS IN EXPO GO:
// We use `expo-auth-session/providers/google` with the *Web* client ID and
// Expo's auth proxy (auth.expo.io). The auth flow opens in a browser, the
// user signs in, Google returns an auth code, and the proxy forwards it back
// to our app. We then exchange the code for an access + refresh token using
// the PKCE flow (no client secret on device).
//
// Why this stays Expo-Go-compatible:
//   • No native Google Sign-In SDK
//   • Custom URL schemes use the Expo proxy URL pattern
//   • Refresh tokens are stored in expo-secure-store (Keychain / Keystore)
//
// You'll need to provide:
//   • GOOGLE_WEB_CLIENT_ID  (from Google Cloud Console — Web application client)
//   • EXPO_USERNAME / SLUG  (so the proxy URL matches what you configured)
//
// See SETUP_GOOGLE_CALENDAR.md for the full setup walkthrough.

import * as AuthSession from 'expo-auth-session';
import * as Google      from 'expo-auth-session/providers/google';
import * as WebBrowser  from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { useEffect }    from 'react';

// Make sure the OAuth popup closes cleanly on iOS / Android.
WebBrowser.maybeCompleteAuthSession();

// ─── Config — fill in via constants or env ────────────────────────────────────
// NOTE: keep this in one place so you can swap to a dev-build configuration later
// without hunting through code.
export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? 'REPLACE_ME.apps.googleusercontent.com';

// Scopes — we ONLY need calendar event access. Don't ask for more.
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar',           // read+write calendars
  'https://www.googleapis.com/auth/userinfo.email',     // know which account signed in
];

// ─── Secure storage keys ──────────────────────────────────────────────────────
const KEY_ACCESS_TOKEN  = 'google_access_token';
const KEY_REFRESH_TOKEN = 'google_refresh_token';
const KEY_EXPIRES_AT    = 'google_token_expires_at';

export interface GoogleTokens {
  accessToken:  string;
  refreshToken: string | null;
  expiresAt:    number;   // epoch ms
}

// ─── Token persistence ────────────────────────────────────────────────────────
export async function saveTokens(tokens: GoogleTokens): Promise<void> {
  await SecureStore.setItemAsync(KEY_ACCESS_TOKEN, tokens.accessToken);
  if (tokens.refreshToken) {
    await SecureStore.setItemAsync(KEY_REFRESH_TOKEN, tokens.refreshToken);
  }
  await SecureStore.setItemAsync(KEY_EXPIRES_AT, String(tokens.expiresAt));
}

export async function loadTokens(): Promise<GoogleTokens | null> {
  const access  = await SecureStore.getItemAsync(KEY_ACCESS_TOKEN);
  const refresh = await SecureStore.getItemAsync(KEY_REFRESH_TOKEN);
  const expires = await SecureStore.getItemAsync(KEY_EXPIRES_AT);
  if (!access) return null;
  return {
    accessToken:  access,
    refreshToken: refresh,
    expiresAt:    expires ? Number(expires) : 0,
  };
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_ACCESS_TOKEN);
  await SecureStore.deleteItemAsync(KEY_REFRESH_TOKEN);
  await SecureStore.deleteItemAsync(KEY_EXPIRES_AT);
}

// ─── Token refresh ────────────────────────────────────────────────────────────
// Google's refresh endpoint: POST https://oauth2.googleapis.com/token
//   body: client_id, refresh_token, grant_type=refresh_token
// Returns { access_token, expires_in, scope, token_type }
export async function refreshAccessToken(): Promise<GoogleTokens | null> {
  const stored = await loadTokens();
  if (!stored?.refreshToken) return null;

  const body = new URLSearchParams({
    client_id:     GOOGLE_WEB_CLIENT_ID,
    refresh_token: stored.refreshToken,
    grant_type:    'refresh_token',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  });

  if (!res.ok) {
    // If refresh fails (e.g. user revoked access in Google account settings),
    // clear tokens so the UI knows to prompt sign-in again.
    await clearTokens();
    return null;
  }

  const json = await res.json();
  const fresh: GoogleTokens = {
    accessToken:  json.access_token,
    refreshToken: stored.refreshToken,   // Google does not re-send refresh tokens
    expiresAt:    Date.now() + (json.expires_in * 1000) - 60_000, // 1-min safety
  };
  await saveTokens(fresh);
  return fresh;
}

// Return a valid (un-expired) access token, refreshing if needed.
// Returns null if the user is not signed in OR refresh failed.
export async function getValidAccessToken(): Promise<string | null> {
  const stored = await loadTokens();
  if (!stored) return null;

  if (Date.now() < stored.expiresAt) {
    return stored.accessToken;
  }
  const refreshed = await refreshAccessToken();
  return refreshed?.accessToken ?? null;
}

// ─── Hook: useGoogleSignIn ────────────────────────────────────────────────────
// Used by CalendarSettingsScreen. Returns { request, promptAsync, exchange }.
// Why a hook? expo-auth-session needs to register the redirect listener on mount.
export function useGoogleSignIn(onComplete: (tokens: GoogleTokens, email: string) => void) {
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId:    GOOGLE_WEB_CLIENT_ID,
    scopes:      GOOGLE_SCOPES,
    // We need offline access to get a refresh token.
    // For PKCE on web client id, this is added via extraParams.
    extraParams: { access_type: 'offline', prompt: 'consent' },
  });

  // When the OAuth flow finishes, exchange the code -> tokens.
  useEffect(() => {
    if (response?.type !== 'success') return;

    (async () => {
      try {
        // 1) Exchange the auth code for tokens.
        //    expo-auth-session gives us `params.code` + the original `codeVerifier`.
        const { code } = response.params;
        const codeVerifier = (request as any)?.codeVerifier;
        if (!code || !codeVerifier) return;

        const tokenRes = await AuthSession.exchangeCodeAsync(
          {
            clientId:     GOOGLE_WEB_CLIENT_ID,
            code,
            redirectUri:  (request as any).redirectUri,
            extraParams:  { code_verifier: codeVerifier },
          },
          { tokenEndpoint: 'https://oauth2.googleapis.com/token' }
        );

        const tokens: GoogleTokens = {
          accessToken:  tokenRes.accessToken,
          refreshToken: tokenRes.refreshToken ?? null,
          expiresAt:    Date.now() + ((tokenRes.expiresIn ?? 3600) * 1000) - 60_000,
        };
        await saveTokens(tokens);

        // 2) Fetch the user's email so we can display it.
        const me = await fetch(
          'https://www.googleapis.com/oauth2/v2/userinfo',
          { headers: { Authorization: `Bearer ${tokens.accessToken}` } }
        ).then((r) => r.json());

        onComplete(tokens, me?.email ?? '');
      } catch (err) {
        console.warn('[googleAuth] code exchange failed', err);
      }
    })();
  }, [response]);

  return { request, promptAsync };
}
