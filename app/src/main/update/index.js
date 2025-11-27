const fs = require("fs");
const os = require("os");
const path = require("path");
const { autoUpdater } = require("electron-updater");
const { https } = require("follow-redirects");
const { DownloadedUpdateHelper } = require("electron-updater/out/DownloadedUpdateHelper");
const { resolveFiles, parseUpdateInfo } = require("electron-updater/out/providers/Provider");
const { getChannelFilename, newBaseUrl, newUrlFromBase } = require("electron-updater/out/util");
const CHANNELS = require("../../global/ipcChannels.cjs");

function sleep(ms) {
    return new Promise((res) => setTimeout(res, ms));
}

function downloadBuffer(url, abortSignal) {
    return new Promise((resolve, reject) => {
        let completed = false;
        const abortErr = new Error("İndirme iptal edildi.");
        abortErr.name = "AbortError";

        const cleanup = (request) => {
            if (abortSignal) abortSignal.removeEventListener("abort", onAbort);
            if (request) request.removeAllListeners();
        };

        const onAbort = () => {
            if (completed) return;
            completed = true;
            cleanup(requestRef);
            requestRef?.destroy(abortErr);
            reject(abortErr);
        };

        if (abortSignal?.aborted) {
            reject(abortErr);
            return;
        }

        const requestRef = https.get(url, (response) => {
            const statusCode = response.statusCode || 0;
            if (statusCode >= 400) {
                completed = true;
                cleanup(requestRef);
                reject(new Error(`İndirme hatası (${statusCode}): ${url}`));
                return;
            }

            const chunks = [];
            response.on("data", (chunk) => {
                if (completed) return;
                chunks.push(chunk);
            });
            response.on("end", () => {
                if (completed) return;
                completed = true;
                cleanup(requestRef);
                resolve(Buffer.concat(chunks));
            });
        });

        const request = requestRef;

        request.on("error", (err) => {
            if (completed) return;
            completed = true;
            cleanup(request);
            reject(err);
        });

        if (abortSignal) {
            abortSignal.addEventListener("abort", onAbort);
        }
    });
}

function downloadToFile(url, destination, onProgress, abortSignal) {
    return new Promise((resolve, reject) => {
        const abortErr = new Error("İndirme iptal edildi.");
        abortErr.name = "AbortError";
        const fileStream = fs.createWriteStream(destination);
        let downloaded = 0;
        let totalBytes = 0;
        const started = Date.now();
        let finished = false;
        let requestRef;

        const cleanup = () => {
            if (abortSignal) abortSignal.removeEventListener("abort", onAbort);
        };

        const onAbort = () => {
            if (finished) return;
            finished = true;
            cleanup();
            requestRef?.destroy(abortErr);
            fileStream.destroy(abortErr);
            fs.unlink(destination, () => {});
            reject(abortErr);
        };

        if (abortSignal?.aborted) {
            onAbort();
            return;
        }

        requestRef = https
            .get(url, (response) => {
                const statusCode = response.statusCode || 0;
                if (statusCode >= 400) {
                    finished = true;
                    cleanup();
                    reject(new Error(`İndirme hatası (${statusCode}): ${url}`));
                    return;
                }

                totalBytes = Number(response.headers["content-length"]) || 0;

                response.on("data", (chunk) => {
                    if (finished) return;
                    downloaded += chunk.length;
                    fileStream.write(chunk);

                    if (typeof onProgress === "function") {
                        const durationSec = Math.max((Date.now() - started) / 1000, 0.001);
                        const bytesPerSecond = downloaded / durationSec;
                        const percent = totalBytes ? (downloaded / totalBytes) * 100 : 0;
                        onProgress({
                            percent,
                            bytesPerSecond,
                            transferred: downloaded,
                            total: totalBytes,
                        });
                    }
                });

                response.once("end", () => {
                    if (finished) return;
                    finished = true;
                    cleanup();
                    fileStream.end();
                    resolve();
                });
            })
            .on("error", (err) => {
                if (finished) return;
                finished = true;
                cleanup();
                fileStream.close(() => reject(err));
            });

        if (abortSignal) {
            abortSignal.addEventListener("abort", onAbort);
        }
    });
}

function setupAutoUpdate({ app, ipcMain, sendToRenderer, pkg }) {
    let repairRequested = false;
    let forceRepairDownload = false;
    let activeDownloadCancel = null;

    const setActiveDownloadCancel = (cancelFn) => {
        activeDownloadCancel = typeof cancelFn === "function" ? cancelFn : null;
    };

    const clearActiveDownloadCancel = () => {
        setActiveDownloadCancel(null);
    };

    const trackCancellationToken = (token) => {
        if (!token || typeof token.cancel !== "function") {
            clearActiveDownloadCancel();
            return;
        }
        setActiveDownloadCancel(() => token.cancel());
    };

    const trackAbortController = (controller) => {
        if (!controller || typeof controller.abort !== "function") {
            clearActiveDownloadCancel();
            return;
        }
        setActiveDownloadCancel(() => controller.abort());
    };

    const cancelOngoingDownload = () => {
        try {
            if (activeDownloadCancel) {
                activeDownloadCancel();
            }
        } catch (err) {
            sendToRenderer(CHANNELS.UPDATE_LOG, `İptal edilirken hata: ${err}`);
        } finally {
            clearActiveDownloadCancel();
        }

        autoUpdater.cancelDownload?.();
    };

    async function manualRepairDownload() {
        const repairAbort = new AbortController();
        trackAbortController(repairAbort);

        const pkgPublish = Array.isArray(pkg.build?.publish)
            ? pkg.build.publish[0]
            : pkg.build?.publish;

        const FALLBACK_PUBLISH = {
            url: "https://updater.bekapvc.com/",
            channel: "latest",
        };

        const publishEntry = pkgPublish || FALLBACK_PUBLISH;
        const baseUrl = newBaseUrl(publishEntry.url);
        const channelName = autoUpdater.channel || publishEntry.channel || "latest";
        const channelFile = getChannelFilename(channelName);
        const latestUrl = newUrlFromBase(channelFile, baseUrl);

        sendToRenderer(CHANNELS.UPDATE_LOG, `latest.yml indiriliyor: ${latestUrl.href}`);

        let updateInfo;
        try {
            const latestBuffer = await downloadBuffer(latestUrl.href, repairAbort.signal);
            updateInfo = parseUpdateInfo(latestBuffer.toString(), channelFile, latestUrl);
        } catch (err) {
            if (err?.name === "AbortError") {
                sendToRenderer(CHANNELS.UPDATE_LOG, "Tamir indirmesi iptal edildi.");
                return { handled: true, success: false };
            }
            sendToRenderer(CHANNELS.UPDATE_ERROR, err?.toString());
            sendToRenderer(CHANNELS.UPDATE_LOG, `HATA: ${err}`);
            return { handled: true, success: false };
        }

        const resolvedFiles = resolveFiles(updateInfo, baseUrl);
        const targetFile = resolvedFiles?.[0];
        const targetUrl = targetFile?.url?.href || targetFile?.url?.toString();

        if (!targetUrl) {
            sendToRenderer(CHANNELS.UPDATE_ERROR, "latest.yml içinde indirilebilir dosya yok.");
            return { handled: true, success: false };
        }

        const fileName = path.basename(targetFile.url.pathname) || `repair-${Date.now()}.exe`;
        const downloadPath = path.join(os.tmpdir(), fileName);

        sendToRenderer(CHANNELS.UPDATE_AVAILABLE, { ...updateInfo, files: updateInfo.files, repair: true });
        sendToRenderer(CHANNELS.UPDATE_LOG, `Tamir kurulumu indiriliyor: ${fileName}`);

        try {
            await downloadToFile(targetUrl, downloadPath, (progress) => {
                sendToRenderer(CHANNELS.UPDATE_PROGRESS, progress);
            }, repairAbort.signal);
        } catch (err) {
            if (err?.name === "AbortError") {
                sendToRenderer(CHANNELS.UPDATE_LOG, "Tamir indirmesi kullanıcı tarafından durduruldu.");
                return { handled: true, success: false };
            }
            sendToRenderer(CHANNELS.UPDATE_ERROR, err?.toString());
            return { handled: true, success: false };
        }

        try {
            const helper = await autoUpdater.getOrCreateDownloadHelper();
            const downloadHelper = helper instanceof DownloadedUpdateHelper
                ? helper
                : new DownloadedUpdateHelper(path.join(app.getPath("userData"), "__updates"));

            await downloadHelper.setDownloadedFile(downloadPath, null, updateInfo, targetFile, fileName, false);
            autoUpdater.downloadedUpdateHelper = downloadHelper;

            autoUpdater.emit("update-downloaded", {}, updateInfo);
            sendToRenderer(CHANNELS.UPDATE_LOG, "Tamir paketi indirildi. Kurulum bekleniyor.");
            return { handled: true, success: true };
        } catch (err) {
            sendToRenderer(CHANNELS.UPDATE_ERROR, err?.toString());
            return { handled: true, success: false };
        } finally {
            clearActiveDownloadCancel();
        }
    }

    async function forceDownloadCurrentRelease() {
        forceRepairDownload = true;
        autoUpdater.allowDowngrade = true;

        const originalGetVersion = app.getVersion;
        const originalAutoDownload = autoUpdater.autoDownload;
        clearActiveDownloadCancel();

        try {
            app.getVersion = () => "0.0.0";
            autoUpdater.autoDownload = false;

            const result = await autoUpdater.checkForUpdates();
            trackCancellationToken(result?.cancellationToken);
            const info = result?.updateInfo;

            if (!info || !result?.cancellationToken) {
                const manualResult = await manualRepairDownload();
                return manualResult.handled;
            }

            sendToRenderer(CHANNELS.UPDATE_AVAILABLE, { ...info, repair: true });
            sendToRenderer(CHANNELS.UPDATE_LOG, `Mevcut sürüm yeniden indiriliyor: ${info.version}`);
            await autoUpdater.downloadUpdate(result.cancellationToken);
            clearActiveDownloadCancel();
            return true;
        } catch (err) {
            sendToRenderer(CHANNELS.UPDATE_ERROR, err?.toString());
            sendToRenderer(CHANNELS.UPDATE_LOG, `HATA: ${err}`);
            return true;
        } finally {
            forceRepairDownload = false;
            autoUpdater.autoDownload = originalAutoDownload;
            app.getVersion = originalGetVersion;
            autoUpdater.allowDowngrade = false;
            clearActiveDownloadCancel();
        }
    }

    ipcMain.on(CHANNELS.UPDATE_START, async () => {
        sendToRenderer(CHANNELS.UPDATE_LOG, "UI → Güncelleme başlatıldı");
        try {
            const result = await autoUpdater.checkForUpdates();
            trackCancellationToken(result?.cancellationToken);
        } catch (err) {
            sendToRenderer(CHANNELS.UPDATE_ERROR, err?.toString());
            sendToRenderer(CHANNELS.UPDATE_LOG, `HATA: ${err}`);
        }
    });

    ipcMain.on(CHANNELS.UPDATE_PROCEED, () => {
        sendToRenderer(CHANNELS.UPDATE_COMPLETE);
    });

    ipcMain.on(CHANNELS.UPDATE_REPAIR, async () => {
        repairRequested = true;
        sendToRenderer(CHANNELS.UPDATE_LOG, "Tamir indirmesi başlatıldı...");
        sendToRenderer(CHANNELS.UPDATE_CHECKING);
        autoUpdater.allowDowngrade = true;

        const originalGetVersion = app.getVersion;
        app.getVersion = () => "0.0.0";

        const restoreVersion = () => {
            app.getVersion = originalGetVersion;
            autoUpdater.allowDowngrade = false;
            autoUpdater.off("update-available", restoreVersion);
            autoUpdater.off("update-not-available", restoreVersion);
            autoUpdater.off("error", restoreVersion);
        };

        autoUpdater.prependListener("update-available", restoreVersion);
        autoUpdater.prependListener("update-not-available", restoreVersion);
        autoUpdater.prependListener("error", restoreVersion);

        try {
            const result = await autoUpdater.checkForUpdates();
            trackCancellationToken(result?.cancellationToken);
        } catch (err) {
            sendToRenderer(CHANNELS.UPDATE_ERROR, err?.toString());
            sendToRenderer(CHANNELS.UPDATE_LOG, `HATA: ${err}`);
        }
    });

    ipcMain.on(CHANNELS.UPDATE_CANCEL, () => {
        repairRequested = false;
        forceRepairDownload = false;
        cancelOngoingDownload();
        clearActiveDownloadCancel();
        sendToRenderer(CHANNELS.UPDATE_LOG, "Güncelleme indirmesi iptal edildi.");
    });

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = false;

    autoUpdater.on("checking-for-update", async () => {
        sendToRenderer(CHANNELS.UPDATE_CHECKING);
        sendToRenderer(CHANNELS.UPDATE_LOG, "Sunucuya bağlanılıyor...");
        await sleep(600);
    });

    autoUpdater.on("update-available", async (info) => {
        const isRepair = repairRequested || info?.repair;
        if (!isRepair) {
            repairRequested = false;
            autoUpdater.allowDowngrade = false;
        }

        sendToRenderer(CHANNELS.UPDATE_AVAILABLE, info);
        sendToRenderer(CHANNELS.UPDATE_LOG, `Yeni sürüm bulundu: ${info.version}`);
        await sleep(600);
    });

    autoUpdater.on("update-not-available", async () => {
        const repairHandled = repairRequested && !forceRepairDownload
            ? await forceDownloadCurrentRelease()
            : false;
        if (repairHandled) return;

        sendToRenderer(CHANNELS.UPDATE_NOT_AVAILABLE, { repairRequested });
        sendToRenderer(
            CHANNELS.UPDATE_LOG,
            repairRequested ? "Tamir için paket yok." : "Uygulama güncel."
        );

        repairRequested = false;
        autoUpdater.allowDowngrade = false;
        clearActiveDownloadCancel();
        await sleep(600);
    });

    autoUpdater.on("error", async (err) => {
        sendToRenderer(CHANNELS.UPDATE_ERROR, err?.toString());
        sendToRenderer(CHANNELS.UPDATE_LOG, `HATA: ${err}`);
        clearActiveDownloadCancel();
        await sleep(600);
    });

    autoUpdater.on("download-progress", (progress) => {
        sendToRenderer(CHANNELS.UPDATE_PROGRESS, progress);
        sendToRenderer(
            CHANNELS.UPDATE_LOG,
            `İndiriliyor: %${Math.round(progress.percent)} (${Math.round(progress.bytesPerSecond / 1024)} KB/s)`
        );
    });

    autoUpdater.on("update-downloaded", async () => {
        sendToRenderer(CHANNELS.UPDATE_DOWNLOADED);
        sendToRenderer(CHANNELS.UPDATE_LOG, "Güncelleme indirildi. Kurulum bekleniyor.");
        repairRequested = false;
        clearActiveDownloadCancel();
        await sleep(600);
    });

    ipcMain.on(CHANNELS.UPDATE_INSTALL, () => {
        sendToRenderer(CHANNELS.UPDATE_LOG, "Yükleyici başlatılıyor...");
        autoUpdater.quitAndInstall(true, true);
    });

    autoUpdater
        .checkForUpdates()
        .then((result) => trackCancellationToken(result?.cancellationToken))
        .catch((err) => {
            sendToRenderer(CHANNELS.UPDATE_LOG, `HATA: ${err}`);
        });
}

module.exports = { setupAutoUpdate };
