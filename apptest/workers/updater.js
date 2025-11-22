import { jsonResponse } from "./common";

async function fetchR2Object(bucket, key) {
  const object = await bucket.get(key);
  if (!object) return null;
  return new Response(object.body, {
    headers: {
      "Cache-Control": "public, max-age=120"
    }
  });
}

async function handleVersion(env) {
  const res = await fetchR2Object(env.LAUNCHER_R2, "version.json");
  return res || jsonResponse({ error: "version.json not found" }, 404);
}

async function handleExecutable(env) {
  const res = await fetchR2Object(env.LAUNCHER_R2, "KissApp.exe");
  if (!res) return jsonResponse({ error: "KissApp.exe not found" }, 404);

  res.headers.set("Content-Type", "application/octet-stream");
  res.headers.set("Content-Disposition", "attachment; filename=KissApp.exe");
  return res;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/version.json") {
      return handleVersion(env);
    }

    if (url.pathname === "/KissApp.exe") {
      return handleExecutable(env);
    }

    return jsonResponse({ error: "Not Found" }, 404);
  }
};
