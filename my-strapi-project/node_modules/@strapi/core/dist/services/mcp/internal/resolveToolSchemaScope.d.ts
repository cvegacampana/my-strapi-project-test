/**
 * Tools whose input/output schemas a request needs.
 *
 * - `'all'`: every tool may be advertised (e.g. `tools/list`).
 * - a set: only these tools may be invoked (`tools/call`); every other tool can skip schema
 *   resolution because the request never lists nor calls it.
 */
export type McpToolSchemaScope = 'all' | ReadonlySet<string>;
/**
 * Derives the tool schema scope from a JSON-RPC POST body (a single message or a batch).
 *
 * The server is stateless and rebuilt for every POST, so the body is the full set of work the
 * server will do. Unknown shapes fall back to `'all'` so the SDK keeps producing its own errors.
 */
export declare const resolveToolSchemaScope: (body: unknown) => McpToolSchemaScope;
//# sourceMappingURL=resolveToolSchemaScope.d.ts.map