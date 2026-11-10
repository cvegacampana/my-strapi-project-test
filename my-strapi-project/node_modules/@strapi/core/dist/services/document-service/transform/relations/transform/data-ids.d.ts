import type { UID } from '@strapi/types';
import { IdMap } from '../../id-map';
interface Options {
    uid: UID.Schema;
    locale?: string | null;
    status?: 'draft' | 'published';
    allowMissingId?: boolean;
}
/**
 * Iterate over all relations and media of a data object and transform document ids to entity ids.
 */
declare const transformDataIdsVisitor: (idMap: IdMap, data: Record<string, any>, source: Options) => Promise<import("@strapi/utils/dist/types").Data>;
export { transformDataIdsVisitor };
//# sourceMappingURL=data-ids.d.ts.map