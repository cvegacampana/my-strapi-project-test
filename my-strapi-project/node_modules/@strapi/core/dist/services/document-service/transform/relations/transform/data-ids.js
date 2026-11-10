'use strict';

var _ = require('lodash');
var strapiUtils = require('@strapi/utils');
var i18n = require('../utils/i18n.js');
var dp = require('../utils/dp.js');
var mapRelation = require('../utils/map-relation.js');
var xtoOne = require('../utils/xto-one.js');

const { isPolymorphic } = strapiUtils.relations;
const MEDIA_UID = 'plugin::upload.file';
/**
 * Get the entry ids for a given documentId.
 */ const getRelationIds = _.curry((idMap, source, targetUid, relation)=>{
    // locale to connect to
    const targetLocale = i18n.getRelationTargetLocale(relation, {
        targetUid,
        sourceUid: source.uid,
        sourceLocale: source.locale
    });
    // status(es) to connect to
    const targetStatus = dp.getRelationTargetStatus(relation, {
        targetUid,
        sourceUid: source.uid,
        sourceStatus: source.status
    });
    const ids = [];
    // Find mapping between documentID -> id(s).
    // There are scenarios where a single documentID can map to multiple ids.
    // e.g when connecting Non DP -> DP and connecting to both the draft and publish version at the same time
    for (const tStatus of targetStatus){
        const entryId = idMap.get({
            uid: targetUid,
            documentId: relation.documentId,
            locale: targetLocale,
            status: tStatus
        });
        if (entryId) ids.push(entryId);
    }
    if (!ids.length && !source.allowMissingId) {
        throw new strapiUtils.errors.ValidationError(`Document with id "${relation.documentId}", locale "${targetLocale}" not found`);
    }
    return ids;
});
/**
 * Iterate over all relations and media of a data object and transform document ids to entity ids.
 */ const transformDataIdsVisitor = (idMap, data, source)=>{
    return mapRelation.traverseEntityRelations(async ({ key, value, attribute }, { set })=>{
        if (!attribute) {
            return;
        }
        const isPolymorphicRelation = isPolymorphic(attribute);
        const getIds = getRelationIds(idMap, source);
        // Collapse a "relates to one" payload to a single entry first.
        const normalizedValue = xtoOne.normalizeXToOneRelationValue(attribute, value);
        // Transform the relation documentId to entity id
        const newRelation = await mapRelation.mapRelation((relation)=>{
            if (!relation || !relation.documentId) {
                return relation;
            }
            // Find relational attributes, and return the document ids
            // if its a polymorphic relation we need to get it from the data itself
            let targetUid;
            if (attribute.type === 'media') {
                targetUid = MEDIA_UID;
            } else if (isPolymorphicRelation) {
                targetUid = relation.__type;
            } else {
                targetUid = attribute.target;
            }
            const ids = getIds(targetUid, relation);
            // Handle positional arguments
            const position = {
                ...relation.position
            };
            // The positional relation target uid can be different for polymorphic relations
            let positionTargetUid = targetUid;
            if (isPolymorphicRelation && position?.__type) {
                positionTargetUid = position.__type;
            }
            if (position.before) {
                const beforeRelation = {
                    ...relation,
                    ...position,
                    documentId: position.before
                };
                const beforeIds = getIds(positionTargetUid, beforeRelation);
                position.before = beforeIds.at(0);
            }
            if (position.after) {
                const afterRelation = {
                    ...relation,
                    ...position,
                    documentId: position.after
                };
                position.after = getIds(positionTargetUid, afterRelation).at(0);
            }
            // Transform all ids to new relations
            return ids?.map((id)=>{
                const newRelation = {
                    id
                };
                if (relation.position) {
                    newRelation.position = position;
                }
                // Insert type if its a polymorphic relation
                if (isPolymorphicRelation) {
                    newRelation.__type = targetUid;
                }
                return newRelation;
            });
        }, normalizedValue);
        set(key, newRelation);
    }, {
        schema: strapi.getModel(source.uid),
        getModel: strapi.getModel.bind(strapi),
        includeMedia: true
    }, data);
};

exports.transformDataIdsVisitor = transformDataIdsVisitor;
//# sourceMappingURL=data-ids.js.map
