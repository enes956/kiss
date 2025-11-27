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