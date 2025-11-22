export default function footerTemplate() {
    return `
        <div class="footer-info"
            style="
                width:100%;
                display:flex;
                justify-content:space-between;
                align-items:center;
                padding:0 20px;
                font-size:13px;
                opacity:.80;
            ">

            <!-- SOL -->
            <span style="text-align:left; flex:1;">
                KissApp © - Tüm hakları saklıdır.  
            </span>

            <!-- ORTA -->
            <span id="footerYear"
                  style="text-align:center; flex:1;">
                © -
            </span>

            <!-- SAĞ -->
            <span id="footerVersion"
                  style="text-align:right; flex:1;">
                Sürüm: -
            </span>

        </div>
    `;
}
