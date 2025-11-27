// builder.js
const fs = require("fs");
const path = require("path");

// Çıkış dosyası
const outFile = path.join(__dirname, "main.user.js");

// IIFE + TamperMonkey header
const header = `// ==UserScript==
// @name        KissKiss Toolkit — Modular Panel (Build)
// @namespace   http://tampermonkey.net/
// @version     1.2
// @description Modular panel with settings, storage, drag and taller view.
// @match       https://getkisskiss.com/*
// @grant       none
// ==/UserScript==

(function(){'use strict';\n`;

const footer = `
})();`;

function readFile(p) {
    return fs.readFileSync(p, "utf8") + "\n";
}

function build() {
    let out = header;

    //
    // 1) CORE DOSYALARI
    //
    const corePath = path.join(__dirname, "core");
    let coreFiles = [];

    if (fs.existsSync(corePath)) {
        coreFiles = fs.readdirSync(corePath)
            .filter(f => f.endsWith(".js"));
    }

    coreFiles.forEach(f => {
        out += `\n// ===== CORE: ${f} =====\n`;
        out += readFile(path.join(corePath, f));
    });

    //
    // 2) MODULE DOSYALARI
    //
    const modulesPath = path.join(__dirname, "modules");
    let moduleFiles = [];

    if (fs.existsSync(modulesPath)) {
        moduleFiles = fs.readdirSync(modulesPath)
            .filter(f => f.endsWith(".js"));
    }

    moduleFiles.forEach(f => {
        out += `\n// ===== MODULE: ${f} =====\n`;
        out += readFile(path.join(modulesPath, f));
    });

    //
    // 3) BOOTSTRAP
    //
    const bootstrapFile = path.join(__dirname, "bootstrap.js");
    if (fs.existsSync(bootstrapFile)) {
        out += `\n// ===== BOOTSTRAP =====\n`;
        out += readFile(bootstrapFile);
    } else {
        console.warn("⚠ bootstrap.js bulunamadı!");
    }

    out += footer;

    fs.writeFileSync(outFile, out, "utf8");
    console.log(`✅ Build tamamlandı → ${outFile}`);
}

build();
