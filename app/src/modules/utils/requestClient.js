const https = require("https");
const fs = require("fs");
const { URL } = require("url");

// SADECE HOSTNAME!!! (https:// koyma)
const ALLOWED_DOMAINS = new Set([
  "updater.bekapvc.com",
  "token.bekapvc.com",
  "proxy.bekapvc.com",
  "key.bekapvc.com",
  "auth.bekapvc.com",
  "app.bekapvc.com"
]);

function assertAllowedHost(urlString) {
  const target = typeof urlString === "string" ? new URL(urlString) : urlString;

  if (target.protocol !== "https:")
    throw new Error("Sadece HTTPS isteklerine izin veriliyor.");

  // hostname karşılaştırılır → protokol yok!
  if (!ALLOWED_DOMAINS.has(target.hostname))
    throw new Error("İzin verilmeyen alan adı: " + target.hostname);

  return target;
}

function doRequest(urlString, { method = "GET", headers = {}, body = null, maxRedirects = 0 } = {}) {
  const initialUrl = assertAllowedHost(urlString);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: initialUrl.hostname,
      path: initialUrl.pathname + initialUrl.search,
      port: 443,
      method,
      headers,
      servername: initialUrl.hostname, // SNI FIX
      rejectUnauthorized: true
    };

    const req = https.request(options, res => {

      // REDIRECT
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (maxRedirects <= 0)
          return reject(new Error("Yönlendirme limiti aşıldı."));

        const redirected = new URL(res.headers.location, initialUrl);

        return resolve(
          doRequest(redirected.toString(), { method, headers, body, maxRedirects: maxRedirects - 1 })
        );
      }

      let chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks)
      }));
    });

    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function downloadToFile(urlString, dest, progressCallback = () => {}, maxRedirects = 3) {
  const target = assertAllowedHost(urlString);

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);

    const requestDownload = currentUrl => {
      const options = {
        hostname: currentUrl.hostname,
        path: currentUrl.pathname + currentUrl.search,
        port: 443,
        method: "GET",
        servername: currentUrl.hostname,
        rejectUnauthorized: true
      };

      const req = https.get(options, res => {

        // REDIRECT
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          if (maxRedirects <= 0)
            return reject(new Error("Fazla yönlendirme tespit edildi."));

          const redirected = new URL(res.headers.location, currentUrl);

          return requestDownload(redirected);
        }

        if (res.statusCode !== 200)
          return reject(new Error("İndirme başarısız: HTTP " + res.statusCode));

        const total = parseInt(res.headers["content-length"] || "0");
        let downloaded = 0;

        res.on("data", chunk => {
          downloaded += chunk.length;
          progressCallback(downloaded, total);
        });

        res.pipe(file);

        file.on("finish", () => file.close(resolve));
        file.on("error", reject);
      });

      req.on("error", reject);
    };

    requestDownload(target);
  });
}

module.exports = {
  ALLOWED_DOMAINS,
  assertAllowedHost,
  doRequest,
  downloadToFile
};
