import { curry, omit } from 'lodash';
import { parsePublicationFilter, parseHasPublishedVersionQueryParam, hasPublishedVersionBooleanToPublicationFilterMode } from '@strapi/utils';
import { getPublicationFilterCondition } from '../publication-filter.mjs';
import { pickAllowedQueryParams } from '../params.mjs';

const transformParamsToQuery = curry((uid, params)=>{
    const rawParams = params ?? {};
    const allowlisted = pickAllowedQueryParams(rawParams);
    const query = strapi.get('query-params').transform(uid, allowlisted);
    const explicitPublicationFilter = parsePublicationFilter(allowlisted.publicationFilter);
    const legacyHasPublishedVersion = parseHasPublishedVersionQueryParam(rawParams.hasPublishedVersion);
    let effectivePublicationFilter = explicitPublicationFilter;
    if (effectivePublicationFilter === undefined && legacyHasPublishedVersion !== undefined) {
        effectivePublicationFilter = hasPublishedVersionBooleanToPublicationFilterMode(legacyHasPublishedVersion);
    }
    const status = allowlisted.status === 'published' ? 'published' : 'draft';
    const baseWhere = {
        ...params?.lookup,
        ...query.where
    };
    // `transformQueryParams` leaves `publicationFilter` / `hasPublishedVersion` on the query object
    // via `...rest`; the DB layer must not receive them as extra top-level keys.
    const queryWithoutPublicationParams = omit(query, [
        'publicationFilter',
        'hasPublishedVersion'
    ]);
    // Publication filtering must go through `query.filters`, not only `where`, so the same
    // cohort logic applies to nested populate queries (each sub-query uses `meta.uid`).
    // Merging into `where` alone breaks populate cascade — see has-published-version API tests.
    if (effectivePublicationFilter !== undefined) {
        const existingFilters = query.filters;
        const wrappedFilters = ({ meta, ...rest })=>{
            let existingResult = {};
            if (typeof existingFilters === 'function') {
                existingResult = existingFilters({
                    meta,
                    ...rest
                }) || {};
            } else if (existingFilters) {
                existingResult = existingFilters;
            }
            const publicationCondition = getPublicationFilterCondition(meta.uid, effectivePublicationFilter, status);
            if (publicationCondition && Object.keys(publicationCondition).length > 0) {
                const conditions = [
                    existingResult,
                    publicationCondition
                ].filter((c)=>Object.keys(c).length);
                return {
                    $and: conditions
                };
            }
            return existingResult;
        };
        const transformedQuery = {
            ...queryWithoutPublicationParams,
            filters: wrappedFilters,
            where: baseWhere
        };
        return transformedQuery;
    }
    const transformedQuery = {
        ...queryWithoutPublicationParams,
        where: baseWhere
    };
    return transformedQuery;
});

export { transformParamsToQuery };
//# sourceMappingURL=query.mjs.map
