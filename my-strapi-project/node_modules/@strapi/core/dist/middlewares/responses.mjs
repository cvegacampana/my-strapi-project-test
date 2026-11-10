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

export { responses };
//# sourceMappingURL=responses.mjs.map
