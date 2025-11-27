const fs = require("fs");
const path = require("path");

const coreDir = path.join(__dirname, "..", "..", "..", "scripts", "core");
const scriptsDir = path.join(__dirname, "..", "..", "..", "scripts", "modules");

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
            .map((file) => path.join(dirPath, file));
    } catch (err) {
        console.warn("Klasör okunamadı:", dirPath, err.message);
        return [];
    }
}

function extractMeta(code, fallbackName) {
    const titleMatch = code.match(/title:\s*["']([^"']+)/i);
    const factoryMatch = code.match(/function\s+(create[\w]+Module)/);
    return {
        title: titleMatch?.[1] || fallbackName,
        factory: factoryMatch?.[1] || null,
    };
}

function loadScripts() {
    const scripts = [];

    readList(scriptsDir).forEach((filePath) => {
        try {
            const code = safeRead(filePath);
            const meta = extractMeta(code, path.basename(filePath));
            scripts.push({
                name: path.basename(filePath),
                code,
                title: meta.title,
                factory: meta.factory,
            });
        } catch (err) {
            console.error("Script okunamadı:", filePath, err);
        }
    });

    return scripts;
}

function buildBundle(selectedNames = []) {
    const allScripts = loadScripts();
    const selected = allScripts.filter((s) => selectedNames.includes(s.name) && s.name !== "ModuleManager.js");
    const moduleManager = allScripts.find((s) => s.name === "ModuleManager.js");

    const bundleScripts = [moduleManager, ...selected].filter(Boolean);

    const coreFiles = readList(coreDir).map((p) => safeRead(p)).join("\n\n");
    const moduleFiles = bundleScripts.map((m) => m.code).join("\n\n");

    const bootstrap = (() => {
        const defs = selected
            .map((script) => (script.factory ? `${script.factory}(StorageUtils)` : ""))
            .filter(Boolean)
            .map((line) => `        ${line}`)
            .join(",\n");

        return `function initializeToolkit() {
    console.log("[Toolkit] Initializing…");

    const registry = new ToolkitModuleRegistry(StorageUtils);
    const panel    = new ToolkitPanel(StorageUtils);

    const moduleManager = createModuleManagerModule(StorageUtils);
    registry.register(moduleManager);

    const enabledMap = moduleManager.loadEnabledMap();
    const allDefinitions = [
${defs}
    ];

    moduleManager.setModuleDefinitions(allDefinitions);

    const activeModules = [];
    allDefinitions.forEach(def => {
        const enabled = enabledMap[def.name] !== false;
        if (enabled) {
            activeModules.push(registry.register(def));
        }
    });

    panel.attachModule(moduleManager);
    activeModules.forEach(m => panel.attachModule(m));
    panel.showModule(moduleManager.name);
    window.__ToolkitPanel = panel;

    console.log("[Toolkit] READY ✅");
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeToolkit);
} else {
    initializeToolkit();
}`;
    })();

    const header = "(function(){'use strict';\n";
    const footer = "\n})();";

    return [header, coreFiles, moduleFiles, bootstrap, footer].join("\n\n");
}

module.exports = { loadScripts, buildBundle };
