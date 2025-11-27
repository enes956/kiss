import { eventBus } from "../../core/eventBus.js";

let loginIpcBound = false;
let authContinueBound = false;
let authCancelBound = false;
let loginDomBindings;
let sidebarAuthState = false;
const CHANNELS = window.api?.CHANNELS || {};

export function registerLoginEvents(ipcRenderer) {
    if (loginIpcBound) return;
    const ipc = ipcRenderer && typeof ipcRenderer.invoke === "function" ? ipcRenderer : window.api;
    if (!ipc || typeof ipc.invoke !== "function" || typeof ipc.send !== "function") {
        console.warn("Login IPC köprüsü başlatılamadı: ipcRenderer yok.");
        return;
    }

    eventBus.on("login-attempt", (detail) => {
        ipc.invoke(CHANNELS.AUTH_LOGIN, detail)
            .then((result) => {
                eventBus.emit("login-response", result);
            })
            .catch((err) => {
                console.error("auth:login hata", err);
                eventBus.emit("login-response", { ok: false, message: "Bağlantı hatası" });
            });
    });

    eventBus.on("login-success", (detail) => {
        ipc.send(CHANNELS.AUTH_SUCCESS, detail);
    });

    eventBus.on("login-cancel", () => {
        ipc.send(CHANNELS.AUTH_CANCEL);
    });

    loginIpcBound = true;
}

function syncSidebarButton(loggedIn) {
    const sidebarAuth = document.getElementById("sidebarAuthBtn");
    if (!sidebarAuth) return;
    sidebarAuthState = !!loggedIn;
    const state = loggedIn ? "logout" : "login";
    sidebarAuth.dataset.state = state;
    sidebarAuth.classList.toggle("active", !!loggedIn);
    sidebarAuth.setAttribute("aria-label", loggedIn ? "Oturumu kapat" : "Giriş yap");
    sidebarAuth.setAttribute("aria-pressed", loggedIn ? "true" : "false");
}

function bindLoginDom() {
    // Temizlik
    if (loginDomBindings?.abort) {
        loginDomBindings.abort();
    }

    const controller = new AbortController();
    const signal = controller.signal;

    const form = document.getElementById("loginForm");
    const usernameEl = document.getElementById("username");
    const passwordEl = document.getElementById("password");
    const togglePassword = document.getElementById("togglePassword");
    const statusBox = document.getElementById("loginStatusBox");
    const statusIcon = statusBox?.querySelector(".login-status-icon");
    const statusTitle = document.getElementById("loginStatusTitle");
    const statusDesc = document.getElementById("loginStatusDesc");
    const btnLogin = document.getElementById("btnLogin");
    const blockedSection = document.getElementById("loginBlocked");
    const gateForm = document.getElementById("loginForm");
    const goUpdate = document.getElementById("btnGoUpdate");

    if (!form || !usernameEl || !passwordEl || !togglePassword || !statusBox || !btnLogin) {
        return;
    }

    const icons = {
        info: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9"></circle><line x1="12" y1="8.5" x2="12" y2="8.5"></line><path d="M10.75 11.5h1.25v4h1.25" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
        success: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" xmlns="http://www.w3.org/2000/svg"><path d="M5.5 12.5 10 17l8.5-10" stroke-linecap="round" stroke-linejoin="round"></path><circle cx="12" cy="12" r="9"></circle></svg>',
        error: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9"></circle><path d="M9 9l6 6m0-6-6 6" stroke-linecap="round"></path></svg>',
        eye: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" stroke-linecap="round" stroke-linejoin="round"></path><circle cx="12" cy="12" r="3"></circle></svg>',
        eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" xmlns="http://www.w3.org/2000/svg"><path d="M3 3l18 18" stroke-linecap="round"></path><path d="M7 7.5C8.8 6.2 10.8 6 12 6c6 0 9.5 6 9.5 6-.5.9-1.3 2.1-2.5 3.2M5 5.4C3.2 6.9 2.5 8 2.5 8s3.5 6 9.5 6c1 0 2-.2 2.9-.5" stroke-linecap="round" stroke-linejoin="round"></path><circle cx="12" cy="12" r="3"></circle></svg>',
    };

    let upToDate = window.appVersionState?.upToDate === true;

    const emitAuthState = (loggedIn) => eventBus.emit("auth-state-change", { loggedIn });

    function setStatus(mode, title, desc) {
        statusBox.classList.remove("info", "success", "error");
        statusBox.classList.add(mode || "info");
        if (statusIcon) statusIcon.innerHTML = icons[mode] || icons.info;
        statusTitle.textContent = title || "";
        statusDesc.textContent = desc || "";
    }

    function gateLogin(isUpToDate) {
        upToDate = !!isUpToDate;
        if (gateForm) gateForm.hidden = !upToDate;
        if (blockedSection) blockedSection.hidden = upToDate;
    }

    function requestLogin(credentials) {
        return new Promise((resolve) => {
            const cancel = eventBus.on("login-response", (detail) => {
                cancel();
                resolve(detail);
            });
            eventBus.emit("login-attempt", credentials);
        });
    }

    async function doLogin(evt) {
        evt.preventDefault();
        if (!upToDate) {
            setStatus("error", "Güncelleme gerekli", "Güncel olmayan sürümde oturum açamazsınız.");
            return;
        }
        const username = (usernameEl.value || "").trim();
        const password = passwordEl.value || "";
        if (!username || !password) {
            setStatus("error", "Eksik bilgi", "Kullanıcı adı ve şifre zorunlu.");
            return;
        }
        btnLogin.disabled = true;
        btnLogin.textContent = "Kimlik doğrulanıyor…";
        setStatus("info", "Kimlik doğrulanıyor", "Bilgiler kontrol ediliyor.");

        try {
            const result = await requestLogin({ username, password });

            if (result && result.ok) {
                setStatus("success", "Giriş başarılı", "Yönlendiriliyorsunuz…");
                emitAuthState(true);
                syncSidebarButton(true);
                setTimeout(() => {
                    eventBus.emit("login-success", { user: result.user });
                }, 400);
            } else {
                const msg = (result && result.message) || "Giriş başarısız. Bilgileri kontrol edin.";
                setStatus("error", "Giriş başarısız", msg);
            }
        } catch (err) {
            console.error(err);
            setStatus("error", "Bağlantı hatası", "Bağlantı kurulamadı.");
        } finally {
            btnLogin.disabled = false;
            btnLogin.textContent = "Giriş Yap";
        }
    }

    function resetLoginState() {
        emitAuthState(false);
        syncSidebarButton(false);
        setStatus("info", "Hazır.", "Giriş yapmaya hazırsınız.");
    }

    function togglePasswordVisibility() {
        const showing = passwordEl.type === "text";
        passwordEl.type = showing ? "password" : "text";
        togglePassword.setAttribute("aria-label", showing ? "Şifreyi göster" : "Şifreyi gizle");
        togglePassword.innerHTML = showing ? icons.eye : icons.eyeOff;
    }

    form.addEventListener("submit", doLogin, { signal });
    togglePassword.addEventListener("click", togglePasswordVisibility, { signal });

    window.addEventListener("keyup", (e) => {
        if (e.key === "Escape") {
            eventBus.emit("login-cancel");
            resetLoginState();
        }
    }, { signal });

    eventBus.on("auth-state-change", (detail) => {
        syncSidebarButton(!!detail?.loggedIn);
    });

    eventBus.on("app-version-status", (detail) => {
        gateLogin(!!detail?.upToDate);
    });

    goUpdate?.addEventListener("click", () => {
        if (window.viewManager?.show) {
            window.viewManager.show("update");
        }
    }, { signal });

    gateLogin(upToDate);
    syncSidebarButton(sidebarAuthState);
    setStatus("info", "Hazır.", "Giriş yapmaya hazırsınız.");
    togglePassword.innerHTML = icons.eye;
    usernameEl.focus({ preventScroll: true });

    loginDomBindings = controller;
}

export default function loginEvents() {
    registerLoginEvents(window.api);
    bindLoginDom();

    if (!authContinueBound && window.api?.on) {
        window.api.on(CHANNELS.AUTH_CONTINUE, () => {
            if (window.viewManager?.show) {
                window.viewManager.show("content");
            }
        });
        authContinueBound = true;
    }

    if (!authCancelBound && window.api?.on) {
        window.api.on(CHANNELS.AUTH_CANCELLED, () => {
            if (window.viewManager?.show) {
                window.viewManager.show("login");
            }
            eventBus.emit("auth-state-change", { loggedIn: false });
        });
        authCancelBound = true;
    }
}
