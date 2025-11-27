export default function sidebarTemplate() {
    return `
        <nav class="sidebar-nav">
            <div class="sidebar-group">
            <div class="sidebar-item">Dashboard</div>
            <div class="sidebar-item">Modules</div>
            <div class="sidebar-item">Settings</div>
        </div>
        <button class="sidebar-auth" id="sidebarAuthBtn" data-state="login" aria-pressed="false" aria-label="Giriş yap">
            <span class="auth-viewport">
                <span class="auth-label auth-login" data-text="Giriş Yap">Oturum Aç</span>
                <span class="auth-label auth-logout" data-text="Çıkış Yap">Oturumu Kapat</span>
            </span>
        </button>
    </nav>
    `;
}
