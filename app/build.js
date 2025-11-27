// =====================================================
// build.js — FINAL (NO CLEANUP, NO REDUCTION)
// =====================================================

const fs = require("fs-extra");
const path = require("path");
const cp = require("child_process");
const obfuscator = require("javascript-obfuscator");

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");

// ----------------------------------
// Minimal Obfuscation (opsiyonel)
// ----------------------------------
function walkJs(dir, list = []) {
    for (const f of fs.readdirSync(dir)) {
        const p = path.join(dir, f);
        if (p.includes("node_modules")) continue;
        if (p.includes("dist-build")) continue;

        if (fs.statSync(p).isDirectory()) walkJs(p, list);
        else if (f.endsWith(".js")) list.push(p);
    }
    return list;
}

function obfuscate(file) {
    const code = fs.readFileSync(file, "utf8");
    const result = obfuscator.obfuscate(code, {
        compact: true,
        stringArray: true
    });
    fs.writeFileSync(file, result.getObfuscatedCode());
}

// ----------------------------------
// MAIN PIPELINE
// ----------------------------------
async function main() {
    console.log("🧹 dist temizleniyor...");
    fs.removeSync(DIST);
    fs.ensureDirSync(DIST);

    console.log("📁 Dist'e proje kopyalanıyor...");
    const FILES = [
        "build",
        "src",
        "scripts",
        "package.json",
        "package-lock.json",
        "node_modules"
    ];

    for (const f of FILES) {
        fs.copySync(path.join(ROOT, f), path.join(DIST, f));
        console.log("→", f);
    }

    console.log("🔥 Obfuscation (opsiyonel) başlıyor...");
    const jsFiles = walkJs(DIST);
    console.log("JS:", jsFiles.length);
    jsFiles.forEach(obfuscate);
    console.log("🔥 Obf tamamlandı.");

    console.log("⚡ electron-builder başlatılıyor...");
    cp.execSync(`npx electron-builder --win nsis --projectDir="./dist"`, {
        stdio: "inherit"
    });

    console.log("🎉 BUILD TAMAMLANDI!");
    console.log("📦 EXE burada → dist-build/");
}

main().catch(err => {
    console.error("❌ HATA:", err);
    process.exit(1);
});
