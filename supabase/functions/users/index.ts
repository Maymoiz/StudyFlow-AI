// Supabase Edge Function — replaces backend/routes/userRoutes.js
// Deploy with: supabase functions deploy users

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SANITY_PROJECT_ID = "gF6MOm1Dm";
const SANITY_DATASET = "production";
const SANITY_TOKEN = Deno.env.get("SANITY_TOKEN");
const SANITY_API_VERSION = "2023-01-01";

const MUTATE_URL = `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/mutate/${SANITY_DATASET}`;
const QUERY_URL = `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}`;

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
  const query = encodeURIComponent(`*[_id == "${id}"][0]`);
  const res = await fetch(`${QUERY_URL}?query=${query}`, {
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
    // POST /createUser
    if (path === "/createUser" && req.method === "POST") {
      const { uid, email, name, photo } = await req.json();
      await sanityMutate([{
        createIfNotExists: {
          _id: uid,
          _type: "userProfile",
          email, name, photo,
          createdAt: new Date().toISOString(),
        },
      }]);
      return json({ success: true });
    }

    // POST /syncUser
    if (path === "/syncUser" && req.method === "POST") {
      const { uid, email, name, photo } = await req.json();
      await sanityMutate([{
        patch: {
          id: uid,
          set: { email, name, photo, updatedAt: new Date().toISOString() },
        },
      }]);
      return json({ success: true });
    }

    // GET /getUser/:uid
    if (path.startsWith("/getUser/") && req.method === "GET") {
      const uid = path.split("/getUser/")[1];
      const user = await sanityGetDocument(uid);
      if (!user) return json({ error: "User not found" }, 404);
      return json(user);
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
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
