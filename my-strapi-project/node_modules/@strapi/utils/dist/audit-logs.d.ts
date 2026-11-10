/**
 * The part of the Strapi instance an audit emit needs. Declared structurally rather
 * than as `Core.Strapi`, so this package does not have to depend on `@strapi/types`,
 * which depends on this one.
 */
export interface AuditEmitter {
    eventHub: {
        emit(event: string, ...args: unknown[]): Promise<void>;
    };
    log: {
        error(message: string, meta?: unknown): void;
    };
}
/**
 * Emits an audit event and waits for it to be processed.
 * A failed audit write, or a failing listener, is logged here and doesn't affect the
 * operation that emitted the event.
 */
export declare const emitAudit: ({ strapi }: {
    strapi: AuditEmitter;
}, event: string, payload: unknown) => Promise<void>;
//# sourceMappingURL=audit-logs.d.ts.map