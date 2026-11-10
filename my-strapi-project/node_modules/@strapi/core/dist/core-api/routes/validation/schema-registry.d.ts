import * as z from 'zod/v4';
/**
 * Creates a per-application store of named Zod schemas for content-API validation.
 *
 * An owned Zod registry is kept in sync with the ID map so schema identity is
 * preserved during construction. The map is the source of truth for lookup and
 * iteration; OpenAPI conversion must copy `entries()` into a conversion-local
 * registry rather than reading the live Zod registry.
 */
export declare const createContentAPISchemaRegistry: () => {
    set: (id: string, schema: z.ZodType) => void;
    get: (id: string) => z.ZodType | undefined;
    getOrDefer: (id: string) => z.ZodType | undefined;
    has: (id: string) => boolean;
    startPending: (id: string) => void;
    finishPending: (id: string) => void;
    entries: () => Iterable<[string, z.ZodType]>;
    remove: (id: string) => boolean;
    clear: () => void;
};
//# sourceMappingURL=schema-registry.d.ts.map