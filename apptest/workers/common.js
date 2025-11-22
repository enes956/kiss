const encoder = new TextEncoder();

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders }
  });
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function base64UrlEncode(data) {
  const uint8 = typeof data === "string" ? encoder.encode(data) : data;
  let str = btoa(String.fromCharCode(...new Uint8Array(uint8)));
  return str.replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlDecode(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "==".slice((str.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacSha256(secret, data) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return new Uint8Array(signature);
}

async function signSimpleToken(secret, payload) {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const input = `${header}.${body}`;
  const signature = await hmacSha256(secret, input);
  return `${input}.${base64UrlEncode(signature)}`;
}

async function verifySimpleToken(secret, token) {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) return null;

  const input = `${header}.${payload}`;
  const expected = await hmacSha256(secret, input);
  const provided = base64UrlDecode(signature);

  if (expected.length !== provided.length) return null;
  let valid = expected.length === provided.length;
  for (let i = 0; i < expected.length; i++) valid &= expected[i] === provided[i];
  if (!valid) return null;

  try {
    return JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
  } catch {
    return null;
  }
}

export {
  base64UrlEncode,
  hmacSha256,
  jsonResponse,
  readJson,
  signSimpleToken,
  verifySimpleToken
};
