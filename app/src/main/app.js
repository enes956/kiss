const path = require("path");
const { app, ipcMain } = require("electron");
const CHANNELS = require("../global/ipcChannels.cjs");
const pkg = require(path.join(__dirname, "..", "..", "package.json"));
const { createMainWindow } = require("./window");
const { registerWindowControls } = require("./ipc/windowControls");
const { registerVersionHandler } = require("./ipc/version");
const { wireAuth } = require("./auth");
const { setupAutoUpdate } = require("./update");
const { registerContentHandlers } = require("./content");

let mainWin;

process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
});

process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
});

function sendToRenderer(channel, payload) {
    try {
        mainWin?.webContents?.send(channel, payload);
    } catch (err) {
        console.error("Renderer ileti hatası", err);
    }
}

function initApp() {
    if (mainWin && !mainWin.isDestroyed()) return;

    mainWin = createMainWindow();

    registerVersionHandler(ipcMain, CHANNELS, pkg.version);
    registerWindowControls(ipcMain, CHANNELS);
    registerContentHandlers(ipcMain, CHANNELS);
    wireAuth(sendToRenderer);
    setupAutoUpdate({ app, ipcMain, mainWindow: mainWin, sendToRenderer, pkg });
}

if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    app.on("second-instance", () => {
        if (!mainWin) return;
        if (mainWin.isMinimized()) mainWin.restore();
        mainWin.focus();
    });

    app.whenReady().then(initApp);

    app.on("activate", () => {
        if (require("electron").BrowserWindow.getAllWindows().length === 0) {
            initApp();
        }
    });

    app.on("window-all-closed", () => {
        if (process.platform !== "darwin") app.quit();
    });
}
