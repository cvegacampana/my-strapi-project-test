import _, { curry, omit, assign, has, isNil, isEqual, isEmpty, isPlainObject } from 'lodash';
import { contentTypes, async, errors } from '@strapi/utils';
import { createField } from '@strapi/database';
import { getComponentJoinColumnEntityName, getComponentJoinColumnInverseName, getComponentTypeColumn, getComponentJoinTableName } from '../../utils/transform-content-types-to-models.mjs';

const omitComponentData = curry((schema, data)=>{
    const { attributes } = schema;
    const componentAttributes = Object.keys(attributes).filter((attributeName)=>contentTypes.isComponentAttribute(attributes[attributeName]));
    return omit(data, componentAttributes);
});
// NOTE: we could generalize the logic to allow CRUD of relation directly in the DB layer
const createComponents = async (uid, data)=>{
    const { attributes = {} } = strapi.getModel(uid);
    const componentBody = {};
    const attributeNames = Object.keys(attributes);
    for (const attributeName of attributeNames){
        const attribute = attributes[attributeName];
        if (!has(data, attributeName) || !contentTypes.isComponentAttribute(attribute)) {
            continue;
        }
        if (attribute.type === 'component') {
            const { component: componentUID, repeatable = false } = attribute;
            const componentValue = data[attributeName];
            if (componentValue === null) {
                continue;
            }
            if (repeatable === true) {
                if (!Array.isArray(componentValue)) {
                    throw new Error('Expected an array to create repeatable component');
                }
                const components = await async.map(componentValue, (value)=>createComponent(componentUID, value));
                componentBody[attributeName] = components.map(({ id })=>{
                    return {
                        id,
                        __pivot: {
                            field: attributeName,
                            component_type: componentUID
                        }
                    };
                });
            } else {
                const component = await createComponent(componentUID, componentValue);
                componentBody[attributeName] = {
                    id: component.id,
                    __pivot: {
                        field: attributeName,
                        component_type: componentUID
                    }
                };
            }
            continue;
        }
        if (attribute.type === 'dynamiczone') {
            const dynamiczoneValues = data[attributeName];
            if (!Array.isArray(dynamiczoneValues)) {
                throw new Error('Expected an array to create repeatable component');
            }
            const createDynamicZoneComponents = async (value)=>{
                const { id } = await createComponent(value.__component, value);
                return {
                    id,
                    __component: value.__component,
                    __pivot: {
                        field: attributeName
                    }
                };
            };
            // MySQL/MariaDB can cause deadlocks here if concurrency higher than 1
            componentBody[attributeName] = await async.map(dynamiczoneValues, createDynamicZoneComponents);
            continue;
        }
    }
    return componentBody;
};
const getComponents = async (uid, entity)=>{
    const componentAttributes = contentTypes.getComponentAttributes(strapi.getModel(uid));
    if (_.isEmpty(componentAttributes)) {
        return {};
    }
    return strapi.db.query(uid).load(entity, componentAttributes);
};
/*
  delete old components
  create or update
*/ const updateComponents = async (uid, entityToUpdate, data)=>{
    const { attributes = {} } = strapi.getModel(uid);
    const componentBody = {};
    for (const attributeName of Object.keys(attributes)){
        const attribute = attributes[attributeName];
        if (!has(data, attributeName)) {
            continue;
        }
        if (attribute.type === 'component') {
            const { component: componentUID, repeatable = false } = attribute;
            const componentValue = data[attributeName];
            const previousValue = await deleteOldComponents(uid, componentUID, entityToUpdate, attributeName, componentValue);
            const previousComponents = _.castArray(previousValue ?? []).filter((component)=>!isNil(component));
            const previousById = new Map(previousComponents.map((component)=>[
                    pickStringifiedId(component),
                    component
                ]));
            const getPrevious = (value)=>value && has(value, 'id') && !isNil(value.id) ? previousById.get(pickStringifiedId(value)) : undefined;
            if (repeatable === true) {
                if (!Array.isArray(componentValue)) {
                    throw new Error('Expected an array to create repeatable component');
                }
                // MySQL/MariaDB can cause deadlocks here if concurrency higher than 1
                const results = await async.map(componentValue, (value)=>updateOrCreateComponent(componentUID, value, getPrevious(value)));
                const components = results.filter((result)=>!isNil(result));
                // The join rows are already right when no component changed and the list kept its order
                const sameList = isEqual(components.map(pickStringifiedId), previousComponents.map((component)=>pickStringifiedId(component)));
                if (sameList && components.every((component)=>!component.changed)) {
                    continue;
                }
                componentBody[attributeName] = components.map(({ id })=>{
                    return {
                        id,
                        __pivot: {
                            field: attributeName,
                            component_type: componentUID
                        }
                    };
                });
            } else {
                const component = await updateOrCreateComponent(componentUID, componentValue, getPrevious(componentValue));
                const previousId = previousComponents[0] ? pickStringifiedId(previousComponents[0]) : null;
                const currentId = component ? pickStringifiedId(component) : null;
                if (previousId === currentId && (!component || !component.changed)) {
                    continue;
                }
                componentBody[attributeName] = component ? {
                    id: component.id,
                    __pivot: {
                        field: attributeName,
                        component_type: componentUID
                    }
                } : null;
            }
        } else if (attribute.type === 'dynamiczone') {
            const dynamiczoneValues = data[attributeName];
            const previousValue = await deleteOldDZComponents(uid, entityToUpdate, attributeName, dynamiczoneValues);
            if (!Array.isArray(dynamiczoneValues)) {
                throw new Error('Expected an array to create repeatable component');
            }
            const toKey = (value)=>`${value.__component}:${pickStringifiedId(value)}`;
            const previousComponents = _.castArray(previousValue ?? []).filter((component)=>!isNil(component));
            const previousByKey = new Map(previousComponents.map((component)=>[
                    toKey(component),
                    component
                ]));
            // MySQL/MariaDB can cause deadlocks here if concurrency higher than 1
            const components = await async.map(dynamiczoneValues, async (value)=>{
                const previous = has(value, 'id') && !isNil(value.id) ? previousByKey.get(toKey(value)) : undefined;
                const result = await updateOrCreateComponent(value.__component, value, previous);
                return {
                    ...result,
                    __component: value.__component
                };
            });
            // The join rows are already right when no component changed and the zone kept its order
            const sameList = isEqual(components.map(toKey), previousComponents.map(toKey));
            if (sameList && components.every((component)=>!component.changed)) {
                continue;
            }
            componentBody[attributeName] = components.map(({ id, __component })=>{
                return {
                    id,
                    __component,
                    __pivot: {
                        field: attributeName
                    }
                };
            });
        }
    }
    return componentBody;
};
const pickStringifiedId = ({ id })=>{
    if (typeof id === 'string') {
        return id;
    }
    return `${id}`;
};
/**
 * Populate of the media attributes of a component, ids only, so that a loaded component can be
 * compared with the data sent for it (see isComponentUnchanged).
 */ const getMediaPopulate = (componentUID)=>{
    const { attributes = {} } = strapi.getModel(componentUID);
    const populate = Object.entries(attributes).reduce((acc, [attributeName, attribute])=>{
        if (attribute.type === 'media') {
            acc[attributeName] = {
                select: [
                    'id'
                ]
            };
        }
        return acc;
    }, {});
    return isEmpty(populate) ? undefined : populate;
};
const getComponentLoadParams = (componentUID)=>{
    const populate = getMediaPopulate(componentUID);
    return populate ? {
        populate
    } : undefined;
};
/**
 * Load params of a dynamic zone for the cleanup pass. The DB layer only returns the types listed
 * in `on`, and a zone may still hold components of a type that was removed from it, so every
 * registered component is listed, not only the ones the zone declares: those components have to
 * be deleted too when they are no longer sent.
 */ const getDynamicZoneLoadParams = ()=>{
    const on = {};
    let hasMedia = false;
    for (const componentUID of Object.keys(strapi.components)){
        const populate = getMediaPopulate(componentUID);
        on[componentUID] = populate ? {
            populate
        } : {};
        hasMedia = hasMedia || populate !== undefined;
    }
    return hasMedia ? {
        on
    } : undefined;
};
/**
 * A relation or media sent as `{ connect: [], disconnect: [] }` leaves the stored value as it is.
 */ const isRelationInputNoop = (value)=>{
    if (!isPlainObject(value) || has(value, 'set')) {
        return false;
    }
    const { connect, disconnect, ...rest } = value;
    return isEmpty(connect) && isEmpty(disconnect) && Object.keys(rest).every((key)=>key === 'options');
};
/**
 * Ids of a media value, as loaded (`{ id }`, `[{ id }]`) or as sent (ids, `{ id }` objects, a `set`).
 * Returns null when they cannot be told.
 */ const toMediaIds = (value)=>{
    if (isNil(value)) {
        return [];
    }
    if (typeof value === 'number' || typeof value === 'string') {
        return [
            String(value)
        ];
    }
    if (Array.isArray(value)) {
        const ids = value.map((item)=>isPlainObject(item) ? item.id : item);
        return ids.every((id)=>typeof id === 'number' || typeof id === 'string') ? ids.map(String) : null;
    }
    if (isPlainObject(value)) {
        if (has(value, 'set')) {
            return toMediaIds(value.set);
        }
        if (has(value, 'id') && !has(value, 'connect') && !has(value, 'disconnect')) {
            return toMediaIds([
                value
            ]);
        }
    }
    return null;
};
const toComparableNumber = (value)=>{
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};
const toComparableBigInt = (value)=>{
    try {
        if (typeof value === 'bigint') {
            return value.toString();
        }
        if (typeof value === 'number' && Number.isInteger(value)) {
            return BigInt(value).toString();
        }
        if (typeof value === 'string' && value.trim() !== '') {
            return BigInt(value.trim()).toString();
        }
    } catch  {
    // not a big integer
    }
    return null;
};
/**
 * What the database layer would store for `value`, or null when it would reject it. Both sides of
 * a comparison go through it so that the comparison matches the write it replaces: the database
 * parsers read a date without a time in local time, format a Date as a local day and reject a
 * time without seconds, and none of that is reproduced here.
 */ const toStoredDateValue = (attribute, value)=>{
    try {
        const stored = createField({
            type: attribute.type
        }).toDB(value);
        return stored instanceof Date ? stored.getTime() : String(stored);
    } catch  {
        return null;
    }
};
const toComparableJson = (value)=>{
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch  {
            return value;
        }
    }
    return value;
};
const isScalarUnchanged = (attribute, stored, incoming)=>{
    if (isNil(stored) || isNil(incoming)) {
        return isNil(stored) && isNil(incoming);
    }
    switch(attribute.type){
        case 'string':
        case 'text':
        case 'richtext':
        case 'email':
        case 'enumeration':
        case 'uid':
            return typeof incoming === 'string' && String(stored) === incoming;
        case 'boolean':
            return typeof incoming === 'boolean' && stored === incoming;
        case 'integer':
        case 'float':
        case 'decimal':
            {
                const a = toComparableNumber(stored);
                return a !== null && a === toComparableNumber(incoming);
            }
        case 'biginteger':
            {
                const a = toComparableBigInt(stored);
                return a !== null && a === toComparableBigInt(incoming);
            }
        case 'date':
        case 'time':
        case 'datetime':
        case 'timestamp':
            {
                const a = toStoredDateValue(attribute, stored);
                return a !== null && a === toStoredDateValue(attribute, incoming);
            }
        case 'json':
        case 'blocks':
            return isEqual(toComparableJson(stored), toComparableJson(incoming));
        default:
            // passwords and unknown types: assume a change
            return false;
    }
};
/**
 * Whether the data sent for a component leaves it as it is stored. Nested components and dynamic
 * zones are not compared here: updateComponents only reports the ones that changed, and the caller
 * checks that it reported none. Anything that cannot be compared with certainty counts as a change.
 */ const isComponentUnchanged = (schema, stored, data)=>{
    return Object.entries(schema.attributes).every(([attributeName, attribute])=>{
        if (!has(data, attributeName) || contentTypes.isComponentAttribute(attribute)) {
            return true;
        }
        const incoming = data[attributeName];
        if (attribute.type === 'relation') {
            return isRelationInputNoop(incoming);
        }
        if (!has(stored, attributeName)) {
            return false;
        }
        if (attribute.type === 'media') {
            if (isRelationInputNoop(incoming)) {
                return true;
            }
            const storedIds = toMediaIds(stored[attributeName]);
            const incomingIds = toMediaIds(incoming);
            return storedIds !== null && incomingIds !== null && isEqual(storedIds, incomingIds);
        }
        return isScalarUnchanged(attribute, stored[attributeName], incoming);
    });
};
const deleteOldComponents = async (uid, componentUID, entityToUpdate, attributeName, componentValue)=>{
    const previousValue = await strapi.db.query(uid).load(entityToUpdate, attributeName, getComponentLoadParams(componentUID));
    const idsToKeep = _.castArray(componentValue).filter((value)=>has(value, 'id')).map(pickStringifiedId);
    const allIds = _.castArray(previousValue).filter((value)=>has(value, 'id')).map(pickStringifiedId);
    idsToKeep.forEach((id)=>{
        if (!allIds.includes(id)) {
            throw new errors.ApplicationError(`Some of the provided components in ${attributeName} are not related to the entity`);
        }
    });
    const idsToDelete = _.difference(allIds, idsToKeep);
    if (idsToDelete.length > 0) {
        for (const idToDelete of idsToDelete){
            await deleteComponent(componentUID, {
                id: idToDelete
            });
        }
    }
    return previousValue;
};
const deleteOldDZComponents = async (uid, entityToUpdate, attributeName, dynamiczoneValues)=>{
    const previousValue = await strapi.db.query(uid).load(entityToUpdate, attributeName, getDynamicZoneLoadParams());
    const idsToKeep = _.castArray(dynamiczoneValues).filter((value)=>has(value, 'id')).map((v)=>({
            id: pickStringifiedId(v),
            __component: v.__component
        }));
    const allIds = _.castArray(previousValue).filter((value)=>has(value, 'id')).map((v)=>({
            id: pickStringifiedId(v),
            __component: v.__component
        }));
    idsToKeep.forEach(({ id, __component: componentUID })=>{
        if (!allIds.find((el)=>el.id === id && el.__component === componentUID)) {
            const err = new Error(`Some of the provided components in ${attributeName} are not related to the entity`);
            Object.assign(err, {
                status: 400
            });
            throw err;
        }
    });
    const idsToDelete = allIds.reduce((acc, { id, __component: componentUID })=>{
        if (!idsToKeep.find((el)=>el.id === id && el.__component === componentUID)) {
            acc.push({
                id,
                __component: componentUID
            });
        }
        return acc;
    }, []);
    if (idsToDelete.length > 0) {
        for (const idToDelete of idsToDelete){
            const { id, __component: componentUID } = idToDelete;
            await deleteComponent(componentUID, {
                id
            });
        }
    }
    return previousValue;
};
const addComponentIds = (groups, componentUID, ids)=>{
    if (ids.length > 0) {
        groups.set(componentUID, [
            ...groups.get(componentUID) ?? [],
            ...ids
        ]);
    }
};
/**
 * Ids of the components held by the component and dynamic zone attributes of `values`, by component uid.
 */ const groupComponentsByUid = (schema, values)=>{
    const groups = new Map();
    for (const [attributeName, attribute] of Object.entries(schema.attributes)){
        const value = values[attributeName];
        if (isNil(value)) {
            continue;
        }
        const components = _.castArray(value).filter((component)=>isPlainObject(component) && !isNil(component.id));
        if (attribute.type === 'component') {
            addComponentIds(groups, attribute.component, components.map((component)=>component.id));
        } else if (attribute.type === 'dynamiczone') {
            for (const component of components){
                if (component.__component) {
                    addComponentIds(groups, component.__component, [
                        component.id
                    ]);
                }
            }
        }
    }
    return groups;
};
/**
 * Ids of every component under an entry or a component, by component uid, down to the deepest
 * level. Each level costs one query per component uid holding nested components, whatever the
 * number of components.
 */ const collectComponentTree = async (uid, entity, { loadComponents = true } = {})=>{
    const tree = new Map();
    const schema = strapi.getModel(uid);
    const componentAttributes = contentTypes.getComponentAttributes(schema);
    if (componentAttributes.length === 0) {
        return tree;
    }
    const values = loadComponents ? await strapi.db.query(uid).load(entity, componentAttributes) : entity;
    let level = groupComponentsByUid(schema, values ?? {});
    while(level.size > 0){
        const nextLevel = new Map();
        for (const [componentUID, ids] of level){
            addComponentIds(tree, componentUID, ids);
            const componentSchema = strapi.getModel(componentUID);
            const nestedAttributes = contentTypes.getComponentAttributes(componentSchema);
            if (nestedAttributes.length === 0) {
                continue;
            }
            // Read without lifecycles: the per-row path never ran `findMany` on a component type, so no
            // subscriber should start receiving those events here
            const rows = await strapi.db.queryBuilder(componentUID).init({
                where: {
                    id: {
                        $in: ids
                    }
                },
                select: [
                    'id'
                ],
                populate: Object.fromEntries(nestedAttributes.map((attributeName)=>[
                        attributeName,
                        // dynamic zone items need their __component, keep every column for them
                        componentSchema.attributes[attributeName].type === 'dynamiczone' ? true : {
                            select: [
                                'id'
                            ]
                        }
                    ]))
            }).execute();
            for (const row of rows){
                for (const [nestedUID, nestedIds] of groupComponentsByUid(componentSchema, row)){
                    addComponentIds(nextLevel, nestedUID, nestedIds);
                }
            }
        }
        level = nextLevel;
    }
    return tree;
};
const UPDATE_LIFECYCLES = [
    'beforeUpdate',
    'afterUpdate'
];
const DELETE_LIFECYCLES = [
    'beforeDelete',
    'afterDelete',
    'beforeDeleteMany',
    'afterDeleteMany'
];
/**
 * Whether a database lifecycle subscriber would receive one of `actions` for the component type.
 */ const hasLifecycleSubscribers = (componentUID, actions)=>actions.some((action)=>strapi.db.lifecycles.hasSubscribers(action, componentUID));
/**
 * Deletes the components one by one, each with its own delete lifecycles.
 */ const deleteComponentsOneByOne = async (uid, entityToDelete, { loadComponents = true } = {})=>{
    const { attributes = {} } = strapi.getModel(uid);
    const attributeNames = Object.keys(attributes);
    for (const attributeName of attributeNames){
        const attribute = attributes[attributeName];
        if (attribute.type === 'component' || attribute.type === 'dynamiczone') {
            let value;
            if (loadComponents) {
                value = await strapi.db.query(uid).load(entityToDelete, attributeName);
            } else {
                value = entityToDelete[attributeName];
            }
            if (!value) {
                continue;
            }
            if (attribute.type === 'component') {
                const { component: componentUID } = attribute;
                await async.map(_.castArray(value), (subValue)=>deleteComponent(componentUID, subValue));
            } else {
                await async.map(_.castArray(value), (subValue)=>deleteComponent(subValue.__component, subValue));
            }
            continue;
        }
    }
};
// Keeps every statement under the parameter limits of the databases
const DELETE_BATCH_SIZE = 500;
/**
 * Deletes every component under an entry or a component. The whole tree is removed level by level
 * with one statement per component uid and per relation attribute. When a database lifecycle
 * subscriber listens to any delete lifecycle of one of those component uids, the components are
 * deleted one by one instead, so that each of them fires its events and no subscriber receives an
 * event it did not receive before.
 */ const deleteComponents = async (uid, entityToDelete, { loadComponents = true } = {})=>{
    const tree = await collectComponentTree(uid, entityToDelete, {
        loadComponents
    });
    if (tree.size === 0) {
        return;
    }
    if ([
        ...tree.keys()
    ].some((componentUID)=>hasLifecycleSubscribers(componentUID, DELETE_LIFECYCLES))) {
        await deleteComponentsOneByOne(uid, entityToDelete, {
            loadComponents
        });
        return;
    }
    await strapi.db.transaction(async ({ trx })=>{
        for (const [componentUID, ids] of tree){
            for (const batch of _.chunk(ids, DELETE_BATCH_SIZE)){
                await strapi.db.entityManager.deleteManyRelations(componentUID, batch, {
                    transaction: trx
                });
                await strapi.db.query(componentUID).deleteMany({
                    where: {
                        id: {
                            $in: batch
                        }
                    }
                });
            }
        }
    });
};
/** *************************
    Component queries
************************** */ // components can have nested compos so this must be recursive
const createComponent = async (uid, data)=>{
    const schema = strapi.getModel(uid);
    const componentData = await createComponents(uid, data);
    // Make sure we don't save the component with a pre-defined ID.
    const entryData = assignComponentData(schema, componentData, omit(data, 'id'));
    return strapi.db.query(uid).create({
        data: entryData
    });
};
// components can have nested compos so this must be recursive
const updateComponent = async (uid, componentToUpdate, data, previous)=>{
    const schema = strapi.getModel(uid);
    const componentData = await updateComponents(uid, componentToUpdate, data);
    // Nothing to write when the component is stored as sent. updateComponents only reports the
    // nested attributes that changed, so an empty componentData means none of them did. The write
    // is kept when a lifecycle subscriber listens to it, so that it fires as before.
    if (previous && isEmpty(componentData) && !hasLifecycleSubscribers(uid, UPDATE_LIFECYCLES) && isComponentUnchanged(schema, previous, data)) {
        return {
            id: componentToUpdate.id,
            changed: false
        };
    }
    const component = await strapi.db.query(uid).update({
        where: {
            id: componentToUpdate.id
        },
        data: assignComponentData(schema, componentData, data)
    });
    return component ? {
        id: component.id,
        changed: true
    } : null;
};
const updateOrCreateComponent = async (componentUID, value, previous)=>{
    if (value === null) {
        return null;
    }
    // update
    if ('id' in value && typeof value.id !== 'undefined') {
        // TODO: verify the compo is associated with the entity
        return updateComponent(componentUID, {
            id: value.id
        }, value, previous);
    }
    // create
    const component = await createComponent(componentUID, value);
    return {
        id: component.id,
        changed: true
    };
};
const deleteComponent = async (uid, componentToDelete)=>{
    await deleteComponents(uid, componentToDelete);
    await strapi.db.query(uid).delete({
        where: {
            id: componentToDelete.id
        }
    });
};
const assignComponentData = curry((schema, componentData, data)=>{
    return assign({}, componentData, omitComponentData(schema, data));
});
// Component instance ids are bound as query parameters, so look them up in batches that stay
// well below the bind parameter limit of every supported database
const PARENT_LOOKUP_BATCH_SIZE = 500;
/**
 * Find the parent entries of many instances of the same component.
 *
 * Given a component model, component instance ids, and the list of possible parent
 * content types and components (those that can embed this component), this function
 * checks each parent's *_cmps join table to see which instances it links to a parent.
 * Parents are checked in order and the first one linking an instance is its parent.
 *
 * Each parent costs one query per batch of instances rather than one query per instance,
 * and parents are no longer checked once every instance has been found.
 *
 * - Returns a map from component instance id (as a string) to its parent uid, parent table
 *   name and parent id.
 * - Instances without a parent are not in the map.
 */ const findComponentParents = async (componentSchema, componentIds, parentSchemasForComponent, opts)=>{
    const parents = new Map();
    if (!componentSchema?.uid) return parents;
    const withTrx = (qb)=>opts?.trx ? qb.transacting(opts.trx) : qb;
    // Use the exact same functions that create the columns
    const identifiers = strapi.db.metadata.identifiers;
    const entityIdColumn = getComponentJoinColumnEntityName(identifiers);
    const componentIdColumn = getComponentJoinColumnInverseName(identifiers);
    const componentTypeColumn = getComponentTypeColumn(identifiers);
    let pendingIds = _.uniqBy(componentIds.filter((id)=>id !== undefined && id !== null), String);
    for (const parent of parentSchemasForComponent){
        if (pendingIds.length === 0) break;
        if (!parent.collectionName) continue;
        // Use the exact same functions that create the tables
        const joinTableName = getComponentJoinTableName(parent.collectionName, identifiers);
        // The join table is registered as a model of its own (see createCompoLinkModel) and schema
        // sync creates every registered model, so the metadata knows whether it exists without
        // querying the database schema
        if (!strapi.db.metadata.has(joinTableName)) continue;
        for (const batch of _.chunk(pendingIds, PARENT_LOOKUP_BATCH_SIZE)){
            try {
                const parentRows = await withTrx(strapi.db.getConnection(joinTableName)).select(entityIdColumn, componentIdColumn).where(componentTypeColumn, componentSchema.uid).whereIn(componentIdColumn, batch);
                for (const parentRow of parentRows){
                    const componentId = String(parentRow[componentIdColumn]);
                    if (!parents.has(componentId)) {
                        parents.set(componentId, {
                            uid: parent.uid,
                            table: parent.collectionName,
                            parentId: parentRow[entityIdColumn]
                        });
                    }
                }
            } catch  {
                continue;
            }
        }
        pendingIds = pendingIds.filter((id)=>!parents.has(String(id)));
    }
    return parents;
};
/**
 * Find the parent entry of a component instance.
 *
 * Single-instance form of `findComponentParents`.
 *
 * - Returns the parent uid, parent table name, and parent id if found.
 * - Returns null if no parent relationship exists.
 */ const findComponentParent = async (componentSchema, componentId, parentSchemasForComponent, opts)=>{
    const parents = await findComponentParents(componentSchema, [
        componentId
    ], parentSchemasForComponent, opts);
    return parents.get(String(componentId)) ?? null;
};
/**
 * Finds content types that contain the given component and have draft & publish enabled.
 */ const getParentSchemasForComponent = (componentSchema)=>{
    // Find direct parents in contentTypes and components
    return [
        ...Object.values(strapi.contentTypes),
        ...Object.values(strapi.components)
    ].filter((schema)=>{
        if (!schema?.attributes) return false;
        return Object.values(schema.attributes).some((attr)=>{
            return attr.type === 'component' && attr.component === componentSchema.uid || attr.type === 'dynamiczone' && attr.components?.includes(componentSchema.uid);
        });
    });
};
/**
 * Finds which of the given component instances belong to an entry of a content type with
 * draft and publish enabled, either directly or through parent components.
 *
 * Instances are resolved one nesting level at a time, so the number of queries depends on
 * the schema rather than on the number of instances.
 *
 * - Returns the ids (as strings) of the instances owned by a draft and publish entry.
 * - Instances without a parent, or owned by an entry without draft and publish, are not included.
 */ const findInstancesOwnedByDraftAndPublishEntries = async (componentSchema, componentIds, trx)=>{
    const ownedIds = new Set();
    const parentSchemas = getParentSchemasForComponent(componentSchema);
    if (parentSchemas.length === 0) {
        return ownedIds;
    }
    const parents = await findComponentParents(componentSchema, componentIds, parentSchemas, {
        trx
    });
    // Instances nested in another component, grouped by that component and its instance id
    const nestedInstances = new Map();
    for (const [componentId, parent] of parents){
        if (strapi.components[parent.uid]) {
            const parentUid = parent.uid;
            const parentKey = String(parent.parentId);
            if (!nestedInstances.has(parentUid)) {
                nestedInstances.set(parentUid, new Map());
            }
            const instancesByParent = nestedInstances.get(parentUid);
            if (!instancesByParent.has(parentKey)) {
                instancesByParent.set(parentKey, {
                    parentId: parent.parentId,
                    componentIds: []
                });
            }
            instancesByParent.get(parentKey).componentIds.push(componentId);
            continue;
        }
        if (strapi.contentTypes[parent.uid]?.options?.draftAndPublish) {
            ownedIds.add(componentId);
        }
    }
    // If the parent is a component, its own parents decide, so check them a level up
    for (const [parentUid, instancesByParent] of nestedInstances){
        const ownedParentIds = await findInstancesOwnedByDraftAndPublishEntries(strapi.components[parentUid], Array.from(instancesByParent.values(), ({ parentId })=>parentId), trx);
        for (const parentKey of ownedParentIds){
            instancesByParent.get(parentKey)?.componentIds.forEach((id)=>ownedIds.add(id));
        }
    }
    return ownedIds;
};
/**
 * Creates a filter function for component relations that can be passed to the generic
 * unidirectional relations utility.
 *
 * A relation of a component instance is propagated to the new document version unless the
 * instance belongs to an entry with draft and publish enabled: that entry's new version gets
 * its own copy of the component.
 */ const createComponentRelationFilter = ()=>{
    return async (relations, model, trx)=>{
        // Only apply component-specific filtering for components
        if (model.modelType !== 'component' || relations.length === 0) {
            return relations;
        }
        const componentSchema = model;
        // Get the component ID column name using the actual component model name
        const componentIdColumn = strapi.db.metadata.identifiers.getJoinColumnAttributeIdName(_.snakeCase(componentSchema.modelName));
        const ownedIds = await findInstancesOwnedByDraftAndPublishEntries(componentSchema, relations.map((relation)=>relation[componentIdColumn]), trx);
        return relations.filter((relation)=>!ownedIds.has(String(relation[componentIdColumn])));
    };
};

export { assignComponentData, createComponentRelationFilter, createComponents, deleteComponent, deleteComponents, findComponentParent, getComponents, getParentSchemasForComponent, isComponentUnchanged, omitComponentData, updateComponents };
//# sourceMappingURL=components.mjs.map
