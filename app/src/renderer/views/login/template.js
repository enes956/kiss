const infoIcon = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9"></circle><line x1="12" y1="8.5" x2="12" y2="8.5"></line><path d="M10.75 11.5h1.25v4h1.25" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
const warningIcon = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" xmlns="http://www.w3.org/2000/svg"><path d="M12 4.5 20 19H4l8-14.5Z" stroke-linejoin="round"></path><path d="M12 10v4.5" stroke-linecap="round"></path><circle cx="12" cy="17.3" r="0.6" fill="currentColor" stroke="none"></circle></svg>`;
const eyeIcon = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" stroke-linecap="round" stroke-linejoin="round"></path><circle cx="12" cy="12" r="3"></circle></svg>`;

export default function buildLoginTemplate() {
    return `
      <div class="view login-view">
        <div class="update-backdrop"></div>
        <main class="login-container">
          <header class="login-header">
            <p class="eyebrow">KissApp Oturum Merkezi</p>
            <h1>Giriş Yönetimi</h1>
            <p class="description">Güvenilir oturum açma için bilgilerinizi doğrulayın ve devam edin.</p>
            <span class="header-underline"></span>
          </header>

          <section class="login-shell">
            <form id="loginForm" class="login-form" autocomplete="on">
              <div>
                <p class="label">Kullanıcı Adı</p>
                <div class="input-wrapper">
                  <input id="username" name="username" placeholder="kullanıcı adınız" autocomplete="username" />
                </div>
              </div>
              <div>
                <p class="label">Şifre</p>
                <div class="input-wrapper">
                  <input id="password" name="password" type="password" placeholder="••••••" autocomplete="current-password" />
                  <button type="button" class="password-toggle" id="togglePassword" aria-label="Şifreyi göster">${eyeIcon}</button>
                </div>
              </div>

              <div class="status-inline">
                <div id="loginStatusBox" class="login-status-box info">
                  <div class="login-status-icon" aria-hidden="true">${infoIcon}</div>
                  <div class="login-status-text">
                    <p class="title" id="loginStatusTitle">Hazır.</p>
                    <p class="desc" id="loginStatusDesc">Giriş yapmaya hazırsınız.</p>
                  </div>
                </div>
              </div>

              <div class="login-actions">
                <button type="submit" id="btnLogin">Giriş Yap</button>
              </div>
            </form>

            <section id="loginBlocked" class="login-blocked" hidden>
              <div class="blocked-icon" aria-hidden="true">${warningIcon}</div>
              <div class="blocked-copy">
                <h3>Güncelleme gerekli</h3>
                <p>Lütfen uygulamanızı son sürüme güncelleyin. Güncel olmayan sürümde oturum açamazsınız.</p>
                <div class="login-actions">
                  <button type="button" class="secondary login-update-btn" id="btnGoUpdate">Güncelleme ekranına git</button>
                </div>
              </div>
            </section>
          </section>
        </main>
      </div>
    `;
}
