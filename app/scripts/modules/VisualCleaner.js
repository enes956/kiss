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
