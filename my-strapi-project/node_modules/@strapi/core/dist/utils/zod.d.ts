import * as z4 from 'zod/v4/core';
type ZodSchemaInspection = {
    type: 'array';
    element: z4.$ZodType;
} | {
    type: 'optional' | 'default';
    innerType: z4.$ZodType;
} | {
    type: 'object';
    shape: z4.$ZodShape;
} | {
    type: Exclude<z4.$ZodTypeDef['type'], 'array' | 'optional' | 'default' | 'object'>;
};
/**
 * Checks whether an unknown value exposes the Zod 4 Core schema contract.
 */
export declare const isZodType: (value: unknown) => value is z4.$ZodType;
/**
 * Reads the supported structural fields from a Zod 4 Core schema definition.
 */
export declare const inspectZodSchema: <T extends z4.$ZodType>(schema: T) => ZodSchemaInspection;
export {};
//# sourceMappingURL=zod.d.ts.map