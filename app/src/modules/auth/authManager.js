const { doRequest } = require("../utils/requestClient");

// Cloudflare Auth Worker
const AUTH_URL = "https://auth.bekapvc.com/login";

function getMachineId() {
  try {
    const os = require("os");
    const id = os.hostname() || "unknown-machine";
    return id.replace(/[^a-zA-Z0-9_-]/g, "");
  } catch (e) {
    return "unknown-machine";
  }
}

async function performLogin({ username, password }) {
  const machine_id = getMachineId();

  const body = JSON.stringify({
    username,
    password,
    machine_id
  });

  const { statusCode, body: respBody, headers } = await doRequest(AUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body
  });

  let data;
  const contentType = headers["content-type"] || "";

  if (contentType.includes("application/json")) {
    try {
      data = JSON.parse(respBody.toString());
    } catch (err) {
      return { ok: false, message: "Geçersiz JSON yanıtı" };
    }
  }

  if (statusCode !== 200) {
    const fallbackText = respBody?.toString?.().trim();
    const message = data?.message || data?.error || fallbackText || `Giriş başarısız (kod: ${statusCode}).`;
    return { ok: false, message };
  }

  if (!data) {
    return { ok: false, message: "Sunucu JSON yanıtı vermedi." };
  }

  return data;
}

module.exports = { performLogin };
