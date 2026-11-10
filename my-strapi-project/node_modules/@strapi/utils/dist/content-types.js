'use strict';

var _ = require('lodash');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var ___default = /*#__PURE__*/_interopDefault(_);

const SINGLE_TYPE = 'singleType';
const COLLECTION_TYPE = 'collectionType';
const ID_ATTRIBUTE = 'id';
const DOC_ID_ATTRIBUTE = 'documentId';
const PUBLISHED_AT_ATTRIBUTE = 'publishedAt';
const FIRST_PUBLISHED_AT_ATTRIBUTE = 'firstPublishedAt';
const CREATED_BY_ATTRIBUTE = 'createdBy';
const UPDATED_BY_ATTRIBUTE = 'updatedBy';
const CREATED_AT_ATTRIBUTE = 'createdAt';
const UPDATED_AT_ATTRIBUTE = 'updatedAt';
const constants = {
    ID_ATTRIBUTE,
    DOC_ID_ATTRIBUTE,
    PUBLISHED_AT_ATTRIBUTE,
    FIRST_PUBLISHED_AT_ATTRIBUTE,
    CREATED_BY_ATTRIBUTE,
    UPDATED_BY_ATTRIBUTE,
    CREATED_AT_ATTRIBUTE,
    UPDATED_AT_ATTRIBUTE,
    SINGLE_TYPE,
    COLLECTION_TYPE
};
/** ID-like fields accepted at root level and on relations/media/components (validate/sanitize traversal). */ const ID_FIELDS = [
    ID_ATTRIBUTE,
    DOC_ID_ATTRIBUTE
];
/** Keys accepted on morphTo relation payloads (e.g. __type). */ const MORPH_TO_KEYS = [
    '__type'
];
/** Keys accepted on dynamic zone component payloads (e.g. __component). */ const DYNAMIC_ZONE_KEYS = [
    '__component'
];
/** Relation operation keys (connect, disconnect, set, options). */ const RELATION_OPERATION_KEYS = [
    'connect',
    'disconnect',
    'set',
    'options'
];
/**
 * Reserved attribute names that cannot be used by user-defined content-type fields.
 * Entries ending with `*` are treated as prefix matchers (e.g. `strapi*` blocks `strapi_foo`).
 */ // use snake_case
const RESERVED_ATTRIBUTE_NAMES = [
    // ID fields
    'id',
    'document_id',
    // Creator fields
    'created_at',
    'updated_at',
    'published_at',
    // V6: we will need to add first_published_at when it becomes the default behaviour
    'created_by_id',
    'updated_by_id',
    // does not actually conflict because the fields are called *_by_id but we'll leave it to avoid confusion
    'created_by',
    'updated_by',
    // Used for Strapi functionality
    'entry_id',
    'localizations',
    'meta',
    'locale',
    '__component',
    '__contentType',
    // We support ending with * to denote prefixes
    'strapi*',
    '_strapi*',
    '__strapi*'
];
/**
 * Reserved attribute names that only conflict when draftAndPublish is enabled.
 * `status` is the v5 Document Service / REST query parameter for draft/published filtering.
 */ // use snake_case
const RESERVED_ATTRIBUTE_NAMES_DRAFT_PUBLISH = [
    'status'
];
/** Reserved model (collection) names that cannot be used by user-defined content-types. */ // use snake_case
const RESERVED_MODEL_NAMES = [
    'boolean',
    'date',
    'date_time',
    'time',
    'upload',
    'document',
    'then',
    // We support ending with * to denote prefixes
    'strapi*',
    '_strapi*',
    '__strapi*'
];
const matchesReservedName = (snakeCaseName, list)=>{
    if (list.includes(snakeCaseName)) {
        return true;
    }
    return list.filter((entry)=>entry.endsWith('*')).map((entry)=>entry.slice(0, -1)).some((prefix)=>snakeCaseName.startsWith(prefix));
};
// compare snake case to check the actual column names that will be used in the database
const isReservedAttributeName = (name, { draftAndPublish = true } = {})=>{
    const snakeCaseName = _.snakeCase(name);
    if (matchesReservedName(snakeCaseName, RESERVED_ATTRIBUTE_NAMES)) {
        return true;
    }
    if (draftAndPublish && matchesReservedName(snakeCaseName, RESERVED_ATTRIBUTE_NAMES_DRAFT_PUBLISH)) {
        return true;
    }
    return false;
};
// compare snake case to check the actual column names that will be used in the database
const isReservedModelName = (name)=>{
    return matchesReservedName(_.snakeCase(name), RESERVED_MODEL_NAMES);
};
const getReservedAttributeNames = ({ draftAndPublish = true } = {})=>{
    return draftAndPublish ? [
        ...RESERVED_ATTRIBUTE_NAMES,
        ...RESERVED_ATTRIBUTE_NAMES_DRAFT_PUBLISH
    ] : [
        ...RESERVED_ATTRIBUTE_NAMES
    ];
};
const getReservedModelNames = ()=>[
        ...RESERVED_MODEL_NAMES
    ];
const findDraftAndPublishReservedAttributeNames = (attributeNames)=>{
    return [
        ...attributeNames
    ].filter((name)=>matchesReservedName(_.snakeCase(name), RESERVED_ATTRIBUTE_NAMES_DRAFT_PUBLISH));
};
const getDraftAndPublishReservedAttributeWarning = (uid, attributeName)=>`The attribute name '${attributeName}' on content type '${uid}' is reserved when 'draftAndPublish' is enabled. It conflicts with the Document Service / REST 'status' query parameter. Rename the attribute or disable the 'draftAndPublish' option.`;
const getDraftAndPublishEnableBlockedMessage = (attributeNames)=>`Cannot enable draft and publish while the following attribute names are reserved: ${attributeNames.join(', ')}. Rename them or remove them first.`;
const getTimestamps = (model)=>{
    const attributes = [];
    if (_.has(model.attributes, CREATED_AT_ATTRIBUTE)) {
        attributes.push(CREATED_AT_ATTRIBUTE);
    }
    if (_.has(model.attributes, UPDATED_AT_ATTRIBUTE)) {
        attributes.push(UPDATED_AT_ATTRIBUTE);
    }
    return attributes;
};
const getCreatorFields = (model)=>{
    const attributes = [];
    if (_.has(model.attributes, CREATED_BY_ATTRIBUTE)) {
        attributes.push(CREATED_BY_ATTRIBUTE);
    }
    if (_.has(model.attributes, UPDATED_BY_ATTRIBUTE)) {
        attributes.push(UPDATED_BY_ATTRIBUTE);
    }
    return attributes;
};
const getNonWritableAttributes = (model)=>{
    if (!model) return [];
    const nonWritableAttributes = ___default.default.reduce(model.attributes, (acc, attr, attrName)=>attr.writable === false ? acc.concat(attrName) : acc, []);
    return ___default.default.uniq([
        ID_ATTRIBUTE,
        DOC_ID_ATTRIBUTE,
        ...getTimestamps(model),
        ...nonWritableAttributes
    ]);
};
const getWritableAttributes = (model)=>{
    if (!model) return [];
    return ___default.default.difference(Object.keys(model.attributes), getNonWritableAttributes(model));
};
const isWritableAttribute = (model, attributeName)=>{
    return getWritableAttributes(model).includes(attributeName);
};
const getNonVisibleAttributes = (model)=>{
    const nonVisibleAttributes = ___default.default.reduce(model.attributes, (acc, attr, attrName)=>attr.visible === false ? acc.concat(attrName) : acc, []);
    return ___default.default.uniq([
        ID_ATTRIBUTE,
        DOC_ID_ATTRIBUTE,
        PUBLISHED_AT_ATTRIBUTE,
        ...getTimestamps(model),
        ...nonVisibleAttributes
    ]);
};
const getVisibleAttributes = (model)=>{
    return ___default.default.difference(___default.default.keys(model.attributes), getNonVisibleAttributes(model));
};
const isVisibleAttribute = (model, attributeName)=>{
    return getVisibleAttributes(model).includes(attributeName);
};
const getOptions = (model)=>___default.default.assign({
        draftAndPublish: false
    }, ___default.default.get(model, 'options', {}));
const hasDraftAndPublish = (model)=>___default.default.get(model, 'options.draftAndPublish', false) === true;
const hasFirstPublishedAtField = (model)=>strapi.config.get('features.future.experimental_firstPublishedAt', false) && hasDraftAndPublish(model);
const isDraft = (data, model)=>hasDraftAndPublish(model) && ___default.default.get(data, PUBLISHED_AT_ATTRIBUTE) === null;
const isSchema = (data)=>{
    return typeof data === 'object' && data !== null && 'modelType' in data && typeof data.modelType === 'string' && [
        'component',
        'contentType'
    ].includes(data.modelType);
};
const isComponentSchema = (data)=>{
    return isSchema(data) && data.modelType === 'component';
};
const isContentTypeSchema = (data)=>{
    return isSchema(data) && data.modelType === 'contentType';
};
const isSingleType = ({ kind = COLLECTION_TYPE })=>kind === SINGLE_TYPE;
const isCollectionType = ({ kind = COLLECTION_TYPE })=>kind === COLLECTION_TYPE;
const isKind = (kind)=>(model)=>model.kind === kind;
/**
 * Memo of each model's "stored" private attributes — those declared in
 * `api.responses.privateAttributes` config or in the model's `options.privateAttributes`,
 * as opposed to attributes flagged `private: true` individually.
 *
 * `isPrivateAttribute` is called once per key, per node, per traversal, per entity, and
 * recomputing this set every time dominated response sanitization: a 25-entity page made
 * 48,605 calls, each doing two lodash path lookups plus a fresh `union()` allocation, all
 * returning the same answer.
 *
 * Keyed on the model object rather than its uid, so a rebuilt schema is a distinct key and
 * the entry cannot go stale. Deliberately NOT stored on the schema itself: a
 * `privateAttributes` getter used to live there and was removed in 2023 (2fa8f30371)
 * because it polluted schema serialization, and because it was only ever attached by
 * `createContentType`, so components never got one.
 *
 * Both inputs are fixed for a model's lifetime — `api.responses.privateAttributes` is
 * boot configuration and is never written at runtime, and `options.privateAttributes`
 * comes from the schema definition. The cache is only populated once `strapi.config` is
 * available so that a lookup during early boot cannot record an empty set permanently.
 */ const storedPrivateAttributesCache = new WeakMap();
const computeStoredPrivateAttributes = (model)=>new Set(_.union(_.get(model, 'options.privateAttributes', []), strapi?.config?.get('api.responses.privateAttributes', []) ?? []));
const getStoredPrivateAttributesSet = (model)=>{
    const cacheable = typeof model === 'object' && model !== null && strapi?.config != null;
    if (!cacheable) {
        return computeStoredPrivateAttributes(model);
    }
    let cached = storedPrivateAttributesCache.get(model);
    if (cached === undefined) {
        cached = computeStoredPrivateAttributes(model);
        storedPrivateAttributesCache.set(model, cached);
    }
    return cached;
};
// Set iteration order is insertion order, which matches what `union` returned before.
const getStoredPrivateAttributes = (model)=>Array.from(getStoredPrivateAttributesSet(model));
const getPrivateAttributes = (model)=>{
    return ___default.default.union(getStoredPrivateAttributes(model), ___default.default.keys(___default.default.pickBy(model.attributes, (attr)=>!!attr.private)));
};
const isPrivateAttribute = (model, attributeName)=>{
    if (model?.attributes?.[attributeName]?.private === true) {
        return true;
    }
    const storedPrivateAttributes = getStoredPrivateAttributesSet(model);
    // The set is empty for the overwhelming majority of models, so check size before hashing.
    return storedPrivateAttributes.size !== 0 && storedPrivateAttributes.has(attributeName);
};
const isScalarAttribute = (attribute)=>{
    return attribute && ![
        'media',
        'component',
        'relation',
        'dynamiczone'
    ].includes(attribute.type);
};
const getDoesAttributeRequireValidation = (attribute)=>{
    return attribute.required || attribute.unique || Object.prototype.hasOwnProperty.call(attribute, 'max') || Object.prototype.hasOwnProperty.call(attribute, 'min') || Object.prototype.hasOwnProperty.call(attribute, 'maxLength') || Object.prototype.hasOwnProperty.call(attribute, 'minLength');
};
const isMediaAttribute = (attribute)=>attribute?.type === 'media';
const isRelationalAttribute = (attribute)=>attribute?.type === 'relation';
const HAS_RELATION_REORDERING = new Set([
    'manyToMany',
    'manyToOne',
    'oneToMany'
]);
const hasRelationReordering = (attribute)=>isRelationalAttribute(attribute) && HAS_RELATION_REORDERING.has(attribute.relation);
const isComponentAttribute = (attribute)=>!!attribute && [
        'component',
        'dynamiczone'
    ].includes(attribute.type);
const isDynamicZoneAttribute = (attribute)=>!!attribute && attribute.type === 'dynamiczone';
const isMorphToRelationalAttribute = (attribute)=>{
    return !!attribute && isRelationalAttribute(attribute) && attribute.relation?.startsWith?.('morphTo');
};
const getComponentAttributes = (schema)=>{
    return ___default.default.reduce(schema.attributes, (acc, attr, attrName)=>{
        if (isComponentAttribute(attr)) acc.push(attrName);
        return acc;
    }, []);
};
const getMediaAttributes = (schema)=>{
    return ___default.default.reduce(schema.attributes, (acc, attr, attrName)=>{
        if (isMediaAttribute(attr)) acc.push(attrName);
        return acc;
    }, []);
};
const getScalarAttributes = (schema)=>{
    return ___default.default.reduce(schema.attributes, (acc, attr, attrName)=>{
        if (isScalarAttribute(attr)) acc.push(attrName);
        return acc;
    }, []);
};
const getRelationalAttributes = (schema)=>{
    return ___default.default.reduce(schema.attributes, (acc, attr, attrName)=>{
        if (isRelationalAttribute(attr)) acc.push(attrName);
        return acc;
    }, []);
};
/**
 * Checks if an attribute is of type `type`
 * @param {object} attribute
 * @param {string} type
 */ const isTypedAttribute = (attribute, type)=>{
    return ___default.default.has(attribute, 'type') && attribute.type === type;
};
/**
 *  Returns a route prefix for a contentType
 * @param {object} contentType
 * @returns {string}
 */ const getContentTypeRoutePrefix = (contentType)=>{
    return isSingleType(contentType) ? ___default.default.kebabCase(contentType.info.singularName) : ___default.default.kebabCase(contentType.info.pluralName);
};

exports.DYNAMIC_ZONE_KEYS = DYNAMIC_ZONE_KEYS;
exports.ID_FIELDS = ID_FIELDS;
exports.MORPH_TO_KEYS = MORPH_TO_KEYS;
exports.RELATION_OPERATION_KEYS = RELATION_OPERATION_KEYS;
exports.RESERVED_ATTRIBUTE_NAMES = RESERVED_ATTRIBUTE_NAMES;
exports.RESERVED_ATTRIBUTE_NAMES_DRAFT_PUBLISH = RESERVED_ATTRIBUTE_NAMES_DRAFT_PUBLISH;
exports.RESERVED_MODEL_NAMES = RESERVED_MODEL_NAMES;
exports.constants = constants;
exports.findDraftAndPublishReservedAttributeNames = findDraftAndPublishReservedAttributeNames;
exports.getComponentAttributes = getComponentAttributes;
exports.getContentTypeRoutePrefix = getContentTypeRoutePrefix;
exports.getCreatorFields = getCreatorFields;
exports.getDoesAttributeRequireValidation = getDoesAttributeRequireValidation;
exports.getDraftAndPublishEnableBlockedMessage = getDraftAndPublishEnableBlockedMessage;
exports.getDraftAndPublishReservedAttributeWarning = getDraftAndPublishReservedAttributeWarning;
exports.getMediaAttributes = getMediaAttributes;
exports.getNonVisibleAttributes = getNonVisibleAttributes;
exports.getNonWritableAttributes = getNonWritableAttributes;
exports.getOptions = getOptions;
exports.getPrivateAttributes = getPrivateAttributes;
exports.getRelationalAttributes = getRelationalAttributes;
exports.getReservedAttributeNames = getReservedAttributeNames;
exports.getReservedModelNames = getReservedModelNames;
exports.getScalarAttributes = getScalarAttributes;
exports.getTimestamps = getTimestamps;
exports.getVisibleAttributes = getVisibleAttributes;
exports.getWritableAttributes = getWritableAttributes;
exports.hasDraftAndPublish = hasDraftAndPublish;
exports.hasFirstPublishedAtField = hasFirstPublishedAtField;
exports.hasRelationReordering = hasRelationReordering;
exports.isCollectionType = isCollectionType;
exports.isComponentAttribute = isComponentAttribute;
exports.isComponentSchema = isComponentSchema;
exports.isContentTypeSchema = isContentTypeSchema;
exports.isDraft = isDraft;
exports.isDynamicZoneAttribute = isDynamicZoneAttribute;
exports.isKind = isKind;
exports.isMediaAttribute = isMediaAttribute;
exports.isMorphToRelationalAttribute = isMorphToRelationalAttribute;
exports.isPrivateAttribute = isPrivateAttribute;
exports.isRelationalAttribute = isRelationalAttribute;
exports.isReservedAttributeName = isReservedAttributeName;
exports.isReservedModelName = isReservedModelName;
exports.isScalarAttribute = isScalarAttribute;
exports.isSchema = isSchema;
exports.isSingleType = isSingleType;
exports.isTypedAttribute = isTypedAttribute;
exports.isVisibleAttribute = isVisibleAttribute;
exports.isWritableAttribute = isWritableAttribute;
//# sourceMappingURL=content-types.js.map
