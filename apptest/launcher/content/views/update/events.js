const {
    UPDATE_CHECK,
    UPDATE_START,
    UPDATE_STATUS,
    UPDATE_REMOTE_DATA,
    UPDATE_PROGRESS,
    UPDATE_DOWNLOAD_STATUS,
    UPDATE_DONE
} = window.api.CHANNELS;


export default function attachUpdateEvents() {

    // ELEMENTLER
    const msg = document.getElementById("updateMessage");
    const dot = document.getElementById("updateStatusDot");
    const loader = document.getElementById("updateLoader");
    const infoBox = document.getElementById("versionInfo");
    const vVersion = document.getElementById("remoteVersion");
    const vSize = document.getElementById("remoteSize");

    const progressBox = document.getElementById("updateProgressBox");
    const progressInner = document.getElementById("updateProgressInner");
    const progressText = document.getElementById("updateProgressText");

    const btnStart = document.getElementById("updateStartBtn");
    const btnContinue = document.getElementById("updateContinueBtn");
    const btnRetry = document.getElementById("updateRetryBtn");

    const errorBox = document.getElementById("updateError");

    let checkInFlight = false;

    function hideAllButtons() {
        btnStart.style.display = "none";
        btnContinue.style.display = "none";
        btnRetry.style.display = "none";
    }

    function resetUiState() {
        hideAllButtons();
        infoBox.style.display = "none";
        progressBox.style.display = "none";
        progressInner.style.width = "0%";
        progressText.innerText = "0%";
        errorBox.style.display = "none";
        loader.style.display = "block";
        dot.classList.remove("ok", "fail");
        dot.classList.add("idle");
    }

    function requestCheck(force = false) {
        if (checkInFlight && !force) return;
        checkInFlight = true;
        resetUiState();
        msg.innerText = "Güncelleme kontrol ediliyor…";
        window.api.send(UPDATE_CHECK);
    }

    function showContinue() {
        btnContinue.style.display = "inline-block";
        btnStart.style.display = "none";
        btnRetry.style.display = "none";
    }

    // İlk state
    resetUiState();

    //-----------------------------------------
    // STATUS → main.js mesajları
    //-----------------------------------------
    window.api.on(UPDATE_STATUS, (status) => {
        checkInFlight = false;
        dot.classList.remove("ok", "fail", "idle");

        switch (status) {
            case "checking": {
                dot.classList.add("idle");
                loader.style.display = "block";
                msg.innerText = "Güncelleme kontrol ediliyor…";
                break;
            }

            case "up-to-date": {
                dot.classList.add("ok");
                msg.innerText = "KissApp güncel!";
                loader.style.display = "none";
                setTimeout(showContinue, 250);
                break;
            }

            case "need-update": {
                dot.classList.add("ok");
                msg.innerText = "Yeni güncelleme mevcut.";
                loader.style.display = "none";
                infoBox.style.display = "block";
                setTimeout(() => {
                    btnStart.style.display = "inline-block";
                }, 200);
                break;
            }

            default: {
                dot.classList.add("fail");
                msg.innerText = "Bilinmeyen durum.";
            }
        }
    });


    //-----------------------------------------
    // REMOTE VERSION → main.js
    //-----------------------------------------
    window.api.on(UPDATE_REMOTE_DATA, (data) => {
        vVersion.innerText = data.version;
        vSize.innerText = (data.size / 1024 / 1024).toFixed(2) + " MB";
    });


    //-----------------------------------------
    // PROGRESS (percent)
    //-----------------------------------------
    window.api.on(UPDATE_PROGRESS, ({ percent }) => {
        progressBox.style.display = "block";

        progressInner.style.width = percent + "%";
        progressText.innerText = percent + "%";

        loader.style.display = percent >= 100 ? "none" : "block";
        msg.innerText = "İndiriliyor… %" + percent;
    });


    //-----------------------------------------
    // DOWNLOAD STATUS
    //-----------------------------------------
    window.api.on(UPDATE_DOWNLOAD_STATUS, (payload) => {
        const status = typeof payload === "string" ? payload : payload?.state;
        const message = payload?.message;

        if (status === "started") {
            msg.innerText = "Güncelleme başlatılıyor…";
            progressInner.style.width = "0%";
            loader.style.display = "none";
        }

        if (status === "done") {
            dot.classList.add("ok");
            loader.style.display = "none";
            msg.innerText = "Güncelleme tamamlandı. Devam edebilirsiniz.";
            showContinue();
        }

        if (status === "error") {
            dot.classList.add("fail");
            loader.style.display = "none";
            msg.innerText = message || "Güncelleme sırasında hata oluştu.";

            errorBox.style.display = "block";
            errorBox.innerText =
                message || "Dosya indirilemedi veya bozuk olabilir.";

            btnStart.style.display = "none";
            btnRetry.style.display = "inline-block";
        }
    });


    //-----------------------------------------
    // BUTONLAR
    //-----------------------------------------

    // Güncellemeyi başlat
    btnStart.addEventListener("click", () => {
        btnStart.style.display = "none";
        msg.innerText = "Güncelleme başlatılıyor…";
        window.api.send(UPDATE_START);
    });

    // Uygulama güncel → devam et
    btnContinue.addEventListener("click", () => {
        window.api.send(UPDATE_DONE);
    });

    // Hata → tekrar dene
    btnRetry.addEventListener("click", () => {
        btnRetry.style.display = "none";
        progressBox.style.display = "none";
        errorBox.style.display = "none";
        loader.style.display = "block";
        dot.classList.add("idle");
        msg.innerText = "Tekrar kontrol ediliyor…";
        setTimeout(() => {
            requestCheck(true);
        }, 400);
    });

    requestCheck();
}
