import { jsonResponse, signSimpleToken } from "./common";

async function handleCreate(request, env) {
  const clientId = request.headers.get("x-auth");
  if (!clientId) return jsonResponse({ error: "x-auth missing" }, 401);

  const now = Date.now();
  const exp = now + 10 * 60 * 1000;
  const token = await signSimpleToken(env.KEY_SECRET, {
    clientId,
    iat: now,
    exp
  });

  return jsonResponse({ token, exp });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/create") {
      return handleCreate(request, env);
    }

    return jsonResponse({ error: "Not Found" }, 404);
  }
};
