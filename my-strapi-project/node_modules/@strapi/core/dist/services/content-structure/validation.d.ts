import { z } from 'zod';
export declare const contentStructureFileSchema: z.ZodObject<{
    version: z.ZodLiteral<1>;
    sections: z.ZodObject<{
        collectionTypes: z.ZodObject<{
            groups: z.ZodArray<z.ZodObject<{
                children: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                    uid: z.ZodString;
                    type: z.ZodLiteral<"contentType">;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"group">;
                    id: z.ZodString;
                }, z.core.$strip>], "type">>;
                parent: z.ZodNullable<z.ZodString>;
                name: z.ZodString;
                id: z.ZodString;
            }, z.core.$strip>>;
        }, z.core.$strip>;
        singleTypes: z.ZodObject<{
            groups: z.ZodArray<z.ZodObject<{
                children: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                    uid: z.ZodString;
                    type: z.ZodLiteral<"contentType">;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"group">;
                    id: z.ZodString;
                }, z.core.$strip>], "type">>;
                parent: z.ZodNullable<z.ZodString>;
                name: z.ZodString;
                id: z.ZodString;
            }, z.core.$strip>>;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=validation.d.ts.map