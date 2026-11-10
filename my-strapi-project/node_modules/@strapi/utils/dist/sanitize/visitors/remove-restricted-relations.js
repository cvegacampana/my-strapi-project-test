'use strict';

var _ = require('lodash');
var contentTypes = require('../../content-types.js');
var relations = require('../../relations.js');

const ACTIONS_TO_VERIFY = [
    'find'
];
const { CREATED_BY_ATTRIBUTE, UPDATED_BY_ATTRIBUTE } = contentTypes.constants;
var removeRestrictedRelations = ((auth)=>(visitorOptions, visitorUtils)=>{
        const { attribute } = visitorOptions;
        // Deliberately not an `async` function. This visitor is invoked for every key of
        // every node of every entity, and only relation attributes need any work at all.
        // Declaring it `async` meant each of those keys allocated a promise purely to
        // resolve it immediately, and the traversal then awaited it. Returning early
        // without a promise lets the traversal stay synchronous for the common case.
        if (!attribute || attribute.type !== 'relation') {
            return;
        }
        return visitRelationAttribute(auth, visitorOptions, visitorUtils);
    });
const visitRelationAttribute = async (auth, { data, key, attribute, schema }, { remove, set })=>{
    // Narrowing only; the caller reaches this for relation attributes exclusively.
    if (!attribute) {
        return;
    }
    const handleMorphRelation = async ()=>{
        const elements = data[key];
        if (!elements) {
            return;
        }
        if (isMorphMutationPayload(elements)) {
            const newValue = {};
            const connect = await handleMorphElements(elements.connect || []);
            const relSet = await handleMorphElements(elements.set || []);
            const disconnect = await handleMorphElements(elements.disconnect || []);
            if (connect.length > 0) {
                newValue.connect = connect;
            }
            if (relSet.length > 0) {
                newValue.set = relSet;
            }
            if (disconnect.length > 0) {
                newValue.disconnect = disconnect;
            }
            // TODO: this should technically be in its own visitor to check morph options, but for now we'll handle it here
            const options = elements.options;
            if (options && typeof options === 'object') {
                const filteredOptions = {};
                Object.keys(options).forEach((key)=>{
                    const optionKey = key;
                    const validator = relations.VALID_RELATION_ORDERING_KEYS[optionKey];
                    const optionValue = options[key];
                    if (validator && validator(optionValue)) {
                        filteredOptions[optionKey] = optionValue;
                    }
                });
                newValue.options = filteredOptions;
            } else {
                newValue.options = {};
            }
            set(key, newValue);
        } else if (isMorphPopulatePayload(elements)) {
            const newOn = {};
            for (const [uid, subPopulate] of Object.entries(elements.on)){
                const scopes = ACTIONS_TO_VERIFY.map((action)=>`${uid}.${action}`);
                const isAllowed = await hasAccessToSomeScopes(scopes, auth);
                if (isAllowed) {
                    newOn[uid] = subPopulate;
                }
            }
            if (Object.keys(newOn).length === 0) {
                remove(key);
                return;
            }
            const count = isMorphPopulateCount(elements.count) ? true : elements.count;
            set(key, {
                ...elements,
                count,
                on: newOn
            });
        } else {
            const newMorphValue = await handleMorphElements(elements);
            if (!newMorphValue.length) {
                if (Array.isArray(elements) && elements.length === 0) {
                    return;
                }
                remove(key);
                return;
            }
            if (Array.isArray(elements)) {
                set(key, newMorphValue);
                return;
            }
            set(key, newMorphValue[0]);
        }
    };
    const isMorphMutationPayload = (value)=>{
        return _.isObject(value) && ('connect' in value || 'set' in value || 'disconnect' in value);
    };
    const isMorphPopulateCount = (value)=>value === true || value === 'true';
    const isMorphPopulatePayload = (value)=>{
        return _.isObject(value) && !('__type' in value) && 'on' in value && _.isObject(value.on);
    };
    const buildAllowedMorphPopulateFragment = async (subPopulate)=>{
        const newOn = {};
        for (const uid of getRegisteredContentTypeUIDs()){
            const scopes = ACTIONS_TO_VERIFY.map((action)=>`${uid}.${action}`);
            const isAllowed = await hasAccessToSomeScopes(scopes, auth);
            if (isAllowed) {
                newOn[uid] = subPopulate;
            }
        }
        return newOn;
    };
    const isMorphPopulateAllOrCount = (value)=>{
        return value === true || value === 'true' || _.isObject(value) && 'count' in value && isMorphPopulateCount(value.count) && !('on' in value);
    };
    const isMorphCountOutput = (value)=>{
        return _.isObject(value) && 'count' in value && typeof value.count === 'number' && Object.keys(value).length === 1;
    };
    const handleMorphElements = async (elements)=>{
        const allowedElements = [];
        const elementsToCheck = Array.isArray(elements) ? elements : [
            elements
        ];
        for (const element of elementsToCheck){
            if (!_.isObject(element) || !('__type' in element) || typeof element.__type !== 'string') {
                continue;
            }
            const scopes = ACTIONS_TO_VERIFY.map((action)=>`${element.__type}.${action}`);
            const isAllowed = await hasAccessToSomeScopes(scopes, auth);
            if (isAllowed) {
                allowedElements.push(element);
            }
        }
        return allowedElements;
    };
    const handleRegularRelation = async ()=>{
        const scopes = ACTIONS_TO_VERIFY.map((action)=>`${attribute.target}.${action}`);
        const isAllowed = await hasAccessToSomeScopes(scopes, auth);
        if (!isAllowed) {
            remove(key);
        }
    };
    const isCreatorRelation = [
        CREATED_BY_ATTRIBUTE,
        UPDATED_BY_ATTRIBUTE
    ].includes(key);
    if (contentTypes.isMorphToRelationalAttribute(attribute)) {
        const value = data[key];
        if (isMorphPopulatePayload(value)) {
            await handleMorphRelation();
            return;
        }
        if (isMorphPopulateAllOrCount(value)) {
            const newOn = await buildAllowedMorphPopulateFragment(true);
            if (Object.keys(newOn).length === 0) {
                remove(key);
                return;
            }
            set(key, value === true || value === 'true' ? {
                on: newOn
            } : {
                ...value,
                count: true,
                on: newOn
            });
            return;
        }
        if (isMorphCountOutput(value)) {
            return;
        }
        await handleMorphRelation();
        return;
    }
    if (isCreatorRelation && schema.options?.populateCreatorFields) {
        return;
    }
    await handleRegularRelation();
};
/**
 * Per-`auth` memo of scope decisions.
 *
 * The decision for a given scope depends only on the ability carried by `auth`, which is
 * built once per request and not mutated while the response is sanitized. Sanitizing a
 * list re-asks the same question for every entity, so a 25-entity page with four
 * relations asked ~100 identical questions; each denial also constructed an Error, and
 * capturing a stack trace is by far the most expensive part of that.
 *
 * Keyed weakly on the `auth` object so entries are collected with the request.
 */ const scopeDecisionCache = new WeakMap();
const canAccessScope = async (scope, auth)=>{
    const cacheable = typeof auth === 'object' && auth !== null;
    let decisions;
    if (cacheable) {
        decisions = scopeDecisionCache.get(auth);
        if (decisions === undefined) {
            decisions = new Map();
            scopeDecisionCache.set(auth, decisions);
        } else {
            const cached = decisions.get(scope);
            if (cached !== undefined) {
                return cached;
            }
        }
    }
    let allowed;
    try {
        await strapi.auth.verify(auth, {
            scope
        });
        allowed = true;
    } catch  {
        allowed = false;
    }
    decisions?.set(scope, allowed);
    return allowed;
};
const hasAccessToSomeScopes = async (scopes, auth)=>{
    for (const scope of scopes){
        if (await canAccessScope(scope, auth)) {
            return true;
        }
    }
    return false;
};
const getRegisteredContentTypeUIDs = ()=>{
    return Object.values(strapi.contentTypes ?? {}).map((model)=>model.uid).filter((uid)=>typeof uid === 'string');
};

module.exports = removeRestrictedRelations;
//# sourceMappingURL=remove-restricted-relations.js.map
