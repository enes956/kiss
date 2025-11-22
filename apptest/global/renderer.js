import launcher from "../launcher/index.js";
import { buildStyles } from "./style.js";

window.addEventListener("DOMContentLoaded", () => {
    const style = document.createElement("style");
    style.textContent = buildStyles();
    document.head.appendChild(style);

    launcher();
});
