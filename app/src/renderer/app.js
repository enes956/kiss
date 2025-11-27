import headerTemplate from "./ui/header/template.js";
import sidebarTemplate from "./ui/sidebar/template.js";
import footerTemplate from "./ui/footer/template.js";
import footerEvents from "./ui/footer/events.js";
import { showView, initViewManagerIpc } from "./core/viewManager.js";
import { eventBus } from "./core/eventBus.js";

export default function app() {
    document.getElementById("header").innerHTML = headerTemplate();
    document.getElementById("sidebar").innerHTML = sidebarTemplate();
    document.getElementById("footer").innerHTML = footerTemplate();

    const sidebarAuthBtn = document.getElementById("sidebarAuthBtn");

    const setSidebarAuthState = (loggedIn) => {
        if (!sidebarAuthBtn) return;
        const state = loggedIn ? "logout" : "login";
        sidebarAuthBtn.dataset.state = state;
        sidebarAuthBtn.classList.toggle("active", !!loggedIn);
        sidebarAuthBtn.setAttribute("aria-pressed", loggedIn ? "true" : "false");
        sidebarAuthBtn.setAttribute("aria-label", loggedIn ? "Oturumu kapat" : "Giriş yap");
    };

    eventBus.on("auth-state-change", (detail) => {
        setSidebarAuthState(!!detail?.loggedIn);
    });

    eventBus.on("login-cancel", () => setSidebarAuthState(false));

    eventBus.on("login-success", () => {
        showView("content");
    });

    if (sidebarAuthBtn) {
        sidebarAuthBtn.addEventListener("click", () => {
            const mode = sidebarAuthBtn.dataset.state;
            if (mode === "logout") {
                eventBus.emit("auth-state-change", { loggedIn: false });
                eventBus.emit("login-cancel");
                showView("login");
            } else {
                showView("login");
            }
        });
    }

    setSidebarAuthState(false);

    const controls = document.querySelectorAll(".window-controls button");
    if (controls.length) {
        controls.forEach(btn => {
            btn.addEventListener("click", () => {
                const action = btn.dataset.win;
                window.api.window.control(action);
            });
        });
    }

    initViewManagerIpc();

    showView("update");

    footerEvents();

    window.api.on(window.api.CHANNELS.UPDATE_COMPLETE, () => {
        window.appVersionState = { upToDate: true };
        eventBus.emit("app-version-status", { upToDate: true });
        showView("login");
    });
}
