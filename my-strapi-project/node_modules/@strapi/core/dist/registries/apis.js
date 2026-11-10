'use strict';

var _ = require('lodash');

const apisRegistry = (strapi)=>{
    const apis = {};
    return {
        get (name) {
            return apis[name];
        },
        getAll () {
            return apis;
        },
        add (apiName, apiConfig) {
            if (_.has(apis, apiName)) {
                throw new Error(`API ${apiName} has already been registered.`);
            }
            const api = strapi.get('modules').add(`api::${apiName}`, apiConfig);
            apis[apiName] = api;
            return apis[apiName];
        }
    };
};

module.exports = apisRegistry;
//# sourceMappingURL=apis.js.map
