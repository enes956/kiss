// launcher/index.js

import headerTemplate from "./header/template.js";
import sidebarTemplate from "./sidebar/template.js";
import footerTemplate from "./footer/template.js";
import footerEvents from "./footer/events.js";

import { showView, initViewManagerIpc } from "./content/viewManager.js";

export default function launcher() {

    // HEADER / SIDEBAR / FOOTER
    document.getElementById("header").innerHTML = headerTemplate();
    document.getElementById("sidebar").innerHTML = sidebarTemplate();
    document.getElementById("footer").innerHTML = footerTemplate();

    // WINDOW CONTROL BUTTON EVENTS
    const controls = document.querySelectorAll(".window-controls button");
    controls.forEach(btn => {
        btn.addEventListener("click", () => {
            const action = btn.dataset.win;     // minimize / maximize / close
            window.api.windowAction(action);    // preload → main
        });
    });

    // VIEW MANAGER IPC’yi hazırla (update:done → login geçişi)
    initViewManagerIpc();

    // UYGULAMA AÇILDIĞINDA ÖNCE UPDATE EKRANI
    showView("update");

    // FOOTER (yıl + versiyon)
    footerEvents();

}
