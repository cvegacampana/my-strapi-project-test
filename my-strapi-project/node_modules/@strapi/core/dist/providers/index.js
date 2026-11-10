'use strict';

var admin = require('./admin.js');
var ai = require('./ai.js');
var contentStructure = require('./content-structure.js');
var coreStore = require('./coreStore.js');
var cron = require('./cron.js');
var mcp = require('./mcp.js');
var registries = require('./registries.js');
var sessionManager = require('./session-manager.js');
var telemetry = require('./telemetry.js');
var webhooks = require('./webhooks.js');

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

exports.providers = providers;
//# sourceMappingURL=index.js.map
