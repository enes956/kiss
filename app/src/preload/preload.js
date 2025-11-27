const { contextBridge, ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const CHANNELS = require("../global/ipcChannels.cjs");

// ======================================================
// ASSET UTILS
// ======================================================
const devRoot = path.join(__dirname, "..");
const projectRoot = path.join(__dirname, "..", "..");
const unique = (list) => Array.from(new Set(list.filter(Boolean)));

const candidateRoots = unique([
    devRoot,
    projectRoot,
    process.resourcesPath,
    path.join(process.resourcesPath ?? "", "app"),
    path.join(process.resourcesPath ?? "", "app.asar"),
    path.join(process.resourcesPath ?? "", "app.asar.unpacked"),
    process.env.PORTABLE_EXECUTABLE_DIR,
    path.dirname(process.execPath ?? ""),
]);

const resolveAssetPath = (relativePath) => {
    const variants = [relativePath];
    const basename = path.basename(relativePath);
    if (basename !== relativePath) variants.push(basename);
    variants.push(path.join("build", basename));

    const candidates = candidateRoots.flatMap(root =>
        variants.map(variant => path.join(root, variant))
    );

    return candidates.find(c => fs.existsSync(c)) ?? candidates[0];
};

const assetUrl = (relativePath) =>
    pathToFileURL(resolveAssetPath(relativePath)).toString();

const assetDataUrl = (relativePath) => {
    const p = resolveAssetPath(relativePath);
    const mime = p.endsWith(".png") ? "image/png"
        : p.endsWith(".ico") ? "image/x-icon"
        : "application/octet-stream";
    try {
        return `data:${mime};base64,${fs.readFileSync(p).toString("base64")}`;
    } catch {
        return assetUrl(relativePath);
    }
};

// ======================================================
// API
// ======================================================
const api = Object.freeze({
    CHANNELS,

    send: (c, d) => ipcRenderer.send(c, d),
    receive: (c, fn) => ipcRenderer.on(c, (_, ...a) => fn(...a)),
    invoke: (c, d) => ipcRenderer.invoke(c, d),
    on: (c, fn) => ipcRenderer.on(c, (_, ...a) => fn(...a)),

    window: {
        control: (action) => ipcRenderer.send(CHANNELS.WINDOW_CONTROL, action),
    },

    auth: {
        login: (payload) => ipcRenderer.invoke(CHANNELS.AUTH_LOGIN, payload),
        success: (detail) => ipcRenderer.send(CHANNELS.AUTH_SUCCESS, detail),
        cancel: () => ipcRenderer.send(CHANNELS.AUTH_CANCEL),
        onContinue: (fn) => ipcRenderer.on(CHANNELS.AUTH_CONTINUE, (_e, d) => fn(d)),
        onCancelled: (fn) => ipcRenderer.on(CHANNELS.AUTH_CANCELLED, fn),
    },

    content: {
        listScripts: () => ipcRenderer.invoke(CHANNELS.CONTENT_LIST_SCRIPTS),
        buildScripts: (scripts) => ipcRenderer.invoke(CHANNELS.CONTENT_BUILD_SCRIPTS, { scripts }),
        clearHistory: (viewCount) => ipcRenderer.invoke(CHANNELS.CONTENT_CLEAR_HISTORY, { viewCount }),
    },

    asset: {
        url: assetUrl,
        dataUrl: assetDataUrl,
    },

    update: {
        start: () => ipcRenderer.send(CHANNELS.UPDATE_START),
        proceed: () => ipcRenderer.send(CHANNELS.UPDATE_PROCEED),
        repair: () => ipcRenderer.send(CHANNELS.UPDATE_REPAIR),
        install: () => ipcRenderer.send(CHANNELS.UPDATE_INSTALL),
        cancel: () => ipcRenderer.send(CHANNELS.UPDATE_CANCEL),
        onLog: (fn) => ipcRenderer.on(CHANNELS.UPDATE_LOG, (_e, d) => fn(d)),
        onChecking: (fn) => ipcRenderer.on(CHANNELS.UPDATE_CHECKING, (_e, d) => fn(d)),
        onAvailable: (fn) => ipcRenderer.on(CHANNELS.UPDATE_AVAILABLE, (_e, d) => fn(d)),
        onNotAvailable: (fn) => ipcRenderer.on(CHANNELS.UPDATE_NOT_AVAILABLE, (_e, d) => fn(d)),
        onError: (fn) => ipcRenderer.on(CHANNELS.UPDATE_ERROR, (_e, d) => fn(d)),
        onProgress: (fn) => ipcRenderer.on(CHANNELS.UPDATE_PROGRESS, (_e, d) => fn(d)),
        onDownloaded: (fn) => ipcRenderer.on(CHANNELS.UPDATE_DOWNLOADED, (_e, d) => fn(d)),
        onComplete: (fn) => ipcRenderer.on(CHANNELS.UPDATE_COMPLETE, fn),
    },

    getVersion: () => ipcRenderer.invoke(CHANNELS.APP_GET_VERSION),

    assetUrl,
    assetDataUrl,
});

contextBridge.exposeInMainWorld("api", api);
