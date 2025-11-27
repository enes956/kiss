import { eventBus } from "../../core/eventBus.js";

let cachedScripts = [];
let activeSlot = null;
let currentCount = 4;
let resizeBound = false;
let fullscreenSlot = null;
let runtimeMode = false;
let compiledBundle = "";
const slotRuntimeHandles = new Map();

function qs(id) {
    return document.getElementById(id);
}

function setStatus(message, tone = "info") {
    const status = qs("contentStatus");
    const runtimeStatus = qs("runtimeStatus");

    if (status) {
        status.textContent = message;
        status.dataset.tone = tone;
    }

    if (runtimeStatus) {
        runtimeStatus.textContent = message;
        runtimeStatus.dataset.tone = tone;
    }
}

function setLayoutMode(mode = "setup") {
    const setup = qs("setupPanel");
    const runtime = qs("runtimePanel");
    const root = document.querySelector(".content-view");
    runtimeMode = mode === "runtime";

    if (setup) setup.hidden = runtimeMode;
    if (runtime) runtime.hidden = !runtimeMode;
    if (root) root.dataset.mode = mode;
}

function updateRuntimeSummary(count, scripts) {
    const summary = qs("runtimeSummary");
    if (!summary) return;
    const names = (scripts || []).map((s) => s.title || s.name);
    const modulesText = names.length ? names.join(", ") : "script seçilmedi";
    summary.textContent = `${count} görünüm · ${modulesText}`;
}

function updateCountUI(count) {
    const label = qs("viewCountLabel");
    if (label) label.textContent = `${count} görünüm`;

    const preview = qs("viewPreview");
    if (!preview) return;

    preview.innerHTML = "";
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i += 1) {
        const dot = document.createElement("span");
        dot.className = "preview-dot";
        fragment.appendChild(dot);
    }
    preview.appendChild(fragment);
}

function buildViewOptionCard(index) {
    const card = document.createElement("div");
    card.className = "view-option-card";
    card.dataset.slot = String(index + 1);
    card.innerHTML = `
        <div class="card-head">
            <span class="pill">View ${index + 1}</span>
            <input type="text" class="input note" name="note-${index + 1}" placeholder="Kısa not (isteğe bağlı)" />
        </div>
        <div class="card-grid">
            <label class="card-field">
                <span>Profil</span>
                <select name="profile-${index + 1}" class="input select">
                    <option value="standart">Standart</option>
                    <option value="deneme">Deneme</option>
                    <option value="hızlı">Hızlı</option>
                </select>
            </label>
            <label class="card-field">
                <span>Çalışma modu</span>
                <select name="mode-${index + 1}" class="input select">
                    <option value="tam">Tam mod</option>
                    <option value="mini">Mini mod</option>
                    <option value="gözlem">Gözlem</option>
                </select>
            </label>
        </div>
    `;
    return card;
}

function renderViewOptions(count) {
    const holder = qs("viewOptions");
    if (!holder) return;
    holder.innerHTML = "";
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i += 1) {
        fragment.appendChild(buildViewOptionCard(i));
    }
    holder.appendChild(fragment);
}

function renderScripts(list) {
    const container = qs("scriptList");
    if (!container) return;
    container.innerHTML = "";

    if (!list || !list.length) {
        container.innerHTML = `<p class="hint">Script bulunamadı. app/scripts/modules klasörünü kontrol edin.</p>`;
        return;
    }

    const fragment = document.createDocumentFragment();
    list.forEach((script, idx) => {
        const row = document.createElement("label");
        row.className = "script-row";
        const isManager = script.name === "ModuleManager.js";
        row.innerHTML = `
            <input type="checkbox" class="script-toggle" name="script-${idx}" value="${script.name}" ${isManager ? "checked disabled" : "checked"} />
            <div class="script-meta">
                <p class="script-name">${script.title || script.name}</p>
                <p class="script-desc">${script.name} · ${isManager ? "Merkez panel için zorunlu" : "Seçildiğinde paket içine eklenir."}</p>
            </div>
        `;
        fragment.appendChild(row);
    });

    container.appendChild(fragment);
}

function getSelectedScripts() {
    const toggles = Array.from(document.querySelectorAll(".script-toggle"));
    const selectedNames = toggles.filter((el) => el.checked).map((el) => el.value);
    return cachedScripts.filter((s) => selectedNames.includes(s.name));
}

function getSelectedScriptNames() {
    return getSelectedScripts().map((s) => s.name);
}

function collectViewOptions(count) {
    const options = [];
    for (let i = 1; i <= count; i += 1) {
        const note = document.querySelector(`[name="note-${i}"]`);
        const profile = document.querySelector(`[name="profile-${i}"]`);
        const mode = document.querySelector(`[name="mode-${i}"]`);
        options.push({
            slot: i,
            note: note?.value || "",
            profile: profile?.value || "standart",
            mode: mode?.value || "tam",
        });
    }
    return options;
}

function setGridLayout(count) {
    const grid = qs("contentGrid");
    if (!grid) return;
    grid.dataset.count = String(count);
    if (count === 1) grid.style.gridTemplateColumns = "1fr";
    else if (count === 2) grid.style.gridTemplateColumns = "repeat(2, 1fr)";
    else if (count === 3) grid.style.gridTemplateColumns = "repeat(3, 1fr)";
    else grid.style.gridTemplateColumns = "repeat(2, 1fr)";
}

function setActiveSlot(slotId) {
    const slotKey = String(slotId);
    activeSlot = slotKey;
    document.querySelectorAll(".webview-slot").forEach((node) => {
        node.classList.toggle("active", node.dataset.slot === slotKey);
    });
}

function fitWebview(webview) {
    try {
        const rect = webview.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const zoom = Math.min(rect.width / 1920, rect.height / 1080);
        webview.setZoomFactor(zoom);
    } catch (err) {
        console.warn("Zoom ayarlanamadı", err);
    }
}

function fitAllWebviews() {
    document.querySelectorAll(".webview-slot webview").forEach((wv) => fitWebview(wv));
}

async function buildBundleForSelection(selectedNames) {
    try {
        return (await window.api?.content?.buildScripts(selectedNames)) || "";
    } catch (err) {
        console.error("Script paketi oluşturulamadı", err);
        return "";
    }
}

function exitFullscreen() {
    const grid = qs("contentGrid");
    fullscreenSlot = null;
    grid?.classList.remove("fullscreen-mode");
    document.querySelectorAll(".webview-slot").forEach((slot) => {
        slot.classList.remove("fullscreen", "hidden-in-fullscreen");
    });
}

function toggleFullscreen(slotWrapper) {
    if (!slotWrapper) return;
    const grid = qs("contentGrid");
    if (!grid) return;

    const alreadyFullscreen = slotWrapper.classList.contains("fullscreen");
    if (alreadyFullscreen) {
        exitFullscreen();
        setStatus("Tam ekrandan çıkıldı. Grid görünümü geri yüklendi.", "info");
        fitAllWebviews();
        return;
    }

    exitFullscreen();
    slotWrapper.classList.add("fullscreen");
    grid.classList.add("fullscreen-mode");
    document.querySelectorAll(".webview-slot").forEach((slot) => {
        if (slot !== slotWrapper) slot.classList.add("hidden-in-fullscreen");
    });
    fullscreenSlot = slotWrapper.dataset.slot;
    setActiveSlot(slotWrapper.dataset.slot);
    fitWebview(slotWrapper.querySelector("webview"));
    setStatus(`View ${slotWrapper.dataset.slot} tam ekranda.`, "success");
}

function closeSlot(slotWrapper) {
    if (!slotWrapper) return;
    const slotId = slotWrapper.dataset.slot;
    const view = slotWrapper.querySelector("webview");
    destroySlotRuntime(Number(slotId), view);
    if (fullscreenSlot === slotId) exitFullscreen();
    if (activeSlot === slotId) activeSlot = null;
    slotWrapper.remove();
    setStatus(`View ${slotId} kapatıldı.`, "info");
}

function handleSlotAction(slotWrapper, webview, action) {
    switch (action) {
        case "focus":
            setActiveSlot(slotWrapper.dataset.slot);
            slotWrapper.classList.add("raised");
            setTimeout(() => slotWrapper.classList.remove("raised"), 600);
            setStatus(`View ${slotWrapper.dataset.slot} öne alındı.`, "info");
            break;
        case "fullscreen":
            toggleFullscreen(slotWrapper);
            break;
        case "reload":
            try { webview?.reload(); setStatus(`View ${slotWrapper.dataset.slot} yenilendi.`, "info"); } catch {}
            break;
        case "pin":
            slotWrapper.classList.toggle("pinned");
            setStatus(
                `View ${slotWrapper.dataset.slot} ${slotWrapper.classList.contains("pinned") ? "üstte tutuluyor" : "normal görünüme alındı"}.`,
                "info",
            );
            break;
        case "close":
            closeSlot(slotWrapper);
            break;
        default:
            break;
    }
}

async function injectSlotRuntime(webview, slot) {
    if (!compiledBundle) return;
    try {
        await webview.executeJavaScript(compiledBundle);
        await webview.executeJavaScript(`
            (function(){
                try {
                    window.__kissPrepareBridge?.({ slot: ${slot}, startedAt: Date.now() });
                    const runtime = window.__kissBootstrapToolkit?.(window.__KISS_MODULE_DEFINITIONS__ || [], { slot: ${slot}, tickInterval: 1000 });
                    if (runtime) {
                        window.__KISS_SLOT_RUNTIMES__ = window.__KISS_SLOT_RUNTIMES__ || {};
                        window.__KISS_SLOT_RUNTIMES__[${slot}] = runtime;
                    }
                } catch (err) {
                    console.error('Slot runtime başlatılamadı', err);
                }
            })();
        `);
        slotRuntimeHandles.set(slot, webview);
    } catch (err) {
        console.error("Slot scriptleri enjekte edilemedi", err);
        setStatus("Scriptler enjekte edilemedi. Ayarları kontrol edin.", "danger");
    }
}

async function destroySlotRuntime(slot, webview) {
    try {
        await webview?.executeJavaScript(`
            try {
                const ctx = window.__KISS_SLOT_RUNTIMES__?.[${slot}];
                ctx?.destroy?.();
                if (window.__KISS_SLOT_RUNTIMES__) delete window.__KISS_SLOT_RUNTIMES__[${slot}];
            } catch (err) { console.error(err); }
        `);
    } catch {}
    slotRuntimeHandles.delete(slot);
}

function destroyAllSlotRuntimes() {
    slotRuntimeHandles.forEach((webview, slot) => {
        destroySlotRuntime(slot, webview);
    });
    slotRuntimeHandles.clear();
}

function attachSlotControls(slotWrapper, webview) {
    const controls = document.createElement("div");
    controls.className = "slot-controls";
    controls.innerHTML = `
        <button type="button" data-action="focus">Öne al</button>
        <button type="button" data-action="fullscreen">Tam ekran</button>
        <button type="button" data-action="reload">Yenile</button>
        <button type="button" data-action="pin">Üstte tut</button>
        <button type="button" data-action="close" class="danger">Kapat</button>
    `;

    controls.addEventListener("click", (evt) => {
        const target = evt.target?.closest("button");
        if (!target) return;
        handleSlotAction(slotWrapper, webview, target.dataset.action);
        evt.stopPropagation();
    });

    slotWrapper.appendChild(controls);
}

function mountWebview(slot, options) {
    const grid = qs("contentGrid");
    if (!grid) return;

    const slotWrapper = document.createElement("div");
    slotWrapper.className = "webview-slot";
    slotWrapper.dataset.slot = String(slot);
    slotWrapper.setAttribute("tabindex", "0");

    const info = document.createElement("div");
    info.className = "slot-info";
    info.innerHTML = `<strong>View ${slot}</strong><span>${options?.profile || "standart"}</span>`;

    const note = document.createElement("div");
    note.className = "slot-note";
    if (options?.note) note.textContent = options.note;

    const webview = document.createElement("webview");
    webview.setAttribute("src", "https://getkisskiss.com");
    webview.setAttribute("partition", `persist:slot${slot}`);
    webview.setAttribute("allowpopups", "true");

    webview.addEventListener("dom-ready", () => {
        webview.insertCSS("::-webkit-scrollbar{display:none!important;} html,body{margin:0;padding:0;overflow:hidden;}");
        injectSlotRuntime(webview, slot);
        fitWebview(webview);
    });

    webview.addEventListener("ipc-message", () => setActiveSlot(slot));
    slotWrapper.addEventListener("click", () => setActiveSlot(slot));

    attachSlotControls(slotWrapper, webview);
    slotWrapper.appendChild(info);
    if (options?.note) slotWrapper.appendChild(note);
    slotWrapper.appendChild(webview);
    grid.appendChild(slotWrapper);
}

function resetGrid() {
    const grid = qs("contentGrid");
    if (!grid) return;
    destroyAllSlotRuntimes();
    grid.innerHTML = "";
    grid.dataset.count = "0";
    exitFullscreen();
    activeSlot = null;
    const summary = qs("runtimeSummary");
    if (summary) summary.textContent = "—";
    compiledBundle = "";
    setStatus("Hazır. Start ile görünüm setini başlatın.", "info");
}

function stopRuntime() {
    resetGrid();
    setLayoutMode("setup");
    setStatus("Ayar ekranı geri açıldı. Seçimleriniz korundu.", "info");
}

function refreshAll() {
    if (!runtimeMode) return;
    document.querySelectorAll(".webview-slot webview").forEach((wv) => {
        try { wv.reload(); } catch {}
    });
    setStatus("Tüm view'ler yenilendi.", "info");
}

function refreshFocused() {
    if (!runtimeMode) return;
    if (!activeSlot) return;
    const target = document.querySelector(`.webview-slot[data-slot="${activeSlot}"] webview`);
    if (target) {
        try { target.reload(); setStatus(`View ${activeSlot} yenilendi.`, "info"); } catch {}
    }
}

async function clearHistory() {
    if (!runtimeMode) return;
    try {
        await window.api?.content?.clearHistory(currentCount);
        setStatus("Tüm view geçmişi temizlendi.", "success");
    } catch (err) {
        console.error("Geçmiş temizlenemedi", err);
        setStatus("Geçmiş temizlenemedi. Daha sonra tekrar deneyin.", "danger");
    }
}

function bindActions() {
    const form = qs("contentForm");
    const viewCountInput = qs("viewCount");
    const resetBtn = qs("resetGrid");
    const refreshAllBtn = qs("refreshAll");
    const refreshFocusedBtn = qs("refreshFocused");
    const clearHistoryBtn = qs("clearHistory");
    const backToSetupBtn = qs("backToSetup");

    viewCountInput?.addEventListener("input", (e) => {
        const val = Number(e.target.value) || 1;
        currentCount = val;
        updateCountUI(val);
        renderViewOptions(val);
        setGridLayout(val);
    });

    form?.addEventListener("submit", async (evt) => {
        evt.preventDefault();
        const count = Number(qs("viewCount")?.value) || 1;
        const selectedScripts = getSelectedScripts();
        const runtimeScripts = selectedScripts.filter((s) => s.name !== "ModuleManager.js");
        const selectedNames = selectedScripts.map((s) => s.name);
        const options = collectViewOptions(count);

        resetGrid();
        setGridLayout(count);

        if (!runtimeScripts.length) {
            setStatus("Yönetici dışında en az bir script seçin.", "danger");
            setLayoutMode("setup");
            return;
        }

        setStatus("Script paketi oluşturuluyor…", "info");
        compiledBundle = await buildBundleForSelection(selectedNames);

        if (!compiledBundle) {
            setStatus("Script paketi oluşturulamadı. Seçimleri kontrol edin ve tekrar deneyin.", "danger");
            setLayoutMode("setup");
            return;
        }

        setLayoutMode("runtime");
        options.slice(0, count).forEach((opt) => mountWebview(opt.slot, opt));
        currentCount = count;
        updateRuntimeSummary(count, runtimeScripts);
        fitAllWebviews();
        setStatus(`Start tamamlandı. ${count} view açıldı ve seçilen scriptler derlenip enjekte edildi.`, "success");
    });

    resetBtn?.addEventListener("click", resetGrid);
    refreshAllBtn?.addEventListener("click", refreshAll);
    refreshFocusedBtn?.addEventListener("click", refreshFocused);
    clearHistoryBtn?.addEventListener("click", clearHistory);
    backToSetupBtn?.addEventListener("click", stopRuntime);
}

async function initScripts() {
    try {
        cachedScripts = (await window.api?.content?.listScripts()) || [];
    } catch (err) {
        console.error("Script listesi alınamadı", err);
        cachedScripts = [];
    }
    renderScripts(cachedScripts);
}

export default function contentController() {
    setLayoutMode("setup");
    updateCountUI(currentCount);
    renderViewOptions(currentCount);
    setGridLayout(currentCount);
    initScripts();
    bindActions();

    if (!resizeBound) {
        window.addEventListener("resize", fitAllWebviews);
        resizeBound = true;
    }

    eventBus.emit("view-ready", { name: "content" });
}
