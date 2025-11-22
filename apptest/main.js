// ------------------------------------------------------
// ADMIN + CORE IMPORTS  (OBF SAFE)
// ------------------------------------------------------
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile, execSync } = require("child_process");
const asar = require("asar");

// --- Admin kontrolü (SID yöntemi) ---
function isRunningAsAdmin() {
    if (process.platform !== "win32") return true;

    try {
        const stdout = execSync("whoami /groups").toString().toLowerCase();
        // Local Administrators SID: S-1-5-32-544
        return stdout.includes("s-1-5-32-544");
    } catch {
        return false;
    }
}

function elevateToAdmin() {
    console.log("[UAC] Yönetici izni yok → UAC açılıyor...");
    execFile(process.execPath, [], { shell: "runas" });
    app.exit(0);
}

// ------------------------------------------------------
// ELECTRON IMPORTS
// ------------------------------------------------------
const { app, BrowserWindow, ipcMain } = require("electron");
const https = require("https");
const crypto = require("crypto");
const AdmZip = require("adm-zip");

const CHANNELS = require("./global/ipcChannels.cjs");

// ------------------------------------------------------
// GLOBALS
// ------------------------------------------------------
let mainWin;
let pendingUpdate = null;

const pkg = JSON.parse(
    fs.readFileSync(path.join(__dirname, "package.json"), "utf8")
);

// ---------------------------------------------------------------------
// UPDATE (AES ŞİFRELİ, DİNAMİK KEY)
// ---------------------------------------------------------------------

const VERSION_URL = "https://updater.bekapvc.com/version.json";
const ALLOWED_HOST = "updater.bekapvc.com";

const RESOURCES_DIR = process.resourcesPath;
const LOCAL_ASAR = path.join(RESOURCES_DIR, "app.asar");
const BACKUP_ASAR = path.join(RESOURCES_DIR, "app.asar.bak");

function getUpdateDir() {
    const dir = path.join(app.getPath("userData"), "updates");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function safeUnlink(p) {
    try {
        if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch {
        // ignore
    }
}

function assertValidAsar(filePath) {
    const stat = fs.statSync(filePath);
    if (!stat || stat.size < 5000) {
        throw new Error("ASAR veri bozuk veya çok küçük!");
    }

    try {
        // asar.listPackage okuma yaparak header'ı doğrular; başarısız olursa istisna fırlatır
        asar.listPackage(filePath);
        console.log(
            "[ASAR] Doğrulama OK:",
            path.basename(filePath),
            "size=",
            stat.size
        );
    } catch (err) {
        throw new Error(
            `ASAR doğrulaması başarısız (${path.basename(filePath)}): ${err.message}`
        );
    }
}

function decryptAesGcm(key, iv, tag, data) {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]);
}

// SABİT MASTER KEY → SADECE version.json'u açar (küçük metadatanın şifresi)
function getVersionMasterKey() {
    return crypto
        .createHash("sha256")
        .update("KISSAPP_VERSION_MASTER_KEY_V1")
        .digest(); // 32 byte
}

// ---------------------------------------------------------------------
// GÜVENLİ HTTP İSTEĞİ (UPDATE + AUTH İÇİN KULLANILIYOR)
// ---------------------------------------------------------------------
function doRequest(url, options = {}, body, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
        let timedOut = false;

        let expectedHost = "";
        try {
            expectedHost = new URL(url).hostname;
        } catch {
            expectedHost = options.host || "";
        }

        const normalizedOptions = { ...options };

        if (body && !normalizedOptions.headers) {
            normalizedOptions.headers = {};
        }

        if (body && normalizedOptions.headers) {
            normalizedOptions.headers["Content-Length"] = Buffer.byteLength(
                body
            );
        }

        const req = https.request(url, normalizedOptions, (res) => {
            let chunks = [];
            let totalLength = 0;
            const MAX_BYTES = 2 * 1024 * 1024;

            res.on("data", (d) => {
                if (timedOut) return;

                totalLength += d.length;
                if (totalLength > MAX_BYTES) {
                    req.destroy(new Error("Response too large"));
                    return;
                }
                chunks.push(d);
            });

            res.on("end", () => {
                if (timedOut) return;
                clearTimeout(timeoutHandle);

                resolve({
                    statusCode: res.statusCode,
                    body: Buffer.concat(chunks),
                    headers: res.headers,
                });
            });
        });

        // TLS hostname kontrolü (.bekapvc.com)
        req.on("socket", (socket) => {
            socket.on("secureConnect", () => {
                try {
                    const cert = socket.getPeerCertificate();
                    if (!cert || Object.keys(cert).length === 0) {
                        req.destroy(new Error("Missing certificate"));
                        return;
                    }

                    const expectedHostLower = expectedHost.toLowerCase();
                    const expectedRoot = ".bekapvc.com";

                    const san =
                        cert.subjectaltname ||
                        cert.subjectAltName ||
                        "";
                    const sanLower = san.toLowerCase();

                    let ok = false;

                    if (sanLower.includes(`dns:${expectedHostLower}`)) ok = true;
                    if (!ok && sanLower.includes(expectedRoot)) ok = true;

                    const subject = cert.subject || {};
                    const cn =
                        (subject.CN || subject.commonName || "").toLowerCase();

                    if (!ok && (cn.includes(expectedHostLower) || cn.includes(expectedRoot))) {
                        ok = true;
                    }

                    if (!ok) {
                        console.error("[TLS] Certificate hostname mismatch for", expectedHostLower);
                        req.destroy(new Error("Certificate hostname mismatch"));
                        return;
                    }
                } catch {
                    console.error("[TLS] Certificate validation error");
                    req.destroy(new Error("Certificate validation error"));
                }
            });
        });

        req.on("error", (err) => {
            if (timedOut) return;
            clearTimeout(timeoutHandle);
            reject(err);
        });

        const timeoutHandle = setTimeout(() => {
            timedOut = true;
            req.destroy(new Error("Request timeout"));
        }, timeoutMs);

        if (body) req.write(body);
        req.end();
    });
}

// =====================================================
// 1) version.enc.json → decrypt → metadata + dinamik asarKey alınır
// =====================================================
async function fetchRemoteVersion() {
    const { statusCode, body } = await doRequest(
        VERSION_URL,
        { method: "GET" },
        null,
        8000
    );

    if (statusCode !== 200) throw new Error("HTTP " + statusCode);

    const enc = JSON.parse(body.toString("utf8"));

    const iv = Buffer.from(enc.iv, "base64");
    const tag = Buffer.from(enc.tag, "base64");
    const cipher = Buffer.from(enc.data, "base64");

    const decrypted = decryptAesGcm(getVersionMasterKey(), iv, tag, cipher);
    const data = JSON.parse(decrypted.toString("utf8"));

    if (!data.asarKey) throw new Error("asarKey bulunamadı!");

    return {
        version: data.version,
        sha256: data.sha256.toUpperCase(),
        size: data.size,
        asarUrl: data.asarUrl,
        asarKey: Buffer.from(data.asarKey, "base64"), // DİNAMİK KEY
    };
}

// =====================================================
// 2) ASAR Update (startup patch model)
// =====================================================
async function performUpdate(remote, sendStatus) {
    const dir = getUpdateDir();
    const ENC = path.join(dir, "app_asar.enc");
    const ZIP = path.join(dir, "app_asar.zip");
    const NEW = path.join(dir, "app_new.asar"); // renderer loglarına uyan net isim
    const LEGACY_NEW = path.join(dir, "app_new.bin");
    const PENDING = path.join(dir, "update_pending.json");

    console.log("[UPDATE] Remote meta:", remote);

    // Temizle
    safeUnlink(ENC);
    safeUnlink(ZIP);
    safeUnlink(NEW);
    safeUnlink(PENDING);
    safeUnlink(LEGACY_NEW);

    sendStatus(CHANNELS.UPDATE_DOWNLOAD_STATUS, { state: "started" });

    // 1) ENC indir
    const downloadInfo = await downloadFile(
        remote.asarUrl,
        ENC,
        (recv, total, percent) => {
            sendStatus(CHANNELS.UPDATE_PROGRESS, { percent });
        }
    );
    console.log("[UPDATE] ENC indirildi:", downloadInfo);

    // 2) ENC → ZIP (AES-GCM)
    const buf = fs.readFileSync(ENC);
    console.log("[UPDATE] ENC dosya boyutu:", buf.length);
    const iv = buf.slice(0, 12);
    const tag = buf.slice(12, 28);
    const cipher = buf.slice(28);

    const zipBuf = decryptAesGcm(remote.asarKey, iv, tag, cipher);
    console.log("[UPDATE] ZIP buffer boyutu:", zipBuf.length);
    fs.writeFileSync(ZIP, zipBuf);

    // 3) ZIP → ASAR çıkar
    const zip = new AdmZip(zipBuf);
    const entries = zip.getEntries();

    if (!entries || entries.length === 0)
        throw new Error("Zip içinde dosya yok!");

    // Önce .asar, yoksa ilk dosya
    console.log(
        "[UPDATE] ZIP entries:",
        entries.map((e) => `${e.entryName}:${e.header?.size || 0}`)
    );

    let entry = entries.find(
        (e) => !e.isDirectory && e.entryName.endsWith(".asar")
    );
    if (!entry) entry = entries.find((e) => !e.isDirectory);

    if (!entry) throw new Error("Zip içinde kullanılabilir entry yok!");

    console.log("ZIP ENTRY:", entry.entryName, "SIZE:", entry.header.size);

    // `getData` buffer'ını kopyalayarak header bütünlüğünü koru
    const finalBuf = Buffer.from(entry.getData());
    console.log(
        "[UPDATE] ASAR buffer alındı:",
        entry.entryName,
        "zip-size=",
        entry.header.size,
        "buf-size=",
        finalBuf.length
    );

    if (remote.size && remote.size !== finalBuf.length) {
        throw new Error(
            `ASAR boyutu beklenenle uyuşmuyor. Meta=${remote.size} gelen=${finalBuf.length}`
        );
    }

    // 4) app_new.asar yaz + doğrula
    fs.writeFileSync(NEW, finalBuf, { flag: "w" });
    assertValidAsar(NEW);
    console.log("WROTE NEW ASAR:", NEW, "SIZE:", finalBuf.length);

    // 5) Hash doğrula
    const hash = (await sha256File(NEW)).toUpperCase();
    if (hash !== remote.sha256) {
        throw new Error(
            `Hash mismatch – beklenen ${remote.sha256}, gelen ${hash}`
        );
    }
    console.log("[UPDATE] Hash doğrulandı:", hash);

    // 6) Startup patch için işaret bırak
    const pendingPayload = {
        ready: true,
        version: remote.version,
        sha256: remote.sha256,
        created_at: new Date().toISOString(),
    };
    fs.writeFileSync(PENDING, JSON.stringify(pendingPayload, null, 2), "utf8");
    console.log("[UPDATE] Pending flag yazıldı:", PENDING);

    // Renderer'a başarı
    sendStatus(CHANNELS.UPDATE_DOWNLOAD_STATUS, { state: "done" });

    // 7) Restart → patch bir SONRAKİ açılışta uygulanacak
    setTimeout(() => {
        app.relaunch();
        app.exit(0);
    }, 1000);
}

// ---------------------------------------------------------------------
// UPDATE IPC KÖPRÜSÜ
// ---------------------------------------------------------------------
function setupUpdateIpc() {
    const sendToRenderer = (channel, payload) => {
        if (!mainWin || mainWin.isDestroyed()) return;
        mainWin.webContents.send(channel, payload);
    };

    ipcMain.on(CHANNELS.UPDATE_CHECK, async () => {
        sendToRenderer(CHANNELS.UPDATE_STATUS, "checking");

        try {
            const remote = await fetchRemoteVersion();
            pendingUpdate = remote;

            sendToRenderer(CHANNELS.UPDATE_REMOTE_DATA, {
                version: remote.version,
                size: remote.size,
            });

            const needsUpdate = pkg.version !== remote.version;
            sendToRenderer(
                CHANNELS.UPDATE_STATUS,
                needsUpdate ? "need-update" : "up-to-date"
            );

            if (!needsUpdate) {
                sendToRenderer(CHANNELS.UPDATE_DONE);
            }
        } catch (err) {
            console.error("[UPDATE] Versiyon kontrolü başarısız:", err);
            sendToRenderer(CHANNELS.UPDATE_DOWNLOAD_STATUS, {
                state: "error",
                message: err?.message || "Güncelleme kontrolü yapılamadı.",
            });
            sendToRenderer(CHANNELS.UPDATE_STATUS, "error");
        }
    });

    ipcMain.on(CHANNELS.UPDATE_START, async () => {
        if (!pendingUpdate) {
            sendToRenderer(CHANNELS.UPDATE_DOWNLOAD_STATUS, {
                state: "error",
                message: "İndirilecek güncelleme bilgisi bulunamadı.",
            });
            return;
        }

        try {
            await performUpdate(pendingUpdate, sendToRenderer);
        } catch (err) {
            console.error("[UPDATE] İndirme/uygulama hatası:", err);
            console.error("[UPDATE] Stack:", err?.stack || "<no-stack>");
            sendToRenderer(CHANNELS.UPDATE_DOWNLOAD_STATUS, {
                state: "error",
                message:
                    err?.message || "Güncelleme indirilemedi veya doğrulanamadı.",
            });
        }
    });

    ipcMain.on(CHANNELS.UPDATE_DONE, () => {
        sendToRenderer(CHANNELS.UPDATE_DONE);
    });
}

// =====================================================
// 2.5) Startup Patch – app_new.bin → app.asar
// =====================================================
async function applyStartupPatch() {
    const dir = getUpdateDir();
    const NEW = path.join(dir, "app_new.asar");
    const LEGACY_NEW = path.join(dir, "app_new.bin");
    const PENDING = path.join(dir, "update_pending.json");

    if (!fs.existsSync(PENDING)) {
        return; // patch beklenmiyor
    }

    console.log("[PATCH] update_pending.json bulundu, patch uygulanacak.");

    let newAsarPath = NEW;
    if (!fs.existsSync(newAsarPath) && fs.existsSync(LEGACY_NEW)) {
        console.log("[PATCH] app_new.bin bulundu, uyumluluk için kullanılıyor.");
        newAsarPath = LEGACY_NEW;
    }

    if (!fs.existsSync(newAsarPath)) {
        console.error("[PATCH] Yeni ASAR bulunamadı, pending temizleniyor.");
        safeUnlink(PENDING);
        return;
    }

    try {
        // Bilgi amaçlı oku (opsiyonel)
        try {
            const metaRaw = fs.readFileSync(PENDING, "utf8");
            console.log("[PATCH] Pending meta:", metaRaw);
        } catch {
            // ignore
        }

        // Hash doğrula (varsa)
        try {
            const meta = JSON.parse(fs.readFileSync(PENDING, "utf8"));
            if (meta.sha256) {
                const hash = await sha256File(newAsarPath);
                if (hash.toUpperCase() !== meta.sha256.toUpperCase()) {
                    console.error(
                        "[PATCH] Hash uyuşmuyor, pending temizleniyor. Beklenen:",
                        meta.sha256,
                        "Gelen:",
                        hash
                    );
                    safeUnlink(newAsarPath);
                    safeUnlink(PENDING);
                    return;
                }
            }
        } catch (err) {
            console.error("[PATCH] Hash doğrulanamadı (devam edilecek):", err);
        }

        // Yeni ASAR dosyasını swap'ten önce doğrula
        const pendingStat = fs.statSync(newAsarPath);
        console.log(
            "[PATCH] Yeni asar bulundu:",
            newAsarPath,
            "size=",
            pendingStat.size
        );
        assertValidAsar(newAsarPath);

        // Eski backup'ı temizle
        if (fs.existsSync(BACKUP_ASAR)) {
            safeUnlink(BACKUP_ASAR);
        }

        // Çalışan versiyonu backup'a al
        if (fs.existsSync(LOCAL_ASAR)) {
            fs.renameSync(LOCAL_ASAR, BACKUP_ASAR);
            console.log("[PATCH] Eski app.asar → app.asar.bak alındı.");
        } else {
            console.log("[PATCH] LOCAL_ASAR bulunamadı, direkt yazılacak:", LOCAL_ASAR);
        }

        // Yeni asar'ı yerine koy
        fs.renameSync(newAsarPath, LOCAL_ASAR);
        console.log("[PATCH] Yeni app.asar yerine taşındı:", LOCAL_ASAR);

        // Pending işaretini temizle
        safeUnlink(PENDING);
        console.log("[PATCH] Pending flag temizlendi.");

        // Yeni ASAR etkin olsun diye süreci yenile
        try {
            console.log("[PATCH] Yeni asar aktif ediliyor, uygulama yeniden başlatılıyor...");
            app.relaunch();
            setTimeout(() => app.exit(0), 300);
        } catch (err) {
            console.error("[PATCH] Yeniden başlatma başarısız:", err);
        }
    } catch (err) {
        console.error("[PATCH] Patch uygulanırken hata:", err);
        try {
            if (fs.existsSync(newAsarPath)) {
                console.log("[PATCH] Hatalı asar temizleniyor:", newAsarPath);
                safeUnlink(newAsarPath);
            }
        } catch {
            // ignore
        }
        // İstersen burada pending'i silmeyip sonraki açılışta tekrar deneyebilirsin.
    }
}

// ---------------------------------------------------------------------
// version & asar doğrulama için sha256 hesaplama
// ---------------------------------------------------------------------
function sha256File(file) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash("sha256");
        const s = fs.createReadStream(file);
        s.on("data", (c) => hash.update(c));
        s.on("end", () => resolve(hash.digest("hex").toUpperCase()));
        s.on("error", reject);
    });
}

// ---------------------------------------------------------------------
// Büyük dosya indirme (app.asar.enc)
// ENC formatı: [IV(12)][TAG(16)][CIPHER(...)]
// ---------------------------------------------------------------------
function downloadFile(url, dest, onProgress, redirectCount = 0) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);

        if (u.hostname !== ALLOWED_HOST) {
            return reject(new Error("İzin verilmeyen host: " + u.hostname));
        }

        const file = fs.createWriteStream(dest, { flags: "w" });

        const request = https.get(
            {
                hostname: u.hostname,
                path: u.pathname + (u.search || ""),
                protocol: u.protocol,
            },
            (res) => {
                if (
                    res.statusCode >= 300 &&
                    res.statusCode < 400 &&
                    res.headers.location
                ) {
                    if (redirectCount >= 1) {
                        file.close(() => safeUnlink(dest));
                        return reject(new Error("Çok fazla yönlendirme"));
                    }

                    file.close(() => safeUnlink(dest));

                    return downloadFile(
                        res.headers.location,
                        dest,
                        onProgress,
                        redirectCount + 1
                    )
                        .then(resolve)
                        .catch(reject);
                }

                if (res.statusCode !== 200) {
                    file.close(() => safeUnlink(dest));
                    return reject(new Error(`HTTP ${res.statusCode}`));
                }

                const total = parseInt(
                    res.headers["content-length"] || "0",
                    10
                );
                let received = 0;

                res.on("data", (chunk) => {
                    received += chunk.length;

                    if (typeof onProgress === "function") {
                        const percent = total
                            ? Math.floor((received / total) * 100)
                            : 0;
                        onProgress(received, total, percent);
                    }
                });

                res.pipe(file);

                file.on("finish", () => {
                    file.close(() =>
                        resolve({
                            received,
                            total,
                            path: dest,
                        })
                    );
                });

                res.on("error", (err) => {
                    file.close(() => safeUnlink(dest));
                    reject(err);
                });
            }
        );

        request.on("error", (err) => {
            file.close(() => safeUnlink(dest));
            reject(err);
        });

        request.setTimeout(120000, () => {
            request.destroy(new Error("İndirme zaman aşımına uğradı"));
        });
    });
}

// ---------------------------------------------------------------------
// AUTH STATE (SADECE RAM'DE)
// ---------------------------------------------------------------------
const authState = {
    token: null,
    user: null,
    raw: null,
};

// ---------------------------------------------------------------------
// MAKİNE ID (HASH'LENMİŞ)
// ---------------------------------------------------------------------
function getMachineId() {
    try {
        const parts = [
            os.hostname() || "unknown-host",
            os.arch() || "unknown-arch",
            os.platform() || "unknown-platform",
        ];

        let username = "";
        try {
            username = os.userInfo().username || "";
        } catch {
            // ignore
        }

        const base = [...parts, username].join("|");

        return crypto.createHash("sha256").update(base).digest("hex");
    } catch {
        return "unknown-machine";
    }
}

// ---------------------------------------------------------------------
// LOGIN İŞLEMİ
// ---------------------------------------------------------------------
async function performLogin({ username, password }) {
    const machine_id = getMachineId();

    const payload = { username, password, machine_id };
    const body = JSON.stringify(payload);

    const AUTH_URL = "https://auth.bekapvc.com/login";

    let response;
    try {
        response = await doRequest(
            AUTH_URL,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            },
            body,
            8000
        );
    } catch (err) {
        console.error("[AUTH] Request error:", err.message);
        return {
            ok: false,
            message:
                "Kimlik doğrulama isteği başarısız (bağlantı hatası, sertifika doğrulama hatası veya süre aşımı).",
        };
    }

    const { statusCode, headers, body: respBody } = response;

    const contentType = (headers["content-type"] || "").toLowerCase();

    let data = null;
    const bodyText = respBody.toString();

    const looksLikeJson =
        contentType.includes("json") ||
        contentType.includes("javascript");

    if (looksLikeJson) {
        try {
            data = JSON.parse(bodyText);
        } catch {
            return {
                ok: false,
                message: "Geçersiz JSON yanıtı alındı.",
            };
        }
    } else {
        try {
            data = JSON.parse(bodyText);
        } catch {
            return {
                ok: false,
                message: "Sunucudan beklenmeyen yanıt alındı.",
            };
        }
    }

    if (statusCode !== 200) {
        const fallback = bodyText;
        const msg =
            data?.message || data?.error || fallback || `Hata: ${statusCode}`;
        return { ok: false, message: msg };
    }

    if (!data) {
        return { ok: false, message: "Boş yanıt alındı." };
    }

    if (data.token) {
        authState.token = data.token;
        authState.user = data.user || username || null;
        authState.raw = data;

        delete data.token;
    } else {
        authState.token = null;
        authState.user = null;
        authState.raw = null;
    }

    return {
        ok: data.ok !== undefined ? !!data.ok : true,
        message: data.message || "Giriş başarılı.",
        user: data.user || username || null,
        ...data,
    };
}

// ---------------------------------------------------------------------
// AUTH IPC
// ---------------------------------------------------------------------
ipcMain.handle(CHANNELS.AUTH_LOGIN, async (event, credentials) => {
    return performLogin(credentials);
});

ipcMain.handle(CHANNELS.AUTH_GET_STATE, () => {
    return {
        loggedIn: !!authState.token,
        user: authState.user,
    };
});

ipcMain.on(CHANNELS.AUTH_SUCCESS, (event, payload) => {
    console.log("LOGIN OK:", payload);
});

ipcMain.on(CHANNELS.AUTH_CANCEL, () => {
    app.quit();
});

// ---------------------------------------------------------------------
// WINDOW CONTROL EVENTS
// ---------------------------------------------------------------------
ipcMain.on(CHANNELS.WINDOW_CONTROL, (event, action) => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return;

    switch (action) {
        case "minimize":
            win.minimize();
            break;
        case "maximize":
            win.isMaximized() ? win.unmaximize() : win.maximize();
            break;
        case "close":
            win.close();
            break;
    }
});

// ---------------------------------------------------------------------
// MAIN WINDOW
// ---------------------------------------------------------------------
function createWindow() {
    mainWin = new BrowserWindow({
        width: 1280,
        height: 830,
        frame: false,
        backgroundColor: "#060c16",
        show: false,
        webPreferences: {
            preload: path.join(__dirname, "global/preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false, // ← BU SATIR ZORUNLU
            enableRemoteModule: false,
        },
    });

    mainWin.loadFile(path.join(__dirname, "launcher/index.html"));

    mainWin.once("ready-to-show", () => {
        mainWin.show();
    });
}

// ---------------------------------------------------------------------
// VERSION → RENDERER
// ---------------------------------------------------------------------
ipcMain.handle(CHANNELS.APP_GET_VERSION, () => {
    return pkg.version;
});

// ---------------------------------------------------------------------
// APP LIFECYCLE
// ---------------------------------------------------------------------
app.whenReady().then(async () => {
    console.log("USERDATA PATH:", app.getPath("userData"));

    // Başlangıçta admin değilse yükselt
    if (!isRunningAsAdmin()) {
        elevateToAdmin();
        return;
    }

    // PATCH — paketli ortam hedeflenir; dev ortamda pending varsa uyarı ile çalıştırılır
    if (!app.isPackaged) {
        console.log("[DEV] Paketlenmemiş ortam, yine de pending varsa patch denenecek.");
    }

    await applyStartupPatch();

    createWindow();
    setupUpdateIpc();
});


app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
    if (!mainWin) createWindow();
});
