import * as z from 'zod/v4';
/**
 * Re-export of the Zod v4 schema builder from the same version Strapi uses
 * internally. Intended for packages that already depend on `@strapi/utils`.
 *
 * For `contentAPI.addQueryParams` / `addInputParams`, pass a factory instead
 * of importing this `z` (or `zod` / `zod/v4`). Strapi supplies its own Zod:
 *
 * @example
 * strapi.contentAPI.addQueryParams({
 *   search: {
 *     schema: (z) => z.string().max(200).optional(),
 *     matchRoute: (route) => route.path.includes('articles'),
 *   },
 * });
 */
export { z };
export declare const validateZodSchema: <T extends z.Schema>(schema: T) => (data: unknown, errorMessage?: string) => z.infer<T>;
type FormErrors = Record<string, string>;
/**
 * Converts a ZodError into form-compatible errors matching
 * getYupValidationErrors from @strapi/admin Form component.
 *
 * Returns a flat object with dot-path keys and string error messages.
 * Only the first error per path is kept (matches Yup behavior).
 * Root-level errors (path = []) are stored under the empty string key ''.
 */
export declare const getZodValidationErrors: (error: z.ZodError) => FormErrors;
//# sourceMappingURL=zod.d.ts.map