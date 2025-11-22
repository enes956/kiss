// style.js

export function buildStyles() {
return `

/* =====================================================================
    ROOT THEME
===================================================================== */
:root {
  --bg: #060c16;
  --panel: rgba(13, 18, 30, 0.78);
  --panel-strong: rgba(18, 26, 42, 0.92);
  --border: rgba(255, 255, 255, 0.08);
  --border-strong: rgba(120, 196, 255, 0.45);

  --text: #eaf2ff;
  --muted: #9fb6d8;

  --accent-a: #5eb7ff;
  --accent-b: #5ef0e5;
  --accent-c: #9d7dff;

  --success: #57e8a2;
  --danger: #ff7d8c;

  --shadow: 0 35px 120px rgba(0,0,0,0.55);
  --blur: 18px;
  --radius: 18px;

  --transition: .38s;
  --font: 'Inter', 'SF Pro', system-ui, sans-serif;
}

/* =====================================================================
    GLOBAL BASE
===================================================================== */
* { box-sizing: border-box; }
html, body { width: 100%; height: 100%; margin:0; padding:0; }
body {
  font-family: var(--font);
  background:
    radial-gradient(circle at 15% 20%, rgba(94,240,229,0.12), transparent 35%),
    radial-gradient(circle at 80% 10%, rgba(94,183,255,0.16), transparent 32%),
    linear-gradient(145deg, #050a14, #0c1424 50%, #070f1d);
  color: var(--text);
  overflow: hidden;
  display: flex;
}


/* =====================================================================
    APP LAYOUT — FRAME / HEADER / SIDEBAR / FOOTER
===================================================================== */
.app-frame {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: 68px 1fr 48px;
  height: 100vh;
  width: 100vw;
}

/* HEADER */
.app-header {
  grid-column: 1 / 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 22px;
  background: rgba(8, 14, 26, 0.8);
  border-bottom: 1px solid var(--border);
  -webkit-app-region: drag;
}
.window-controls button {
  -webkit-app-region: no-drag;
}

/* SIDEBAR — LEFT MENU */
.app-sidebar {
  grid-row: 2;
  border-right: 1px solid var(--border);
  background: rgba(255,255,255,0.02);
  backdrop-filter: blur(var(--blur));
}
.sidebar-nav {
  display: grid;
  gap: 8px;
  padding: 14px;
}
.sidebar-item {
  padding: 12px 16px;
  border-radius: var(--radius);
  background: rgba(255,255,255,0.04);
  color: var(--text);
  border: 1px solid var(--border);
  cursor: pointer;
  text-align:left;
  transition: .25s;
}
.sidebar-item:hover {
  background: rgba(255,255,255,0.09);
}

/* CONTENT AREA */
.app-content {
  grid-row: 2;
  grid-column: 2;
  position: relative;
  overflow: hidden;
}

/* FOOTER */
.app-footer {
  grid-column: 1 / 3;
  display:flex;
  align-items:center;
  justify-content:center;
  border-top:1px solid var(--border);
  background: rgba(12,18,30,0.85);
  color: var(--muted);
  font-size: 13px;
}


/* =====================================================================
    CARD COMPONENTS
===================================================================== */
.card {
  width: 100%;
  max-width: 1100px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 22px;
  box-shadow: var(--shadow);
  display: grid;
  gap: 16px;
}


/* =====================================================================
    FORM ELEMENTS — INPUTS
===================================================================== */
input, select {
  width: 100%;
  padding: 13px 15px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.07);
  background: rgba(255,255,255,0.04);
  color: var(--text);
  font-size: 15px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 14px 40px rgba(0,0,0,0.35);
  transition: .25s;
}
input:focus, select:focus {
  outline: 2px solid rgba(94,183,255,0.3);
  border-color: var(--border-strong);
  box-shadow: 0 8px 26px rgba(94,183,255,0.25);
}


/* =====================================================================
    BUTTONS
===================================================================== */
button {
  border: none;
  border-radius: 14px;
  padding: 13px 16px;
  font-size: 15px;
  cursor: pointer;
  color: #050a14;
  background: linear-gradient(135deg, var(--accent-a), var(--accent-b));
  font-weight: 700;
  box-shadow: 0 12px 30px rgba(94,183,255,0.28);
  transition: transform 160ms ease, box-shadow 160ms ease, filter 160ms ease;
}
button:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 40px rgba(94,240,229,0.26);
  filter: brightness(1.05);
}
button.secondary {
  background: rgba(255,255,255,0.06);
  color: var(--text);
  box-shadow: none;
  border: 1px solid var(--border);
}
button.ghost {
  background: transparent;
  color: var(--text);
  border: 1px dashed var(--border);
  box-shadow: none;
}


/* =====================================================================
    VIEW MANAGER — PAGE TRANSITIONS
===================================================================== */
.view {
  position: absolute;
  inset: 0;
  padding: 14px;
  opacity: 0;
  transform: translateY(28px) scale(.98);
  pointer-events: none;
  filter: blur(6px);
  transition: opacity .28s ease, transform .28s ease, filter .28s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}
.view.active {
  opacity: 1;
  transform: translateY(0) scale(1);
  filter: blur(0px);
  pointer-events: auto;
  z-index: 2;
}
.view.leaving {
  opacity: 0;
  transform: translateY(-18px) scale(.985);
  filter: blur(6px);
}


/* =====================================================================
    SLOT SELECTOR
===================================================================== */
.slot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px,1fr));
  gap: 14px;
}
.slot-card {
  padding: 18px;
  border-radius: 18px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,0.02);
  cursor: pointer;
  transition: .25s;
  position: relative;
  overflow: hidden;
}
.slot-card:hover {
  transform: translateY(-4px);
  border-color: var(--border-strong);
  box-shadow: 0 20px 48px rgba(0,0,0,0.35);
}
.slot-card.active {
  border-color: var(--border-strong);
  box-shadow: 0 24px 58px rgba(94,183,255,0.22);
  background: radial-gradient(circle at 30% 20%, rgba(94,240,229,0.08), rgba(255,255,255,0.02));
}


/* =====================================================================
    PROGRESS BARS
===================================================================== */
.progress {
  width:100%;
  height:12px;
  border-radius:999px;
  background: rgba(255,255,255,0.06);
  overflow:hidden;
  position:relative;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
}
.progress div {
  height:100%;
  width:0%;
  border-radius:999px;
  background:linear-gradient(90deg, var(--accent-a), var(--accent-c));
  transition:width .22s ease;
}


/* =====================================================================
    LOADERS
===================================================================== */
.loader-large {
  width:140px;
  height:140px;
  border-radius:32px;
  background: radial-gradient(circle at 30% 30%, rgba(94,183,255,0.3), transparent 38%), rgba(255,255,255,0.03);
  border:1px solid var(--border);
  box-shadow:0 30px 90px rgba(0,0,0,0.45);
  display:grid;
  place-items:center;
}
.loader-dual::before,
.loader-dual::after {
  content:"";
  position:absolute;
  border-radius:50%;
  inset:14px;
  border:3px solid transparent;
  border-top-color:var(--accent-a);
  border-right-color:var(--accent-b);
  animation: spin 2.4s ease-in-out infinite;
}
.loader-dual::after {
  inset:30px;
  animation-duration:1.8s;
  opacity:.65;
  border-top-color:var(--accent-c);
  border-right-color:var(--accent-a);
}
@keyframes spin { to { transform:rotate(360deg); } }

.spinner {
  display:inline-block;
  width:14px;
  height:14px;
  border:3px solid rgba(255,255,255,0.3);
  border-top-color:white;
  border-radius:50%;
  animation:spin 0.8s linear infinite;
  margin-right:6px;
}

@keyframes spin {
  to { transform:rotate(360deg); }
}
.status-dot {
  width:12px;
  height:12px;
  border-radius:50%;
  background:var(--muted);
  box-shadow:0 0 0 2px rgba(0,0,0,0.35);
  position: relative;
  overflow: hidden;
}

.status-dot::after {
  content:"";
  position:absolute;
  inset:-4px;
  border-radius:50%;
  background:currentColor;
  opacity:.18;
  filter:blur(6px);
  transition:opacity .25s ease;
}

.status-dot.idle {
  color: var(--muted);
  background: var(--muted);
}

.status-dot.ok {
  color: var(--success);
  background: var(--success);
  animation:pulse-ok 2.4s ease-in-out infinite;
}

.status-dot.fail {
  color: var(--danger);
  background: var(--danger);
  animation:pulse-fail 1.2s ease-in-out infinite;
}

@keyframes pulse-ok { 0%,100% { transform:scale(.96); opacity:.9;} 50% { transform:scale(1.08); opacity:1; } }
@keyframes pulse-fail { 0%,100% { transform:scale(.98); } 50% { transform:scale(1.05); } }

/* =====================================================================
   FIXED — UPDATE LOADER (Circle, not square)
===================================================================== */

.update-loader {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 4px solid rgba(255,255,255,0.08);
  border-top-color: var(--accent-a);
  border-right-color: var(--accent-c);
  animation: spin 1.1s linear infinite;
  margin: 20px auto;
}

/* =====================================================================
    STATES — ERROR / SUCCESS
===================================================================== */
.error {
  display:none;
  color:var(--danger);
  padding:10px 12px;
  background:rgba(255,125,140,0.08);
  border:1px solid rgba(255,125,140,0.35);
  border-radius:12px;
}
.success {
  display:none;
  color:var(--success);
  padding:10px 12px;
  background:rgba(87,232,162,0.08);
  border:1px solid rgba(87,232,162,0.35);
  border-radius:12px;
}

`;
}


