import type { Core, Schema, UID } from '@strapi/types';
export type DeferredRelationCopy = {
    schemaUid: UID.Schema;
    attributeName: string;
    kind: 'joinTable' | 'fkColumn' | 'morphToOne';
    /** Lodash path to the owning entity in entry data (e.g. `details` or `items.0`). `null` = root entry. */
    ownerPath: string | null;
};
export type PostCloneRelationUpdate = {
    dataPath: string;
    value: Record<string, unknown>;
    schemaUid: UID.Schema;
    ownerPath: string | null;
};
export type PrepareCloneDataResult = {
    data: Record<string, unknown>;
    deferredCopies: DeferredRelationCopy[];
    postCloneUpdates: PostCloneRelationUpdate[];
};
export declare const prepareCloneData: (originalData: Record<string, unknown>, submittedData: Record<string, unknown> | undefined, contentType: Schema.ContentType, getModel: (uid: string) => Schema.Schema) => Promise<PrepareCloneDataResult>;
export declare const copyCloneRelationRows: (strapi: Core.Strapi, uid: UID.Schema, attributeName: string, sourceEntryId: number, targetEntryId: number) => Promise<void>;
export declare const applyDeferredCloneRelationCopies: (strapi: Core.Strapi, rootUid: UID.ContentType, sourceRootId: number, targetRootId: number, originalData: Record<string, unknown>, clonedData: Record<string, unknown>, deferredCopies: DeferredRelationCopy[]) => Promise<void>;
export declare const applyPostCloneRelationUpdates: (strapi: Core.Strapi, rootUid: UID.ContentType, sourceRootId: number, clonedEntryId: number, clonedData: Record<string, unknown>, originalData: Record<string, unknown>, postCloneUpdates: PostCloneRelationUpdate[]) => Promise<void>;
//# sourceMappingURL=clone-relations.d.ts.map