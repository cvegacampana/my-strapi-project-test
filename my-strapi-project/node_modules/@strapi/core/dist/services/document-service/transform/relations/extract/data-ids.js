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
 * Load a relation documentId into the idMap.
 */ const addRelationDocId = _.curry((idMap, source, targetUid, relation)=>{
    const targetLocale = i18n.getRelationTargetLocale(relation, {
        targetUid,
        sourceUid: source.uid,
        sourceLocale: source.locale
    });
    const targetStatus = dp.getRelationTargetStatus(relation, {
        targetUid,
        sourceUid: source.uid,
        sourceStatus: source.status
    });
    targetStatus.forEach((status)=>{
        idMap.add({
            uid: targetUid,
            documentId: relation.documentId,
            locale: targetLocale,
            status
        });
    });
});
/**
 * Iterate over all relations and media of a data object and extract their document ids.
 * Those will later be transformed to entity ids.
 */ const extractDataIds = (idMap, data, source)=>{
    return mapRelation.traverseEntityRelations(async ({ attribute, value })=>{
        if (!attribute) {
            return;
        }
        const isPolymorphicRelation = isPolymorphic(attribute);
        const addDocId = addRelationDocId(idMap, source);
        // Skip looking up entries we're about to discard.
        const normalizedValue = xtoOne.normalizeXToOneRelationValue(attribute, value);
        return mapRelation.mapRelation((relation)=>{
            if (!relation || !relation.documentId) {
                return relation;
            }
            // Regular relations will always target the same target
            // if its a polymorphic relation we need to get it from the data itself
            let targetUid;
            if (attribute.type === 'media') {
                targetUid = MEDIA_UID;
            } else if (isPolymorphicRelation) {
                targetUid = relation.__type;
            } else {
                targetUid = attribute.target;
            }
            addDocId(targetUid, relation);
            // Handle positional arguments
            const position = relation.position;
            // The positional relation target uid can be different for polymorphic relations
            let positionTargetUid = targetUid;
            if (isPolymorphicRelation && position?.__type) {
                positionTargetUid = position.__type;
            }
            if (position?.before) {
                addDocId(positionTargetUid, {
                    ...relation,
                    ...position,
                    documentId: position.before
                });
            }
            if (position?.after) {
                addDocId(positionTargetUid, {
                    ...relation,
                    ...position,
                    documentId: position.after
                });
            }
            return relation;
        }, normalizedValue);
    }, {
        schema: strapi.getModel(source.uid),
        getModel: strapi.getModel.bind(strapi),
        includeMedia: true
    }, data);
};

exports.extractDataIds = extractDataIds;
//# sourceMappingURL=data-ids.js.map
