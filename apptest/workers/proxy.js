import { jsonResponse, readJson, verifySimpleToken } from "./common";

async function forwardRequest(env, targetURL, init = {}) {
  const target = new URL(targetURL);
  if (!/^https?:$/.test(target.protocol)) {
    throw new Error("Unsupported protocol");
  }

  const response = await fetch(target.toString(), init);
  const headers = new Headers(response.headers);
  headers.delete("transfer-encoding");

  return new Response(response.body, {
    status: response.status,
    headers
  });
}

async function handleForward(request, env) {
  const token = request.headers.get("x-auth");
  const payload = token ? await verifySimpleToken(env.KEY_SECRET, token) : null;
  if (!payload || payload.exp < Date.now()) {
    return jsonResponse({ ok: false, message: "invalid token" }, 401);
  }

  if (request.method === "GET") {
    const targetURL = env.DEFAULT_FORWARD_URL;
    if (!targetURL) return jsonResponse({ ok: false, message: "DEFAULT_FORWARD_URL missing" }, 500);
    try {
      return await forwardRequest(env, targetURL, { headers: request.headers });
    } catch (err) {
      return jsonResponse({ ok: false, message: err.message }, 500);
    }
  }

  const body = await readJson(request);
  if (!body || !body.targetURL) {
    return jsonResponse({ ok: false, message: "targetURL missing" }, 400);
  }

  const { targetURL, payload: proxiedPayload, cookies, headers = {} } = body;

  const init = {
    method: request.method === "POST" ? "POST" : "GET",
    headers: new Headers(headers)
  };

  if (cookies) init.headers.set("Cookie", cookies);
  if (proxiedPayload) {
    init.body = typeof proxiedPayload === "string" ? proxiedPayload : JSON.stringify(proxiedPayload);
    if (!init.headers.has("Content-Type")) init.headers.set("Content-Type", "application/json");
  }

  try {
    const response = await forwardRequest(env, targetURL, init);
    return response;
  } catch (err) {
    return jsonResponse({ ok: false, message: err.message }, 500);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/forward") {
      return handleForward(request, env);
    }

    return jsonResponse({ error: "Not Found" }, 404);
  }
};
