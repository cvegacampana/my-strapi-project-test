'use strict';

var _ = require('lodash');
var contentTypes = require('./content-types.js');
var errors = require('./errors.js');
var operators = require('./operators.js');
var parseType = require('./parse-type.js');
var sortQuery = require('./sort-query.js');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var ___default = /*#__PURE__*/_interopDefault(_);

const { ID_ATTRIBUTE, DOC_ID_ATTRIBUTE, PUBLISHED_AT_ATTRIBUTE } = contentTypes.constants;
const isPlainObject = (value)=>___default.default.isPlainObject(value);
const hasOwnProperty = (object, key)=>Object.prototype.hasOwnProperty.call(object, key);
const setSortMapValue = (field, order)=>{
    const path = ___default.default.toPath(field);
    const sortMap = {};
    let current = sortMap;
    for (const [index, key] of path.entries()){
        const isLastSegment = index === path.length - 1;
        if (key === 'prototype' || key in current && !hasOwnProperty(current, key)) {
            throw new errors.ValidationError('Invalid sort query');
        }
        if (isLastSegment) {
            Object.defineProperty(current, key, {
                configurable: true,
                enumerable: true,
                value: order,
                writable: true
            });
            continue;
        }
        const nextValue = /^\d+$/.test(path[index + 1]) ? [] : {};
        Object.defineProperty(current, key, {
            configurable: true,
            enumerable: true,
            value: nextValue,
            writable: true
        });
        current = nextValue;
    }
    return sortMap;
};
function isEmptySortMap(sortMap) {
    const keys = Object.keys(sortMap);
    if (keys.length === 0) {
        return true;
    }
    return keys.every((key)=>{
        const value = sortMap[key];
        if (typeof value === 'string') {
            return value.trim().length === 0;
        }
        if (isPlainObject(value)) {
            return isEmptySortMap(value);
        }
        return true;
    });
}
/** Drops empty sort maps so a trailing comma does not leave a truthy but meaningless `orderBy`. */ function normalizeOrderBy(orderBy) {
    if (Array.isArray(orderBy)) {
        const filtered = orderBy.filter((sortMap)=>!isEmptySortMap(sortMap));
        return filtered.length > 0 ? filtered : undefined;
    }
    return isEmptySortMap(orderBy) ? undefined : orderBy;
}
class InvalidOrderError extends errors.ValidationError {
    constructor(){
        super('Invalid order. order can only be one of asc|desc|ASC|DESC');
    }
}
class InvalidSortError extends errors.ValidationError {
    constructor(){
        super('Invalid sort parameter. Expected a string, an array of strings, a sort object or an array of sort objects');
    }
}
class InvalidPopulateError extends errors.ValidationError {
    constructor(){
        super('Invalid populate parameter. Expected a string, an array of strings, a populate object');
    }
}
function validateOrder(order) {
    if (!_.isString(order) || ![
        'asc',
        'desc'
    ].includes(order.toLocaleLowerCase())) {
        throw new InvalidOrderError();
    }
}
const convertCountQueryParams = (countQuery)=>{
    return parseType.default({
        type: 'boolean',
        value: countQuery
    });
};
const convertOrderingQueryParams = (ordering)=>{
    return ordering;
};
const isStringArray = (value)=>Array.isArray(value) && value.every(_.isString);
const createTransformer = ({ getModel })=>{
    /**
   * Sort query parser
   */ const convertSortQueryParams = (sortQuery)=>{
        if (typeof sortQuery === 'string') {
            return convertStringSortQueryParam(sortQuery);
        }
        if (isStringArray(sortQuery)) {
            return sortQuery.flatMap((sortValue)=>convertStringSortQueryParam(sortValue));
        }
        if (Array.isArray(sortQuery)) {
            return sortQuery.map((sortValue)=>convertNestedSortQueryParam(sortValue));
        }
        if (isPlainObject(sortQuery)) {
            return convertNestedSortQueryParam(sortQuery);
        }
        throw new InvalidSortError();
    };
    const convertStringSortQueryParam = (sortQuery$1)=>{
        return sortQuery.getMeaningfulSortSegments(sortQuery$1).map((segment)=>convertSingleSortQueryParam(segment));
    };
    const convertSingleSortQueryParam = (sortQuery)=>{
        const trimmed = sortQuery.trim();
        if (!trimmed) {
            return {};
        }
        if (!_.isString(trimmed)) {
            throw new errors.ValidationError('Invalid sort query');
        }
        // split field and order param with default order to ascending
        const [rawField, order = 'asc'] = trimmed.split(':');
        const field = rawField.trim();
        if (field.length === 0) {
            throw new errors.ValidationError('Field cannot be empty');
        }
        validateOrder(order.trim());
        // TODO: field should be a valid path on an object model
        return setSortMapValue(field, order.trim());
    };
    const convertNestedSortQueryParam = (sortQuery)=>{
        const transformedSort = {};
        for (const field of Object.keys(sortQuery)){
            const order = sortQuery[field];
            // this is a deep sort
            if (isPlainObject(order)) {
                const nested = convertNestedSortQueryParam(order);
                if (!isEmptySortMap(nested)) {
                    transformedSort[field] = nested;
                }
            } else if (typeof order === 'string') {
                const trimmedOrder = order.trim();
                if (trimmedOrder.length > 0) {
                    validateOrder(trimmedOrder);
                    transformedSort[field] = trimmedOrder;
                }
            } else {
                throw new errors.ValidationError(`Invalid sort type expected object or string got ${typeof order}`);
            }
        }
        return transformedSort;
    };
    const applySortToQuery = (query, sortParam)=>{
        if (!sortQuery.hasSort(sortParam)) {
            return;
        }
        const orderBy = normalizeOrderBy(convertSortQueryParams(sortParam));
        if (orderBy !== undefined) {
            query.orderBy = orderBy;
        }
    };
    /**
   * Start query parser
   */ const convertStartQueryParams = (startQuery)=>{
        const startAsANumber = _.toNumber(startQuery);
        if (!___default.default.isInteger(startAsANumber) || startAsANumber < 0) {
            throw new errors.ValidationError(`convertStartQueryParams expected a positive integer got ${startAsANumber}`);
        }
        return startAsANumber;
    };
    /**
   * Limit query parser
   */ const convertLimitQueryParams = (limitQuery)=>{
        const limitAsANumber = _.toNumber(limitQuery);
        if (!___default.default.isInteger(limitAsANumber) || limitAsANumber !== -1 && limitAsANumber < 0) {
            throw new errors.ValidationError(`convertLimitQueryParams expected a positive integer got ${limitAsANumber}`);
        }
        if (limitAsANumber === -1) {
            return undefined;
        }
        return limitAsANumber;
    };
    const convertPageQueryParams = (page)=>{
        const pageVal = _.toNumber(page);
        if (!Number.isInteger(pageVal) || pageVal <= 0) {
            throw new errors.PaginationError(`Invalid 'page' parameter. Expected an integer > 0, received: ${page}`);
        }
        return pageVal;
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const convertPageSizeQueryParams = (pageSize, _page)=>{
        const pageSizeVal = _.toNumber(pageSize);
        if (!Number.isInteger(pageSizeVal) || pageSizeVal <= 0) {
            throw new errors.PaginationError(`Invalid 'pageSize' parameter. Expected an integer > 0, received: ${pageSize}`);
        }
        return pageSizeVal;
    };
    const validatePaginationParams = (page, pageSize, start, limit)=>{
        const isPagePagination = page != null || pageSize != null;
        const isOffsetPagination = start != null || limit != null;
        if (isPagePagination && isOffsetPagination) {
            throw new errors.PaginationError('Invalid pagination attributes. The page parameters are incorrect and must be in the pagination object');
        }
    };
    // NOTE: we could support foo.* or foo.bar.* etc later on
    const convertPopulateQueryParams = (populate, schema, depth = 0)=>{
        if (depth === 0 && populate === '*') {
            return true;
        }
        if (typeof populate === 'string') {
            return populate.split(',').map((value)=>___default.default.trim(value));
        }
        if (Array.isArray(populate)) {
            // map convert
            return ___default.default.uniq(populate.flatMap((value)=>{
                if (typeof value !== 'string') {
                    throw new InvalidPopulateError();
                }
                return value.split(',').map((value)=>___default.default.trim(value));
            }));
        }
        if (___default.default.isPlainObject(populate)) {
            return convertPopulateObject(populate, schema);
        }
        throw new InvalidPopulateError();
    };
    const hasPopulateFragmentDefined = (populate)=>{
        return typeof populate === 'object' && 'on' in populate && populate.on != null;
    };
    const hasCountDefined = (populate)=>{
        return typeof populate === 'object' && 'count' in populate && typeof populate.count === 'boolean';
    };
    const convertPopulateObject = (populate, schema)=>{
        if (!schema) {
            return {};
        }
        const { attributes } = schema;
        return Object.entries(populate).reduce((acc, [key, subPopulate])=>{
            // Try converting strings to regular booleans if possible
            if (___default.default.isString(subPopulate)) {
                try {
                    const subPopulateAsBoolean = parseType.default({
                        type: 'boolean',
                        value: subPopulate
                    });
                    // Only true is accepted as a boolean populate value
                    return subPopulateAsBoolean ? {
                        ...acc,
                        [key]: true
                    } : acc;
                } catch  {
                // ignore
                }
            }
            if (___default.default.isBoolean(subPopulate)) {
                // Only true is accepted as a boolean populate value
                return subPopulate === true ? {
                    ...acc,
                    [key]: true
                } : acc;
            }
            const attribute = attributes[key];
            if (!attribute) {
                return acc;
            }
            // Allow adding an 'on' strategy to populate queries for morphTo relations and dynamic zones
            const isMorphLikeRelationalAttribute = contentTypes.isDynamicZoneAttribute(attribute) || contentTypes.isMorphToRelationalAttribute(attribute);
            if (isMorphLikeRelationalAttribute) {
                const hasInvalidProperties = Object.keys(subPopulate).some((key)=>![
                        'populate',
                        'on',
                        'count'
                    ].includes(key));
                if (hasInvalidProperties) {
                    throw new errors.ValidationError(`Invalid nested populate for ${schema.info?.singularName}.${key} (${schema.uid}). Expected a fragment ("on") or "count" but found ${JSON.stringify(subPopulate)}`);
                }
                /**
         * Validate nested population queries in the context of a polymorphic attribute (dynamic zone, morph relation).
         *
         * If 'populate' exists in subPopulate, its value should be constrained to a wildcard ('*').
         */ if ('populate' in subPopulate && subPopulate.populate != null && subPopulate.populate !== '*') {
                    throw new errors.ValidationError(`Invalid nested population query detected. When using 'populate' within polymorphic structures, ` + `its value must be '*' to indicate all second level links. Specific field targeting is not supported here. ` + `Consider using the fragment API for more granular population control.`);
                }
                // TODO: Remove the possibility to have multiple properties at the same time (on/count/populate)
                const newSubPopulate = {};
                // case: { populate: '*' }
                if ('populate' in subPopulate && subPopulate.populate === '*') {
                    Object.assign(newSubPopulate, {
                        populate: true
                    });
                }
                // case: { on: { <clauses> } }
                if (hasPopulateFragmentDefined(subPopulate)) {
                    // If the fragment API is used, it applies the transformation to every
                    // sub-populate, then assign the result to the new sub-populate
                    Object.assign(newSubPopulate, {
                        on: Object.entries(subPopulate.on).reduce((acc, [type, typeSubPopulate])=>({
                                ...acc,
                                [type]: convertNestedPopulate(typeSubPopulate, getModel(type))
                            }), {})
                    });
                }
                // case: { count: true | false }
                if (hasCountDefined(subPopulate)) {
                    Object.assign(newSubPopulate, {
                        count: subPopulate.count
                    });
                }
                return {
                    ...acc,
                    [key]: newSubPopulate
                };
            }
            // Edge case when trying to use the fragment ('on') on a non-morph like attribute
            if (!isMorphLikeRelationalAttribute && hasPopulateFragmentDefined(subPopulate)) {
                throw new errors.ValidationError(`Using fragments is not permitted to populate "${key}" in "${schema.uid}"`);
            }
            // NOTE: Retrieve the target schema UID.
            // Only handles basic relations, medias and component since it's not possible
            // to populate with options for a dynamic zone or a polymorphic relation
            let targetSchemaUID;
            if (attribute.type === 'relation') {
                targetSchemaUID = attribute.target;
            } else if (attribute.type === 'component') {
                targetSchemaUID = attribute.component;
            } else if (attribute.type === 'media') {
                targetSchemaUID = 'plugin::upload.file';
            } else {
                return acc;
            }
            const targetSchema = getModel(targetSchemaUID);
            // ignore the sub-populate for the current key if there is no schema associated
            if (!targetSchema) {
                return acc;
            }
            const populateObject = convertNestedPopulate(subPopulate, targetSchema);
            if (!populateObject) {
                return acc;
            }
            return {
                ...acc,
                [key]: populateObject
            };
        }, {});
    };
    const convertNestedPopulate = (subPopulate, schema)=>{
        if (___default.default.isString(subPopulate)) {
            return parseType.default({
                type: 'boolean',
                value: subPopulate,
                forceCast: true
            });
        }
        if (___default.default.isBoolean(subPopulate)) {
            return subPopulate;
        }
        if (!isPlainObject(subPopulate)) {
            throw new errors.ValidationError(`Invalid nested populate. Expected '*' or an object`);
        }
        const { sort, filters, fields, populate, count, ordering, page, pageSize, start, limit } = subPopulate;
        const query = {};
        applySortToQuery(query, sort);
        if (filters) {
            query.where = convertFiltersQueryParams(filters, schema);
        }
        if (fields) {
            query.select = convertFieldsQueryParams(fields, schema);
        }
        if (populate) {
            query.populate = convertPopulateQueryParams(populate, schema);
        }
        if (count) {
            query.count = convertCountQueryParams(count);
        }
        if (ordering) {
            query.ordering = convertOrderingQueryParams(ordering);
        }
        validatePaginationParams(page, pageSize, start, limit);
        if (page != null) {
            query.page = convertPageQueryParams(page);
        }
        if (pageSize != null) {
            query.pageSize = convertPageSizeQueryParams(pageSize);
        }
        if (start != null) {
            query.offset = convertStartQueryParams(start);
        }
        if (limit != null) {
            query.limit = convertLimitQueryParams(limit);
        }
        return query;
    };
    // TODO: ensure field is valid in content types (will probably have to check strapi.contentTypes since it can be a string.path)
    const convertFieldsQueryParams = (fields, schema, depth = 0)=>{
        if (depth === 0 && fields === '*') {
            return undefined;
        }
        if (typeof fields === 'string') {
            const fieldsValues = fields.split(',').map((value)=>___default.default.trim(value));
            // NOTE: Only include the doc id if it's a content type
            if (schema?.modelType === 'contentType') {
                return ___default.default.uniq([
                    ID_ATTRIBUTE,
                    DOC_ID_ATTRIBUTE,
                    ...fieldsValues
                ]);
            }
            return ___default.default.uniq([
                ID_ATTRIBUTE,
                ...fieldsValues
            ]);
        }
        if (isStringArray(fields)) {
            // map convert
            const fieldsValues = fields.flatMap((value)=>convertFieldsQueryParams(value, schema, depth + 1)).filter((v)=>v != null);
            // NOTE: Only include the doc id if it's a content type
            if (schema?.modelType === 'contentType') {
                return ___default.default.uniq([
                    ID_ATTRIBUTE,
                    DOC_ID_ATTRIBUTE,
                    ...fieldsValues
                ]);
            }
            return ___default.default.uniq([
                ID_ATTRIBUTE,
                ...fieldsValues
            ]);
        }
        throw new errors.ValidationError('Invalid fields parameter. Expected a string or an array of strings');
    };
    const isValidSchemaAttribute = (key, schema)=>{
        if ([
            DOC_ID_ATTRIBUTE,
            ID_ATTRIBUTE
        ].includes(key)) {
            return true;
        }
        if (!schema) {
            return false;
        }
        return Object.keys(schema.attributes).includes(key);
    };
    const convertFiltersQueryParams = (filters, schema)=>{
        // Filters need to be either an array or an object
        // Here we're only checking for 'object' type since typeof [] => object and typeof {} => object
        if (!_.isObject(filters)) {
            throw new errors.ValidationError('The filters parameter must be an object or an array');
        }
        // Don't mutate the original object
        const filtersCopy = _.cloneDeep(filters);
        return convertAndSanitizeFilters(filtersCopy, schema);
    };
    const convertAndSanitizeFilters = (filters, schema)=>{
        if (Array.isArray(filters)) {
            return filters// Sanitize each filter
            .map((filter)=>convertAndSanitizeFilters(filter, schema))// Filter out empty filters
            .filter((filter)=>!isPlainObject(filter) || !_.isEmpty(filter));
        }
        if (!isPlainObject(filters)) {
            return filters;
        }
        const removeOperator = (operator)=>delete filters[operator];
        // Here, `key` can either be an operator or an attribute name
        for (const [key, value] of Object.entries(filters)){
            const attribute = _.get(schema?.attributes, key);
            const validKey = operators.isOperator(key) || isValidSchemaAttribute(key, schema);
            if (!validKey) {
                removeOperator(key);
            } else if (attribute) {
                // Relations
                if (attribute.type === 'relation') {
                    filters[key] = convertAndSanitizeFilters(value, getModel(attribute.target));
                } else if (attribute.type === 'component') {
                    filters[key] = convertAndSanitizeFilters(value, getModel(attribute.component));
                } else if (attribute.type === 'media') {
                    filters[key] = convertAndSanitizeFilters(value, getModel('plugin::upload.file'));
                } else if (attribute.type === 'dynamiczone') {
                    removeOperator(key);
                } else if (attribute.type === 'password') {
                    // Always remove password attributes from filters object
                    removeOperator(key);
                } else {
                    filters[key] = convertAndSanitizeFilters(value, schema);
                }
            } else if ([
                '$null',
                '$notNull'
            ].includes(key)) {
                filters[key] = parseType.default({
                    type: 'boolean',
                    value: filters[key],
                    forceCast: true
                });
            } else if (_.isObject(value)) {
                filters[key] = convertAndSanitizeFilters(value, schema);
            }
            // Remove empty objects & arrays
            if (isPlainObject(filters[key]) && _.isEmpty(filters[key])) {
                removeOperator(key);
            }
        }
        return filters;
    };
    const convertStatusParams = (status, query = {})=>{
        // NOTE: this is the query layer filters not the document/entity service filters
        query.filters = ({ meta })=>{
            const contentType = getModel(meta.uid);
            // Ignore if target model has disabled DP, as it doesn't make sense to filter by its status
            if (!contentType || !contentTypes.hasDraftAndPublish(contentType)) {
                return {};
            }
            return {
                [PUBLISHED_AT_ATTRIBUTE]: {
                    $null: status === 'draft'
                }
            };
        };
    };
    const transformQueryParams = (uid, params)=>{
        // NOTE: can be a CT, a Compo or nothing in the case of polymorphism (DZ & morph relations)
        const schema = getModel(uid);
        const query = {};
        const { _q: searchQuery, sort, filters, fields, populate, page, pageSize, start, limit, status, ...rest } = params;
        if (status != null) {
            convertStatusParams(status, query);
        }
        if (searchQuery != null) {
            query._q = searchQuery;
        }
        applySortToQuery(query, sort);
        if (filters != null) {
            query.where = convertFiltersQueryParams(filters, schema);
        }
        if (fields != null) {
            query.select = convertFieldsQueryParams(fields, schema);
        }
        if (populate != null) {
            query.populate = convertPopulateQueryParams(populate, schema);
        }
        validatePaginationParams(page, pageSize, start, limit);
        if (page != null) {
            query.page = convertPageQueryParams(page);
        }
        if (pageSize != null) {
            query.pageSize = convertPageSizeQueryParams(pageSize);
        }
        if (start != null) {
            query.offset = convertStartQueryParams(start);
        }
        if (limit != null) {
            query.limit = convertLimitQueryParams(limit);
        }
        return {
            ...rest,
            ...query
        };
    };
    return {
        private_convertSortQueryParams: convertSortQueryParams,
        private_convertStartQueryParams: convertStartQueryParams,
        private_convertLimitQueryParams: convertLimitQueryParams,
        private_convertPopulateQueryParams: convertPopulateQueryParams,
        private_convertFiltersQueryParams: convertFiltersQueryParams,
        private_convertFieldsQueryParams: convertFieldsQueryParams,
        transformQueryParams
    };
};

exports.createTransformer = createTransformer;
//# sourceMappingURL=convert-query-params.js.map
