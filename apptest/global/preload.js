const { contextBridge, ipcRenderer } = require("electron");
const CHANNELS = require("./ipcChannels.cjs");

contextBridge.exposeInMainWorld("api", {

    CHANNELS,   //  ←←← BUNU EKLE

    send: (c, d) => ipcRenderer.send(c, d),
    receive: (c, fn) => ipcRenderer.on(c, (_, ...a) => fn(...a)),
    invoke: (c, d) => ipcRenderer.invoke(c, d),
    on: (c, fn) => ipcRenderer.on(c, (_, ...a) => fn(...a)),
    windowAction: (action) => ipcRenderer.send(CHANNELS.WINDOW_CONTROL, action),
    getVersion: () => ipcRenderer.invoke(CHANNELS.APP_GET_VERSION)
});
