// =====================================================
// build.js — FINAL CLEAN VERSION (Şifresiz ASAR Güncelleme)
// =====================================================

const fs = require("fs-extra");
const path = require("path");
const crypto = require("crypto");
const cp = require("child_process");
const obfuscator = require("javascript-obfuscator");

// -----------------------------------------------------
// PATHS
// -----------------------------------------------------
const ROOT = process.cwd();                     // app/
const DIST = path.join(ROOT, "dist");          // build workspace
const UPDATE_OUT = path.join(ROOT, "dist-update"); // cloud output
const ASAR_URL = "https://updater.bekapvc.com/app.asar";

// -----------------------------------------------------
// OBF CONFIG
// -----------------------------------------------------
const layer1 = {
    compact: true,
    controlFlowFlattening: true,
    stringArray: true,
    stringArrayEncoding: ["base64", "rc4"],
    deadCodeInjection: true,
    renameGlobals: true
};
const layer2 = {
    compact: true,
    renameGlobals: true,
    stringArray: true,
    stringArrayEncoding: ["rc4"]
};

// -----------------------------------------------------
// HELPERS
// -----------------------------------------------------
function walkJs(dir, list = []) {
    for (const f of fs.readdirSync(dir)) {
        const full = path.join(dir, f);

        if (full.includes("node_modules")) continue;
        if (full.includes("dist-build")) continue;

        if (fs.statSync(full).isDirectory()) {
            walkJs(full, list);
        } else if (f.endsWith(".js")) {
            list.push(full);
        }
    }
    return list;
}

function obf(file, config) {
    const code = fs.readFileSync(file, "utf8");
    const out = obfuscator.obfuscate(code, config).getObfuscatedCode();
    fs.writeFileSync(file, out);
}

function sha256(filePath) {
    return crypto.createHash("sha256")
        .update(fs.readFileSync(filePath))
        .digest("hex")
        .toUpperCase();
}

// -----------------------------------------------------
// MAIN PIPELINE
// -----------------------------------------------------
async function main() {

    // 0 — Cleanup ---------------------------------------------------------
    console.log("🧹 dist ve dist-update temizleniyor...");
    fs.removeSync(DIST);
    fs.mkdirSync(DIST);
    fs.removeSync(UPDATE_OUT);
    fs.mkdirSync(UPDATE_OUT);

    // 1 — Copy required files/folders -----------------------------------
    console.log("📁 Seçili dosyalar dist içine kopyalanıyor...");

    const COPY_LIST = [
        "build",
        "global",
        "launcher",
        "main.js",
        "package.json"
    ];

    for (const item of COPY_LIST) {
        const src = path.join(ROOT, item);
        const dest = path.join(DIST, item);

        if (!fs.existsSync(src)) {
            console.log("⚠️ Bulunamadı, atlandı:", item);
            continue;
        }

        console.log("→", item);
        fs.copySync(src, dest);
    }

    // 2 — OBF -------------------------------------------------------------
    console.log("🔥 OBF başladı (dist/)...");
    const jsFiles = walkJs(DIST);
    console.log(`🔥 Toplam JS: ${jsFiles.length}`);

    console.log("🔥 Layer1...");
    jsFiles.forEach(f => obf(f, layer1));

    console.log("🔥 Layer2...");
    jsFiles.forEach(f => obf(f, layer2));

    // 3 — node_modules ----------------------------------------------------
    console.log("📦 node_modules → dist/node_modules");
    fs.copySync(path.join(ROOT, "node_modules"), path.join(DIST, "node_modules"));

    // 4 — electron-builder ------------------------------------------------
    console.log("⚡ electron-builder çalıştırılıyor...");
    try {
        cp.execSync('npx electron-builder --win nsis --projectDir="./dist"', {
            stdio: "inherit"
        });
    } catch (err) {
        console.error("❌ BUILD HATASI:", err);
        process.exit(1);
    }

    // 5 — app.asar locate -------------------------------------------------
    const unpacked = path.join(DIST, "dist-build", "win-unpacked");
    const resources = path.join(unpacked, "resources");
    const asarPath = path.join(resources, "app.asar");

    if (!fs.existsSync(asarPath)) {
        console.error("❌ app.asar bulunamadı!");
        process.exit(1);
    }

    const pkg = require(path.join(ROOT, "package.json"));
    const version = pkg.version;
    const asarHash = sha256(asarPath);
    const asarSize = fs.statSync(asarPath).size;

    console.log("📌 Version:", version);
    console.log("📌 ASAR SHA256:", asarHash);
    console.log("📌 ASAR Size:", asarSize);

    // 6 — app.asar çıktısını aynen kopyala --------------------------------
    const plainAsarPath = path.join(UPDATE_OUT, "app.asar");
    fs.copyFileSync(asarPath, plainAsarPath);

    // 7 — Build version.json (plain) -------------------------------------
    const versionPayload = {
        version,
        size: asarSize,
        sha256: asarHash,
        asarUrl: ASAR_URL
    };

    const plainBuf = Buffer.from(JSON.stringify(versionPayload));

    fs.writeFileSync(
        path.join(UPDATE_OUT, "version.json"),
        JSON.stringify(JSON.parse(plainBuf.toString("utf8")), null, 2)
    );

    fs.writeFileSync(
        path.join(DIST, "version.json"),
        JSON.stringify(JSON.parse(plainBuf.toString("utf8")), null, 2)
    );

    // 8 — Summary ----------------------------------------------------------
    console.log("\n🎉 BUILD TAMAMLANDI!");
    console.log("📤 Cloud’a atılacaklar:");
    console.log("   ✔", plainAsarPath);
    console.log("   ✔", path.join(UPDATE_OUT, "version.json"));
}

main().catch(err => {
    console.error("❌ PIPELINE ERROR:", err);
    process.exit(1);
});
