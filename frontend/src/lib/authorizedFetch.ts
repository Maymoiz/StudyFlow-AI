// Helper that attaches the current user's verified identity to a request.
// Firebase issues a short lived ID token, we send it as a Bearer token,
// and the backend verifies it instead of trusting whatever uid we claim to be.

import { auth } from "../firebase";

export async function authorizedFetch(url: string, options: RequestInit = {}) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("No authenticated user, cannot make an authorized request.");
  }

  // getIdToken() returns the cached token if still valid, or refreshes it.
  const idToken = await currentUser.getIdToken();

  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${idToken}`,
    },
  });
}