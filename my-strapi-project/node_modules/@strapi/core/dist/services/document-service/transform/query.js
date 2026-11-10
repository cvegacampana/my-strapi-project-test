'use strict';

var _ = require('lodash');
var strapiUtils = require('@strapi/utils');
var publicationFilter = require('../publication-filter.js');
var params = require('../params.js');

const transformParamsToQuery = _.curry((uid, params$1)=>{
    const rawParams = params$1 ?? {};
    const allowlisted = params.pickAllowedQueryParams(rawParams);
    const query = strapi.get('query-params').transform(uid, allowlisted);
    const explicitPublicationFilter = strapiUtils.parsePublicationFilter(allowlisted.publicationFilter);
    const legacyHasPublishedVersion = strapiUtils.parseHasPublishedVersionQueryParam(rawParams.hasPublishedVersion);
    let effectivePublicationFilter = explicitPublicationFilter;
    if (effectivePublicationFilter === undefined && legacyHasPublishedVersion !== undefined) {
        effectivePublicationFilter = strapiUtils.hasPublishedVersionBooleanToPublicationFilterMode(legacyHasPublishedVersion);
    }
    const status = allowlisted.status === 'published' ? 'published' : 'draft';
    const baseWhere = {
        ...params$1?.lookup,
        ...query.where
    };
    // `transformQueryParams` leaves `publicationFilter` / `hasPublishedVersion` on the query object
    // via `...rest`; the DB layer must not receive them as extra top-level keys.
    const queryWithoutPublicationParams = _.omit(query, [
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
            const publicationCondition = publicationFilter.getPublicationFilterCondition(meta.uid, effectivePublicationFilter, status);
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

exports.transformParamsToQuery = transformParamsToQuery;
//# sourceMappingURL=query.js.map
