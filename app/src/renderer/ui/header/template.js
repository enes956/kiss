export default function headerTemplate() {
    const fallbackIcon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120' fill='none'%3E%3Crect x='6' y='6' width='108' height='108' rx='24' fill='%230c1726' stroke='%235eb7ff' stroke-width='12'/%3E%3Cpath d='M36 48c6-14 13-20 24-20 13 0 24 10 24 26 0 19-13 32-32 32-8 0-14-3-18-8l8-12c2 3 5 5 9 5 8 0 12-6 12-15 0-8-4-13-10-13-4 0-8 2-12 8L36 48Z' fill='%235ef0e5'/%3E%3C/svg%3E";
    const iconSrc = typeof window !== "undefined" && window.api?.asset?.dataUrl
        ? window.api.asset.dataUrl("icon.ico")
        : fallbackIcon;

    return `
        <div class="logo-area">
            <img src="${iconSrc}" alt="logo" class="logo-icon" />
            <h1 class="logo-title">KissApp</h1>
        </div>

        <div class="window-controls">
            <button data-win="minimize" title="Küçült" class="window-control-btn">–</button>
            <button data-win="maximize" title="Büyüt" class="window-control-btn">⧉</button>
            <button data-win="close" title="Kapat" class="window-control-btn close">✕</button>
        </div>
    `;
}
