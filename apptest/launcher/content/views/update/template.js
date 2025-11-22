export default function updateTemplate() {
    return `
    <div class="view update-view" id="updateView">

        <div class="card" style="max-width: 540px; text-align: center;">

            <h2 style="
                margin: 0;
                font-size: 26px;
                font-weight: 700;
                background: linear-gradient(135deg, var(--accent-a), var(--accent-c));
                -webkit-text-fill-color: transparent;
                -webkit-background-clip: text;
            ">
                KissApp Güncelleme Sistemi
            </h2>

            <p id="updateMessage" style="font-size: 15px; opacity: .85; margin-top: 6px;">
                Güncelleme kontrol ediliyor… Lütfen bekleyin.
            </p>

            <div style="display:flex; justify-content:center; margin-top:10px;">
                <div id="updateStatusDot" class="status-dot idle"></div>
            </div>

            <!-- FIXED LOADER -->
            <div id="updateLoader" class="update-loader"></div>

            <div id="versionInfo" style="display:none; margin-bottom: 14px;">
                <p style="font-size:14px; opacity:.8;">
                    <strong>Yeni sürüm bulundu:</strong>
                    <span id="remoteVersion"></span>
                </p>
                <p style="font-size:14px; opacity:.8;">
                    <strong>Boyut:</strong>
                    <span id="remoteSize"></span>
                </p>
            </div>

            <div id="updateProgressBox" style="display:none; margin-top:16px;">
                <div class="progress"><div id="updateProgressInner"></div></div>
                <div style="margin-top:8px; font-size:14px; opacity:.75;" id="updateProgressText">0%</div>
            </div>

            <div style="display:flex; gap:10px; margin-top:26px; justify-content:center;">
                <button id="updateContinueBtn" style="display:none; min-width:140px;">
                    Devam Et
                </button>

                <button id="updateStartBtn" style="display:none; min-width:140px;">
                    Güncellemeyi Başlat
                </button>

                <button id="updateRetryBtn" class="secondary" style="display:none; min-width:120px;">
                    Yeniden Dene
                </button>
            </div>

            <div id="updateError" class="error" style="margin-top:18px;"></div>

        </div>

    </div>
    `;
}
