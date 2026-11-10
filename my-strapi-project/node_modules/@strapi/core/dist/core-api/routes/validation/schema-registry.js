'use strict';

var z = require('zod/v4');

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n.default = e;
  return Object.freeze(n);
}

var z__namespace = /*#__PURE__*/_interopNamespace(z);

/**
 * Creates a per-application store of named Zod schemas for content-API validation.
 *
 * An owned Zod registry is kept in sync with the ID map so schema identity is
 * preserved during construction. The map is the source of truth for lookup and
 * iteration; OpenAPI conversion must copy `entries()` into a conversion-local
 * registry rather than reading the live Zod registry.
 */ const createContentAPISchemaRegistry = ()=>{
    const store = {
        registry: z__namespace.registry(),
        schemas: new Map(),
        pending: new Set()
    };
    const get = (id)=>store.schemas.get(id);
    const getRequired = (id)=>{
        const schema = get(id);
        if (schema === undefined) {
            throw new Error(`Content-API schema "${id}" was not registered`);
        }
        return schema;
    };
    const isPending = (id)=>store.pending.has(id);
    const set = (id, schema)=>{
        const existingSchema = store.schemas.get(id);
        if (existingSchema !== undefined) {
            store.registry.remove(existingSchema);
            store.schemas.delete(id);
        }
        store.registry.add(schema, {
            id
        });
        store.schemas.set(id, schema);
    };
    const has = (id)=>store.schemas.has(id);
    const getOrDefer = (id)=>{
        if (isPending(id) === true) {
            return z__namespace.lazy(()=>getRequired(id));
        }
        return get(id);
    };
    const startPending = (id)=>{
        store.pending.add(id);
    };
    const finishPending = (id)=>{
        store.pending.delete(id);
    };
    const entries = ()=>store.schemas.entries();
    const remove = (id)=>{
        const schema = store.schemas.get(id);
        if (schema === undefined) {
            return false;
        }
        store.registry.remove(schema);
        return store.schemas.delete(id);
    };
    const clear = ()=>{
        store.registry.clear();
        store.schemas.clear();
        store.pending.clear();
    };
    return {
        set,
        get,
        getOrDefer,
        has,
        startPending,
        finishPending,
        entries,
        remove,
        clear
    };
};

exports.createContentAPISchemaRegistry = createContentAPISchemaRegistry;
//# sourceMappingURL=schema-registry.js.map
