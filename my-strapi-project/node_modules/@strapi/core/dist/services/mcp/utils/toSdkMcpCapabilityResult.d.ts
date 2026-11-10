import type { CallToolResult, ContentBlock, GetPromptResult, ReadResourceResult, ResourceMetadata } from '@modelcontextprotocol/server';
import type { Modules } from '@strapi/types';
/**
 * Maps one Strapi-owned content block onto the protocol shape the SDK transports.
 *
 * Every variant Strapi accepts is translated explicitly, so removing or renaming a
 * variant upstream fails this boundary at compile time instead of reaching authors.
 */
export declare const toSdkContentBlock: (content: Modules.MCP.McpContentBlock) => ContentBlock;
/** Maps a Strapi-owned tool result onto the protocol shape the SDK transports. */
export declare const toSdkToolResult: (result: Modules.MCP.McpToolResult) => CallToolResult;
/** Maps a Strapi-owned prompt result onto the protocol shape the SDK transports. */
export declare const toSdkPromptResult: (result: Modules.MCP.McpPromptResult) => GetPromptResult;
/** Maps a Strapi-owned resource read result onto the protocol shape the SDK transports. */
export declare const toSdkResourceReadResult: (result: Modules.MCP.McpResourceReadResult) => ReadResourceResult;
/** Maps Strapi-owned resource listing metadata onto the shape the SDK advertises. */
export declare const toSdkResourceListingMetadata: (metadata: Modules.MCP.McpResourceListingMetadata) => ResourceMetadata;
//# sourceMappingURL=toSdkMcpCapabilityResult.d.ts.map