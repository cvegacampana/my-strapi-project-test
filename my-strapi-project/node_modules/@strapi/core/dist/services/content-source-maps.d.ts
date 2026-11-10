import type { Core, Struct } from '@strapi/types';
import type { FieldContentSourceMap } from '@strapi/admin/strapi-admin';
interface EncodingInfo {
    data: any;
    schema: Struct.Schema;
}
type BlocksEncodeMetadata = Omit<FieldContentSourceMap, 'path' | 'type'> & {
    fieldPath: string;
};
type EncodeFieldFn = (text: string, metadata: FieldContentSourceMap) => string;
/**
 * Pure transformation over a blocks AST. Injects one stega marker per visual block
 * (first text leaf, or image alt text) using the blocks field path for all markers.
 * Code blocks are skipped entirely.
 */
declare const encodeBlocks: (blocks: unknown, metadata: BlocksEncodeMetadata, encodeField: EncodeFieldFn) => unknown;
declare const createContentSourceMapsService: (strapi: Core.Strapi) => {
    encodeField(text: string, { kind, model, documentId, type, path, locale, fieldPath }: FieldContentSourceMap): string;
    encodeBlocks(blocks: unknown, metadata: BlocksEncodeMetadata): unknown;
    encodeEntry({ data, schema }: EncodingInfo): Promise<any>;
    encodeSourceMaps({ data, schema }: EncodingInfo): Promise<any>;
};
export { createContentSourceMapsService, encodeBlocks };
export type { BlocksEncodeMetadata, EncodeFieldFn };
//# sourceMappingURL=content-source-maps.d.ts.map