const bus = new EventTarget();

function on(event, handler, options) {
    if (typeof handler !== "function") return () => {};
    const listener = (evt) => handler(evt.detail, evt);
    bus.addEventListener(event, listener, options);
    return () => bus.removeEventListener(event, listener, options);
}

function once(event, handler) {
    return on(event, handler, { once: true });
}

function emit(event, detail) {
    bus.dispatchEvent(new CustomEvent(event, { detail }));
}

function off(event, handler) {
    bus.removeEventListener(event, handler);
}

const eventBus = { on, once, emit, off };

export { eventBus };
export default eventBus;
