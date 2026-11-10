export interface PluginDeclaration {
    enabled: boolean;
    resolve: string;
    isModule: boolean;
}
/**
 * Return user defined plugins' config
 * first load config from `config/plugins.js`
 * and then merge config from `config/env/{env}/plugins.js`
 */
export declare const getUserPluginsConfig: () => Promise<Record<string, boolean | PluginDeclaration>>;
//# sourceMappingURL=get-user-plugins-config.d.ts.map