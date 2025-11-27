const { session } = require("electron");
const { loadScripts, buildBundle } = require("../../modules/content/scriptLoader");

async function clearHistoryForViews(viewCount) {
    const tasks = [];
    for (let i = 1; i <= viewCount; i += 1) {
        const partition = session.fromPartition(`persist:slot${i}`);
        tasks.push(
            partition.clearStorageData({
                storages: [
                    "cookies",
                    "localstorage",
                    "indexdb",
                    "cachestorage",
                    "serviceworkers",
                    "appcache",
                ],
            }).catch((error) => {
                console.error("Depolama temizlenirken hata oluştu:", error);
            }),
        );
    }

    await Promise.all(tasks);
}

function registerContentHandlers(ipcMain, CHANNELS) {
    ipcMain.handle(CHANNELS.CONTENT_LIST_SCRIPTS, () => loadScripts());
    ipcMain.handle(CHANNELS.CONTENT_BUILD_SCRIPTS, (_event, payload) => {
        const names = Array.isArray(payload?.scripts) ? payload.scripts : [];
        return buildBundle(names);
    });
    ipcMain.handle(CHANNELS.CONTENT_CLEAR_HISTORY, async (_event, payload) => {
        const count = Number(payload?.viewCount) || 1;
        await clearHistoryForViews(Math.max(1, Math.min(8, count)));
    });
}

module.exports = { registerContentHandlers };
