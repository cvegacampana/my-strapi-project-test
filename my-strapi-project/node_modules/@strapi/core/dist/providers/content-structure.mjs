import { defineProvider } from './provider.mjs';
import { createContentStructureService } from '../services/content-structure/index.mjs';

var contentStructure = defineProvider({
    init (strapi) {
        strapi.add('content-structure', ()=>createContentStructureService(strapi));
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

export { contentStructure as default };
//# sourceMappingURL=content-structure.mjs.map
