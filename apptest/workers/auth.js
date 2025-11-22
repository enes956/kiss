import { jsonResponse, readJson, signSimpleToken } from "./common";

async function handleLogin(request, env) {
  const body = await readJson(request);
  if (!body) return jsonResponse({ ok: false, message: "Geçersiz JSON" }, 400);

  const { username, password, machine_id } = body;
  if (!username || !password || !machine_id) {
    return jsonResponse({ ok: false, message: "Eksik alan" }, 400);
  }

  const now = Math.floor(Date.now() / 1000);
  const token = await signSimpleToken(env.AUTH_SECRET, {
    sub: username,
    machine_id,
    iat: now,
    exp: now + 3600
  });

  return jsonResponse({
    ok: true,
    token,
    user: { username, machine_id }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/login") {
      return handleLogin(request, env);
    }

    return jsonResponse({ error: "Not Found" }, 404);
  }
};
