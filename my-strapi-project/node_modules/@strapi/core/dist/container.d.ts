import type { Core } from '@strapi/types';
export declare class Container implements Core.Container {
    private registerMap;
    private serviceMap;
    add(name: string, resolver: unknown): this;
    has(name: string): boolean;
    get(name: string, args?: unknown): any;
}
//# sourceMappingURL=container.d.ts.map