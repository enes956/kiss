export function buildLoginMarkup() {
    return `
    <div class="view"
         style="width:100%; height:100%;
                display:flex; justify-content:center; align-items:center; padding:40px;">

        <div style="width:100%; max-width:420px; display:grid; gap:22px;">            

            <h2 style="text-align:center; margin:0;">Giriş Yap</h2>

            <form id="loginForm" style="display:grid; gap:18px;">

                <!-- USERNAME -->
                <div style="display:grid; gap:6px;">
                    <label for="username">Kullanıcı Adı</label>
                    <input id="username"
                           placeholder="Kullanıcı adı"
                           autocomplete="username" />
                </div>

                <!-- PASSWORD -->
                <div style="display:grid; gap:6px; position:relative;">
                    <label for="password">Şifre</label>

                    <input id="password"
                           type="password"
                           placeholder="Şifre"
                           autocomplete="current-password" />

                    <!-- ICON AREA -->
                    <div id="togglePassword"
                        style="
                            position:absolute;
                            right:12px;
                            bottom:14px;
                            width:20px;
                            height:20px;
                            cursor:pointer;
                            opacity:.65;
                            display:flex;
                            align-items:center;
                            justify-content:center;
                        ">
                        <!-- varsayılan olarak açık göz -->
                        <svg id="icon-eye" width="18" height="18" viewBox="0 0 24 24"
                             fill="none" stroke="currentColor" stroke-width="2"
                             stroke-linecap="round" stroke-linejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </div>

                    <!-- CAPSLOCK UYARISI -->
                    <div id="capsWarning"
                         style="
                            display:none;
                            font-size:12px;
                            color:#ff7d8c;
                            padding-top:4px;
                         ">
                         Caps Lock açık!
                    </div>
                </div>

                <!-- STATUS BADGE -->
                <div id="status"
                    style="
                        display:none;
                        align-items:center;
                        gap:10px;
                        padding:8px 10px;
                        border-radius:12px;
                        font-size:14px;
                        background:rgba(255,255,255,0.04);
                        border:1px solid rgba(255,255,255,0.12);
                        transition:.25s;
                    ">
                    <div class="status-dot idle"></div>
                    <span id="statusMessage"></span>
                </div>

                <button type="submit" id="btnLogin">
                    Giriş Yap
                </button>

            </form>

        </div>
    </div>
    `;
}

export default function loadLoginTemplate() {
    return buildLoginMarkup();
}
