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
