const { ipcMain } = require("electron");
const CHANNELS = require("../../global/ipcChannels.cjs");
const { performLogin } = require("./authManager");

function registerAuthEvents({ onLoginSuccess, onLoginCancel } = {}) {
    ipcMain.handle(CHANNELS.AUTH_LOGIN, async (_event, credentials) => performLogin(credentials));

    ipcMain.on(CHANNELS.AUTH_SUCCESS, (_event, detail) => {
        if (typeof onLoginSuccess === "function") onLoginSuccess(detail);
    });

    ipcMain.on(CHANNELS.AUTH_CANCEL, () => {
        if (typeof onLoginCancel === "function") onLoginCancel();
    });
}

module.exports = { registerAuthEvents };
