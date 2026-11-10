import type { UID, Modules } from '@strapi/types';
declare const createEntriesService: (uid: UID.ContentType, entityValidator: Modules.EntityValidator.EntityValidator) => {
    create: (params?: any) => Promise<any>;
    delete: (id: number, query?: any) => Promise<any>;
    update: (entryToUpdate: any, params?: any) => Promise<any>;
    publish: (entry: any, params?: any) => Promise<Pick<any, string | number | symbol>>;
    discardDraft: (entry: any, params?: any) => Promise<Pick<any, string | number | symbol>>;
};
export { createEntriesService };
//# sourceMappingURL=entries.d.ts.map