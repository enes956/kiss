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
                        <p class="description">Slot sayısını ve script paketini belirleyin. Start sonrası yalnızca çalışma alanı açılır.</p>
                        <span class="header-underline"></span>
                    </div>
                    <div class="header-pill">Sadece ayarlar</div>
                </header>

                <form id="contentForm" class="content-form">
                    <div class="setup-grid">
                        <div class="content-card">
                            <div class="card-head">
                                <div>
                                    <p class="label">View / slot sayısı</p>
                                    <p class="hint">1-4 arası slot seçin. Seçim yatay slot picker ile yapılır.</p>
                                </div>
                                <span id="viewCountLabel" class="chip">4 slot</span>
                            </div>

                            <div class="field">
                                <div id="slotPicker" class="slot-picker" role="group" aria-label="Slot sayısı seçimi">
                                    <button type="button" class="slot-btn" data-count="1">1</button>
                                    <button type="button" class="slot-btn" data-count="2">2</button>
                                    <button type="button" class="slot-btn" data-count="3">3</button>
                                    <button type="button" class="slot-btn" data-count="4">4</button>
                                </div>
                            </div>
                        </div>

                        <div class="content-card">
                            <div class="card-head">
                                <div>
                                    <p class="label">Script / modül seçimi</p>
                                    <p class="hint">app/scripts/modules içindeki modüller otomatik listelenir. Seçilenler paketlenir ve her slota enjekte edilir.</p>
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
