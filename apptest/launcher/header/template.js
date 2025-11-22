export default function headerTemplate() {
    return `
        <div class="logo-area"
             style="display:flex; align-items:center; gap:12px; padding-left:6px;">
             
            <img src="../build/icon.ico"
                 alt="logo"
                 style="width:28px; height:28px;" />

            <h1 style="
                margin:0;
                font-size:22px;
                font-weight:700;
                letter-spacing:0.5px;
            ">KissApp</h1>
        </div>

        <div class="window-controls" style="
            display:flex;
            gap:6px;
            padding-right:6px;
        ">
            <button data-win="minimize" title="Küçült"
                style="
                    width:28px;
                    height:28px;
                    font-size:16px;
                    padding:0;
                    border-radius:8px;
                ">–</button>

            <button data-win="maximize" title="Büyüt"
                style="
                    width:28px;
                    height:28px;
                    font-size:14px;
                    padding:0;
                    border-radius:8px;
                ">⧉</button>

            <button data-win="close" title="Kapat"
                class="close"
                style="
                    width:28px;
                    height:28px;
                    font-size:14px;
                    padding:0;
                    border-radius:8px;
                ">✕</button>
        </div>
    `;
}

