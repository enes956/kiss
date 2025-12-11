// bootstrap.js
function prepareToolkitBridge(slotInfo = {}) {
    window.__KISSToolkit__ = window.__KISSToolkit__ || { slots: {} };
    window.__KISSToolkit__.slots[slotInfo.slot] = { createdAt: Date.now(), info: slotInfo };
    return window.__KISSToolkit__;
}

function createToolkitRuntime(definitions = [], options = {}) {
    const tickInterval = Math.max(250, Number(options.tickInterval) || 1000);
    const registry = new ToolkitModuleRegistry(StorageUtils);
    const panel = new ToolkitPanel(StorageUtils);

    registry.setActiveDefinitions(definitions);

    const modules = definitions
        .map((definition) => {
            try {
                const instance = definition.factory?.(StorageUtils);
                if (!instance) return null;

                const moduleConfig = {
                    ...instance,
                    name: instance.name || definition.name,
                    title: instance.title || definition.title || definition.name,
                    defaultSettings: instance.defaultSettings || {},
                    renderSettings: instance.renderSettings,
                };

                const registered = registry.register(moduleConfig);
                panel.attachModule(registered);

                return {
                    definition,
                    instance,
                };
            } catch (error) {
                console.error("Modül başlatılamadı:", definition?.name, error);
                return null;
            }
        })
        .filter(Boolean);

    let tickTimer = null;

    const callLifecycle = (hook) => {
        modules.forEach((mod) => {
            try {
                if (typeof mod.instance?.[hook] === "function") {
                    mod.instance[hook]({ slot: options.slot, utils: StorageUtils });
                }
            } catch (error) {
                console.error(`Lifecycle ${hook} çalıştırılamadı:`, mod.definition?.name, error);
            }
        });
    };

    const runtime = {
        slot: options.slot,
        modules: modules.map((m) => m.definition?.name).filter(Boolean),
        start() {
            panel.showFirstModule();
            callLifecycle("onLoad");
            callLifecycle("onStart");

            const hasTickers = modules.some((mod) => typeof mod.instance?.onTick === "function");
            if (hasTickers) {
                tickTimer = setInterval(() => callLifecycle("onTick"), tickInterval);
            }
        },
        destroy() {
            if (tickTimer) clearInterval(tickTimer);
            callLifecycle("onDestroy");
            panel.destroy();
        },
    };

    return runtime;
}

function bootstrapToolkit(definitions = [], options = {}) {
    const bridge = prepareToolkitBridge(options);
    const runtime = createToolkitRuntime(definitions, options);
    runtime.start();

    if (bridge && options.slot !== undefined) {
        bridge.slots[options.slot] = {
            ...bridge.slots[options.slot],
            runtime,
        };
    }

    window.__ToolkitRuntime = runtime;
    return runtime;
}
