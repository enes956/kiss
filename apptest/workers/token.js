import { jsonResponse, readJson, signSimpleToken, verifySimpleToken } from "./common";

async function mintToken(env, subject) {
  const now = Date.now();
  const exp = now + 5 * 60 * 1000;
  const token = await signSimpleToken(env.KEY_SECRET, { subject, iat: now, exp });
  return { token, exp };
}

async function handleVerify(request, env) {
  const token = request.headers.get("x-auth");
  if (!token) return jsonResponse({ ok: false, message: "x-auth missing" }, 401);

  const payload = await verifySimpleToken(env.KEY_SECRET, token);
  if (!payload || payload.exp < Date.now()) {
    return jsonResponse({ ok: false, message: "invalid token" }, 401);
  }

  return jsonResponse({ ok: true, token, exp: payload.exp });
}

async function handleRefresh(request, env) {
  const existing = request.headers.get("x-auth");
  const subject = existing ? (await verifySimpleToken(env.KEY_SECRET, existing))?.subject : undefined;
  const { token, exp } = await mintToken(env, subject || "launcher");
  return jsonResponse({ token, exp });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/verify") {
      return handleVerify(request, env);
    }

    if (request.method === "GET" && url.pathname === "/refresh") {
      return handleRefresh(request, env);
    }

    if (request.method === "POST" && url.pathname === "/verify") {
      return handleVerify(request, env);
    }

    if (request.method === "POST" && url.pathname === "/refresh") {
      return handleRefresh(request, env);
    }

    if (request.method === "POST") {
      const body = await readJson(request);
      return jsonResponse({ ok: false, message: "Bilinmeyen endpoint", body }, 404);
    }

    return jsonResponse({ error: "Not Found" }, 404);
  }
};
