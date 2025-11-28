const fs = require("fs");
const path = require("path");

const coreDir = path.join(__dirname, "..", "..", "..", "scripts", "core");
const scriptsDir = path.join(__dirname, "..", "..", "..", "scripts", "modules");
const bootstrapPath = path.join(__dirname, "..", "..", "..", "scripts", "bootstrap.js");

function safeRead(filePath) {
    try {
        return fs.readFileSync(filePath, "utf8");
    } catch (err) {
        console.error("Dosya okunamadı:", filePath, err);
        return "";
    }
}

function readList(dirPath) {
    try {
        return fs
            .readdirSync(dirPath)
            .filter((file) => file.toLowerCase().endsWith(".js"))
            .sort()
            .map((file) => path.join(dirPath, file));
    } catch (err) {
        console.warn("Klasör okunamadı:", dirPath, err.message);
        return [];
    }
}

function extractMeta(code, fallbackName) {
    const titleMatch = code.match(/title:\s*["']([^"']+)/i);
    const descriptionMatch = code.match(/description:\s*["']([^"']+)/i);
    const factoryMatch = code.match(/function\s+(create[\w]+Module)/);
    return {
        title: titleMatch?.[1] || fallbackName,
        description: descriptionMatch?.[1] || null,
        factory: factoryMatch?.[1] || null,
    };
}

function loadScripts() {
    const scripts = [];

    readList(scriptsDir).forEach((filePath) => {
        try {
            const code = safeRead(filePath);
            const meta = extractMeta(code, path.basename(filePath));
            const displayName = path.basename(filePath, ".js");
            scripts.push({
                name: path.basename(filePath),
                code,
                title: meta.title,
                description: meta.description,
                displayName,
                factory: meta.factory,
                hidden: path.basename(filePath) === "ModuleManager.js",
            });
        } catch (err) {
            console.error("Script okunamadı:", filePath, err);
        }
    });

    return scripts;
}

function buildBundle(selectedNames = []) {
    const allScripts = loadScripts();
    const selection = new Set(selectedNames);
    const manager = allScripts.find((s) => s.name === "ModuleManager.js");
    if (manager) selection.add(manager.name);
    const selected = allScripts.filter((s) => selection.has(s.name));

    const coreFiles = readList(coreDir).map((p) => safeRead(p)).join("\n\n");
    const moduleFiles = selected.map((m) => m.code).join("\n\n");
    const bootstrap = safeRead(bootstrapPath);

    const definitions = selected
        .filter((script) => script.factory)
        .map((script) => `    { name: ${JSON.stringify(script.name)}, title: ${JSON.stringify(script.title)}, factory: ${script.factory} }`)
        .join(",\n");

    const header = "(function(){'use strict';\n";
    const footer = "\n})();";

    const payload = [
        header,
        coreFiles,
        moduleFiles,
        bootstrap,
        "window.__KISS_MODULE_DEFINITIONS__ = [\n" + definitions + "\n].filter(def => typeof def.factory === 'function');",
        "window.__kissBootstrapToolkit = window.__kissBootstrapToolkit || bootstrapToolkit;",
        "window.__kissPrepareBridge = window.__kissPrepareBridge || prepareToolkitBridge;",
        "window.__KISS_BUNDLE_READY__ = true;",
        footer,
    ]
        .filter(Boolean)
        .join("\n\n");

    return payload;
}

module.exports = { loadScripts, buildBundle };
