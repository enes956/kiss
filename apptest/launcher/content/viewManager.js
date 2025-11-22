// launcher/content/viewManager.js
const {
    UPDATE_DONE,
    UPDATE_START,
    UPDATE_STATUS,
    UPDATE_REMOTE_DATA,
    UPDATE_PROGRESS,
    UPDATE_DOWNLOAD_STATUS,
    UPDATE_CHECK
} = window.api.CHANNELS;

import loadLoginTemplate from "./views/login/template.js";
import loginEvents from "./views/login/events.js";

import updateTemplate from "./views/update/template.js";
import updateEvents from "./views/update/events.js";

const VIEWS = {
    update: {
        template: updateTemplate,
        events: updateEvents,
    },
    login: {
        template: loadLoginTemplate,
        events: loginEvents,
    },
};

let currentView = null;
let pendingRemovalTimer = null;

export function showView(name) {
    const content = document.getElementById("content");
    if (!content) return;

    if (!VIEWS[name]) return;
    if (currentView === name) return; // idempotent

    const { template, events } = VIEWS[name];

    // Mevcut view'i animasyonla kaldır
    const previous = content.querySelector(".view.active");
    if (previous) {
        previous.classList.add("leaving");
        previous.classList.remove("active");

        clearTimeout(pendingRemovalTimer);
        pendingRemovalTimer = setTimeout(() => {
            previous.remove();
        }, 280);
    }

    const wrapper = document.createElement("div");
    wrapper.innerHTML = template();
    const viewEl = wrapper.firstElementChild;

    if (!viewEl) return;

    content.appendChild(viewEl);

    requestAnimationFrame(() => {
        viewEl.classList.add("active");
    });

    if (typeof events === "function") {
        events();
    }

    currentView = name;
}

// Bu fonksiyonu launcher() içinden 1 kere çağıracağız
export function initViewManagerIpc() {
    let updateFlowFinished = false;

    // Güncelleme tamamlandığında login ekranına geç
    window.api.receive(UPDATE_DONE, () => {
        if (updateFlowFinished && currentView === "login") return;
        updateFlowFinished = true;
        showView("login");
    });
}
