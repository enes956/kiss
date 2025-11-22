export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --------------------------
    // /version.json   (düz metadata)
    // --------------------------
    if (url.pathname === "/version.json") {
      return handleVersion(env);
    }

    // --------------------------
    // /app.asar   (şifresiz ASAR)
    // --------------------------
    if (url.pathname === "/app.asar") {
      return handleAsar(env);
    }

    return new Response(
      JSON.stringify({ error: "Not Found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }
};

/* -------------------------------------------------------------------------- */
/*                               HELPERS                                      */
/* -------------------------------------------------------------------------- */

async function fetchR2(name, env) {
  const file = await env.LAUNCHER_R2.get(name);
  if (!file) return null;
  return file;
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

/* -------------------------------------------------------------------------- */
/*                              /version.json                                 */
/* -------------------------------------------------------------------------- */

async function handleVersion(env) {
  const file = await fetchR2("version.json", env);

  if (!file) {
    return jsonResponse({ error: "version.json not found" }, 404);
  }

  const buffer = await file.arrayBuffer();
  const text = new TextDecoder().decode(buffer);

  return new Response(text, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

/* -------------------------------------------------------------------------- */
/*                              /app.asar                                     */
/* -------------------------------------------------------------------------- */

async function handleAsar(env) {
  const file = await fetchR2("app.asar", env);

  if (!file) {
    return jsonResponse({ error: "app.asar not found" }, 404);
  }

  const buffer = await file.arrayBuffer();

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Cache-Control": "no-store",
    }
  });
}
