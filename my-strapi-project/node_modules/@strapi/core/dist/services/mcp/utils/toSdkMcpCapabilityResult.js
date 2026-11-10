'use strict';

const toSdkResultMetadata = (metadata)=>metadata;
const toSdkResourceContents = (contents)=>{
    if ('text' in contents) {
        const { uri, mimeType, text, _meta } = contents;
        return {
            uri,
            mimeType,
            text,
            _meta
        };
    }
    const { uri, mimeType, blob, _meta } = contents;
    return {
        uri,
        mimeType,
        blob,
        _meta
    };
};
/**
 * Maps one Strapi-owned content block onto the protocol shape the SDK transports.
 *
 * Every variant Strapi accepts is translated explicitly, so removing or renaming a
 * variant upstream fails this boundary at compile time instead of reaching authors.
 */ const toSdkContentBlock = (content)=>{
    switch(content.type){
        case 'text':
            {
                const { type, text, annotations, _meta } = content;
                return {
                    type,
                    text,
                    annotations,
                    _meta
                };
            }
        case 'image':
            {
                const { type, data, mimeType, annotations, _meta } = content;
                return {
                    type,
                    data,
                    mimeType,
                    annotations,
                    _meta
                };
            }
        case 'audio':
            {
                const { type, data, mimeType, annotations, _meta } = content;
                return {
                    type,
                    data,
                    mimeType,
                    annotations,
                    _meta
                };
            }
        case 'resource_link':
            {
                const { type, name, uri, title, description, mimeType, size, icons, annotations, _meta } = content;
                return {
                    type,
                    name,
                    uri,
                    title,
                    description,
                    mimeType,
                    size,
                    icons,
                    annotations,
                    _meta
                };
            }
        case 'resource':
            {
                const { type, resource, annotations, _meta } = content;
                return {
                    type,
                    resource: toSdkResourceContents(resource),
                    annotations,
                    _meta
                };
            }
        default:
            {
                const unsupported = content;
                throw new Error(`[MCP] Unsupported content block: ${JSON.stringify(unsupported)}`);
            }
    }
};
/** Maps a Strapi-owned tool result onto the protocol shape the SDK transports. */ const toSdkToolResult = (result)=>({
        content: result.content.map(toSdkContentBlock),
        structuredContent: result.structuredContent,
        isError: result.isError
    });
/** Maps a Strapi-owned prompt result onto the protocol shape the SDK transports. */ const toSdkPromptResult = (result)=>{
    const { description, messages, _meta, ...extensionFields } = result;
    return {
        ...extensionFields,
        description,
        messages: messages.map((message)=>({
                role: message.role,
                content: toSdkContentBlock(message.content)
            })),
        _meta: toSdkResultMetadata(_meta)
    };
};
/** Maps a Strapi-owned resource read result onto the protocol shape the SDK transports. */ const toSdkResourceReadResult = (result)=>{
    const { contents, _meta, ...extensionFields } = result;
    return {
        ...extensionFields,
        contents: contents.map(toSdkResourceContents),
        _meta: toSdkResultMetadata(_meta)
    };
};
/** Maps Strapi-owned resource listing metadata onto the shape the SDK advertises. */ const toSdkResourceListingMetadata = (metadata)=>{
    const { title, description, mimeType, size, icons, annotations, _meta } = metadata;
    return {
        title,
        description,
        mimeType,
        size,
        icons,
        annotations,
        _meta
    };
};

exports.toSdkContentBlock = toSdkContentBlock;
exports.toSdkPromptResult = toSdkPromptResult;
exports.toSdkResourceListingMetadata = toSdkResourceListingMetadata;
exports.toSdkResourceReadResult = toSdkResourceReadResult;
exports.toSdkToolResult = toSdkToolResult;
//# sourceMappingURL=toSdkMcpCapabilityResult.js.map
