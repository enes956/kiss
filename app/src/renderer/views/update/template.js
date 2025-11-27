export default function updateTemplate() {
    return `
    <div class="view update-view">
        <div class="update-backdrop"></div>
        <main class="update-container">
            <header class="update-header">
                <p class="eyebrow">KissApp Güncelleme Merkezi</p>
                <h1>Güncelleme Yönetimi</h1>
                <p class="description">Yeni özellikler, güvenlik geliştirmeleri ve hata düzeltmeleri içeren son sürümü burada yönetebilirsiniz.</p>
                <span class="header-underline"></span>
            </header>

            <section id="updateStatusBox" class="status-box info">
                <div class="status-icon">ℹ</div>
                <div class="status-text" id="updateStatusMessage">Güncelleme kontrolüne hazır.</div>
            </section>

            <section id="updateInfo" class="update-info is-hidden">
                <div>
                    <p class="label">Yeni sürüm</p>
                    <h3 id="updateVersion">—</h3>
                </div>
                <div>
                    <p class="label">Boyut</p>
                    <h3 id="updateSize">—</h3>
                </div>
                <div class="update-note">
                    <p class="label">Değişiklikler</p>
                    <p id="updateDescription">Bu güncelleme performans ve kararlılık iyileştirmeleri içerir.</p>
                </div>
            </section>

            <div class="update-actions">
                <button id="updateStartBtn" class="update-primary">Güncellemeyi İndir</button>
                <div id="updateUpToDateActions" class="update-secondary-actions is-hidden">
                    <button id="updateContinueBtn" class="secondary">Devam Et</button>
                    <button id="updateRepairBtn" class="ghost">Tamir Et</button>
                </div>
            </div>

            <section id="updateProgressArea" class="update-progress is-hidden">
                <div class="progress-row">
                    <span id="updateProgressLabel">İndiriliyor…</span>
                    <span id="updatePercent">0%</span>
                </div>
                <div class="progress">
                    <div id="updateProgressBar"></div>
                </div>
            </section>

            <section id="updateInstalling" class="update-installing is-hidden">
                <div class="spinner"></div>
                <div>
                    <p class="label">Kuruluyor…</p>
                    <p class="subtitle">Güncelleme uygulanıyor. Uygulama yeniden başlatılacak.</p>
                </div>
            </section>

            <div id="repairLeaveModal" class="update-modal is-hidden" role="alertdialog" aria-modal="true" aria-labelledby="repairModalTitle" aria-describedby="repairModalDesc">
                <div class="modal-card">
                    <h3 id="repairModalTitle">İndirme devam ediyor</h3>
                    <p id="repairModalDesc">Sayfadan ayrılırsanız tamir paketiniz iptal edilecektir.</p>
                    <div class="modal-actions">
                        <button id="repairStayBtn" class="secondary">İptal</button>
                        <button id="repairLeaveBtn" class="danger">Devam Et</button>
                    </div>
                </div>
            </div>

            <div id="updateLeaveModal" class="update-modal is-hidden" role="alertdialog" aria-modal="true" aria-labelledby="updateModalTitle" aria-describedby="updateModalDesc">
                <div class="modal-card">
                    <h3 id="updateModalTitle">İndirme sürüyor</h3>
                    <p id="updateModalDesc">Sayfadan ayrılırsanız güncelleme indirmesi iptal edilecektir.</p>
                    <div class="modal-actions">
                        <button id="updateStayBtn" class="secondary">İptal</button>
                        <button id="updateLeaveBtn" class="danger">Devam Et</button>
                    </div>
                </div>
            </div>
        </main>
    </div>
    `;
}
