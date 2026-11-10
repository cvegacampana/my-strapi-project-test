import type { Struct } from '@strapi/types';
interface TransformOptions {
    contentType?: Struct.ContentTypeSchema | Struct.ComponentSchema;
    /**
     * @deprecated this option is deprecated and will be removed in the next major version
     */
    useJsonAPIFormat?: boolean;
    encodeSourceMaps?: boolean;
}
declare const transformResponse: (resource: any, meta?: unknown, opts?: TransformOptions) => Promise<any>;
export { transformResponse };
//# sourceMappingURL=transform.d.ts.map