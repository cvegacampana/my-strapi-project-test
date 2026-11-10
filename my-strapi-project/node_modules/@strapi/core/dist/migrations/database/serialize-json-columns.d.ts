/**
 * Re-serializes JSON/blocks columns in a row before INSERT.
 *
 * mysql2 and node-pg parse JSON/JSONB columns on SELECT into JS objects; knex
 * does not re-serialize those objects on INSERT. Stringify object/array values
 * for json and blocks attributes. Values that are already strings (typical of
 * SQLite) are left unchanged.
 */
export declare const serializeJsonColumns: (row: Record<string, any>, meta: {
    attributes?: Record<string, any>;
} | null | undefined) => Record<string, any>;
//# sourceMappingURL=serialize-json-columns.d.ts.map