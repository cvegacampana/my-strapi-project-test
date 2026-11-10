'use strict';

/**
 * Translates the MCP SDK's request context into Strapi's public handler context.
 */ const createMcpCapabilityHandlerContext = (context)=>{
    const { _meta, envelope } = context.mcpReq;
    const request = context.http?.req;
    const headers = {};
    request?.headers.forEach((value, key)=>{
        headers[key] = value;
    });
    return {
        signal: context.mcpReq.signal,
        requestId: context.mcpReq.id,
        sessionId: context.sessionId,
        authInfo: context.http?.authInfo,
        _meta: _meta === undefined && envelope === undefined ? undefined : {
            ..._meta,
            ...envelope
        },
        requestInfo: request === undefined ? undefined : {
            headers,
            url: new URL(request.url)
        }
    };
};

exports.createMcpCapabilityHandlerContext = createMcpCapabilityHandlerContext;
//# sourceMappingURL=createMcpCapabilityHandlerContext.js.map
