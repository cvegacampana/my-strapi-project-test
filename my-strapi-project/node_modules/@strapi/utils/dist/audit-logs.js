'use strict';

/**
 * The part of the Strapi instance an audit emit needs. Declared structurally rather
 * than as `Core.Strapi`, so this package does not have to depend on `@strapi/types`,
 * which depends on this one.
 */ /**
 * Emits an audit event and waits for it to be processed.
 * A failed audit write, or a failing listener, is logged here and doesn't affect the
 * operation that emitted the event.
 */ const emitAudit = async ({ strapi }, event, payload)=>{
    try {
        await strapi.eventHub.emit(event, payload);
    } catch (error) {
        strapi.log.error(`An event listener failed while handling ${event}`, {
            error
        });
    }
};

exports.emitAudit = emitAudit;
//# sourceMappingURL=audit-logs.js.map
