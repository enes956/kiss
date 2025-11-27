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
