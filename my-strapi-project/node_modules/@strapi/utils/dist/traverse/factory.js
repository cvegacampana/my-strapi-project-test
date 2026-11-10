'use strict';

/* eslint-disable @typescript-eslint/no-loop-func */ const DEFAULT_PATH = {
    raw: null,
    attribute: null
};
var traverseFactory = (()=>{
    const state = {
        parsers: [],
        interceptors: [],
        ignore: [],
        handlers: {
            attributes: [],
            common: []
        }
    };
    const traverse = async (visitor, options, data)=>{
        const { path = DEFAULT_PATH, parent, schema, getModel } = options ?? {};
        // interceptors
        for (const { predicate, handler } of state.interceptors){
            if (predicate(data)) {
                return handler(visitor, options, data, {
                    recurse: traverse
                });
            }
        }
        // parsers
        const parser = state.parsers.find((parser)=>parser.predicate(data))?.parser;
        const utils = parser?.(data);
        // Return the data untouched if we don't know how to traverse it
        if (!utils) {
            return data;
        }
        // main loop
        let out = utils.transform(data);
        const keys = utils.keys(out);
        // Built once per traversal rather than once per key. `state.handlers` is populated
        // while the traversal is being defined and is fixed by the time it runs, so spreading
        // both lists on every key allocated a fresh array to hold the same handlers. This
        // loop runs for every key of every node of every query, which made it one of the
        // hottest allocation sites in a request.
        const handlers = [
            ...state.handlers.common,
            ...state.handlers.attributes
        ];
        // Also hoisted: none of these close over `key` (each method takes it as an argument),
        // so the previous code allocated three closures per key to no end. They still mutate
        // the same `out` binding, so behaviour is unchanged.
        const transformUtils = {
            remove (key) {
                out = utils.remove(key, out);
            },
            set (key, value) {
                out = utils.set(key, value, out);
            },
            recurse: traverse
        };
        // Pre-picked instead of calling lodash `pick` per key, which allocated both the
        // key-list array literal and a fresh result object every time.
        const visitorUtils = {
            remove: transformUtils.remove,
            set: transformUtils.set
        };
        const handlerUtils = {
            set: transformUtils.set,
            recurse: transformUtils.recurse
        };
        for (const key of keys){
            const attribute = schema?.attributes?.[key];
            // The attribute segment only grows when the key maps to an attribute; otherwise the
            // parent's value carries through unchanged.
            let attributePath = path.attribute;
            if (attribute != null) {
                attributePath = path.attribute == null ? key : `${path.attribute}.${key}`;
            }
            // A single literal rather than a spread followed by conditional assignment: the
            // spread produced an object whose hidden class then transitioned on each write.
            // `Path` is closed over `raw` and `attribute` and callers never supply their own,
            // so nothing can be dropped by building it directly.
            const newPath = {
                raw: path.raw == null ? key : `${path.raw}.${key}`,
                attribute: attributePath
            };
            // visitors
            const visitorOptions = {
                key,
                value: utils.get(key, out),
                attribute,
                schema,
                path: newPath,
                data: out,
                getModel,
                parent
            };
            // Awaited unconditionally. Most visitors are synchronous, and awaiting a
            // non-thenable still schedules a microtask, but skipping that await changes
            // the order of branches that recurse concurrently via Promise.all.
            //
            // That reordering used to drop nested populate in content-manager's
            // getQueryPopulate: a shallow `relation` write replaced the subtree a deeper
            // sibling had written at `relation.populate.component`. #27236 fixed that
            // visitor by merging paths. Re-measuring the skip afterward showed no
            // throughput gain, so the await stays.
            await visitor(visitorOptions, visitorUtils);
            const value = utils.get(key, out);
            const createContext = ()=>({
                    key,
                    value,
                    attribute,
                    schema,
                    path: newPath,
                    data: out,
                    visitor,
                    getModel,
                    parent
                });
            // ignore
            const ignoreCtx = createContext();
            const shouldIgnore = state.ignore.some((predicate)=>predicate(ignoreCtx));
            if (shouldIgnore) {
                continue;
            }
            // handlers
            //
            // `for await` over a plain array awaits every element, allocating a promise per
            // handler per key even though the elements are ordinary objects. A plain `for...of`
            // with explicit thenable checks is equivalent for non-promise elements, and the
            // predicates in practice are synchronous.
            for (const handler of handlers){
                const ctx = createContext();
                // A fresh context per handler is deliberate: a handler may call `set`, which
                // reassigns `out`, and the next handler must observe the updated `data`.
                const predicated = handler.predicate(ctx);
                const pass = predicated != null && typeof predicated.then === 'function' ? await predicated : predicated;
                if (pass) {
                    const handled = handler.handler(ctx, handlerUtils);
                    if (handled != null && typeof handled.then === 'function') {
                        await handled;
                    }
                }
            }
        }
        return out;
    };
    return {
        traverse,
        intercept (predicate, handler) {
            state.interceptors.push({
                predicate,
                handler
            });
            return this;
        },
        parse (predicate, parser) {
            state.parsers.push({
                predicate,
                parser
            });
            return this;
        },
        ignore (predicate) {
            state.ignore.push(predicate);
            return this;
        },
        on (predicate, handler) {
            state.handlers.common.push({
                predicate,
                handler
            });
            return this;
        },
        onAttribute (predicate, handler) {
            state.handlers.attributes.push({
                predicate,
                handler
            });
            return this;
        },
        onRelation (handler) {
            return this.onAttribute(({ attribute })=>attribute?.type === 'relation', handler);
        },
        onMedia (handler) {
            return this.onAttribute(({ attribute })=>attribute?.type === 'media', handler);
        },
        onComponent (handler) {
            return this.onAttribute(({ attribute })=>attribute?.type === 'component', handler);
        },
        onDynamicZone (handler) {
            return this.onAttribute(({ attribute })=>attribute?.type === 'dynamiczone', handler);
        }
    };
});

module.exports = traverseFactory;
//# sourceMappingURL=factory.js.map
