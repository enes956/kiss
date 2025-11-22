export default async function footerEvents() {
    const yearEl = document.getElementById("footerYear");
    const versionEl = document.getElementById("footerVersion");

    if (!yearEl || !versionEl) return;

    // YIL
    const year = new Date().getFullYear();
    yearEl.textContent = ` ${year}`;

    // SÜRÜM
    try {
        const version = await window.api.getVersion();
        versionEl.textContent = `Sürüm: v${version}`;
    } catch {
        versionEl.textContent = "Sürüm: ?";
    }
}
