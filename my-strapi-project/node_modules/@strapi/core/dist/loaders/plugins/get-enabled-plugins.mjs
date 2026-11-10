import { join, dirname, resolve } from 'path';
import { existsSync, statSync } from 'fs';
import { pickBy, defaultsDeep, get } from 'lodash';
import { strings } from '@strapi/utils';
import { getUserPluginsConfig } from './get-user-plugins-config.mjs';

/**
 * otherwise known as "core features"
 *
 * NOTE: These are excluded from the content manager plugin list, as they are always enabled.
 *       See admin.ts server controller on the content-manager plugin for more details.
 */ const INTERNAL_PLUGINS = [
    '@strapi/content-manager',
    '@strapi/content-type-builder',
    '@strapi/email',
    '@strapi/upload',
    '@strapi/i18n',
    '@strapi/content-releases',
    '@strapi/review-workflows'
];
const isStrapiPlugin = (info)=>get(info, 'strapi.kind') === 'plugin';
const validatePluginName = (pluginName)=>{
    if (!strings.isKebabCase(pluginName)) {
        throw new Error(`Plugin name "${pluginName}" is not in kebab (an-example-of-kebab-case)`);
    }
};
const toDetailedDeclaration = (declaration)=>{
    if (typeof declaration === 'boolean') {
        return {
            enabled: declaration
        };
    }
    const detailedDeclaration = {
        enabled: declaration.enabled
    };
    if (declaration?.resolve) {
        let pathToPlugin = '';
        if (declaration.isModule) {
            /**
       * we only want the node_module here, not the package.json
       */ pathToPlugin = join(declaration.resolve, '..');
        } else {
            try {
                pathToPlugin = dirname(require.resolve(declaration.resolve));
            } catch  {
                pathToPlugin = resolve(strapi.dirs.app.root, declaration.resolve);
                if (!existsSync(pathToPlugin) || !statSync(pathToPlugin).isDirectory()) {
                    throw new Error(`${declaration.resolve} couldn't be resolved`);
                }
            }
        }
        detailedDeclaration.pathToPlugin = pathToPlugin;
    }
    return detailedDeclaration;
};
const getEnabledPlugins = async (strapi1, { client } = {
    client: false
})=>{
    const internalPlugins = {};
    for (const dep of INTERNAL_PLUGINS){
        const packagePath = join(dep, 'package.json');
        // NOTE: internal plugins should be resolved from the strapi package
        const packageModulePath = require.resolve(packagePath, {
            paths: [
                require.resolve('@strapi/strapi/package.json'),
                process.cwd()
            ]
        });
        const packageInfo = require(packageModulePath);
        validatePluginName(packageInfo.strapi.name);
        internalPlugins[packageInfo.strapi.name] = {
            ...toDetailedDeclaration({
                enabled: true,
                resolve: packageModulePath,
                isModule: client
            }),
            info: packageInfo.strapi,
            packageInfo
        };
    }
    const installedPlugins = {};
    const dependencies = strapi1.config.get('info.dependencies', {});
    for (const dep of Object.keys(dependencies)){
        const packagePath = join(dep, 'package.json');
        let packageInfo;
        try {
            packageInfo = require(packagePath);
        } catch  {
            continue;
        }
        if (isStrapiPlugin(packageInfo)) {
            validatePluginName(packageInfo.strapi.name);
            installedPlugins[packageInfo.strapi.name] = {
                ...toDetailedDeclaration({
                    enabled: true,
                    resolve: packagePath,
                    isModule: client
                }),
                info: {
                    ...packageInfo.strapi,
                    packageName: packageInfo.name
                },
                packageInfo
            };
        }
    }
    const declaredPlugins = {};
    const userPluginsConfig = await getUserPluginsConfig();
    for (const [pluginName, declaration] of Object.entries(userPluginsConfig)){
        validatePluginName(pluginName);
        declaredPlugins[pluginName] = {
            ...toDetailedDeclaration(declaration),
            info: {}
        };
        const { pathToPlugin } = declaredPlugins[pluginName];
        // for manually resolved plugins
        if (pathToPlugin) {
            const packagePath = join(pathToPlugin, 'package.json');
            const packageInfo = require(packagePath);
            if (isStrapiPlugin(packageInfo)) {
                declaredPlugins[pluginName].info = packageInfo.strapi || {};
                declaredPlugins[pluginName].packageInfo = packageInfo;
            }
        }
    }
    const declaredPluginsResolves = new Set(Object.values(declaredPlugins).map((plugin)=>plugin.pathToPlugin));
    const installedPluginsNotAlreadyUsed = pickBy(installedPlugins, (p)=>!declaredPluginsResolves.has(p.pathToPlugin));
    const allPlugins = defaultsDeep({}, internalPlugins, declaredPlugins, installedPluginsNotAlreadyUsed);
    const enabledPlugins = pickBy(allPlugins, (plugin)=>plugin.enabled);
    return enabledPlugins;
};

export { getEnabledPlugins };
//# sourceMappingURL=get-enabled-plugins.mjs.map
