// Görünüm kayıtları
import { eventBus } from "./eventBus.js";
import * as updateView from "../views/update/index.js";
import * as placeholderView from "../views/placeholder/index.js";
import * as loginView from "../views/login/index.js";
import * as contentView from "../views/content/index.js";

const VIEWS = {
    update: updateView,
    login: loginView,
    content: contentView,
    placeholder: placeholderView,
};

let currentView = null;
let pendingRemovalTimer = null;
const VIEW_TRANSITION_VAR = "--view-transition-duration";

window.viewManager = {
    show: (name, options) => showView(name, options),
};

function dispatchViewChangeGuard(name) {
    const detail = {
        from: currentView,
        to: name,
        prevented: false,
        prevent: () => {
            detail.prevented = true;
        },
    };

    eventBus.emit("view-change-request", detail);

    return detail;
}

export function showView(name, options = {}) {
    const { force } = options;
    const content = document.getElementById("content");
    if (!content) {
        console.warn("❗ content alanı bulunamadı!");
        return;
    }

    if (!VIEWS[name]) {
        console.warn("❗ Tanımsız görünüm:", name);
        return;
    }

    if (currentView === name) return;

    if (!force) {
        const guard = dispatchViewChangeGuard(name);
        if (guard.prevented) return;

        // Tamir indirimi sürerken view değiştirmeyi engelle
        const repairActive = Boolean(window?.appGuards?.repairDownloadActive);
        if (repairActive && currentView === "update" && name !== "update") {
            eventBus.emit("repair-leave-confirm", { target: name });
            return;
        }

        const updateActive = Boolean(window?.appGuards?.updateDownloadActive);
        if (updateActive && currentView === "update" && name !== "update") {
            eventBus.emit("update-leave-confirm", { target: name });
            return;
        }
    }

    const { template, controller } = VIEWS[name];

    const previous = content.querySelector(".view.active");
    if (previous) {
        previous.classList.add("leaving");
        previous.classList.remove("active");

        clearTimeout(pendingRemovalTimer);
        pendingRemovalTimer = setTimeout(() => {
            previous.remove();
        }, getViewTransitionDuration());
    }

    const wrapper = document.createElement("div");
    wrapper.innerHTML = template();
    const viewEl = wrapper.firstElementChild;

    if (!viewEl) return;

    content.appendChild(viewEl);

    requestAnimationFrame(() => {
        viewEl.classList.add("active");
    });

    if (typeof controller === "function") {
        setTimeout(() => {
            try {
                controller();
            } catch (err) {
                console.error("❗ View event hatası:", err);
            }
        }, 20);
    }

    currentView = name;
    eventBus.emit("view-changed", { to: name });
}

function getViewTransitionDuration() {
    const value = getComputedStyle(document.documentElement)
        .getPropertyValue(VIEW_TRANSITION_VAR);
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 280;
}

export function initViewManagerIpc() {
    // İleride view değişimi IPC ile yapılırsa buraya koyarız.
}
