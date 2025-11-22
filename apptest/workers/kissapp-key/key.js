import { jsonResponse, signSimpleToken } from "./common";

const AES_KEY_BASE64 = "zD+R1Cyo4n3YQVVrgJlXxgyzLCGadLfupGiwrDnWQdY=";

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

  // 🔥 YENİ EKLENDİ → AES key'i token yapısına ekledik
  return jsonResponse({
    token,
    exp,
    key: AES_KEY_BASE64
  });
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
