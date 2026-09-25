export async function ensureSwInstalledAndRun(callback) {
    await navigator.serviceWorker.register('./sw.js', { type: 'module' });
    if (!navigator.serviceWorker.controller) {
        // First load: SW just installed but not yet controlling; reload so it intercepts.
        window.location.reload();
    } else {
        callback();
    }
}
