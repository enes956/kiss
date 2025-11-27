export default function buildContentTemplate() {
    return `
    <div class="view content-view" data-mode="setup">
        <div class="content-backdrop"></div>
        <main class="content-container">
            <section id="setupPanel" class="content-shell setup-shell">
                <header class="content-header">
                    <div>
                        <p class="eyebrow">Ayar Ekranı</p>
                        <h1>Çoklu Görünüm ve Script Kontrolü</h1>
                        <p class="description">View sayısını, slot ayrıntılarını ve script paketini belirleyin. Start sonrası yalnızca çalışma alanı açılır.</p>
                        <span class="header-underline"></span>
                    </div>
                    <div class="header-pill">Sadece ayarlar</div>
                </header>

                <form id="contentForm" class="content-form">
                    <div class="setup-grid">
                        <div class="content-card">
                            <div class="card-head">
                                <div>
                                    <p class="label">Görünüm planı</p>
                                    <p class="hint">Slot sayısını belirleyin, her slot için profil ve not atayın.</p>
                                </div>
                                <span id="viewCountLabel" class="chip">4 görünüm</span>
                            </div>

                            <div class="field">
                                <p class="label">View sayısı</p>
                                <input type="range" min="1" max="4" value="4" id="viewCount" />
                                <div id="viewPreview" class="count-preview" aria-hidden="true"></div>
                            </div>

                            <div class="divider"></div>

                            <div class="field">
                                <div class="field-head">
                                    <p class="label">Her view için seçenekler</p>
                                    <p class="hint">Profil, çalışma modu ve kısa notları düzenleyin.</p>
                                </div>
                                <div id="viewOptions" class="view-options"></div>
                            </div>
                        </div>

                        <div class="content-card">
                            <div class="card-head">
                                <div>
                                    <p class="label">Script / modül seçimi</p>
                                    <p class="hint">app/scripts/modules içindeki modülleri inceleyin. Seçilen modüllerle yeni bir paket üretilir ve tüm view’lere enjekte edilir.</p>
                                </div>
                            </div>
                            <div id="scriptList" class="script-list"></div>
                        </div>
                    </div>

                    <footer class="content-footer">
                        <div class="status-line" id="contentStatus" role="status">Hazır. Start ile görünüm setini başlatın.</div>
                        <div class="action-group">
                            <button type="button" id="resetGrid" class="ghost">Temizle</button>
                            <button type="submit" class="primary">Start</button>
                        </div>
                    </footer>
                </form>
            </section>

            <section id="runtimePanel" class="runtime-shell" hidden>
                <header class="runtime-toolbar">
                    <div class="runtime-meta">
                        <p class="eyebrow">Content Çalışması</p>
                        <h2>Webview Alanı</h2>
                        <p id="runtimeSummary" class="runtime-summary">—</p>
                    </div>
                    <div class="runtime-actions">
                        <button type="button" id="refreshAll" class="pill-btn">Tümünü yenile</button>
                        <button type="button" id="refreshFocused" class="pill-btn">Seçiliyi yenile</button>
                        <button type="button" id="clearHistory" class="pill-btn danger">Geçmişi temizle</button>
                        <button type="button" id="backToSetup" class="pill-btn ghost">Ayar Ekranına Dön</button>
                    </div>
                </header>
                <div class="runtime-status" id="runtimeStatus" role="status">Hazır. Start ile görünüm setini başlatın.</div>
                <div id="contentGrid" class="content-webview-grid" data-count="0"></div>
            </section>
        </main>
    </div>
    `;
}
