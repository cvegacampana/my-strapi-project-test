'use strict';

var _ = require('lodash');
var strapiUtils = require('@strapi/utils');
var common = require('./common.js');
var draftAndPublish = require('./draft-and-publish.js');
var internationalization = require('./internationalization.js');
var components = require('./components.js');
var entries = require('./entries.js');
var params = require('./params.js');
var transformContentTypesToModels = require('../../utils/transform-content-types-to-models.js');
var populate = require('./utils/populate.js');
var query = require('./transform/query.js');
var idTransform = require('./transform/id-transform.js');
var events = require('./events.js');
var unidirectionalRelations = require('./utils/unidirectional-relations.js');
var bidirectionalRelations = require('./utils/bidirectional-relations.js');
var selfReferentialRelations = require('./utils/self-referential-relations.js');
var index = require('../entity-validator/index.js');
var firstPublishedAt = require('./first-published-at.js');
var orderedParallel = require('./utils/ordered-parallel.js');
var cloneRelations = require('./utils/clone-relations.js');

const { validators } = strapiUtils.validate;
// we have to typecast to reconcile the differences between validator and database getModel
const getModel = (schema)=>strapi.getModel(schema);
// config.api.documents.strictParams: false/undefined (pass through), true (throw on invalid)
// BCP 47–style locale format: 2–3 letter language code (any case), optional subtags (-XX or -XXX...), max 35 chars
const LOCALE_FORMAT = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/;
const MAX_LOCALE_LENGTH = 35;
/**
 * Publication actions look up every row matching `documentId`. An empty value would match
 * all rows whose document_id is NULL (or '') — rows left behind by a past bug — and
 * publish/discard them as if they were a single document, so reject it outright.
 */ const assertDocumentIdProvided = (documentId, action)=>{
    if (params.isParamEmpty(documentId)) {
        throw new strapiUtils.errors.ValidationError(`Cannot ${action} a document without a documentId`);
    }
};
const createContentTypeRepository = (uid, validator = index)=>{
    const contentType = strapi.contentType(uid);
    const hasDraftAndPublish = strapiUtils.contentTypes.hasDraftAndPublish(contentType);
    // Define the validations that should be performed
    const sortValidations = [
        'nonAttributesOperators',
        'dynamicZones',
        'morphRelations'
    ];
    const fieldValidations = [
        'scalarAttributes'
    ];
    const filtersValidations = [
        'nonAttributesOperators',
        'dynamicZones',
        'morphRelations'
    ];
    const populateValidations = {
        sort: sortValidations,
        field: fieldValidations,
        filters: filtersValidations,
        populate: [
            'nonAttributesOperators'
        ]
    };
    /**
   * Checks status parameter. When strict is true, throws on invalid status.
   * Valid values are 'published' and 'draft'; for types without D&P they are currently ignored but may throw in the future
   */ const checkStatus = (params$1, strict)=>{
        if (!strict) {
            return params$1;
        }
        if (params.isParamEmpty(params$1.status)) {
            delete params$1.status;
            return params$1;
        }
        if (params$1.status !== 'published' && params$1.status !== 'draft') {
            throw new strapiUtils.errors.ValidationError(`Invalid parameter at 'status'. Expected 'published' or 'draft', received: ${params$1.status}`);
        }
        return params$1;
    };
    /**
   * Checks locale parameter. When strict is true, throws on invalid locale value.
   * Accepts only: string (single locale or '*'), array of locale strings (e.g. bulk publish),
   * empty string, null, or undefined (removed but allowed)
   */ const checkLocale = (params$1, strict)=>{
        if (!strict) {
            return params$1;
        }
        if (params.isParamEmpty(params$1.locale)) {
            delete params$1.locale;
            return params$1;
        }
        // Reject objects (we only accept string, array of strings, empty string, null, undefined)
        if (typeof params$1.locale === 'object' && !Array.isArray(params$1.locale)) {
            throw new strapiUtils.errors.ValidationError(`Invalid parameter at 'locale'. Expected a string, array of strings, empty string, null, or undefined; received: object`, {
                received: params$1.locale
            });
        }
        const validateAndNormalizeOne = (value, path)=>{
            if (typeof value !== 'string') {
                throw new strapiUtils.errors.ValidationError(`Invalid parameter at '${path}'. Expected a string, received: ${typeof value}`, {
                    received: value
                });
            }
            if (value === '*') return value;
            const isEmpty = value.length === 0;
            const tooLong = value.length > MAX_LOCALE_LENGTH;
            const invalidFormat = !LOCALE_FORMAT.test(value);
            if (isEmpty || tooLong || invalidFormat) {
                let reason;
                if (isEmpty) {
                    reason = 'Locale cannot be empty';
                } else if (tooLong) {
                    reason = `Locale exceeds maximum length of ${MAX_LOCALE_LENGTH} characters`;
                } else {
                    reason = 'Locale must be a valid BCP 47 format (e.g. en, en-US, zh-Hans)';
                }
                throw new strapiUtils.errors.ValidationError(`Invalid parameter at '${path}'. ${reason}.`);
            }
            return value;
        };
        if (Array.isArray(params$1.locale)) {
            const filtered = params$1.locale.filter((item)=>typeof item === 'string' && !params.isParamEmpty(item));
            if (filtered.length === 0) {
                delete params$1.locale;
                return params$1;
            }
            params$1.locale = filtered.map((item, i)=>validateAndNormalizeOne(item, `locale[${i}]`));
            return params$1;
        }
        params$1.locale = validateAndNormalizeOne(params$1.locale, 'locale');
        return params$1;
    };
    /**
   * Pagination param parsing (used only when strict).
   * Contract: empty (null/undefined/'') → undefined (omit from result).
   *           present but invalid → throw ValidationError.
   *           present and valid → return normalized value.
   */ const parsePaginationInt = (name, value, strict, spec)=>{
        if (params.isParamEmpty(value)) return undefined;
        const num = Number(value);
        const valid = Number.isInteger(num) && (num >= spec.min || spec.allowMinusOne === true && num === -1);
        if (!valid && strict) {
            const expected = spec.allowMinusOne ? `integer >= ${spec.min} or -1` : `integer >= ${spec.min}`;
            throw new strapiUtils.errors.ValidationError(`Invalid parameter at '${name}'. Expected ${expected}, received: ${value}`);
        }
        return valid ? num : undefined;
    };
    const parseWithCount = (value)=>{
        if (params.isParamEmpty(value)) return undefined;
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string' && (value === 'true' || value === 'false')) return value === 'true';
        throw new strapiUtils.errors.ValidationError(`Invalid parameter at 'withCount'. Expected a boolean, received: ${typeof value}`);
    };
    const PAGINATION_KEYS = [
        'page',
        'pageSize',
        'start',
        'limit',
        'withCount'
    ];
    /**
   * When strict: empty → omit, invalid → throw, valid → include.
   * When not strict: return params unchanged.
   */ const checkPagination = (params$1, strict)=>{
        if (!strict) return params$1;
        const hasPage = !params.isParamEmpty(params$1.page) || !params.isParamEmpty(params$1.pageSize);
        const hasOffset = !params.isParamEmpty(params$1.start) || !params.isParamEmpty(params$1.limit);
        if (hasPage && hasOffset) {
            throw new strapiUtils.errors.ValidationError('Invalid pagination parameters. Cannot use both page-based (page, pageSize) and offset-based (start, limit) pagination in the same query.');
        }
        const page = parsePaginationInt('page', params$1.page, strict, {
            min: 1
        });
        const pageSize = parsePaginationInt('pageSize', params$1.pageSize, strict, {
            min: 1
        });
        const start = parsePaginationInt('start', params$1.start, strict, {
            min: 0
        });
        const limit = parsePaginationInt('limit', params$1.limit, strict, {
            min: 1,
            allowMinusOne: true
        });
        const withCount = parseWithCount(params$1.withCount);
        const result = {
            ..._.omit(params$1, PAGINATION_KEYS)
        };
        if (page !== undefined) result.page = page;
        if (pageSize !== undefined) result.pageSize = pageSize;
        if (start !== undefined) result.start = start;
        if (limit !== undefined) result.limit = limit;
        if (withCount !== undefined) result.withCount = withCount;
        return result;
    };
    /**
   * When strict is true, strip to allowed root-level keys so only those reach the query.
   * Extra params (e.g. from content API addQueryParams) are allowed in so middlewares see them,
   * but are stripped here before the query pipeline; they never affect the document query.
   */ const checkUnrecognizedRootParams = (params$1, strict)=>{
        if (!strict) {
            return params$1;
        }
        return _.pick(params$1, params.ALLOWED_DOCUMENT_ROOT_PARAM_KEYS);
    };
    const validateParams = async (params)=>{
        // Cache model lookups for this request to avoid repeating the same work
        const modelCache = strapiUtils.createModelCache(getModel);
        const ctx = {
            schema: contentType,
            getModel: modelCache.getModel
        };
        // Only validate what is actually provided
        const validations = [];
        if (params.filters && !_.isEmpty(params.filters)) {
            validations.push(validators.validateFilters(ctx, params.filters, filtersValidations));
        }
        if (params.sort && !_.isEmpty(params.sort)) {
            validations.push(validators.validateSort(ctx, params.sort, sortValidations));
        }
        if (params.fields && !_.isEmpty(params.fields)) {
            validations.push(validators.validateFields(ctx, params.fields, fieldValidations));
        }
        if (params.populate && !_.isEmpty(params.populate)) {
            validations.push(validators.validatePopulate(ctx, params.populate, populateValidations));
        }
        // Run validations together but keep the same error order as before
        await orderedParallel.runParallelWithOrderedErrors(validations);
        // Clean up cache after validation
        modelCache.clear();
        // Strip lookup from params, it's only used internally
        if (params.lookup) {
            throw new strapiUtils.errors.ValidationError("Invalid params: 'lookup'");
        }
        // Validate status, locale, and pagination based on config
        // config.api.documents.strictParams: false/undefined (pass through), true (throw on invalid)
        const rawStrictParams = strapi.config.get('api.documents.strictParams', undefined);
        if (rawStrictParams !== undefined && rawStrictParams !== false && rawStrictParams !== true) {
            throw new strapiUtils.errors.ValidationError(`Invalid config.api.documents.strictParams value: "${rawStrictParams}". Expected boolean (true or false).`);
        }
        const strict = rawStrictParams === true;
        let processedParams;
        if (strict) {
            processedParams = checkUnrecognizedRootParams(params, strict);
            processedParams = checkStatus(processedParams, strict);
            processedParams = checkLocale(processedParams, strict);
            processedParams = checkPagination(processedParams, strict);
        } else {
            processedParams = params;
        }
        return processedParams;
    };
    const entries$1 = entries.createEntriesService(uid, validator);
    const eventManager = events.createEventManager(strapi, uid);
    const emitEvent = _.curry(eventManager.emitEvent);
    async function findMany(params = {}) {
        const query$1 = await strapiUtils.async.pipe(validateParams, draftAndPublish.defaultToDraft, draftAndPublish.statusToLookup(contentType), internationalization.defaultLocale(contentType), internationalization.multiLocaleToLookup(contentType), idTransform.transformParamsDocumentId(uid), query.transformParamsToQuery(uid))(params || {});
        return strapi.db.query(uid).findMany(query$1);
    }
    async function findFirst(params = {}) {
        const query$1 = await strapiUtils.async.pipe(validateParams, draftAndPublish.defaultToDraft, draftAndPublish.statusToLookup(contentType), internationalization.defaultLocale(contentType), internationalization.localeToLookup(contentType), idTransform.transformParamsDocumentId(uid), query.transformParamsToQuery(uid))(params);
        return strapi.db.query(uid).findOne(query$1);
    }
    // TODO: do we really want to add filters on the findOne now that we have findFirst ?
    async function findOne(opts = {}) {
        const { documentId, ...params } = opts;
        const query$1 = await strapiUtils.async.pipe(validateParams, draftAndPublish.defaultToDraft, draftAndPublish.statusToLookup(contentType), internationalization.defaultLocale(contentType), internationalization.localeToLookup(contentType), idTransform.transformParamsDocumentId(uid), query.transformParamsToQuery(uid), (query)=>({
                ...query,
                where: {
                    ...query.where,
                    documentId
                }
            }))(params);
        return strapi.db.query(uid).findOne(query$1);
    }
    async function deleteDocument(opts = {}) {
        const { documentId, ...params$1 } = opts;
        const lookupQuery = await strapiUtils.async.pipe(validateParams, (value)=>_.omit(value, 'status'), internationalization.defaultLocale(contentType), internationalization.multiLocaleToLookup(contentType), query.transformParamsToQuery(uid), (query)=>({
                ...query,
                where: {
                    ...query.where,
                    documentId
                }
            }))(params$1);
        const selectionQuery = await strapiUtils.async.pipe(validateParams, (value)=>_.omit(value, 'status'), params.pickSelectionParams, query.transformParamsToQuery(uid))(params$1);
        if (hasDraftAndPublish && params$1.status === 'draft') {
            throw new Error('Cannot delete a draft document');
        }
        const entriesToDelete = await strapi.db.query(uid).findMany(lookupQuery);
        const deletedEntries = await strapiUtils.async.map(entriesToDelete, (entryToDelete)=>entries$1.delete(entryToDelete.id, selectionQuery));
        entriesToDelete.forEach(emitEvent('entry.delete'));
        return {
            documentId,
            entries: deletedEntries
        };
    }
    async function create(opts = {}) {
        const { documentId: _documentId, ...params } = opts;
        const queryParams = await strapiUtils.async.pipe(validateParams, draftAndPublish.filterDataPublishedAt, draftAndPublish.setStatusToDraft(contentType), draftAndPublish.statusToData(contentType), internationalization.defaultLocale(contentType), internationalization.localeToData(contentType))(params);
        const doc = await entries$1.create(queryParams);
        emitEvent('entry.create', doc);
        if (hasDraftAndPublish && params.status === 'published') {
            return publish({
                ...params,
                documentId: doc.documentId
            }).then((doc)=>doc.entries[0]);
        }
        return doc;
    }
    async function clone(opts = {}) {
        const { documentId, ...params$1 } = opts;
        const queryParams = await strapiUtils.async.pipe(validateParams, draftAndPublish.filterDataPublishedAt, internationalization.defaultLocale(contentType), internationalization.multiLocaleToLookup(contentType))(params$1);
        // Get deep populate
        const entriesToClone = await strapi.db.query(uid).findMany({
            where: {
                ...queryParams?.lookup,
                documentId,
                // DP Enabled: Clone drafts
                // DP Disabled: Clone only the existing version (published)
                publishedAt: {
                    $null: hasDraftAndPublish
                }
            },
            populate: populate.getDeepPopulate(uid, {
                relationalFields: [
                    'id'
                ]
            })
        });
        const newDocumentId = transformContentTypesToModels.createDocumentId();
        const clonedEntries = await strapiUtils.async.map(entriesToClone, async (entryToClone)=>{
            const sourceEntryId = entryToClone.id;
            const originalData = _.omit(entryToClone, [
                'id',
                'createdAt',
                'updatedAt'
            ]);
            const { data, deferredCopies, postCloneUpdates } = await cloneRelations.prepareCloneData(originalData, queryParams.data, contentType, (modelUid)=>strapi.getModel(modelUid));
            const dataWithDocumentId = {
                ...data,
                documentId: newDocumentId
            };
            const doc = await entries$1.create({
                ...queryParams,
                data: dataWithDocumentId,
                status: 'draft'
            });
            const needsRelationFollowUp = deferredCopies.length > 0 || postCloneUpdates.length > 0;
            const selectionQuery = query.transformParamsToQuery(uid, params.pickSelectionParams({
                ...queryParams,
                status: 'draft'
            }));
            const clonedEntry = needsRelationFollowUp ? await strapi.db.query(uid).findOne({
                ...selectionQuery,
                where: {
                    id: doc.id
                },
                populate: populate.getDeepPopulate(uid, {
                    relationalFields: [
                        'id'
                    ]
                })
            }) : doc;
            if (clonedEntry) {
                await cloneRelations.applyDeferredCloneRelationCopies(strapi, uid, sourceEntryId, doc.id, originalData, clonedEntry, deferredCopies);
                await cloneRelations.applyPostCloneRelationUpdates(strapi, uid, sourceEntryId, doc.id, {
                    ...clonedEntry,
                    documentId: doc.documentId,
                    locale: entryToClone.locale ?? queryParams.locale ?? queryParams.data?.locale
                }, originalData, postCloneUpdates);
            }
            if (!needsRelationFollowUp) {
                return doc;
            }
            return strapi.db.query(uid).findOne({
                ...selectionQuery,
                where: {
                    id: doc.id
                }
            });
        });
        clonedEntries.forEach(emitEvent('entry.create'));
        return {
            documentId: clonedEntries.at(0)?.documentId,
            entries: clonedEntries
        };
    }
    async function update(opts = {}) {
        const { documentId, ...params$1 } = opts;
        const queryParams = await strapiUtils.async.pipe(validateParams, draftAndPublish.filterDataPublishedAt, firstPublishedAt.filterDataFirstPublishedAt, draftAndPublish.setStatusToDraft(contentType), draftAndPublish.statusToLookup(contentType), draftAndPublish.statusToData(contentType), // Default locale will be set if not provided
        internationalization.defaultLocale(contentType), internationalization.localeToLookup(contentType), internationalization.localeToData(contentType))(params$1);
        const { data: _data, ...restParams } = await idTransform.transformParamsDocumentId(uid, queryParams || {});
        const query$1 = query.transformParamsToQuery(uid, params.pickSelectionParams(restParams || {}));
        // Validation
        // Find if document exists
        const entryToUpdate = await strapi.db.query(uid).findOne({
            ...query$1,
            where: {
                ...queryParams?.lookup,
                ...query$1?.where,
                documentId
            }
        });
        let updatedDraft = null;
        if (entryToUpdate) {
            updatedDraft = await entries$1.update(entryToUpdate, queryParams);
            emitEvent('entry.update', updatedDraft);
        }
        if (!updatedDraft) {
            const documentExists = await strapi.db.query(contentType.uid).findOne({
                where: {
                    documentId
                }
            });
            if (documentExists) {
                const mergedData = await internationalization.copyNonLocalizedFields(contentType, documentId, {
                    ...queryParams.data,
                    documentId
                });
                updatedDraft = await entries$1.create({
                    ...queryParams,
                    data: mergedData
                });
                emitEvent('entry.create', updatedDraft);
            }
        }
        if (hasDraftAndPublish && updatedDraft && params$1.status === 'published') {
            return publish({
                ...params$1,
                documentId
            }).then((doc)=>doc.entries[0]);
        }
        return updatedDraft;
    }
    async function count(params = {}) {
        const query$1 = await strapiUtils.async.pipe(validateParams, draftAndPublish.defaultStatus(contentType), draftAndPublish.statusToLookup(contentType), internationalization.defaultLocale(contentType), internationalization.multiLocaleToLookup(contentType), query.transformParamsToQuery(uid))(params);
        return strapi.db.query(uid).count(query$1);
    }
    async function publish(opts = {}) {
        const { documentId, ...params } = opts;
        assertDocumentIdProvided(documentId, 'publish');
        const queryParams = await strapiUtils.async.pipe(validateParams, internationalization.defaultLocale(contentType), internationalization.multiLocaleToLookup(contentType))(params);
        const [draftsToPublish, oldPublishedVersions] = await Promise.all([
            strapi.db.query(uid).findMany({
                where: {
                    ...queryParams?.lookup,
                    documentId,
                    publishedAt: null
                },
                // Populate relations, media, compos and dz
                populate: populate.getDeepPopulate(uid, {
                    relationalFields: [
                        'documentId',
                        'locale'
                    ]
                })
            }),
            strapi.db.query(uid).findMany({
                where: {
                    ...queryParams?.lookup,
                    documentId,
                    publishedAt: {
                        $ne: null
                    }
                },
                select: [
                    'id',
                    'locale'
                ]
            })
        ]);
        // Load any unidirectional relation targetting the old published entries
        const relationsToSync = await unidirectionalRelations.load(uid, {
            newVersions: draftsToPublish,
            oldVersions: oldPublishedVersions
        }, {
            filterRelationsToPropagate: components.createComponentRelationFilter()
        });
        const bidirectionalRelationsToSync = await bidirectionalRelations.load(uid, {
            newVersions: draftsToPublish,
            oldVersions: oldPublishedVersions
        });
        const selfRelationsToSync = await selfReferentialRelations.load(uid, draftsToPublish, 'published');
        // Delete old published versions
        await strapiUtils.async.map(oldPublishedVersions, (entry)=>entries$1.delete(entry.id));
        // Add firstPublishedAt to draft if it doesn't exist
        const updatedDraft = await strapiUtils.async.map(draftsToPublish, (draft)=>firstPublishedAt.addFirstPublishedAtToDraft(draft, entries$1.update, contentType));
        // Transform draft entry data and create published versions
        const publishedEntries = await strapiUtils.async.map(updatedDraft, (draft)=>entries$1.publish(draft, queryParams));
        // Sync unidirectional relations with the new published entries
        await unidirectionalRelations.sync([
            ...oldPublishedVersions,
            ...updatedDraft
        ], publishedEntries, relationsToSync);
        await bidirectionalRelations.sync([
            ...oldPublishedVersions,
            ...updatedDraft
        ], publishedEntries, bidirectionalRelationsToSync);
        // Map both old published IDs and updated draft IDs to the new published entries.
        await selfReferentialRelations.sync([
            ...oldPublishedVersions,
            ...updatedDraft
        ], publishedEntries, selfRelationsToSync);
        publishedEntries.forEach(emitEvent('entry.publish'));
        return {
            documentId,
            entries: publishedEntries
        };
    }
    async function unpublish(opts = {}) {
        const { documentId, ...params } = opts;
        assertDocumentIdProvided(documentId, 'unpublish');
        const query$1 = await strapiUtils.async.pipe(validateParams, internationalization.defaultLocale(contentType), internationalization.multiLocaleToLookup(contentType), query.transformParamsToQuery(uid), (query)=>({
                ...query,
                where: {
                    ...query.where,
                    documentId,
                    publishedAt: {
                        $ne: null
                    }
                }
            }))(params);
        // Delete all published versions
        const versionsToDelete = await strapi.db.query(uid).findMany(query$1);
        await strapiUtils.async.map(versionsToDelete, (entry)=>entries$1.delete(entry.id));
        versionsToDelete.forEach(emitEvent('entry.unpublish'));
        return {
            documentId,
            entries: versionsToDelete
        };
    }
    async function discardDraft(opts = {}) {
        const { documentId, ...params } = opts;
        assertDocumentIdProvided(documentId, 'discard the draft of');
        const queryParams = await strapiUtils.async.pipe(validateParams, internationalization.defaultLocale(contentType), internationalization.multiLocaleToLookup(contentType))(params);
        const [versionsToDraft, oldDrafts] = await Promise.all([
            strapi.db.query(uid).findMany({
                where: {
                    ...queryParams?.lookup,
                    documentId,
                    publishedAt: {
                        $ne: null
                    }
                },
                // Populate relations, media, compos and dz
                populate: populate.getDeepPopulate(uid, {
                    relationalFields: [
                        'documentId',
                        'locale'
                    ]
                })
            }),
            strapi.db.query(uid).findMany({
                where: {
                    ...queryParams?.lookup,
                    documentId,
                    publishedAt: null
                },
                select: [
                    'id',
                    'locale'
                ]
            })
        ]);
        // Load any unidirectional relation targeting the old drafts
        const relationsToSync = await unidirectionalRelations.load(uid, {
            newVersions: versionsToDraft,
            oldVersions: oldDrafts
        }, {
            filterRelationsToPropagate: components.createComponentRelationFilter()
        });
        const bidirectionalRelationsToSync = await bidirectionalRelations.load(uid, {
            newVersions: versionsToDraft,
            oldVersions: oldDrafts
        });
        const selfRelationsToSync = await selfReferentialRelations.load(uid, versionsToDraft, 'draft');
        // Delete old drafts
        await strapiUtils.async.map(oldDrafts, (entry)=>entries$1.delete(entry.id));
        // Transform published entry data and create draft versions
        const draftEntries = await strapiUtils.async.map(versionsToDraft, (entry)=>entries$1.discardDraft(entry, queryParams));
        // Sync unidirectional relations with the new draft entries
        await unidirectionalRelations.sync([
            ...oldDrafts,
            ...versionsToDraft
        ], draftEntries, relationsToSync);
        await bidirectionalRelations.sync([
            ...oldDrafts,
            ...versionsToDraft
        ], draftEntries, bidirectionalRelationsToSync);
        // Map both old draft IDs and published source IDs to the new draft entries.
        await selfReferentialRelations.sync([
            ...oldDrafts,
            ...versionsToDraft
        ], draftEntries, selfRelationsToSync);
        draftEntries.forEach(emitEvent('entry.draft-discard'));
        return {
            documentId,
            entries: draftEntries
        };
    }
    async function updateComponents(entry, data) {
        return components.updateComponents(uid, entry, data);
    }
    function omitComponentData(data) {
        return components.omitComponentData(contentType, data);
    }
    return {
        findMany: common.wrapInTransaction(findMany),
        findFirst: common.wrapInTransaction(findFirst),
        findOne: common.wrapInTransaction(findOne),
        delete: common.wrapInTransaction(deleteDocument),
        create: common.wrapInTransaction(create),
        clone: common.wrapInTransaction(clone),
        update: common.wrapInTransaction(update),
        count: common.wrapInTransaction(count),
        publish: hasDraftAndPublish ? common.wrapInTransaction(publish) : undefined,
        unpublish: hasDraftAndPublish ? common.wrapInTransaction(unpublish) : undefined,
        discardDraft: hasDraftAndPublish ? common.wrapInTransaction(discardDraft) : undefined,
        updateComponents,
        omitComponentData
    };
};

exports.createContentTypeRepository = createContentTypeRepository;
//# sourceMappingURL=repository.js.map
