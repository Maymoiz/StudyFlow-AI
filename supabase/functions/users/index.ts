// // Supabase Edge Function — replaces backend/routes/userRoutes.js
// // Deploy with: supabase functions deploy users

// import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// const corsHeaders = {
//   "Access-Control-Allow-Origin": "*",
//   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
//   "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
// };

// const SANITY_PROJECT_ID = "gF6MOm1Dm";
// const SANITY_DATASET = "production";
// const SANITY_TOKEN = Deno.env.get("SANITY_TOKEN");
// const SANITY_API_VERSION = "2023-01-01";

// const MUTATE_URL = `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/mutate/${SANITY_DATASET}`;
// const QUERY_URL = `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}`;

// async function sanityMutate(mutations: unknown[]) {
//   const res = await fetch(MUTATE_URL, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       "Authorization": `Bearer ${SANITY_TOKEN}`,
//     },
//     body: JSON.stringify({ mutations }),
//   });
//   const data = await res.json();
//   if (!res.ok) throw new Error(data?.error?.description || "Sanity mutation failed");
//   return data;
// }

// async function sanityGetDocument(id: string) {
//   const query = encodeURIComponent(`*[_id == "${id}"][0]`);
//   const res = await fetch(`${QUERY_URL}?query=${query}`, {
//     headers: { "Authorization": `Bearer ${SANITY_TOKEN}` },
//   });
//   const data = await res.json();
//   if (!res.ok) throw new Error(data?.error?.description || "Sanity query failed");
//   return data.result;
// }

// Deno.serve(async (req: Request) => {
//   if (req.method === "OPTIONS") {
//     return new Response("ok", { headers: corsHeaders });
//   }

//   const url = new URL(req.url);
//   const path = url.pathname.replace(/^\/users/, "");

//   try {
//     // POST /createUser
//     if (path === "/createUser" && req.method === "POST") {
//       const { uid, email, name, photo } = await req.json();
//       await sanityMutate([{
//         createIfNotExists: {
//           _id: uid,
//           _type: "userProfile",
//           email, name, photo,
//           createdAt: new Date().toISOString(),
//         },
//       }]);
//       return json({ success: true });
//     }

//     // POST /syncUser
//     if (path === "/syncUser" && req.method === "POST") {
//       const { uid, email, name, photo } = await req.json();
//       await sanityMutate([{
//         patch: {
//           id: uid,
//           set: { email, name, photo, updatedAt: new Date().toISOString() },
//         },
//       }]);
//       return json({ success: true });
//     }

//     // GET /getUser/:uid
//     if (path.startsWith("/getUser/") && req.method === "GET") {
//       const uid = path.split("/getUser/")[1];
//       const user = await sanityGetDocument(uid);
//       if (!user) return json({ error: "User not found" }, 404);
//       return json(user);
//     }

//     return json({ error: "Not found" }, 404);
//   } catch (err) {
//     console.error("Users function error:", err);
//     return json({ error: "Request failed" }, 500);
//   }
// });

// function json(body: unknown, status = 200) {
//   return new Response(JSON.stringify(body), {
//     status,
//     headers: { ...corsHeaders, "Content-Type": "application/json" },
//   });
// }

// Alvin corrections
// Supabase Edge Function for user profile creation, sync, and lookup.
// Every request must carry a valid Firebase ID token. We verify that token
// against Firebase's public keys and use the uid it contains as the only
// source of truth for identity. We never trust a uid sent in the request body.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // will be tightened in Fix #3
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SANITY_PROJECT_ID = "gF6MOm1Dm";
const SANITY_DATASET = "production";
const SANITY_TOKEN = Deno.env.get("SANITY_TOKEN");
const SANITY_API_VERSION = "2023-01-01";

// Must match the Firebase project the frontend authenticates against.
const FIREBASE_PROJECT_ID = "moisha-studyflow-ai";

const MUTATE_URL = `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/mutate/${SANITY_DATASET}`;
const QUERY_URL = `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}`;

// Firebase publishes the public keys used to sign ID tokens at this fixed URL.
// jose fetches and caches them automatically, including on key rotation.
const firebaseJWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

// Verifies the Authorization header against Firebase's public keys.
// Returns the verified uid on success, or throws on any failure.
// Every handler below must pass through this before touching data.
async function requireVerifiedUid(req: Request): Promise<string> {
  const authHeader = req.headers.get("Authorization") || "";
  const match = authHeader.match(/^Bearer (.+)$/);

  if (!match) {
    throw new AuthError("Missing or malformed Authorization header.");
  }

  const idToken = match[1];

  try {
    const { payload } = await jwtVerify(idToken, firebaseJWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });

    // Firebase ID tokens carry the uid in the standard "sub" claim.
    if (!payload.sub) {
      throw new AuthError("Token did not contain a subject claim.");
    }

    return payload.sub;
  } catch (err) {
    console.error("Token verification failed:", err);
    throw new AuthError("Invalid or expired token.");
  }
}

// Dedicated error type so the top level handler can tell the difference
// between "this request is unauthenticated" and "something broke internally".
class AuthError extends Error {}

async function sanityMutate(mutations: unknown[]) {
  const res = await fetch(MUTATE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SANITY_TOKEN}`,
    },
    body: JSON.stringify({ mutations }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.description || "Sanity mutation failed");
  return data;
}

async function sanityGetDocument(id: string) {
  // Parameterized query, Sanity substitutes $id safely instead of us
  // concatenating the id directly into the query string.
  const query = encodeURIComponent(`*[_id == $id][0]`);
  const params = encodeURIComponent(JSON.stringify({ id }));
  const res = await fetch(`${QUERY_URL}?query=${query}&$id=${params}`, {
    headers: { "Authorization": `Bearer ${SANITY_TOKEN}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.description || "Sanity query failed");
  return data.result;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/users/, "");

  try {
    // Every route below requires a verified identity before touching data.
    const verifiedUid = await requireVerifiedUid(req);

    // POST /createUser
    if (path === "/createUser" && req.method === "POST") {
      const { email, name, photo } = await req.json();

      // We ignore any uid the client sent and use the verified one instead.
      // This is the core of the fix.
      await sanityMutate([{
        createIfNotExists: {
          _id: verifiedUid,
          _type: "userProfile",
          email, name, photo,
          createdAt: new Date().toISOString(),
        },
      }]);
      return json({ success: true });
    }

    // POST /syncUser
    if (path === "/syncUser" && req.method === "POST") {
      const { email, name, photo } = await req.json();

      await sanityMutate([{
        patch: {
          id: verifiedUid,
          set: { email, name, photo, updatedAt: new Date().toISOString() },
        },
      }]);
      return json({ success: true });
    }

    // GET /getUser/:uid
    // A user may only fetch their own profile, the path uid must match
    // the verified token uid, this closes the "read anyone's profile" hole.
    if (path.startsWith("/getUser/") && req.method === "GET") {
      const requestedUid = path.split("/getUser/")[1];

      if (requestedUid !== verifiedUid) {
        return json({ error: "Forbidden" }, 403);
      }

      const user = await sanityGetDocument(verifiedUid);
      if (!user) return json({ error: "User not found" }, 404);
      return json(user);
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    if (err instanceof AuthError) {
      return json({ error: err.message }, 401);
    }
    console.error("Users function error:", err);
    return json({ error: "Request failed" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}