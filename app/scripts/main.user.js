// ==UserScript==
// @name        KissKiss Toolkit — Modular Panel (Build)
// @namespace   http://tampermonkey.net/
// @version     1.2
// @description Modular panel with settings, storage, drag and taller view.
// @match       https://getkisskiss.com/*
// @grant       none
// ==/UserScript==

(function(){'use strict';

// ===== CORE: panel.js =====
// panel.js
class ToolkitPanel {
    constructor(utils) {
        this.utils = utils;
        const { panel, header, tabStrip, body } = this.#buildLayout();
        this.panel = panel;
        this.header = header;
        this.tabStrip = tabStrip;
        this.body = body;
        this.tabMap = new Map();
        this.#enableDragging();
    }

    attachModule(module) {
        const tab = this.utils.el('button', {
            text: module.title,
            css: {
                padding: '6px 8px', cursor: 'pointer', border: '1px solid transparent',
                background: 'transparent', color: '#e6ffb3', opacity: '0.6'
            }
        });
        const content = this.utils.el('div', { css: { display: 'none' } });
        const settingsContainer = this.utils.el('div', { css: { marginTop: '12px' } });
        content.appendChild(settingsContainer);

        if (typeof module.renderSettings === 'function') {
            try { module.renderSettings.call(module, settingsContainer, { utils: this.utils }); }
            catch (error) { console.error('Modül yüklenemedi:', module.name, error); }
        }

        tab.addEventListener('click', () => this.showModule(module.name));

        this.tabStrip.appendChild(tab);
        this.body.appendChild(content);
        this.tabMap.set(module.name, { tab, content });
    }

    showModule(name) {
        this.tabMap.forEach(({ tab, content }, moduleName) => {
            const isActive = moduleName === name;
            tab.style.opacity = isActive ? '1' : '0.6';
            content.style.display = isActive ? 'block' : 'none';
        });
    }

    showFirstModule() {
        const first = this.tabMap.keys().next();
        if (!first.done) this.showModule(first.value);
    }

    #buildLayout() {
        const panel = this.utils.el('div', {
            css: {
                position: 'fixed', right: '10px', bottom: '10px', width: '400px', maxHeight: '720px',
                background: '#111', color: '#e6ffb3', border: '2px solid #bada55', borderRadius: '8px',
                zIndex: 999999, fontFamily: 'system-ui, monospace', boxShadow: '0 6px 20px rgba(0,0,0,.6)',
                display: 'flex', flexDirection: 'column'
            }
        });
        const header = this.utils.el('div', { css: { padding: '8px', fontWeight: 'bold', cursor: 'move' }, text: 'KissKiss Toolkit — Modular' });
        panel.appendChild(header);

        const tabContainer = this.utils.el('div', { css: { display: 'flex', alignItems: 'center', gap: '4px', padding: '8px' } });
        const btnLeft = this.utils.el('button', { text: '◀', css: { cursor: 'pointer', padding: '2px 6px' } });
        const btnRight = this.utils.el('button', { text: '▶', css: { cursor: 'pointer', padding: '2px 6px' } });
        const tabStrip = this.utils.el('div', { css: { display: 'flex', gap: '6px', overflowX: 'auto', flexGrow: 1, borderBottom: '1px solid rgba(186,218,85,0.15)' } });
        btnLeft.addEventListener('click', () => { tabStrip.scrollBy({ left: -100, behavior: 'smooth' }); });
        btnRight.addEventListener('click', () => { tabStrip.scrollBy({ left: 100, behavior: 'smooth' }); });
        tabContainer.appendChild(btnLeft);
        tabContainer.appendChild(tabStrip);
        tabContainer.appendChild(btnRight);
        panel.appendChild(tabContainer);

        const body = this.utils.el('div', { css: { padding: '10px', height: '620px', overflowY: 'auto', background: '#222' } });
        panel.appendChild(body);

        document.body.appendChild(panel);

        return { panel, header, tabStrip, body };
    }

    #enableDragging() {
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;
        this.header.addEventListener('mousedown', event => {
            isDragging = true;
            offsetX = event.clientX - this.panel.offsetLeft;
            offsetY = event.clientY - this.panel.offsetTop;
        });
        document.addEventListener('mousemove', event => {
            if (!isDragging) return;
            this.panel.style.left = `${event.clientX - offsetX}px`;
            this.panel.style.top = `${event.clientY - offsetY}px`;
        });
        document.addEventListener('mouseup', () => { isDragging = false; });
    }
}


// ===== CORE: registry.js =====
// registry.js
class ToolkitModuleRegistry {
    constructor(utils) {
        this.utils = utils;
        this.modules = new Map();
    }

    register(config) {
        const { name, title, renderSettings, defaultSettings = {} } = config;
        if (!name) throw new Error('Module must have name');
        if (this.modules.has(name)) return this.modules.get(name);

        const settings = this.utils.loadSettings(name, defaultSettings);
        const module = { name, title: title || name, renderSettings, defaultSettings, settings };
        this.modules.set(name, module);
        return module;
    }

    allModules() {
        return Array.from(this.modules.values());
    }
}


// ===== CORE: storageUtils.js =====
// storageUtils.js
const StorageUtils = {
    prefix: 'kiss_toolkit_',
    getKey(moduleName) { return this.prefix + moduleName; },
    saveSettings(moduleName, obj) {
        try { localStorage.setItem(this.getKey(moduleName), JSON.stringify(obj)); }
        catch (error) { console.error(error); }
    },
    loadSettings(moduleName, defaults = {}) {
        try {
            const value = localStorage.getItem(this.getKey(moduleName));
            return value ? JSON.parse(value) : defaults;
        } catch (error) {
            console.error(error);
            return defaults;
        }
    },
    exportAllSettings() {
        const output = {};
        for (let i = 0; i < localStorage.length; i += 1) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith(this.prefix)) continue;
            try { output[key] = JSON.parse(localStorage.getItem(key)); }
            catch { output[key] = localStorage.getItem(key); }
        }
        return output;
    },
    importAllSettings(obj) {
        if (!obj || typeof obj !== 'object') return;
        Object.keys(obj).forEach(key => {
            if (!key.startsWith(this.prefix)) return;
            try { localStorage.setItem(key, JSON.stringify(obj[key])); }
            catch { localStorage.setItem(key, obj[key]); }
        });
    },
    el(tag, opts = {}, ...children) {
        const element = document.createElement(tag);
        if (opts.css) Object.assign(element.style, opts.css);
        if (opts.html) element.innerHTML = opts.html;
        if (opts.text) element.textContent = opts.text;
        if (opts.attrs) Object.entries(opts.attrs).forEach(([key, value]) => element.setAttribute(key, value));
        children.flat().forEach(child => {
            if (child == null) return;
            element.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
        });
        return element;
    }
};


// ===== MODULE: AutoCombo.js =====
function createAutoComboModule(utils) {
    return {
        name: "autoCombo",
        title: "Kick + Save",

        defaultSettings: {
            kicksPerCycle: 1,
            kickCycleSeconds: 1,
            savesPerCycle: 1,
            saveCycleSeconds: 1,

            kickList: {},   // { uid: true }
            saveList: [],   // [uid]
        },

        renderSettings(container) {
            const S = utils.loadSettings(this.name, this.defaultSettings);
            container.innerHTML = "";

            /* HELPERS */
            const shorten = n => n?.length > 8 ? n.slice(0, 8) + "…" : n;
            const saveNow = () => utils.saveSettings(this.name, S);


            /* PLAYERS */
            function getPlayers() {
                try {
                    const links = document.querySelectorAll(".player__name__link");
                    if (!links?.length) return [];

                    return [...links]
                        .map(el => {
                            const userId =
                                el.getAttribute("data-uid") ||
                                el.closest("[data-uid]")?.getAttribute("data-uid");

                            const name =
                                el.getAttribute("data-name") ||
                                el.textContent?.trim() ||
                                "?";

                            return userId ? { userId, name } : null;
                        })
                        .filter(Boolean);
                } catch {
                    return [];
                }
            }

            /* STORAGE */
            const kickIntervals = {};
            const saveIntervals = {};

            /* KICK */
            function doKick(uid) {
                try {
                    const wrap =
                        document.querySelector(`.player__wrap[data-uid='${uid}']`) ||
                        document.querySelector(`.user-list__item[data-uid='${uid}']`);
                    if (!wrap) return;

                    let menu = wrap.querySelector(".player__menu.js-player-menu");
                    if (!menu || menu.style.display === "none") {
                        wrap.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
                        menu = wrap.querySelector(".player__menu.js-player-menu");
                    }

                    const kickBtn = menu?.querySelector(".player__menu__item--kick");
                    if (kickBtn) {
                        kickBtn.dispatchEvent(
                            new MouseEvent("click", { bubbles: true, cancelable: true, view: window })
                        );
                    }
                } catch {}
            }

            function startKick(uid) {
                stopKick(uid);
                S.kickList[uid] = true;
                saveNow();

                kickIntervals[uid] = setInterval(() => {
                    for (let i = 0; i < S.kicksPerCycle; i++)
                        setTimeout(() => doKick(uid), i * (1000 / S.kicksPerCycle));
                }, S.kickCycleSeconds * 1000);
            }

            function stopKick(uid) {
                clearInterval(kickIntervals[uid]);
                delete kickIntervals[uid];
                delete S.kickList[uid];
                saveNow();
            }

            /* SAVE */
            function doSave(uid) {
                try {
                    document
                        .querySelectorAll(".message__text .save-kick")
                        ?.forEach(a => {
                            if (a.getAttribute("data-user-id") === uid) a.click();
                        });
                } catch {}
            }

            function startSave(uid) {
                stopSave(uid);
                if (!S.saveList.includes(uid)) S.saveList.push(uid);
                saveNow();

                saveIntervals[uid] = setInterval(() => {
                    for (let i = 0; i < S.savesPerCycle; i++)
                        setTimeout(() => doSave(uid), i * (1000 / S.savesPerCycle));
                }, S.saveCycleSeconds * 1000);
            }

            function stopSave(uid) {
                clearInterval(saveIntervals[uid]);
                delete saveIntervals[uid];
                S.saveList = S.saveList.filter(x => x !== uid);
                saveNow();
            }


            /* UI — OPTIONS */
            const opt = utils.el("div", {
                css: {
                    marginBottom: "12px",
                    padding: "6px",
                    border: "1px solid #444",
                    borderRadius: "6px",
                    background: "#1115"
                }
            });
            container.append(opt);

            function addRow(title, v1, cb1, v2, cb2) {
                const row = utils.el("div", {
                    css: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "6px",
                        marginBottom: "6px"
                    }
                });

                row.append(
                    utils.el("label", {
                        text: title,
                        css: { width: "48px", opacity: 0.85 }
                    }),

                    utils.el("label", {
                        text: "adet",
                        css: { fontSize: "11px", opacity: 0.7 }
                    }),

                    utils.el("input", {
                        attrs: { type: "number", min: "1", value: v1 },
                        css: { width: "46px", textAlign: "center" },
                        oninput: e => cb1(+e.target.value || 1)
                    }),

                    utils.el("label", {
                        text: "sn",
                        css: { fontSize: "11px", opacity: 0.7 }
                    }),

                    utils.el("input", {
                        attrs: { type: "number", min: "1", value: v2 },
                        css: { width: "46px", textAlign: "center" },
                        oninput: e => cb2(+e.target.value || 1)
                    }),
                );

                opt.append(row);
            }

            addRow(
                "Kick",
                S.kicksPerCycle,
                v => { S.kicksPerCycle = v; saveNow(); },
                S.kickCycleSeconds,
                v => { S.kickCycleSeconds = v; saveNow(); },
            );

            addRow(
                "Save",
                S.savesPerCycle,
                v => { S.savesPerCycle = v; saveNow(); },
                S.saveCycleSeconds,
                v => { S.saveCycleSeconds = v; saveNow(); },
            );


            /* PLAYER LIST */
            const listRoot = utils.el("div", {
                css: {
                    maxHeight: "540px",
                    overflowY: "auto",
                    border: "1px solid #333",
                    borderRadius: "6px",
                    padding: "4px"
                }
            });
            container.append(listRoot);


            const clearBtn = utils.el("button", {
                text: "Seçimleri temizle",
                css: {
                    background: "#b11",
                    color: "#fff",
                    width: "100%",
                    marginTop: "6px",
                    padding: "6px",
                    borderRadius: "4px",
                }
            });
            clearBtn.onclick = () => {
                Object.keys(kickIntervals).forEach(stopKick);
                [...S.saveList].forEach(stopSave);
                S.kickList = {};
                S.saveList = [];
                saveNow();
                refreshList();
            };
            container.append(clearBtn);


            /* REFRESH */
            function refreshList() {
                const players = getPlayers();
                listRoot.innerHTML = "";

                if (!players.length) {
                    listRoot.append(
                        utils.el("div", {
                            text: "Oda boş…",
                            css: { opacity: 0.5, textAlign: "center", padding: "10px" }
                        })
                    );
                    return;
                }

                players.forEach(p => {
                    const uid = p.userId;

                    const row = utils.el("div", {
                        css: {
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "4px",
                            gap: "6px",
                        }
                    });

                    row.append(
                        utils.el("span", {
                            text: shorten(p.name),
                            css: { flex: "1" }
                        })
                    );

                    const isKick = S.kickList[uid];
                    const btnKick = utils.el("button", {
                        text: isKick ? "K.DUR" : "KICK",
                        css: { minWidth: "60px", fontSize: "11px" }
                    });
                    btnKick.style.backgroundColor = isKick ? "#d32f2f" : "#388e3c";
                    btnKick.onclick = () => {
                        isKick ? stopKick(uid) : startKick(uid);
                        refreshList();
                    };
                    row.append(btnKick);

                    const isSave = S.saveList.includes(uid);
                    const btnSave = utils.el("button", {
                        text: isSave ? "S.DUR" : "SAVE",
                        css: { minWidth: "60px", fontSize: "11px" }
                    });
                    btnSave.style.backgroundColor = isSave ? "#d32f2f" : "#1976d2";
                    btnSave.onclick = () => {
                        isSave ? stopSave(uid) : startSave(uid);
                        refreshList();
                    };
                    row.append(btnSave);

                    listRoot.append(row);
                });
            }

            refreshList();


            /* AUTO-RESUME */
            function autoResume() {
                Object.keys(S.kickList).forEach(uid => startKick(uid));
                S.saveList.forEach(uid => startSave(uid));
            }
            autoResume();


            /* AUTO REFRESH */
            setInterval(refreshList, 2000);
        }
    };
}


// ===== MODULE: AutoSpin.js =====
function createAutoSpinModule(utils) {
    return {
        name: 'autoSpinTab1',
        title: 'Genel Auto',

        defaultSettings: {
            manualStopped: { spin:false, kiss:false, close:false },
            retList:{},
            forceRetAll:false,
            guardEnabled:false,   // ✅ PATCH — kalıcı Guard
        },

        renderSettings(container) {

            /* ========================= LOAD ========================= */
            const S = utils.loadSettings(this.name, this.defaultSettings);
            const manualStopped = S.manualStopped;
            const retList       = S.retList || {};
            let   forceRetAll   = !!S.forceRetAll;
            let   guardEnabled  = !!S.guardEnabled;   // ✅ PATCH

            const saveNow = () => {
                S.manualStopped = manualStopped;
                S.retList       = retList;
                S.forceRetAll   = forceRetAll;
                S.guardEnabled  = guardEnabled;   // ✅ PATCH
                utils.saveSettings(this.name, S);
            };

            /* ========================= CONFIG ========================= */
            const cfg = {
                url:'https://getkisskiss.com/ajax/product/wheel_of_fortune/',
                body:'spin=1',
                method:'POST',
                headers:{
                    'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With':'XMLHttpRequest'
                },
                maxParallel:5,
                minInterval:400,
                minAllowedInterval:50,
                maxAllowedInterval:5000,
                successDecreaseFactor:0.9,
                errorIncreaseFactor:1.5,
                jitterPct:0.2,
                autoCheckInterval:1000
            };

            /* ========================= STATE ========================= */
            const state = {
                running:false,
                inflight:0,
                totalSent:0,
                totalSuccess:0,
                totalError:0,
                lastSentAt:0,
                minInterval:cfg.minInterval,

                autoClicking1:false,
                clickCount1:0,
                clickTimer1:null,

                universalCloseRunning:false,

                guardRunning:false,
                guardTimer:null,
            };

            let managerStarted = false;
            let universalCloseInterval = null;

            /* ========================= UI ROOT ========================= */
            const panel = utils.el('div',{
                css:{
                    background:'#222',
                    color:'#bada55',
                    padding:'12px 18px',
                    borderRadius:'8px',
                    fontFamily:'monospace',
                    border:'2px solid #bada55',
                    boxShadow:'0 0 15px rgba(0,0,0,0.5)',
                    whiteSpace:'pre-line'
                }
            });
            container.appendChild(panel);

            /* ========================= UTIL ========================= */
            const jitter = ms => {
                const j=(Math.random()*2-1)*cfg.jitterPct*ms;
                return Math.max(0,Math.floor(ms+j));
            };

            function isVisible(el){
                if(!el) return false;
                if(el.offsetParent===null) return false;
                const r=el.getBoundingClientRect();
                return r.width>0 && r.height>0;
            }

            function humanLikeClick(el){
                try{
                    const r=el.getBoundingClientRect();
                    const opt={
                        bubbles:true,
                        cancelable:true,
                        view:window,
                        clientX:r.left+r.width/2,
                        clientY:r.top+r.height/2
                    };
                    el.dispatchEvent(new MouseEvent("mouseover",opt));
                    el.dispatchEvent(new MouseEvent("mousedown",opt));
                    setTimeout(()=>{
                        el.dispatchEvent(new MouseEvent("mouseup",opt));
                        el.dispatchEvent(new MouseEvent("click",opt));
                    },50+Math.random()*100);
                }catch{}
            }

            /* ========================= SPIN ========================= */
            async function sendOneSpin(){
                state.inflight++;
                state.totalSent++;
                state.lastSentAt=Date.now();

                try{
                    const res=await fetch(cfg.url,{
                        method:cfg.method,
                        headers:cfg.headers,
                        body:cfg.body,
                        credentials:'same-origin',
                        cache:'no-store'
                    });
                    let data=null;
                    try{ data=await res.json(); }
                    catch{ data={result:0,error:1}; }

                    if(data && data.result===1){
                        state.totalSuccess++;
                        state.minInterval=Math.max(
                            cfg.minAllowedInterval,
                            state.minInterval*cfg.successDecreaseFactor
                        );
                    } else {
                        state.totalError++;
                        state.minInterval=Math.min(
                            cfg.maxAllowedInterval,
                            state.minInterval*cfg.errorIncreaseFactor
                        );
                    }

                }catch{
                    state.totalError++;
                    state.minInterval=Math.min(
                        cfg.maxAllowedInterval,
                        state.minInterval*cfg.errorIncreaseFactor
                    );
                }finally{
                    state.inflight--;
                }
            }

            async function managerLoop(){
                if(managerStarted) return;
                managerStarted=true;

                while(true){
                    const now=Date.now();
                    const ok=
                        state.inflight<cfg.maxParallel &&
                        (now-state.lastSentAt)>=jitter(state.minInterval);

                    if(state.running && ok) sendOneSpin();
                    await new Promise(r=>setTimeout(r,30));
                }
            }

            /* ======================================================
             *       CENTER PLAYER / RET LIST
             * ====================================================== */

            function normalizeName(s){
                return (s||"")
                    .normalize("NFKC")
                    .replace(/\s+/g," ")
                    .trim()
                    .toLowerCase();
            }

            function getCenterNames(){
                const sels=[
                    '.action-user-name','.duel__player-name','.action__user-name',
                    '.middle-player-name','.action-player-name',
                    '.action-buttons .player__name__link'
                ];
                const out=[];
                for(const sel of sels){
                    document.querySelectorAll(sel).forEach(el=>{
                        const t=el.textContent?.trim();
                        if(t) out.push(t);
                    });
                }
                return [...new Set(out)];
            }

            function buildRoomNameUidMap(){
                const map=new Map();
                document.querySelectorAll('.player__name__link').forEach(el=>{
                    const nm=normalizeName(el.textContent||el.dataset.name||'');
                    const uid=el.dataset.uid || el.closest('[data-uid]')?.dataset.uid;
                    if(nm && uid) map.set(nm,uid);
                });
                return map;
            }

            function getNearestUidsAroundButtons(){
                const btnArea=document.querySelector('.action-buttons');
                if(!btnArea || !isVisible(btnArea)) return [];

                const br=btnArea.getBoundingClientRect();
                const bx=br.left+br.width/2;
                const by=br.top+br.height/2;

                const cands=[];
                document.querySelectorAll('[data-uid]').forEach(el=>{
                    if(!isVisible(el)) return;
                    const r=el.getBoundingClientRect();
                    const cx=r.left+r.width/2;
                    const cy=r.top+r.height/2;
                    const dx=cx-bx;
                    const dy=cy-by;
                    const dist2=dx*dx+dy*dy;
                    const uid=el.getAttribute("data-uid")||el.closest('[data-uid]')?.dataset.uid;
                    if(uid) cands.push({uid,dist2});
                });
                cands.sort((a,b)=>a.dist2-b.dist2);

                const out=[];
                for(const c of cands){
                    if(!out.includes(c.uid)) out.push(c.uid);
                    if(out.length>=2) break;
                }
                return out;
            }

            function getCenterCandidateUids(){
                const out=new Set();
                const names=getCenterNames();
                if(names.length){
                    const map=buildRoomNameUidMap();
                    names.forEach(nm=>{
                        const uid=map.get(normalizeName(nm));
                        if(uid) out.add(uid);
                    });
                }
                if(!out.size){
                    getNearestUidsAroundButtons().forEach(uid=>out.add(uid));
                }
                return [...out];
            }

         function autoCenterChoice(){
    const yesBtn = document.querySelector('.js-kiss[data-type="2"]');
    const vipBtn = document.querySelector('.js-kiss[data-type="3"]');   // ✅ VIP fallback
    const noBtn  = document.querySelector('.js-kiss[data-type="1"]');

    // Hiçbir şey yok → çık
    if(!yesBtn && !vipBtn && !noBtn) return false;

    const cands = getCenterCandidateUids();

    // RET ALL aktif → direkt red
    if(forceRetAll){
        if(noBtn && !noBtn.disabled && isVisible(noBtn)) {
            humanLikeClick(noBtn);
            return true;
        }
        return true;
    }

    // Normal RET check
    if(cands.length){
        const mustReject = cands.some(uid => !!retList[uid]);
        if(mustReject){
            if(noBtn && !noBtn.disabled && isVisible(noBtn)) {
                humanLikeClick(noBtn);
                return true;
            }
            return true;
        }
    }

    // ✅ Önce normal “İstiyorum” çalışsın
    if(yesBtn && !yesBtn.disabled && isVisible(yesBtn)){
        humanLikeClick(yesBtn);
        state.clickCount1++;
        return true;
    }

    // ✅ Yoksa VIP X2 butonu fallback
    if(vipBtn && !vipBtn.disabled && isVisible(vipBtn)){
        humanLikeClick(vipBtn);
        state.clickCount1++;
        return true;
    }

    return false;
}

            /* ========================= AUTO KISS ========================= */
function autoClickTick(){
    if(autoCenterChoice()) return;

    let btn = document.querySelector('.js-kiss[data-type="2"]');
    let vip = document.querySelector('.js-kiss[data-type="3"]');   // ✅ VIP fallback

    if(btn && !btn.disabled && isVisible(btn)){
        humanLikeClick(btn);
        state.clickCount1++;
        return;
    }

    // ✅ VIP fallback
    if(vip && !vip.disabled && isVisible(vip)){
        humanLikeClick(vip);
        state.clickCount1++;
        return;
    }
}


            function startAutoClick1(){
                if(state.autoClicking1){
                    if(!state.clickTimer1)
                        state.clickTimer1=setInterval(autoClickTick,700+Math.random()*300);
                    return;
                }
                state.autoClicking1=true;
                state.clickCount1=0;
                if(state.clickTimer1) clearInterval(state.clickTimer1);
                state.clickTimer1=setInterval(autoClickTick,700+Math.random()*300);
                updatePanel();
            }

            function stopAutoClick1(){
                if(!state.autoClicking1) return;
                state.autoClicking1=false;
                if(state.clickTimer1){
                    clearInterval(state.clickTimer1);
                    state.clickTimer1=null;
                }
                updatePanel();
            }

            /* ========================= UNIVERSAL CLOSE ========================= */
            function universalClose(){
                const sels=[
                    '.notify__close','.popup__close','.modal__close','.close','.btn-close',
                    '[data-close]','[aria-label="close"]','[aria-label="kapat"]',
                    'button.close','button[title="Kapat"]','button[title="Close"]'
                ];
                document.querySelectorAll(sels.join(',')).forEach(btn=>{
                    try{btn.click();}catch{}
                });
            }

            function startUniversalClose(){
                if(state.universalCloseRunning){
                    if(!universalCloseInterval)
                        universalCloseInterval=setInterval(universalClose,Math.max(800,cfg.autoCheckInterval));
                    return;
                }
                state.universalCloseRunning=true;
                universalClose();
                if(universalCloseInterval) clearInterval(universalCloseInterval);
                universalCloseInterval=setInterval(universalClose,Math.max(800,cfg.autoCheckInterval));
                updatePanel();
            }

            function stopUniversalClose(){
                if(!state.universalCloseRunning) return;
                state.universalCloseRunning=false;
                if(universalCloseInterval){
                    clearInterval(universalCloseInterval);
                    universalCloseInterval=null;
                }
                updatePanel();
            }

            /* ========================= AUTOSPIN ========================= */
            function startAutoSpin(){
                if(state.running) return;
                state.running=true;
                managerLoop().catch(console.error);
                updatePanel();
            }

            function stopAutoSpin(){
                if(!state.running) return;
                state.running=false;
                updatePanel();
            }

            /* ========================= RET UI ========================= */
            const listRoot=utils.el("div",{
                css:{
                    marginTop:"12px",
                    maxHeight:"350px",
                    overflowY:"auto",
                    border:"1px solid #444",
                    borderRadius:"6px",
                    padding:"4px",
                    background:"#111a"
                }
            });
            panel.appendChild(listRoot);

            function getRoomPlayers(){
                return [...document.querySelectorAll(".player__name__link")]
                    .map(el=>{
                        const uid=el.dataset.uid||el.closest('[data-uid]')?.dataset.uid;
                        const name=el.dataset.name || el.textContent?.trim() || "?";
                        return uid ? {userId:uid,name} : null;
                    })
                    .filter(Boolean);
            }

            function refreshPlayersUI(){
                const players=getRoomPlayers();
                listRoot.innerHTML="";
                if(!players.length){
                    listRoot.append(
                        utils.el("div",{text:"Oda boş…",css:{opacity:0.5,textAlign:"center",padding:"10px"}})
                    );
                    return;
                }
                players.forEach(p=>{
                    const row=utils.el("div",{
                        css:{
                            display:"flex",justifyContent:"space-between",
                            alignItems:"center",marginBottom:"4px",gap:"6px",
                            padding:"4px 0"
                        }
                    });
                    row.append(utils.el("span",{text:p.name.substring(0,18),css:{flex:"1"}}));
                    const isRet=!!retList[p.userId];
                    const btn=utils.el("button",{
                        text:isRet?"RET:✅":"RET",
                        css:{
                            minWidth:"65px",fontSize:"11px",
                            background:isRet?"#ff4444":"#333",
                            color:"#fff",cursor:"pointer"
                        }
                    });
                    btn.onclick=()=>{
                        if(retList[p.userId]) delete retList[p.userId];
                        else retList[p.userId]=true;
                        saveNow();
                        refreshPlayersUI();
                    };
                    row.append(btn);
                    listRoot.append(row);
                });
            }

            /* ========================= MAIN UI ========================= */
            function addRow(label, status, fn){
                const r=utils.el('div',{
                    css:{marginBottom:'6px',display:'flex',justifyContent:'space-between',alignItems:'center'}
                });
                const lbl=utils.el('span',{
                    html:`<strong>${label}</strong>: ${status?'🟢 Aktif':'🔴 Pasif'}`
                });
                const btn=utils.el('button',{
                    text: status?'Durdur':'Başlat',
                    css:{cursor:'pointer',marginLeft:'6px'}
                });
                btn.addEventListener('click',fn);
                r.append(lbl,btn);
                panel.appendChild(r);
            }

            function clearRetList(){
                for(const k in retList) delete retList[k];
                saveNow();
                refreshPlayersUI();
                updatePanel();
            }

            function toggleForceRetAll(){
                forceRetAll=!forceRetAll;
                saveNow();
                updatePanel();
            }

            /* ========================= GUARD (Kalıcı) ========================= */
            function detectMyUID(){
                try{
                    for(const p of document.querySelectorAll('.player[data-uid]')){
                        const m=p.querySelector('.player__menu');
                        if(!m) continue;
                        const hasKick=m.querySelector('.js-player-kick');
                        const hasGift=m.querySelector('.js-player-send-gift');
                        const hasRob =m.querySelector('.js-player-send-robber');
                        if(!hasKick && !hasGift && !hasRob){
                            return p.dataset.uid;
                        }
                    }
                }catch{}
                return null;
            }

            let myUID=null;
            function getMe(){
                if(!myUID) myUID=detectMyUID();
                if(!myUID) return null;
                return document.querySelector(`.player[data-uid="${myUID}"]`);
            }

            function tryOpenMyMenu(){
                const me=getMe();
                if(!me) return;
                const r=me.getBoundingClientRect();
                me.dispatchEvent(new MouseEvent("mouseover",{bubbles:true,clientX:r.left+10,clientY:r.top+10}));
                setTimeout(()=>{ me.dispatchEvent(new MouseEvent("click",{bubbles:true})); },300);
            }

            function startGuard(){
                if(state.guardRunning) return;
                state.guardRunning=true;
                guardEnabled=true;
                saveNow();

                if(state.guardTimer) clearInterval(state.guardTimer);
                state.guardTimer=setInterval(tryOpenMyMenu,30_000);
                tryOpenMyMenu();
            }

            function stopGuard(){
                state.guardRunning=false;
                guardEnabled=false;
                saveNow();

                if(state.guardTimer){
                    clearInterval(state.guardTimer);
                    state.guardTimer=null;
                }
            }

            /* ========================= PANEL ========================= */
            function updatePanel(){
                panel.innerHTML="";

                addRow("AutoSpin",state.running,()=>{
                    if(state.running){ stopAutoSpin(); manualStopped.spin=true; }
                    else{ manualStopped.spin=false; startAutoSpin(); }
                    saveNow(); updatePanel();
                });

                addRow("AutoKiss (RET-aware)",state.autoClicking1,()=>{
                    if(state.autoClicking1){ stopAutoClick1(); manualStopped.kiss=true; }
                    else{ manualStopped.kiss=false; startAutoClick1(); }
                    saveNow(); updatePanel();
                });

                addRow("Sekmeleri Kapat",state.universalCloseRunning,()=>{
                    if(state.universalCloseRunning){ stopUniversalClose(); manualStopped.close=true; }
                    else{ manualStopped.close=false; startUniversalClose(); }
                    saveNow(); updatePanel();
                });

                /* === RET ALL === */
                let forceRow=utils.el("div",{
                    css:{marginBottom:"6px",display:"flex",justifyContent:"space-between",alignItems:"center"}
                });
                const fLbl=utils.el("span",{
                    html:`<strong>Herkesi RET</strong>: ${forceRetAll?'🟢 Açık':'🔴 Kapalı'}`
                });
                const fBtn=utils.el("button",{
                    text:forceRetAll?'Kapat':'Aç',
                    css:{cursor:'pointer',marginLeft:'6px'}
                });
                fBtn.onclick=toggleForceRetAll;
                forceRow.append(fLbl,fBtn);
                panel.appendChild(forceRow);

                /* === ✅ Aktiflik Koruma === */
                const row=utils.el("div",{
                    css:{marginBottom:"6px",display:"flex",justifyContent:"space-between",alignItems:"center"}
                });
                const lbl=utils.el("span",{
                    html:`<strong>Aktiflik Koruma</strong>: ${guardEnabled?'🟢':'🔴'}`
                });
                const btn=utils.el("button",{
                    text: guardEnabled?"Durdur":"Başlat",
                    css:{cursor:"pointer",marginLeft:"6px"}
                });
                btn.addEventListener("click",()=>{
                    if(guardEnabled) stopGuard();
                    else startGuard();
                    updatePanel();
                });
                row.append(lbl,btn);
                panel.appendChild(row);

                const stats=utils.el("div",{
                    css:{marginTop:"8px",whiteSpace:"pre-line"},
                    html:`🎰 Spin: ${state.totalSuccess}\n💋 Kiss: ${state.clickCount1}`
                });
                panel.appendChild(stats);
                panel.appendChild(listRoot);

                const clrBtn=utils.el("button",{
                    text:"RET listesini temizle",
                    css:{
                        marginTop:"10px",padding:"6px 10px",width:"100%",
                        background:"#552222",color:"#fff",
                        border:"1px solid #aa4444",cursor:"pointer",
                        borderRadius:"6px",fontSize:"13px"
                    }
                });
                clrBtn.onclick=clearRetList;
                panel.appendChild(clrBtn);
            }

            /* ========================= AUTO CHECK LOOP ========================= */
            setInterval(()=>{
                if(!manualStopped.spin && !state.running) startAutoSpin();
                if(!manualStopped.kiss && !state.autoClicking1) startAutoClick1();
                if(!manualStopped.close && !state.universalCloseRunning) startUniversalClose();
                if(state.autoClicking1 && !state.clickTimer1)
                    state.clickTimer1=setInterval(autoClickTick,700+Math.random()*300);

                refreshPlayersUI();
                updatePanel();

            },cfg.autoCheckInterval);

            /* ========================= INIT ========================= */
            managerLoop().catch(console.error);

            /* ✅ Guard restore */
            if(guardEnabled){
                startGuard();
            }

            updatePanel();
            refreshPlayersUI();
        }
    };
}


// ===== MODULE: MessageCleaner.js =====
    function createMessageCleanerModule() {
        return {
            name: 'messageCleaner',
            title: 'Mesaj Temizleme',
            defaultSettings: {},
            renderSettings(container) {
                const defaults = {
                    hideGifts: false,
                    hideWheel: false,
                    hideKissBoost: false,
                    hideGiftInline: false
                };
                let settings = JSON.parse(localStorage.getItem('msgCleanSettings') || JSON.stringify(defaults));

                function saveSettings() {
                    localStorage.setItem('msgCleanSettings', JSON.stringify(settings));
                }

                function hideGiftMessages() {
                    const messages = document.querySelectorAll('.chat__message');
                    messages.forEach(message => {
                        const text = message.querySelector('.message__text')?.textContent?.trim() || '';
                        if (settings.hideGiftInline && message.querySelector('.gift__inline')) {
                            message.style.display = 'none';
                            return;
                        }
                        if (settings.hideWheel && text.includes("Çarkıfelek'te inanılmaz bir hediye kazandı")) {
                            message.style.display = 'none';
                            return;
                        }
                        if (settings.hideKissBoost && text.includes('ile öpüşme şansını artırdı')) {
                            message.style.display = 'none';
                            return;
                        }
                        if (settings.hideGifts && message.querySelector('.gift__inline')) {
                            message.style.display = 'none';
                        }
                    });
                }

                container.innerHTML = `
                    <div style="padding:8px">
                        <label><input type="checkbox" id="hideGiftInline" ${settings.hideGiftInline ? 'checked' : ''}> 🎁 Hediye mesajlarını gizle</label><br>
                        <label><input type="checkbox" id="hideWheel" ${settings.hideWheel ? 'checked' : ''}> 🎰 Çarkıfelek mesajlarını gizle</label><br>
                        <label><input type="checkbox" id="hideKissBoost" ${settings.hideKissBoost ? 'checked' : ''}> 💋 Şans mesajlarını gizle</label><br>
                        <label><input type="checkbox" id="hideGifts" ${settings.hideGifts ? 'checked' : ''}> 🎀 Diğer hediye içeriklerini gizle</label>
                    </div>
                `;

                container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    cb.addEventListener('change', event => {
                        settings[event.target.id] = event.target.checked;
                        saveSettings();
                        hideGiftMessages();
                    });
                });

                hideGiftMessages();
                const observer = new MutationObserver(() => hideGiftMessages());
                const chatContainer = document.querySelector('.chat__messages') || document.body;
                observer.observe(chatContainer, { childList: true, subtree: true });
                console.log('🧹 Mesaj Temizleme modülü aktif.');
            }
        };
    }

// ===== MODULE: ModuleManager.js =====
// moduleManager.js
function createModuleManagerModule(utils) {
    const STORAGE_KEY = "moduleManager_enabledModules";

    // ----------------------
    // LOAD / SAVE
    // ----------------------
    function loadEnabled() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        } catch {
            return {};
        }
    }

    function saveEnabled(obj) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    }

    // dışarıdan gelecek modül listesi için
    let allDefs = [];

    return {
        name: "moduleManager",
        title: "⚙️ Modüller",
        defaultSettings: {},

        // bootstrap tarafından çağrılacak
        setModuleDefinitions(list) {
            allDefs = list || [];
        },

        // bootstrap için: enable-map'i verir
        loadEnabledMap() {
            return loadEnabled();
        },

        // ----------------------
        // PANEL UI
        // ----------------------
        renderSettings(container) {
            container.innerHTML = "";

            let enabledMap = loadEnabled();

            // varsayılan olarak tüm modüller açık say
            allDefs.forEach(def => {
                if (enabledMap[def.name] === undefined) {
                    enabledMap[def.name] = true;
                }
            });
            saveEnabled(enabledMap);

            if (!allDefs.length) {
                container.innerHTML = "<div>Modül listesi bulunamadı.</div>";
                return;
            }

            // Tüm modülleri (pasif olsa bile) listele
            allDefs.forEach(def => {
                const isEnabled = enabledMap[def.name] !== false;

                const row = utils.el("div", {
                    css: {
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "8px",
                        padding: "4px",
                        borderBottom: "1px dotted #666"
                    }
                });

                const lbl = utils.el("span", { text: def.title || def.name });

                const toggle = utils.el("input", {
                    attrs: { type: "checkbox" }
                });

                toggle.checked = isEnabled;

                // ON/OFF
                toggle.addEventListener("change", () => {
                    enabledMap[def.name] = toggle.checked;
                    saveEnabled(enabledMap);

                    // reload → yeni enable/disable uygulansın
                    location.reload();
                });

                row.appendChild(lbl);
                row.appendChild(toggle);
                container.appendChild(row);
            });

            // Küçük not
            container.appendChild(
                utils.el("div", {
                    css: { marginTop: "12px", opacity: 0.6, fontSize: "12px" },
                    text: "Değişiklikler yenileme sonrası aktif olur."
                })
            );
        }
    };
}


// ===== MODULE: VisualCleaner.js =====
function createVisualCleanerModule(utils) {
    return {
        name: 'visualCleanerUltimateFixedV9',
        title: 'Görsel Temizleme',
        defaultSettings: {},
        renderSettings(container) {

            const defaults = {
                hideHatsFrames: false,
                hideNames: false,
                hidePP: false,
                hideGifts: false,
                hideCups: false,
                hideAltInfo: false,
                hideAll: false
            };

            let settings = JSON.parse(localStorage.getItem('visualCleanerUltimateFixedV9Settings') || JSON.stringify(defaults));
            function saveSettings() {
                localStorage.setItem('visualCleanerUltimateFixedV9Settings', JSON.stringify(settings));
            }

            /* ---------------------------------------------------
               ✅ Hediyeleri CSS ile ANINDA yok eden layer
            ---------------------------------------------------*/
            function applyGiftCSS() {
                let style = document.getElementById("vcleaner-hide-gifts-css");
                if (settings.hideGifts) {
                    if (!style) {
                        style = document.createElement("style");
                        style.id = "vcleaner-hide-gifts-css";
                        style.textContent = `
                            .gift,
                            .gift--small,
                            .gift--small--317,
                            .gift-animation,
                            .gift-animation-container,
                            .gift__container,
                            .animation_gift,
                            [data-gift],
                            [data-type="gift"],
                            canvas[data-type="gift"],
                            div[class*="gift"],
                            img[class*="gift"],
                            [class*="gift"] {
                                display:none !important;
                                visibility:hidden !important;
                                opacity:0 !important;
                                width:0!important;
                                height:0!important;
                                pointer-events:none!important;
                            }
                        `;
                        document.head.appendChild(style);
                    }
                } else {
                    style?.remove();
                }
            }

            /* ---------------------------------------------------
               ✅ DOM kill
            ---------------------------------------------------*/
            function killGiftsHard(root = document) {
                if (!settings.hideGifts) return;
                const selectors = [
                    '.gift', '.gift--small', '.gift--small--317',
                    '.gift-animation', '.gift-animation-container',
                    '.gift__container', '.animation_gift',
                    '[data-gift]', '[data-type="gift"]',
                    'canvas[data-type="gift"]',
                    'div[class*="gift"]', 'img[class*="gift"]',
                    '[class*="gift"]'
                ];

                root.querySelectorAll(selectors.join(',')).forEach(el => {
                    try { el.remove(); }
                    catch { el.style.display = 'none'; }
                });
            }

            /* ---------------------------------------------------
               ✅ SHADOW ROOT SCAN
            ---------------------------------------------------*/
            function deepScan(node) {
                try { killGiftsHard(node); } catch {}

                if (node.shadowRoot) {
                    killGiftsHard(node.shadowRoot);
                }
                node.childNodes?.forEach(n => {
                    if (n.nodeType === 1) deepScan(n);
                });
            }

            /* ---------------------------------------------------
               ✅ FULL SWEEP
            ---------------------------------------------------*/
            function fullGiftSweep() {
                if (!settings.hideGifts) return;
                deepScan(document.body);
            }

            /* ---------------------------------------------------
               ✅ Normal eski görsel işleme (senin kodun)
            ---------------------------------------------------*/
            const originalDisplay = new WeakMap();
            function toggleElement(el, hide) {
                if (!originalDisplay.has(el)) originalDisplay.set(el, el.style.display || '');
                el.style.display = hide ? 'none' : originalDisplay.get(el);
            }

            function hideGifts(root = document.body) {
                if (!settings.hideGifts) return;
                killGiftsHard(root);
            }

            function hideAltInfo() {
                document.querySelectorAll('.player__counter.player__counter--gift, .player__counter.player__counter--kiss')
                    .forEach(el => toggleElement(el, settings.hideAltInfo));
            }

            function hideAllPlayers(hide) {
                document.querySelectorAll('.js-player, .player, .player-container')
                    .forEach(el => toggleElement(el, hide));
            }

            function scanVisuals(root = document.body) {
                const hatsFramesSelector = [
                    'canvas.hat-animation-frame',
                    'canvas.animation-frame',
                    'canvas[data-type="hat"]',
                    'canvas[data-type="frame"]',
                    'canvas[data-type="frame-glow"]',
                    '.player__collection[data-link="collection"]',
                    '.frame-glow',
                    '.frame-glow-wrap',
                    '.player__frame',
                    '.player__border'
                ].join(',');

                const namesSelector =
                    '.player__name__link, a.js-player-mention, [class*="span_"], .player__badge, .player__club, .player__badge-icon';

                const ppSelector =
                    '.player__photo, .player__avatar, img.player__photo, .player__pic';

                const cupsSelector = '.icon-small-cup';

                if (settings.hideAll) {
                    hideAllPlayers(true);
                    return;
                }
                hideAllPlayers(false);

                root.querySelectorAll(hatsFramesSelector)
                    .forEach(el => toggleElement(el, settings.hideHatsFrames));

                root.querySelectorAll(namesSelector)
                    .forEach(el => toggleElement(el, settings.hideNames));

                root.querySelectorAll(ppSelector)
                    .forEach(el => {
                        if (settings.hidePP) {
                            if (!el.dataset._originalVisibility) el.dataset._originalVisibility = el.style.visibility || '';
                            if (!el.dataset._originalOpacity) el.dataset._originalOpacity = el.style.opacity || '';
                            el.style.visibility = 'hidden';
                            el.style.opacity = '0';
                        } else {
                            el.style.visibility = el.dataset._originalVisibility || 'visible';
                            el.style.opacity = el.dataset._originalOpacity || '1';
                        }
                    });

                root.querySelectorAll(cupsSelector)
                    .forEach(el => toggleElement(el, settings.hideCups));

                hideAltInfo();
                hideGifts(root);
            }


            /* ---------------------------------------------------
                ✅ UI
            ---------------------------------------------------*/
            container.innerHTML = `
                <div style="padding:8px">
                    <label><input type="checkbox" id="hideHatsFrames" ${settings.hideHatsFrames ? 'checked' : ''}> 🎩🖼️ Koleksiyonları gizle</label><br>
                    <label><input type="checkbox" id="hideNames" ${settings.hideNames ? 'checked' : ''}> ✏️ Kullanıcı isimlerini gizle</label><br>
                    <label><input type="checkbox" id="hidePP" ${settings.hidePP ? 'checked' : ''}> 🖼️ Profil fotoğrafını gizle</label><br>
                    <label><input type="checkbox" id="hideGifts" ${settings.hideGifts ? 'checked' : ''}> 🎁 Hediyeleri gizle</label><br>
                    <label><input type="checkbox" id="hideCups" ${settings.hideCups ? 'checked' : ''}> 🏆 Kupalari gizle</label><br>
                    <label><input type="checkbox" id="hideAltInfo" ${settings.hideAltInfo ? 'checked' : ''}> ℹ️ Alt bilgiyi gizle</label><br>
                    <label><input type="checkbox" id="hideAll" ${settings.hideAll ? 'checked' : ''}> 🧨 Hepsini Kaldır</label>
                </div>
            `;

            container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.addEventListener('change', ev => {
                    settings[ev.target.id] = ev.target.checked;
                    saveSettings();

                    if (ev.target.id === "hideGifts") {
                        applyGiftCSS();
                        fullGiftSweep();
                    }

                    scanVisuals();
                });
            });

            /* Tarama + CSS ekleme */
            setInterval(fullGiftSweep, 800);
            scanVisuals();
            applyGiftCSS();
            fullGiftSweep();


            /* ---------------------------------------------------
                ✅ MutationObserver — fast fallback
            ---------------------------------------------------*/
            const giftObserver = new MutationObserver(mutations => {
                if (!settings.hideGifts) return;
                for (const mutation of mutations) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType !== 1) return;
                        deepScan(node);
                    });
                }
            });

            giftObserver.observe(document.body, { childList: true, subtree: true });
        }
    };
}


// ===== BOOTSTRAP =====
// bootstrap.js
function initializeToolkit() {
    console.log("[Toolkit] Initializing…");

    const registry = new ToolkitModuleRegistry(StorageUtils);
    const panel    = new ToolkitPanel(StorageUtils);

    // 1) ModuleManager önce oluşturulur
    const moduleManager = createModuleManagerModule(StorageUtils);
    registry.register(moduleManager);

    // 2) Enabled bilgisi çekilir
    const enabledMap = moduleManager.loadEnabledMap();

    // 3) Tüm modüller tek listede
    // AutoKick + AutoSave çıkarıldı → AutoCombo kullanıyoruz
    const allDefinitions = [
        createAutoSpinModule(StorageUtils),
        createAutoComboModule(StorageUtils),
        createVisualCleanerModule(StorageUtils),
        createMessageCleanerModule()
    ];

    // ✅ 4) DEFINITIONS aktar (liste gösterimi için şart!)
    moduleManager.setModuleDefinitions(allDefinitions);

    // 5) Enabled olanları register et
    const activeModules = [];
    allDefinitions.forEach(def => {
        const enabled = enabledMap[def.name] !== false;
        if (enabled) {
            activeModules.push(registry.register(def));
        }
    });

    // 6) Panel attach — moduleManager hep ilk
    panel.attachModule(moduleManager);
    activeModules.forEach(m => panel.attachModule(m));

    // İlk açılışta moduleManager’ı göster
    panel.showModule(moduleManager.name);

    // Global erişim
    window.__ToolkitPanel = panel;

    console.log("[Toolkit] READY ✅");
}


// --------------------------------------------------------
// ENTRY — DOMContentLoaded sonrası toolkit başlat
// --------------------------------------------------------
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeToolkit);
} else {
    initializeToolkit();
}


})();