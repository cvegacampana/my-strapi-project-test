'use strict';

/**
 * Checks whether an unknown value exposes the Zod 4 Core schema contract.
 */ const isZodType = (value)=>{
    if (typeof value !== 'object' || value === null || !('_zod' in value)) {
        return false;
    }
    const internals = value._zod;
    return typeof internals === 'object' && internals !== null && 'def' in internals && typeof internals.def === 'object' && internals.def !== null && 'type' in internals.def && typeof internals.def.type === 'string';
};
/**
 * Reads the supported structural fields from a Zod 4 Core schema definition.
 */ const inspectZodSchema = (schema)=>{
    const def = schema._zod.def;
    switch(def.type){
        case 'array':
            return {
                type: def.type,
                element: def.element
            };
        case 'optional':
            return {
                type: def.type,
                innerType: def.innerType
            };
        case 'default':
            return {
                type: def.type,
                innerType: def.innerType
            };
        case 'object':
            return {
                type: def.type,
                shape: def.shape
            };
        default:
            return {
                type: def.type
            };
    }
};

exports.inspectZodSchema = inspectZodSchema;
exports.isZodType = isZodType;
//# sourceMappingURL=zod.js.map
