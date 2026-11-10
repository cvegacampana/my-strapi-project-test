import { engine } from '@strapi/permissions';

var createPermissionEngine = (({ providers })=>engine.new({
        providers
    }));

export { createPermissionEngine as default };
//# sourceMappingURL=engine.mjs.map
