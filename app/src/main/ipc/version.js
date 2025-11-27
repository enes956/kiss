function registerVersionHandler(ipcMain, CHANNELS, version) {
    ipcMain.handle(CHANNELS.APP_GET_VERSION, () => version);
}

module.exports = { registerVersionHandler };
