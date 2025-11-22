




export default function loginEvents() {

    const form = document.getElementById("loginForm");
    const usernameEl = document.getElementById("username");
    const passwordEl = document.getElementById("password");

    const togglePassword = document.getElementById("togglePassword");
    const iconEye = document.getElementById("icon-eye");

    const statusEl = document.getElementById("status");
    const statusMsg = document.getElementById("statusMessage");
    const statusDot = statusEl.querySelector(".status-dot");

    const capsWarning = document.getElementById("capsWarning");
    const btnLogin = document.getElementById("btnLogin");

    // BRUTE FORCE STATE
    let failCount = 0;
    let lockUntil = 0;
    const LOCK_THRESHOLD = 5;         // 5 hatalı deneme
    const LOCK_DURATION_MS = 60_000;  // 60 sn kilit

    // -----------------------------------
    // PAROLA GÖSTER / GİZLE (SVG ICON)
    // -----------------------------------
    const openSVG = `
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
    `;
    const closedSVG = `
        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21 21 0 0 1 5.06-6.94"></path>
        <path d="M1 1l22 22"></path>
        <path d="M9.53 9.53a3 3 0 0 0 4.24 4.24"></path>
    `;

    togglePassword.addEventListener("click", () => {
        if (passwordEl.type === "password") {
            passwordEl.type = "text";
            iconEye.innerHTML = closedSVG;
        } else {
            passwordEl.type = "password";
            iconEye.innerHTML = openSVG;
        }
    });

    // -----------------------------------
    // CAPS LOCK DETECTION
    // -----------------------------------
    passwordEl.addEventListener("keyup", (e) => {
        const caps = e.getModifierState("CapsLock");
        capsWarning.style.display = caps ? "block" : "none";
    });

    // -----------------------------------
    // PASSWORD COPY / CUT / CONTEXTMENU ENGELİ
    // -----------------------------------
    ["copy", "cut"].forEach((evt) => {
        passwordEl.addEventListener(evt, (e) => {
            e.preventDefault();
        });
    });

    passwordEl.addEventListener("contextmenu", (e) => {
        e.preventDefault();
    });

    // -----------------------------------
    // ENTER ANİMASYONU
    // -----------------------------------
    window.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            passwordEl.style.transform = "scale(0.97)";
            setTimeout(() => {
                passwordEl.style.transform = "scale(1)";
            }, 120);
        }
    });

    // -----------------------------------
    // STATUS TASARIM UPGRADE
    // -----------------------------------
    function setStatus(mode, text) {
        statusEl.style.display = "flex";
        statusEl.style.opacity = 0;
        setTimeout(() => (statusEl.style.opacity = 1), 30);

        statusMsg.textContent = text;

        statusDot.classList.remove("ok", "fail", "idle");
        statusDot.classList.add(mode);

        statusEl.style.background =
            mode === "ok"
                ? "rgba(87,232,162,0.10)"
                : mode === "fail"
                ? "rgba(255,125,140,0.10)"
                : "rgba(255,255,255,0.04)";

        statusEl.style.borderColor =
            mode === "ok"
                ? "rgba(87,232,162,0.35)"
                : mode === "fail"
                ? "rgba(255,125,140,0.35)"
                : "rgba(255,255,255,0.12)";
    }

    // -----------------------------------
    // BRUTE FORCE CONTROL
    // -----------------------------------
    function isLocked() {
        const now = Date.now();
        if (now < lockUntil) {
            const remaining = Math.ceil((lockUntil - now) / 1000);
            setStatus(
                "fail",
                `Çok fazla hatalı giriş denemesi. Lütfen ${remaining} saniye sonra tekrar deneyin.`
            );
            return true;
        }
        return false;
    }

    function registerFail() {
        failCount += 1;
        if (failCount >= LOCK_THRESHOLD) {
            lockUntil = Date.now() + LOCK_DURATION_MS;
            setStatus(
                "fail",
                `Çok fazla hatalı giriş. Lütfen 60 saniye sonra tekrar deneyin.`
            );
        }
    }

    function resetFailState() {
        failCount = 0;
        lockUntil = 0;
    }

    // -----------------------------------
    // LOGIN SUBMIT
    // -----------------------------------
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (isLocked()) {
            return;
        }

        const username = usernameEl.value.trim();
        const password = passwordEl.value.trim();

        if (!username || !password) {
            setStatus("fail", "Kullanıcı adı ve şifre zorunlu.");
            return;
        }

        btnLogin.disabled = true;
        btnLogin.innerHTML = `<span class="spinner"></span> Giriş yapılıyor...`;

        setStatus("idle", "Kimlik doğrulama yapılıyor...");

        try {
            const result = await window.api.invoke(AUTH_LOGIN, {
                username,
                password,
            });

            // Buraya düşüyorsak => main tarafı hata fırlatmadı,
            // her şey sonuç objesine çevrilmiş durumda.
            if (result?.ok) {
                resetFailState();
                setStatus("ok", "Giriş başarılı...");

                setTimeout(() => {
                    window.api.send(AUTH_SUCCESS, { user: username });
                }, 300);
            } else {
                registerFail();

                // Brute-force kilit devreye girdiyse, registerFail zaten mesaj verdi.
                if (failCount < LOCK_THRESHOLD) {
                    setStatus(
                        "fail",
                        result?.message || "Giriş başarısız."
                    );
                }
            }
        } catch (err) {
            console.error("[LOGIN] renderer error:", err);
            // Bu aşamada genelde IPC tarafında beklenmedik bir exception var demektir.
            registerFail();
            setStatus(
                "fail",
                "Sunucuya ulaşılamadı veya süre aşımı meydana geldi."
            );
        }

        btnLogin.disabled = false;
        btnLogin.textContent = "Giriş Yap";
    });

    usernameEl.focus();
}
