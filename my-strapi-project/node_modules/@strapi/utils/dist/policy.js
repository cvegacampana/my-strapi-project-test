'use strict';

const createPolicy = (options)=>{
    const { name = 'unnamed', validator, handler } = options;
    const wrappedValidator = (config)=>{
        if (validator) {
            try {
                validator(config);
            } catch  {
                throw new Error(`Invalid config passed to "${name}" policy.`);
            }
        }
    };
    return {
        name,
        validator: wrappedValidator,
        handler
    };
};
const createPolicyContext = (type, ctx)=>{
    return Object.assign({
        is: (otherType)=>type === otherType,
        get type () {
            return type;
        }
    }, ctx);
};

exports.createPolicy = createPolicy;
exports.createPolicyContext = createPolicyContext;
//# sourceMappingURL=policy.js.map
