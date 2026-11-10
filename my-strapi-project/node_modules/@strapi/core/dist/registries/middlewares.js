'use strict';

var _ = require('lodash');
var namespace = require('./namespace.js');

// TODO: move instantiation part here instead of in the server service
const middlewaresRegistry = ()=>{
    const middlewares = {};
    return {
        /**
     * Returns this list of registered middlewares uids
     */ keys () {
            return Object.keys(middlewares);
        },
        /**
     * Returns the instance of a middleware. Instantiate the middleware if not already done
     */ get (uid) {
            return middlewares[uid];
        },
        /**
     * Returns a map with all the middlewares in a namespace
     */ getAll (namespace$1) {
            return _.pickBy(middlewares, (_, uid)=>namespace.hasNamespace(uid, namespace$1));
        },
        /**
     * Registers a middleware
     */ set (uid, middleware) {
            middlewares[uid] = middleware;
            return this;
        },
        /**
     * Registers a map of middlewares for a specific namespace
     */ add (namespace$1, rawMiddlewares = {}) {
            for (const middlewareName of Object.keys(rawMiddlewares)){
                const middleware = rawMiddlewares[middlewareName];
                const uid = namespace.addNamespace(middlewareName, namespace$1);
                if (_.has(middlewares, uid)) {
                    throw new Error(`Middleware ${uid} has already been registered.`);
                }
                middlewares[uid] = middleware;
            }
        },
        /**
     * Wraps a middleware to extend it
     */ extend (uid, extendFn) {
            const currentMiddleware = this.get(uid);
            if (!currentMiddleware) {
                throw new Error(`Middleware ${uid} doesn't exist`);
            }
            const newMiddleware = extendFn(currentMiddleware);
            middlewares[uid] = newMiddleware;
            return this;
        }
    };
};

module.exports = middlewaresRegistry;
//# sourceMappingURL=middlewares.js.map
