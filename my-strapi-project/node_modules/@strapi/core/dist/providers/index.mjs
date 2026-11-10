import admin from './admin.mjs';
import ai from './ai.mjs';
import contentStructure from './content-structure.mjs';
import coreStore from './coreStore.mjs';
import cron from './cron.mjs';
import mcp from './mcp.mjs';
import registries from './registries.mjs';
import sessionManager from './session-manager.mjs';
import telemetry from './telemetry.mjs';
import webhooks from './webhooks.mjs';

const providers = [
    registries,
    admin,
    ai,
    contentStructure,
    coreStore,
    sessionManager,
    webhooks,
    telemetry,
    cron,
    mcp
];

export { providers };
//# sourceMappingURL=index.mjs.map
