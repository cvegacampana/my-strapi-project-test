'use strict';

var _ = require('lodash');

const pluginsRegistry = (strapi)=>{
    const plugins = {};
    return {
        get (name) {
            return plugins[name];
        },
        getAll () {
            return plugins;
        },
        add (name, pluginConfig) {
            if (_.has(plugins, name)) {
                throw new Error(`Plugin ${name} has already been registered.`);
            }
            const pluginModule = strapi.get('modules').add(`plugin::${name}`, pluginConfig);
            plugins[name] = pluginModule;
            return plugins[name];
        }
    };
};

module.exports = pluginsRegistry;
//# sourceMappingURL=plugins.js.map
