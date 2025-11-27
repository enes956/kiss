function registerWindowControls(ipcMain, CHANNELS) {
    const { BrowserWindow } = require("electron");

    ipcMain.on(CHANNELS.WINDOW_CONTROL, (_event, action) => {
        const win = BrowserWindow.getFocusedWindow();
        if (!win) return;

        if (action === "minimize") win.minimize();
        else if (action === "maximize") win.isMaximized() ? win.unmaximize() : win.maximize();
        else if (action === "close") win.close();
    });
}

module.exports = { registerWindowControls };
