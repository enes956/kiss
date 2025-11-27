const path = require("path");
const { BrowserWindow } = require("electron");

function createMainWindow() {
    const mainWin = new BrowserWindow({
        width: 1280,
        height: 830,
        frame: false,
        backgroundColor: "#060c16",
        show: false,
        webPreferences: {
            preload: path.join(__dirname, "../preload/preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            webviewTag: true,
            backgroundThrottling: false,
        },
    });

    mainWin.once("closed", () => {
        mainWin.destroy();
    });

    mainWin.loadFile(path.join(__dirname, "../renderer/index.html"));

    mainWin.once("ready-to-show", () => {
        if (!mainWin.isDestroyed()) {
            mainWin.show();
        }
    });

    return mainWin;
}

module.exports = { createMainWindow };
