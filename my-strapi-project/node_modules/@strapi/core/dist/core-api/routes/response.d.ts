import * as z from 'zod/v4';
/**
 * `{ data, meta: { pagination } }` envelope returned by collection `find`.
 */
export declare const collectionResponseSchema: <T extends z.ZodArray>(data: T) => z.ZodObject<{
    data: T;
    meta: z.ZodObject<{
        pagination: z.ZodUnion<readonly [z.ZodObject<{
            page: z.ZodNumber;
            pageSize: z.ZodNumber;
            pageCount: z.ZodOptional<z.ZodNumber>;
            total: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>, z.ZodObject<{
            start: z.ZodNumber;
            limit: z.ZodNumber;
            total: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>]>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * `{ data, meta: {} }` envelope. findOne, create, update, and single-type
 * find/update return this. Delete routes reuse it for their documented JSON body.
 */
export declare const documentResponseSchema: <T extends z.ZodType>(data: T) => z.ZodObject<{
    data: T;
    meta: z.ZodObject<{}, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=response.d.ts.map