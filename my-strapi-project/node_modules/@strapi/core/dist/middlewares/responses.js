'use strict';

const responses = (config = {})=>{
    return async (ctx, next)=>{
        await next();
        const { status } = ctx;
        const handler = config?.handlers?.[status];
        if (typeof handler === 'function') {
            await handler(ctx, next);
        }
    };
};

exports.responses = responses;
//# sourceMappingURL=responses.js.map
