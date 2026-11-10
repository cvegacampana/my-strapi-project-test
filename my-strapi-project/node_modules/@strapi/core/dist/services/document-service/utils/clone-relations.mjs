import { merge, set, get, unset, has } from 'lodash';
import { traverseEntity, contentTypes } from '@strapi/utils';
import { traverseEntityRelations as traverseEntityRelationsCurried } from '../transform/relations/utils/map-relation.mjs';
import { isLocalizedContentType, getDefaultLocale, getRelationTargetLocale } from '../transform/relations/utils/i18n.mjs';
import { getRelationTargetStatus } from '../transform/relations/utils/dp.mjs';
import { setDefaultLocaleToRelation } from '../transform/relations/transform/default-locale.mjs';

const RELATION_OPERATIONS = [
    'connect',
    'disconnect',
    'set'
];
const isRecord = (value)=>{
    return value !== null && typeof value === 'object' && !Array.isArray(value);
};
const isRelationAttribute = (attribute)=>{
    return isRecord(attribute) && attribute.type === 'relation' && typeof attribute.relation === 'string';
};
const isRelationOperationPayload = (value)=>{
    return isRecord(value) && RELATION_OPERATIONS.some((operation)=>Object.prototype.hasOwnProperty.call(value, operation));
};
const hasMeaningfulRelationOperations = (value)=>{
    if (Object.prototype.hasOwnProperty.call(value, 'set')) {
        return true;
    }
    return [
        'connect',
        'disconnect'
    ].some((operation)=>{
        const operationValue = value[operation];
        return Array.isArray(operationValue) ? operationValue.length > 0 : operationValue != null;
    });
};
const usesJoinTable = (attribute)=>{
    return attribute.useJoinTable !== false;
};
const isBidirectionalOneToOne = (attribute)=>{
    return attribute.relation === 'oneToOne' && [
        attribute.inversedBy,
        attribute.mappedBy,
        attribute.targetAttribute
    ].some((inverseAttribute)=>inverseAttribute != null);
};
const isMorphToOneAttribute = (attribute)=>{
    return attribute.relation === 'morphToOne';
};
const isBidirectionalOneToManyMappedBy = (attribute)=>{
    return attribute.relation === 'oneToMany' && attribute.mappedBy != null;
};
const hasPopulatedRelation = (value)=>{
    return isRecord(value) && ('id' in value || 'documentId' in value);
};
const hasPopulatedRelationList = (value)=>{
    return Array.isArray(value) && value.length > 0 && value.every((item)=>isRecord(item) && ('id' in item || 'documentId' in item));
};
const getSubmittedValueAtPath = (submitted, path)=>{
    return get(submitted, path);
};
const wasRelationSubmittedAtPath = (submitted, path)=>{
    return has(submitted, path);
};
const isRelationUnchangedAtPath = (submitted, path, submittedValue)=>{
    if (!wasRelationSubmittedAtPath(submitted, path)) {
        return true;
    }
    const isOperationPayload = isRelationOperationPayload(submittedValue);
    const hasMeaningfulOperations = isOperationPayload && hasMeaningfulRelationOperations(submittedValue);
    return isOperationPayload && !hasMeaningfulOperations;
};
/**
 * The nested collector walks the source entry, so a relation under a component
 * the clone payload set to null still looks omitted. That copy has no owner on
 * the clone and must not be queued. Missing paths are not removal: those owners
 * still need their deferred copy, and a later resolution failure must still throw.
 */ const isOwnerExplicitlyRemoved = (submitted, ownerPath)=>{
    const segments = ownerPath.split('.');
    let current = submitted;
    for (const segment of segments){
        if (Array.isArray(current)) {
            const index = Number(segment);
            if (!Number.isInteger(index) || index < 0 || index >= current.length) {
                return false;
            }
            current = current[index];
        } else if (isRecord(current) && Object.prototype.hasOwnProperty.call(current, segment)) {
            current = current[segment];
        } else {
            return false;
        }
        if (current === null) {
            return true;
        }
    }
    return false;
};
/**
 * Like `traverseEntityRelations`, but also visits inline storage (`useJoinTable: false`
 * and `morphToOne`). Clone follow-up must see those relations; the shared transform
 * helper intentionally skips them because they are handled in processData.
 */ const traverseAllEntityRelations = async (visitor, options, data)=>{
    return traverseEntity(async (visitorOptions, utils)=>{
        const { attribute } = visitorOptions;
        if (!attribute || attribute.type !== 'relation') {
            return;
        }
        return visitor(visitorOptions, utils);
    }, options, data);
};
const collectRelationOperationOverrides = async (submittedData, contentType, getModel)=>{
    const overrides = new Map();
    await traverseEntityRelationsCurried(({ path, value })=>{
        if (isRelationOperationPayload(value) && hasMeaningfulRelationOperations(value)) {
            overrides.set(path.rawWithIndices, value);
        }
    }, {
        schema: contentType,
        getModel
    }, submittedData);
    return [
        ...overrides.entries()
    ].sort(([leftPath], [rightPath])=>leftPath.localeCompare(rightPath));
};
const collectNestedCloneRelationAdjustments = async (originalData, submitted, contentType, getModel, data)=>{
    const adjustedData = data;
    const deferredCopies = [];
    const postCloneUpdates = [];
    await traverseAllEntityRelations(({ attribute, key, path, schema, value })=>{
        if (!attribute || !isRelationAttribute(attribute)) {
            return;
        }
        const relationPath = path.rawWithIndices;
        // Owner is the parent of the relation path (preserve indices for
        // repeatable components / DZs, e.g. `items.0.tag` → `items.0`).
        // Top-level relations have no parent segment → null (root entry).
        const lastDot = relationPath.lastIndexOf('.');
        const ownerPath = lastDot === -1 ? null : relationPath.slice(0, lastDot);
        if (ownerPath == null) {
            return;
        }
        if (isOwnerExplicitlyRemoved(submitted, ownerPath)) {
            return;
        }
        const submittedValue = getSubmittedValueAtPath(submitted, relationPath);
        const relationIsUnchanged = isRelationUnchangedAtPath(submitted, relationPath, submittedValue);
        if (relationIsUnchanged && isBidirectionalOneToOne(attribute) && usesJoinTable(attribute) && hasPopulatedRelation(value)) {
            unset(adjustedData, relationPath);
            deferredCopies.push({
                schemaUid: schema.uid,
                attributeName: key,
                kind: 'joinTable',
                ownerPath
            });
            return;
        }
        if (relationIsUnchanged && isBidirectionalOneToOne(attribute) && !usesJoinTable(attribute) && hasPopulatedRelation(value)) {
            unset(adjustedData, relationPath);
            deferredCopies.push({
                schemaUid: schema.uid,
                attributeName: key,
                kind: 'fkColumn',
                ownerPath
            });
            return;
        }
        // Always defer morphToOne: populate can be null even when morph columns are set.
        if (relationIsUnchanged && isMorphToOneAttribute(attribute)) {
            unset(adjustedData, relationPath);
            deferredCopies.push({
                schemaUid: schema.uid,
                attributeName: key,
                kind: 'morphToOne',
                ownerPath
            });
            return;
        }
        if (relationIsUnchanged && isBidirectionalOneToManyMappedBy(attribute) && hasPopulatedRelationList(value)) {
            unset(adjustedData, relationPath);
            return;
        }
        if (!relationIsUnchanged && isRelationOperationPayload(submittedValue) && hasMeaningfulRelationOperations(submittedValue) && (!usesJoinTable(attribute) || isMorphToOneAttribute(attribute))) {
            unset(adjustedData, relationPath);
            postCloneUpdates.push({
                dataPath: relationPath,
                value: submittedValue,
                schemaUid: schema.uid,
                ownerPath
            });
        }
    }, {
        schema: contentType,
        getModel
    }, originalData);
    return {
        data: adjustedData,
        deferredCopies,
        postCloneUpdates
    };
};
const prepareCloneData = async (originalData, submittedData, contentType, getModel)=>{
    const submitted = submittedData ?? {};
    const relationOperationOverrides = await collectRelationOperationOverrides(submitted, contentType, getModel);
    let data = merge({}, originalData, submitted);
    const deferredCopies = [];
    const postCloneUpdates = [];
    for (const [attributeName, attribute] of Object.entries(contentType.attributes)){
        if (!isRelationAttribute(attribute)) {
            continue;
        }
        const submittedValue = submitted[attributeName];
        const relationWasSubmitted = Object.prototype.hasOwnProperty.call(submitted, attributeName);
        const isOperationPayload = isRelationOperationPayload(submittedValue);
        const hasMeaningfulOperations = isOperationPayload && hasMeaningfulRelationOperations(submittedValue);
        const relationIsUnchanged = !relationWasSubmitted || isOperationPayload && !hasMeaningfulOperations;
        if (relationIsUnchanged && isBidirectionalOneToOne(attribute) && usesJoinTable(attribute) && hasPopulatedRelation(originalData[attributeName])) {
            delete data[attributeName];
            deferredCopies.push({
                schemaUid: contentType.uid,
                attributeName,
                kind: 'joinTable',
                ownerPath: null
            });
            continue;
        }
        if (relationIsUnchanged && isBidirectionalOneToOne(attribute) && !usesJoinTable(attribute) && hasPopulatedRelation(originalData[attributeName])) {
            delete data[attributeName];
            deferredCopies.push({
                schemaUid: contentType.uid,
                attributeName,
                kind: 'fkColumn',
                ownerPath: null
            });
            continue;
        }
        // Always defer morphToOne: populate can be null even when morph columns are set.
        if (relationIsUnchanged && isMorphToOneAttribute(attribute)) {
            delete data[attributeName];
            deferredCopies.push({
                schemaUid: contentType.uid,
                attributeName,
                kind: 'morphToOne',
                ownerPath: null
            });
            continue;
        }
        if (relationIsUnchanged && isBidirectionalOneToManyMappedBy(attribute) && hasPopulatedRelationList(originalData[attributeName])) {
            delete data[attributeName];
            continue;
        }
        if (!relationIsUnchanged && isRelationOperationPayload(submittedValue) && hasMeaningfulOperations && (!usesJoinTable(attribute) || isMorphToOneAttribute(attribute))) {
            delete data[attributeName];
            postCloneUpdates.push({
                dataPath: attributeName,
                value: submittedValue,
                schemaUid: contentType.uid,
                ownerPath: null
            });
        }
    }
    const nested = await collectNestedCloneRelationAdjustments(originalData, submitted, contentType, getModel, data);
    data = nested.data;
    deferredCopies.push(...nested.deferredCopies);
    postCloneUpdates.push(...nested.postCloneUpdates);
    for (const [path, value] of relationOperationOverrides){
        set(data, path, value);
    }
    return {
        data,
        deferredCopies,
        postCloneUpdates
    };
};
const resolveOwnerEntryId = (entryData, ownerPath, fallbackId)=>{
    if (ownerPath == null) {
        return fallbackId;
    }
    const owner = get(entryData, ownerPath);
    const ownerId = owner?.id;
    return typeof ownerId === 'number' ? ownerId : undefined;
};
const ownerComponentUid = (owner)=>{
    if (!isRecord(owner) || typeof owner.__component !== 'string') {
        return undefined;
    }
    return owner.__component;
};
/**
 * A dynamic-zone block can be replaced by another component at the same index.
 * Component ids are allocated per table, so a deferred write that still uses the
 * source component UID and the new row id updates an unrelated row.
 */ const ownerComponentWasReplaced = (originalData, clonedData, ownerPath)=>{
    if (ownerPath == null) {
        return false;
    }
    const sourceComponent = ownerComponentUid(get(originalData, ownerPath));
    const cloneComponent = ownerComponentUid(get(clonedData, ownerPath));
    return sourceComponent != null && cloneComponent != null && sourceComponent !== cloneComponent;
};
const copyCloneRelationRows = async (strapi, uid, attributeName, sourceEntryId, targetEntryId)=>{
    const { attributes } = strapi.db.metadata.get(uid);
    const attribute = attributes[attributeName];
    if (attribute?.type !== 'relation' || !('joinTable' in attribute) || !attribute.joinTable) {
        return;
    }
    const idColumn = strapi.db.metadata.identifiers.ID_COLUMN;
    const batchSize = strapi.db.dialect.getBatchInsertSize();
    const { joinTable } = attribute;
    const { joinColumn } = joinTable;
    await strapi.db.transaction(async ({ trx })=>{
        const rows = await strapi.db.getConnection(joinTable.name).where({
            [joinColumn.name]: sourceEntryId,
            ...'on' in joinTable && joinTable.on
        }).select('*').transacting(trx);
        const rowsToCopy = rows.map((row)=>{
            const copiedRow = {
                ...row,
                [joinColumn.name]: targetEntryId
            };
            delete copiedRow[idColumn];
            return copiedRow;
        });
        for(let index = 0; index < rowsToCopy.length; index += batchSize){
            await strapi.db.getConnection(joinTable.name).insert(rowsToCopy.slice(index, index + batchSize)).transacting(trx);
        }
    });
};
const copyFkColumnRelation = async (strapi, targetUid, attributeName, sourceEntryId, targetEntryId, sourceUid = targetUid)=>{
    const meta = strapi.db.metadata.get(sourceUid);
    const attribute = meta.attributes[attributeName];
    if (attribute?.type !== 'relation' || !('joinColumn' in attribute) || !attribute.joinColumn) {
        return;
    }
    // Inverse/non-owning joinColumn.name is this table's `id`, not an FK. Copying it
    // attaches an unrelated row whose numeric id happens to match the source id.
    if (!('owner' in attribute) || attribute.owner !== true) {
        return;
    }
    const joinColumnName = attribute.joinColumn.name;
    await strapi.db.transaction(async ({ trx })=>{
        const sourceRow = await strapi.db.getConnection(meta.tableName).where({
            id: sourceEntryId
        }).select([
            joinColumnName
        ]).transacting(trx).first();
        if (!sourceRow) {
            return;
        }
        const targetAttribute = strapi.db.metadata.get(targetUid).attributes[attributeName];
        if (targetAttribute?.type !== 'relation' || targetAttribute.relation !== 'oneToOne') {
            return;
        }
        // processData only accepts attribute names, not raw join-column names
        await strapi.db.query(targetUid).update({
            where: {
                id: targetEntryId
            },
            data: {
                [attributeName]: sourceRow[joinColumnName] ?? null
            }
        });
    });
};
const copyMorphToOneRelation = async (strapi, targetUid, attributeName, sourceEntryId, targetEntryId, sourceUid = targetUid)=>{
    const sourceAttribute = strapi.db.metadata.get(sourceUid).attributes[attributeName];
    const targetAttribute = strapi.db.metadata.get(targetUid).attributes[attributeName];
    if (sourceAttribute?.type !== 'relation' || sourceAttribute.relation !== 'morphToOne' || !sourceAttribute.morphColumn || targetAttribute?.type !== 'relation' || targetAttribute.relation !== 'morphToOne') {
        return;
    }
    const { idColumn, typeColumn } = sourceAttribute.morphColumn;
    const typeField = targetAttribute.morphColumn?.typeField ?? '__type';
    const sourceMeta = strapi.db.metadata.get(sourceUid);
    await strapi.db.transaction(async ({ trx })=>{
        const sourceRow = await strapi.db.getConnection(sourceMeta.tableName).where({
            id: sourceEntryId
        }).select([
            idColumn.name,
            typeColumn.name
        ]).transacting(trx).first();
        if (!sourceRow) {
            return;
        }
        const morphId = sourceRow[idColumn.name];
        const morphType = sourceRow[typeColumn.name];
        // processData only accepts the morph attribute ({ id, __type }), not raw column names
        await strapi.db.query(targetUid).update({
            where: {
                id: targetEntryId
            },
            data: {
                [attributeName]: morphId != null && morphType != null ? {
                    id: morphId,
                    [typeField]: morphType
                } : null
            }
        });
    });
};
const applyDeferredCloneRelationCopies = async (strapi, rootUid, sourceRootId, targetRootId, originalData, clonedData, deferredCopies)=>{
    if (deferredCopies.length === 0) {
        return;
    }
    for (const task of deferredCopies){
        // Root owners (ownerPath === null) resolve via the fallback root IDs.
        // Nested owners must resolve explicitly — falling back to the root ID would
        // copy component-schema relation rows using an unrelated document ID.
        const sourceEntryId = resolveOwnerEntryId(originalData, task.ownerPath, sourceRootId);
        const targetEntryId = resolveOwnerEntryId(clonedData, task.ownerPath, targetRootId);
        if (sourceEntryId == null || targetEntryId == null) {
            throw new Error(`Unable to resolve clone relation owner for "${task.attributeName}" at path "${task.ownerPath ?? '<root>'}"`);
        }
        if (ownerComponentWasReplaced(originalData, clonedData, task.ownerPath)) {
            continue;
        }
        if (sourceEntryId === targetEntryId) {
            continue;
        }
        if (task.kind === 'joinTable') {
            await copyCloneRelationRows(strapi, task.schemaUid, task.attributeName, sourceEntryId, targetEntryId);
        } else if (task.kind === 'fkColumn') {
            await copyFkColumnRelation(strapi, task.schemaUid, task.attributeName, sourceEntryId, targetEntryId);
        } else if (task.kind === 'morphToOne') {
            await copyMorphToOneRelation(strapi, task.schemaUid, task.attributeName, sourceEntryId, targetEntryId);
        }
    }
};
const toRelationRef = (value)=>{
    if (isRecord(value)) {
        return value;
    }
    if (typeof value === 'number') {
        return {
            id: value
        };
    }
    // Document Service shorthand: a string is a documentId, matching mapRelation.
    if (typeof value === 'string') {
        return {
            documentId: value
        };
    }
    return undefined;
};
const relationOperationList = (value)=>{
    if (Array.isArray(value)) {
        return value;
    }
    if (value == null) {
        return [];
    }
    return [
        value
    ];
};
const pickInlineRelationTargetRef = (value)=>{
    if (Object.prototype.hasOwnProperty.call(value, 'set')) {
        const setValue = value.set;
        if (setValue == null) {
            return null;
        }
        const list = relationOperationList(setValue);
        if (list.length === 0) {
            return null;
        }
        return toRelationRef(list[list.length - 1]);
    }
    const connect = value.connect;
    if (connect == null) {
        return undefined;
    }
    const list = relationOperationList(connect);
    if (list.length === 0) {
        return undefined;
    }
    return toRelationRef(list[list.length - 1]);
};
const toRelationStatus = (value)=>{
    return value === 'draft' || value === 'published' ? value : undefined;
};
const resolveEntryIdsByRef = async (strapi, sourceUid, targetUid, ref, opts)=>{
    if (typeof ref.id === 'number') {
        return [
            ref.id
        ];
    }
    if (typeof ref.documentId !== 'string') {
        return [];
    }
    let relation = {
        documentId: ref.documentId,
        locale: typeof ref.locale === 'string' ? ref.locale : undefined,
        status: toRelationStatus(ref.status)
    };
    if (relation.locale == null && !isLocalizedContentType(sourceUid) && isLocalizedContentType(targetUid)) {
        relation = setDefaultLocaleToRelation(relation, await getDefaultLocale());
    }
    const targetLocale = getRelationTargetLocale(relation, {
        targetUid,
        sourceUid,
        sourceLocale: opts.locale
    });
    const sourceHasDP = contentTypes.hasDraftAndPublish(strapi.getModel(sourceUid));
    const statuses = getRelationTargetStatus(relation, {
        targetUid,
        sourceUid,
        sourceStatus: sourceHasDP ? 'draft' : undefined
    });
    const model = strapi.getModel(targetUid);
    const targetHasDP = contentTypes.hasDraftAndPublish(model);
    const resolvedIds = [];
    for (const status of statuses){
        const where = {
            documentId: ref.documentId
        };
        if (targetHasDP) {
            where.publishedAt = status === 'draft' ? null : {
                $ne: null
            };
        }
        if (targetLocale) {
            where.locale = targetLocale;
        }
        const row = await strapi.db.query(targetUid).findOne({
            where,
            select: [
                'id'
            ]
        });
        if (typeof row?.id === 'number' && !resolvedIds.includes(row.id)) {
            resolvedIds.push(row.id);
        }
    }
    return resolvedIds;
};
const resolveEntryIdByRef = async (strapi, sourceUid, targetUid, ref, opts)=>{
    const resolvedIds = await resolveEntryIdsByRef(strapi, sourceUid, targetUid, ref, opts);
    // Single-column FK/morph storage can keep only one id; match entity-manager and
    // keep the last resolved status when the standard resolver returns both.
    return resolvedIds.at(-1);
};
const getMorphTypeField = (attribute)=>{
    const morphColumn = 'morphColumn' in attribute ? attribute.morphColumn : undefined;
    return morphColumn?.typeField ?? '__type';
};
const hasRelationTarget = (attribute)=>{
    return 'target' in attribute && typeof attribute.target === 'string';
};
const currentAssociationId = (current)=>{
    if (typeof current === 'number') {
        return current;
    }
    if (isRecord(current) && typeof current.id === 'number') {
        return current.id;
    }
    return undefined;
};
const disconnectMatchesCurrent = async (strapi, sourceUid, attribute, disconnect, current, opts)=>{
    const currentId = currentAssociationId(current);
    if (currentId == null) {
        return false;
    }
    const typeField = getMorphTypeField(attribute);
    const currentType = isMorphToOneAttribute(attribute) && isRecord(current) && typeof current[typeField] === 'string' ? current[typeField] : undefined;
    for (const item of disconnect){
        let ref = null;
        if (isRecord(item)) {
            ref = item;
        } else if (typeof item === 'number' || typeof item === 'string') {
            ref = {
                id: item
            };
        }
        if (!ref) {
            continue;
        }
        if (isMorphToOneAttribute(attribute)) {
            const targetUid = ref[typeField];
            if (typeof targetUid !== 'string') {
                continue;
            }
            if (currentType != null && currentType !== targetUid) {
                continue;
            }
            const ids = await resolveEntryIdsByRef(strapi, sourceUid, targetUid, ref, opts);
            if (ids.includes(currentId)) {
                return true;
            }
            continue;
        }
        if (!hasRelationTarget(attribute)) {
            continue;
        }
        const ids = await resolveEntryIdsByRef(strapi, sourceUid, attribute.target, ref, opts);
        if (ids.includes(currentId)) {
            return true;
        }
    }
    return false;
};
const resolveInlineRelationAssignment = async (strapi, attribute, value, opts)=>{
    const targetRef = pickInlineRelationTargetRef(value);
    if (targetRef === undefined) {
        const disconnect = relationOperationList(value.disconnect);
        if (disconnect.length === 0) {
            return undefined;
        }
        const matches = await disconnectMatchesCurrent(strapi, opts.sourceUid, attribute, disconnect, opts.originalValue, {
            locale: opts.locale
        });
        if (matches) {
            return null;
        }
        // Unmatched disconnect must keep the original association. The clone was
        // created without the relation (stripped from create data), so copy it now.
        if (opts.sourceOwnerId == null) {
            throw new Error(`Unable to restore clone relation "${opts.attributeName}" after unmatched disconnect`);
        }
        const readUid = opts.sourceSchemaUid ?? opts.ownerUid;
        if (isMorphToOneAttribute(attribute)) {
            await copyMorphToOneRelation(strapi, opts.ownerUid, opts.attributeName, opts.sourceOwnerId, opts.targetOwnerId, readUid);
        } else {
            await copyFkColumnRelation(strapi, opts.ownerUid, opts.attributeName, opts.sourceOwnerId, opts.targetOwnerId, readUid);
        }
        return undefined;
    }
    if (targetRef === null) {
        return null;
    }
    if (isMorphToOneAttribute(attribute)) {
        const typeField = getMorphTypeField(attribute);
        const targetUid = targetRef[typeField];
        if (typeof targetUid !== 'string') {
            throw new Error(`Inline morphToOne clone update requires ${typeField}`);
        }
        const id = await resolveEntryIdByRef(strapi, opts.sourceUid, targetUid, targetRef, opts);
        if (id == null) {
            throw new Error(`Unable to resolve morphToOne target for clone relation update`);
        }
        return {
            id,
            [typeField]: targetUid
        };
    }
    if (!hasRelationTarget(attribute)) {
        throw new Error('Inline FK clone update requires a relation target');
    }
    const id = await resolveEntryIdByRef(strapi, opts.sourceUid, attribute.target, targetRef, opts);
    if (id == null) {
        throw new Error(`Unable to resolve relation target for clone relation update`);
    }
    return id;
};
const applyPostCloneRelationUpdates = async (strapi, rootUid, sourceRootId, clonedEntryId, clonedData, originalData, postCloneUpdates)=>{
    if (postCloneUpdates.length === 0) {
        return;
    }
    const locale = clonedData.locale;
    for (const update of postCloneUpdates){
        const attributeName = update.dataPath.split('.').pop();
        const ownerEntryId = resolveOwnerEntryId(clonedData, update.ownerPath, clonedEntryId);
        const sourceOwnerId = resolveOwnerEntryId(originalData, update.ownerPath, sourceRootId);
        if (ownerEntryId == null) {
            throw new Error(`Unable to resolve clone relation owner for "${attributeName}" at path "${update.ownerPath ?? '<root>'}"`);
        }
        let schemaUid = update.schemaUid;
        if (ownerComponentWasReplaced(originalData, clonedData, update.ownerPath)) {
            const cloneComponent = ownerComponentUid(get(clonedData, update.ownerPath));
            const cloneAttribute = cloneComponent ? strapi.db.metadata.get(cloneComponent).attributes[attributeName] : undefined;
            // The submitted operation belongs to the new block. Do not apply it with the
            // source component UID, or the new row id will match an unrelated row.
            if (!cloneComponent || cloneAttribute?.type !== 'relation') {
                continue;
            }
            schemaUid = cloneComponent;
        }
        const attribute = strapi.db.metadata.get(schemaUid).attributes[attributeName];
        if (!attribute || attribute.type !== 'relation') {
            throw new Error(`Unable to resolve clone relation attribute "${attributeName}" on "${schemaUid}"`);
        }
        const assignment = await resolveInlineRelationAssignment(strapi, attribute, update.value, {
            locale,
            ownerUid: schemaUid,
            sourceSchemaUid: update.schemaUid,
            sourceUid: rootUid,
            originalValue: get(originalData, update.dataPath),
            sourceOwnerId,
            targetOwnerId: ownerEntryId,
            attributeName
        });
        if (assignment === undefined) {
            continue;
        }
        // processData accepts attribute names (FK id / morph { id, __type }), not operation payloads.
        await strapi.db.query(schemaUid).update({
            where: {
                id: ownerEntryId
            },
            data: {
                [attributeName]: assignment
            }
        });
    }
};

export { applyDeferredCloneRelationCopies, applyPostCloneRelationUpdates, copyCloneRelationRows, prepareCloneData };
//# sourceMappingURL=clone-relations.mjs.map
