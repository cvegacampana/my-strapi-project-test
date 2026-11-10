'use strict';

var provider = require('./provider.js');
var index = require('../services/content-structure/index.js');

var contentStructure = provider.defineProvider({
    init (strapi) {
        strapi.add('content-structure', ()=>index.createContentStructureService(strapi));
    },
    async bootstrap (strapi) {
        const contentStructure = strapi.get('content-structure');
        // Executes tolerant validation during bootstrap, logs validation warnings
        const cleaned = await contentStructure.getCleanedFile();
        if (cleaned) {
            const count = await contentStructure.countGroups();
            strapi.log.info(`[content-structure] Loaded groups.json with ${count} folder group(s)`);
        }
    }
});

module.exports = contentStructure;
//# sourceMappingURL=content-structure.js.map
