import { sanitize, validate, sanitizeRoutesMapForSerialization, RESERVED_INPUT_PARAM_KEYS, ALLOWED_QUERY_PARAM_KEYS } from '@strapi/utils';
import * as z from 'zod/v4';
import { isZodType, inspectZodSchema } from '../../utils/zod.mjs';
import instantiatePermissionsUtilities from './permissions/index.mjs';

const transformRoutePrefixFor = (pluginName)=>(route)=>{
        const prefix = route.config && route.config.prefix;
        const path = prefix !== undefined ? `${prefix}${route.path}` : `/${pluginName}${route.path}`;
        return {
            ...route,
            path
        };
    };
const filterContentAPI = (route)=>route.info.type === 'content-api';
/**
 * Runtime check for addQueryParams: we only allow scalar or array-of-scalar schemas (no nested objects).
 * We keep this in addition to the ZodQueryParamSchema type because: (1) TypeScript can be bypassed (JS,
 * any, or schema from another Zod instance); (2) it gives a clear, immediate error at registration
 * time instead of a later failure in validate/sanitize.
 */ const ALLOWED_QUERY_SCHEMA_TYPES = new Set([
    'string',
    'number',
    'boolean',
    'enum'
]);
const formatZodSchemaName = (type)=>{
    if (type.length === 0) {
        return '';
    }
    return `Zod${type.split('_').map((part)=>`${part.charAt(0).toUpperCase()}${part.slice(1)}`).join('')}`;
};
function assertQueryParamSchema(schema, param) {
    if (!isZodType(schema)) {
        const name = typeof schema === 'object' && schema !== null ? schema.constructor?.name ?? 'Object' : typeof schema;
        throw new Error(`contentAPI.addQueryParams: param "${param}" schema must be a scalar (string, number, boolean, enum) or array of scalars; got ${name}. Use addInputParams for nested objects.`);
    }
    const inspection = inspectZodSchema(schema);
    if (inspection.type === 'optional' || inspection.type === 'default') {
        assertQueryParamSchema(inspection.innerType, param);
        return;
    }
    if (inspection.type === 'array') {
        assertQueryParamSchema(inspection.element, param);
        return;
    }
    if (!ALLOWED_QUERY_SCHEMA_TYPES.has(inspection.type)) {
        throw new Error(`contentAPI.addQueryParams: param "${param}" schema must be a scalar (string, number, boolean, enum) or array of scalars; got ${formatZodSchemaName(inspection.type)}. Use addInputParams for nested objects.`);
    }
}
function resolveSchema(schemaOrFactory) {
    if (typeof schemaOrFactory === 'function') {
        return schemaOrFactory(z);
    }
    return schemaOrFactory;
}
const mergeOneQueryParamIntoRoute = (route, param, schema, matchRoute)=>{
    if (matchRoute && !matchRoute(route)) return;
    const query = {
        ...route.request?.query
    };
    if (param in query) {
        throw new Error(`contentAPI.addQueryParams: param "${param}" already exists on route ${route.method} ${route.path}`);
    }
    route.request = {
        ...route.request,
        query: {
            ...query,
            [param]: schema
        }
    };
};
const mergeOneInputParamIntoRoute = (route, param, schema, matchRoute)=>{
    if (matchRoute && !matchRoute(route)) return;
    const jsonKey = 'application/json';
    const body = route.request?.body ? {
        ...route.request.body
    } : {};
    const existing = body[jsonKey];
    const base = existing && typeof existing === 'object' && 'shape' in existing ? existing.shape : {};
    if (param in base) {
        throw new Error(`contentAPI.addInputParams: param "${param}" already exists on route ${route.method} ${route.path}`);
    }
    body[jsonKey] = z.object({
        ...base,
        [param]: schema
    });
    route.request = {
        ...route.request,
        body
    };
};
/**
 * Create a content API container that holds logic, tools and utils. (eg: permissions, ...)
 */ const createContentAPI = (strapi)=>{
    const extraQueryParams = [];
    const extraInputParams = [];
    const addQueryParam = (options)=>{
        const { param, schema: schemaOrFactory, matchRoute } = options;
        const schema = resolveSchema(schemaOrFactory);
        assertQueryParamSchema(schema, param);
        if (ALLOWED_QUERY_PARAM_KEYS.includes(param)) {
            throw new Error(`contentAPI.addQueryParams: param "${param}" is reserved by Strapi; use a different name`);
        }
        if (extraQueryParams.some((o)=>o.param === param)) {
            throw new Error(`contentAPI.addQueryParams: param "${param}" has already been added`);
        }
        extraQueryParams.push({
            param,
            schema,
            matchRoute
        });
    // Params are merged into routes when initRouting() runs (applyExtraParamsToRoutes).
    // We do not merge here: at register() time routes may not exist yet (lazy creation), and
    // merging here would cause double-merge when initRouting runs and 400 "invalid param" or
    // "param already exists" errors.
    };
    const addInputParam = (options)=>{
        const { param, schema: schemaOrFactory, matchRoute } = options;
        const schema = resolveSchema(schemaOrFactory);
        if (RESERVED_INPUT_PARAM_KEYS.includes(param)) {
            throw new Error(`contentAPI.addInputParams: param "${param}" is reserved by Strapi; use a different name`);
        }
        if (extraInputParams.some((o)=>o.param === param)) {
            throw new Error(`contentAPI.addInputParams: param "${param}" has already been added`);
        }
        extraInputParams.push({
            param,
            schema,
            matchRoute
        });
    // Params are merged into routes when initRouting() runs (applyExtraParamsToRoutes).
    };
    /**
   * Register extra query params. Keys = param names; values = { schema, matchRoute? }.
   * Schemas must be Zod scalar or array-of-scalars (enforced at runtime via assertQueryParamSchema).
   */ const addQueryParams = (options)=>{
        Object.entries(options).forEach(([param, rest])=>addQueryParam({
                param,
                ...rest
            }));
    };
    /**
   * Register extra input params (root-level body.data). Keys = param names; values = { schema, matchRoute? }.
   * Any Zod type allowed; enforced at registration time.
   */ const addInputParams = (options)=>{
        Object.entries(options).forEach(([param, rest])=>addInputParam({
                param,
                ...rest
            }));
    };
    /** Merge all registered extra params into the given routes (mutates in place). Called at route registration. Throws if a param key already exists. */ const applyExtraParamsToRoutes = (routes)=>{
        routes.forEach((route)=>{
            for (const { param, schema, matchRoute } of extraQueryParams){
                mergeOneQueryParamIntoRoute(route, param, schema, matchRoute);
            }
            for (const { param, schema, matchRoute } of extraInputParams){
                mergeOneInputParamIntoRoute(route, param, schema, matchRoute);
            }
        });
    };
    const getRoutesMap = async ()=>{
        const routesMap = {};
        for (const [apiName, api] of Object.entries(strapi.apis)){
            const routes = Object.values(api.routes).flatMap((route)=>'routes' in route ? route.routes : route).filter(filterContentAPI);
            if (routes.length === 0) {
                continue;
            }
            const apiPrefix = strapi.config.get('api.rest.prefix');
            routesMap[`api::${apiName}`] = routes.map((route)=>({
                    ...route,
                    path: `${apiPrefix}${route.path}`
                }));
        }
        for (const [pluginName, plugin] of Object.entries(strapi.plugins)){
            const transformPrefix = transformRoutePrefixFor(pluginName);
            const pluginRoutes = Array.isArray(plugin.routes) ? plugin.routes : Object.values(plugin.routes).flatMap((route)=>route.routes);
            const routes = pluginRoutes.map(transformPrefix).filter(filterContentAPI);
            if (routes.length === 0) {
                continue;
            }
            const apiPrefix = strapi.config.get('api.rest.prefix');
            routesMap[`plugin::${pluginName}`] = routes.map((route)=>({
                    ...route,
                    path: `${apiPrefix}${route.path}`
                }));
        }
        return sanitizeRoutesMapForSerialization(routesMap);
    };
    const sanitizer = sanitize.createAPISanitizers({
        getModel (uid) {
            return strapi.getModel(uid);
        },
        get sanitizers () {
            return {
                input: strapi.sanitizers.get('content-api.input'),
                output: strapi.sanitizers.get('content-api.output')
            };
        }
    });
    const validator = validate.createAPIValidators({
        getModel (uid) {
            return strapi.getModel(uid);
        },
        get validators () {
            return {
                input: strapi.validators.get('content-api.input')
            };
        }
    });
    return {
        permissions: instantiatePermissionsUtilities(strapi),
        getRoutesMap,
        sanitize: sanitizer,
        validate: validator,
        addQueryParams,
        addInputParams,
        applyExtraParamsToRoutes
    };
};

export { createContentAPI as default };
//# sourceMappingURL=index.mjs.map
