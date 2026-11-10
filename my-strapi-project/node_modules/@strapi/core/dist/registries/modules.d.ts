import type { Core } from '@strapi/types';
import { RawModule, Module } from '../domain/module';
declare const modulesRegistry: (strapi: Core.Strapi) => {
    get(namespace: string): Module;
    getAll(prefix?: string): import("lodash").Dictionary<Module>;
    add(namespace: string, rawModule: RawModule): Module;
    bootstrap(): Promise<void>;
    register(): Promise<void>;
    destroy(): Promise<void>;
};
export default modulesRegistry;
//# sourceMappingURL=modules.d.ts.map