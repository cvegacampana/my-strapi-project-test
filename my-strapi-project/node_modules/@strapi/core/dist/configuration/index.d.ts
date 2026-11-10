import type { StrapiOptions } from '../Strapi';
export declare const loadConfiguration: (opts: StrapiOptions) => {
    launchedAt: number;
    autoReload: boolean;
    environment: string | undefined;
    uuid: any;
    installId: any;
    packageJsonStrapi: Pick<any, string | number | symbol>;
    info: any;
    admin: {
        serveAdminPanel: boolean;
    };
} & {
    server: {
        host: string;
        port: number;
        proxy: false;
        cron: {
            enabled: false;
        };
        dirs: {
            public: string;
        };
        transfer: {
            remote: {
                enabled: true;
            };
        };
        logger: {
            updates: {
                enabled: true;
            };
            startup: {
                enabled: true;
            };
        };
        openapi: {
            'content-api': {
                access: "disabled";
                route: {
                    path: string;
                };
                cache: {
                    enabled: true;
                    maxAgeMs: number;
                    filePath: string;
                };
            };
            admin: {
                access: "disabled";
                route: {
                    path: string;
                };
                cache: {
                    enabled: true;
                    maxAgeMs: number;
                    filePath: string;
                };
            };
        };
    };
    admin: {};
    api: {
        rest: {
            prefix: string;
        };
    };
} & Pick<Record<string, unknown>, string> & Record<string, unknown>;
//# sourceMappingURL=index.d.ts.map