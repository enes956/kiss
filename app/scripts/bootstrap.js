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
