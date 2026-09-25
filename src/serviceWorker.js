import init, { transform } from 'https://esm.sh/@swc/wasm-web';

// Initialize SWC WASM once; all intercept calls await this promise.
const swcReady = init();

export function run() {
    self.addEventListener('fetch', handleFetch);
}

function handleFetch(event) {
    const url = new URL(event.request.url);
    if (url.pathname.endsWith('.ts') || url.pathname.endsWith('.tsx')) {
        event.respondWith(interceptTs(event.request, url));
    }
}

async function interceptTs(request, url) {
    await swcReady;

    const original = await fetch(request).then(r => r.text());
    const filename = url.pathname.split('/').pop();
    const isTsx = filename.endsWith('.tsx');

    const { code } = await transform(original, {
        jsc: {
            parser: { syntax: 'typescript', tsx: isTsx },
            transform: { react: { runtime: 'automatic', importSource: 'react' } },
            target: 'es2020'
        },
        module: { type: 'es6' }
    });

    const modifiedContent = `// ...\n` + code;

    const modified =
        `console.groupCollapsed("Serving file ${filename}");\n` +
        `console.log(${JSON.stringify(modifiedContent)});\n` +
        `console.groupEnd();\n` +
        modifiedContent;

    return new Response(modified, {
        headers: { 'Content-Type': 'application/javascript' }
    });
}
