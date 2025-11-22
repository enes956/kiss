import { jsonResponse, readJson, signSimpleToken } from "./common";

// LIMIT: dakika başına 5 istek
const MAX_ATTEMPTS_PER_MIN = 5;
const WINDOW_SECONDS = 60;

/**
 * Rate limit helper
 * keyPrefix: "ip", "uname", "mid"
 */
async function rateLimitCheck(env, keyPrefix, keyValue) {
  const key = `${keyPrefix}:${keyValue}`;

  const used = await env.RATE_LIMIT.get(key);
  const count = used ? parseInt(used) : 0;

  if (count >= MAX_ATTEMPTS_PER_MIN) {
    return {
      limited: true,
      response: jsonResponse(
        {
          ok: false,
          message: "Çok fazla deneme. Lütfen 1 dakika bekleyin."
        },
        429
      ),
    };
  }

  // sayaç arttır (TTL = 60 sn)
  await env.RATE_LIMIT.put(key, count + 1, { expirationTtl: WINDOW_SECONDS });

  return { limited: false };
}

async function handleLogin(request, env) {
  const body = await readJson(request);
  if (!body) return jsonResponse({ ok: false, message: "Geçersiz JSON" }, 400);

  const { username, password, machine_id } = body;
  if (!username || !password || !machine_id) {
    return jsonResponse({ ok: false, message: "Eksik alan" }, 400);
  }

  // IP alınır (Cloudflare header)
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";

  //
  // -------------------------
  // RATE LIMIT KONTROLLERİ
  // -------------------------
  //

  // 1) IP rate limit
  const ipCheck = await rateLimitCheck(env, "ip", ip);
  if (ipCheck.limited) return ipCheck.response;

  // 2) Username rate limit
  const unameCheck = await rateLimitCheck(env, "uname", username);
  if (unameCheck.limited) return unameCheck.response;

  // 3) Machine-ID rate limit
  const midCheck = await rateLimitCheck(env, "mid", machine_id);
  if (midCheck.limited) return midCheck.response;

  //
  // -------------------------
  // AUTH CONTROLLER
  // -------------------------
  //

  const userRaw = await env.MY_AUTH_STORE.get(username);
  if (!userRaw) {
    return jsonResponse({ ok: false, message: "Kullanıcı bulunamadı" }, 401);
  }

  let user;
  try {
    user = JSON.parse(userRaw);
  } catch (err) {
    return jsonResponse({ ok: false, message: "Kullanıcı verisi bozuk" }, 500);
  }

  // Şifre kontrolü
  if (user.password !== password) {
    return jsonResponse({ ok: false, message: "Şifre hatalı" }, 401);
  }

  //
  // -------------------------
  // TOKEN URET
  // -------------------------
  //
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
