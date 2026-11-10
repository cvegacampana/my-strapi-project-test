import type { Core } from '@strapi/types';
export declare const isLifecycleNonEmpty: (fn: unknown) => boolean;
export declare const detectCustomizations: (strapi: Core.Strapi) => {
    apis: {
        uid: string;
        customController: boolean;
        customService: boolean;
        customRoutes: boolean;
    }[];
    controllers: {
        uid: string;
        custom: boolean;
    }[];
    extendedPlugins: string[];
    counts: {
        customControllers: number;
        customServices: number;
        customRoutes: number;
    };
    srcIndex: {
        present: boolean;
        registerDefined: boolean;
        registerNonEmpty: boolean;
        bootstrapDefined: boolean;
        bootstrapNonEmpty: boolean;
        destroyDefined: boolean;
        destroyNonEmpty: boolean;
        beyondTemplate: boolean;
    };
};
//# sourceMappingURL=detect-customizations.d.ts.map