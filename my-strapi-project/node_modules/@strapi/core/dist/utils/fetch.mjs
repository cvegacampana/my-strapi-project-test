import ProxyAgent from 'undici/lib/dispatcher/proxy-agent.js';
import Dispatcher1Wrapper from 'undici/lib/dispatcher/dispatcher1-wrapper.js';
import Dispatcher from 'undici/lib/dispatcher/dispatcher.js';
import connect from 'undici/lib/api/api-connect.js';

var /* eslint-enable import/extensions */ // undici's main entry adds connect() to every dispatcher. ProxyAgent needs it to open the CONNECT
// tunnel used for https targets, so add it here since the main entry is skipped.
_Dispatcher_prototype;
(_Dispatcher_prototype = Dispatcher.prototype).connect ?? (_Dispatcher_prototype.connect = connect);
const isStream = (body)=>body instanceof ReadableStream || typeof body === 'object' && body !== null && Symbol.asyncIterator in body;
// Node's built-in fetch adds its own Content-Length, and undici 8 dispatchers reject the duplicated
// header (https://github.com/nodejs/undici/issues/5500), so drop the caller's one when proxying.
// A stream body has no length of its own and keeps the header, otherwise it would be sent chunked.
// TODO: remove once https://github.com/nodejs/undici/pull/5502 is released and installed
const withoutContentLength = (input, init)=>{
    if (isStream(init?.body)) {
        return init;
    }
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    if (!headers.has('content-length')) {
        return init;
    }
    headers.delete('content-length');
    return {
        ...init,
        headers
    };
};
// Create a wrapper for Node's Fetch API that applies a global proxy
const createStrapiFetch = (strapi, options)=>{
    const { logs = true } = options ?? {};
    const strapiFetch = (url, options)=>{
        const { dispatcher } = strapiFetch;
        // Cast: the global RequestInit types its dispatcher with Node's bundled undici types, which
        // differ from the installed undici version; Dispatcher1Wrapper makes them compatible at runtime
        const fetchOptions = dispatcher ? {
            dispatcher,
            ...withoutContentLength(url, options)
        } : options;
        if (logs) {
            strapi.log.debug(`Making request for ${url}`);
        }
        return fetch(url, fetchOptions);
    };
    const proxy = strapi.config.get('server.proxy.fetch') || strapi.config.get('server.proxy.global');
    if (proxy) {
        if (logs) {
            strapi.log.info(`Using proxy for Fetch requests: ${proxy}`);
        }
        // Node's built-in fetch runs its own bundled undici, which may still use the legacy (v1)
        // dispatcher handler API that undici 8 removed. Dispatcher1Wrapper bridges both APIs.
        strapiFetch.dispatcher = new Dispatcher1Wrapper(new ProxyAgent(proxy));
    }
    return strapiFetch;
};

export { createStrapiFetch };
//# sourceMappingURL=fetch.mjs.map
