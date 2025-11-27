import { eventBus } from "../../core/eventBus.js";

// launcher/content/views/update/events.js
export default function updateEvents() {
    const statusBox = document.getElementById("updateStatusBox");
    const statusMessage = document.getElementById("updateStatusMessage");
    const statusIcon = statusBox?.querySelector(".status-icon");
    const updateInfo = document.getElementById("updateInfo");
    const updateVersion = document.getElementById("updateVersion");
    const updateSize = document.getElementById("updateSize");
    const updateDescription = document.getElementById("updateDescription");
    const progressArea = document.getElementById("updateProgressArea");
    const progressBar = document.getElementById("updateProgressBar");
    const progressLabel = document.getElementById("updateProgressLabel");
    const percentEl = document.getElementById("updatePercent");
    const installingBox = document.getElementById("updateInstalling");
    const startBtn = document.getElementById("updateStartBtn");
    const upToDateActions = document.getElementById("updateUpToDateActions");
    const continueBtn = document.getElementById("updateContinueBtn");
    const repairBtn = document.getElementById("updateRepairBtn");
    const repairModal = document.getElementById("repairLeaveModal");
    const repairStayBtn = document.getElementById("repairStayBtn");
    const repairLeaveBtn = document.getElementById("repairLeaveBtn");
    const updateLeaveModal = document.getElementById("updateLeaveModal");
    const updateStayBtn = document.getElementById("updateStayBtn");
    const updateLeaveBtn = document.getElementById("updateLeaveBtn");
    let downloadRequested = false;
    let updateReady = false;
    let repairRequested = false;
    let currentVersion = "";
    let upToDate = false;
    let repairDownloadActive = false;
    let updateDownloadActive = false;
    let pendingTargetView = null;

    window.appGuards = window.appGuards || {};

    function setRepairActive(active) {
        repairDownloadActive = !!active;
        window.appGuards.repairDownloadActive = repairDownloadActive;
    }

    function setUpdateDownloadActive(active) {
        updateDownloadActive = !!active;
        window.appGuards.updateDownloadActive = updateDownloadActive;
    }

    window.api.getVersion?.().then((v) => {
        currentVersion = v ?? "";
    });

    function setStatus(type, message) {
        statusBox.classList.remove("info", "success", "error");
        statusBox.classList.add(type);
        statusMessage.textContent = message;
        if (statusIcon) {
            statusIcon.textContent = type === "success" ? "✓" : type === "error" ? "!" : "ℹ";
        }
    }

    function setVersionState(isUpToDate) {
        upToDate = !!isUpToDate;
        window.appVersionState = { upToDate };
        eventBus.emit("app-version-status", { upToDate });
    }

    function formatSize(bytes) {
        if (!bytes || Number.isNaN(bytes)) return "-";
        const mb = bytes / 1024 / 1024;
        return `${mb.toFixed(1)} MB`;
    }

    function resetProgress() {
        progressBar.style.width = "0%";
        percentEl.textContent = "0%";
        progressArea.classList.add("is-hidden");
    }

    function resetViewState({ cancelled } = {}) {
        downloadRequested = false;
        updateReady = false;
        repairRequested = false;
        setRepairActive(false);
        setUpdateDownloadActive(false);
        toggleStart(false);
        setStartVisibility(true);
        toggleUpToDateActions(false);
        installingBox.classList.add("is-hidden");
        resetProgress();
        const message = cancelled
            ? "İndirme iptal edildi. İstediğiniz zaman yeniden başlayabilirsiniz."
            : "Güncelleme kontrolüne hazır.";
        setStatus("info", message);
        setVersionState(cancelled ? true : false);
        updateInfo.classList.add("is-hidden");
    }

    function cancelActiveDownloads({ allowLogin = false } = {}) {
        window.api.send(window.api.CHANNELS.UPDATE_CANCEL);
        resetViewState({ cancelled: allowLogin });
    }

    function openRepairModal(targetView) {
        if (!repairModal) return;
        pendingTargetView = targetView;
        repairModal.classList.remove("is-hidden");
    }

    function closeRepairModal() {
        if (!repairModal) return;
        repairModal.classList.add("is-hidden");
        pendingTargetView = null;
    }

    function openUpdateLeaveModal(targetView) {
        if (!updateLeaveModal) return;
        pendingTargetView = targetView;
        updateLeaveModal.classList.remove("is-hidden");
    }

    function closeUpdateLeaveModal() {
        if (!updateLeaveModal) return;
        updateLeaveModal.classList.add("is-hidden");
        pendingTargetView = null;
    }

    function toggleStart(disabled) {
        if (!startBtn) return;
        startBtn.disabled = disabled;
        startBtn.classList.toggle("disabled", disabled);
    }

    function toggleUpToDateActions(visible) {
        if (!upToDateActions) return;
        upToDateActions.classList.toggle("is-hidden", !visible);
    }

    function setStartVisibility(visible) {
        if (!startBtn) return;
        startBtn.classList.toggle("is-hidden", !visible);
    }

    function normalizeNotes(notes) {
        if (Array.isArray(notes)) {
            const allNotes = notes
                .map((note) => (typeof note === "string" ? note : note?.note))
                .filter(Boolean);
            return allNotes.join("\n\n");
        }
        return typeof notes === "string" ? notes : "";
    }

    setVersionState(false);
    setRepairActive(false);
    setUpdateDownloadActive(false);

    startBtn?.addEventListener("click", () => {
        downloadRequested = true;
        repairRequested = false;
        setStatus("info", "Güncelleme kontrolü başlatıldı.");
        setVersionState(false);
        resetProgress();
        setUpdateDownloadActive(false);
        toggleStart(true);
        installingBox.classList.add("is-hidden");
        toggleUpToDateActions(false);
        setStartVisibility(true);
        window.api.send(window.api.CHANNELS.UPDATE_START);
    });

    continueBtn?.addEventListener("click", () => {
        setVersionState(true);
        window.api.send(window.api.CHANNELS.UPDATE_PROCEED);
    });

    repairBtn?.addEventListener("click", () => {
        repairRequested = true;
        downloadRequested = true;
        setRepairActive(true);
        updateReady = false;
        setStatus("info", "Tamir indirimi başlatılıyor…");
        setVersionState(false);
        resetProgress();
        toggleUpToDateActions(false);
        setStartVisibility(true);
        toggleStart(true);
        installingBox.classList.add("is-hidden");
        window.api.send(window.api.CHANNELS.UPDATE_REPAIR);
    });

    window.api.on(window.api.CHANNELS.UPDATE_CHECKING, () => {
        setStatus("info", "Güncelleme sunucusu kontrol ediliyor…");
        setVersionState(false);
    });

    window.api.on(window.api.CHANNELS.UPDATE_AVAILABLE, (info) => {
        updateReady = true;
        setRepairActive(false);
        const fileInfo = info?.files?.[0] || {};
        updateVersion.textContent = info?.version ? `v${info.version}` : "Bilinmiyor";
        updateSize.textContent = formatSize(fileInfo.packageSize ?? fileInfo.size ?? info?.filesize ?? info?.size);
        const notes = normalizeNotes(info?.releaseNotes);
        updateDescription.textContent = notes || "Bu güncelleme performans iyileştirmeleri içerir.";
        updateInfo.classList.remove("is-hidden");
        setStatus("info", "Yeni sürüm bulundu. İndirmek için hazır.");
        setVersionState(false);
        // Güncellemeyi elle başlatmaya izin ver.
        toggleStart(false);
        installingBox.classList.add("is-hidden");
        resetProgress();
        toggleUpToDateActions(false);
        setStartVisibility(true);
        repairRequested = false;
    });

    window.api.on(window.api.CHANNELS.UPDATE_NOT_AVAILABLE, (payload = {}) => {
        const wasRepair = Boolean(payload.repairRequested || repairRequested);
        setRepairActive(false);
        // UI'de asla sahte "0.0.0" görünmesin:
        const safeCurrent = (!currentVersion || currentVersion === "0.0.0")
            ? ""
            : `v${currentVersion}`;

        updateVersion.textContent = safeCurrent || "Güncel";

        updateSize.textContent = "-";
        updateDescription.textContent = wasRepair
            ? "Tamir indirimi için yeni bir paket bulunamadı."
            : "Uygulama son sürüme güncel.";
        updateInfo.classList.remove("is-hidden");
        setStatus(wasRepair ? "error" : "success", wasRepair
            ? "Mevcut sürüm için yeniden kurulum dosyası bulunamadı."
            : "Uygulama zaten güncel.");
        setVersionState(!wasRepair);
        toggleStart(false);
        downloadRequested = false;
        updateReady = false;
        repairRequested = false;
        setUpdateDownloadActive(false);
        resetProgress();
        toggleUpToDateActions(true);
        setStartVisibility(false);
    });

    window.api.on(window.api.CHANNELS.UPDATE_ERROR, (err) => {
        setStatus("error", "Güncelleme sırasında bir hata oluştu.");
        setVersionState(false);
        if (console && console.error) console.error(err);
        toggleStart(false);
        downloadRequested = false;
        updateReady = false;
        setRepairActive(false);
        setUpdateDownloadActive(false);
        resetProgress();
        installingBox.classList.add("is-hidden");
    });

    window.api.on(window.api.CHANNELS.UPDATE_PROGRESS, (progress) => {
        if (!downloadRequested) return;
        if (repairRequested) {
            setRepairActive(true);
        }
        if (!updateReady && !repairRequested) return;
        const p = Math.round(progress?.percent || 0);
        if (!repairRequested) {
            setUpdateDownloadActive(true);
        }
        progressArea.classList.remove("is-hidden");
        progressBar.style.width = `${p}%`;
        percentEl.textContent = `${p}%`;
        progressLabel.textContent = "İndiriliyor…";
        toggleStart(true);
    });

    window.api.on(window.api.CHANNELS.UPDATE_DOWNLOADED, () => {
        if (!downloadRequested || !updateReady) return;
        progressArea.classList.add("is-hidden");
        installingBox.classList.remove("is-hidden");
        setStatus("success", "Güncelleme indirildi. Kurulum başlatılıyor…");
        setVersionState(true);
        toggleStart(true);
        downloadRequested = false;
        updateReady = false;
        setRepairActive(false);
        setUpdateDownloadActive(false);
        setTimeout(() => {
            window.api.send(window.api.CHANNELS.UPDATE_INSTALL);
        }, 3000);
    });

    repairStayBtn?.addEventListener("click", () => {
        closeRepairModal();
    });

    repairLeaveBtn?.addEventListener("click", () => {
        closeRepairModal();
        cancelActiveDownloads({ allowLogin: true });
        if (pendingTargetView && window.viewManager?.show) {
            window.viewManager.show(pendingTargetView, { force: true });
        }
    });

    updateStayBtn?.addEventListener("click", () => {
        closeUpdateLeaveModal();
    });

    updateLeaveBtn?.addEventListener("click", () => {
        closeUpdateLeaveModal();
        cancelActiveDownloads({ allowLogin: true });
        if (pendingTargetView && window.viewManager?.show) {
            window.viewManager.show(pendingTargetView, { force: true });
        }
    });

    eventBus.on("view-change-request", (detail) => {
        if (updateDownloadActive) {
            if (detail.to !== "update" && detail.from === "update") {
                detail.prevented = true;
                if (typeof detail.prevent === "function") detail.prevent();
                openUpdateLeaveModal(detail.to);
                return;
            }
        }
        if (!repairDownloadActive) return;
        if (detail.to === "update") return;
        if (detail.from !== "update") return;
        detail.prevented = true;
        if (typeof detail.prevent === "function") detail.prevent();
        openRepairModal(detail.to);
    });

    eventBus.on("repair-leave-confirm", (detail = {}) => {
        if (!repairDownloadActive) return;
        const targetView = detail.target || "update";
        openRepairModal(targetView);
    });

    eventBus.on("update-leave-confirm", (detail = {}) => {
        if (!updateDownloadActive) return;
        const targetView = detail.target || "update";
        openUpdateLeaveModal(targetView);
    });
}
