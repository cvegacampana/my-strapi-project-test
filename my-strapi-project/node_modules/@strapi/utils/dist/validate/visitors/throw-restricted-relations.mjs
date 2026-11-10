import { isObject } from 'lodash';
import { isMorphToRelationalAttribute, constants } from '../../content-types.mjs';
import { throwInvalidKey } from '../utils.mjs';
import { VALID_RELATION_ORDERING_KEYS } from '../../relations.mjs';

const ACTIONS_TO_VERIFY = [
    'find'
];
const { CREATED_BY_ATTRIBUTE, UPDATED_BY_ATTRIBUTE } = constants;
var throwRestrictedRelations = ((auth)=>async ({ data, key, attribute, schema, path })=>{
        if (!attribute) {
            return;
        }
        const isRelation = attribute.type === 'relation';
        if (!isRelation) {
            return;
        }
        const handleMorphRelation = async ()=>{
            const elements = data[key];
            if (isMorphMutationPayload(elements)) {
                await handleMorphElements(elements.connect || []);
                await handleMorphElements(elements.set || []);
                await handleMorphElements(elements.disconnect || []);
                // TODO: this should technically be in its own visitor to check morph options, but for now we'll handle it here
                if ('options' in elements) {
                    if (elements.options === null || elements.options === undefined) {
                        return;
                    }
                    if (typeof elements.options !== 'object') {
                        throwInvalidKey({
                            key,
                            path: path.attribute
                        });
                    }
                    const optionKeys = Object.keys(elements.options);
                    // Validate each key based on its validator function
                    for (const key of optionKeys){
                        const optionKey = key;
                        const validator = VALID_RELATION_ORDERING_KEYS[optionKey];
                        if (!validator) {
                            throwInvalidKey({
                                key,
                                path: path.attribute
                            });
                        }
                        if (!validator(elements.options[key])) {
                            throwInvalidKey({
                                key,
                                path: path.attribute
                            });
                        }
                    }
                }
            } else if (isMorphPopulatePayload(elements)) {
                for (const uid of Object.keys(elements.on)){
                    const scopes = ACTIONS_TO_VERIFY.map((action)=>`${uid}.${action}`);
                    const isAllowed = await hasAccessToSomeScopes(scopes, auth);
                    if (!isAllowed) {
                        throwInvalidKey({
                            key,
                            path: path.attribute
                        });
                    }
                }
            } else {
                await handleMorphElements(elements);
            }
        };
        const isMorphMutationPayload = (value)=>{
            return isObject(value) && ('connect' in value || 'set' in value || 'disconnect' in value || 'options' in value);
        };
        const isMorphPopulatePayload = (value)=>{
            return isObject(value) && !('__type' in value) && 'on' in value && isObject(value.on);
        };
        const isMorphPopulateAllOrCount = (value)=>{
            return value === true || isObject(value) && 'count' in value && value.count === true;
        };
        const handleMorphElements = async (elements)=>{
            if (!Array.isArray(elements)) {
                throwInvalidKey({
                    key,
                    path: path.attribute
                });
            }
            const morphElements = elements;
            for (const element of morphElements){
                if (!isObject(element) || !('__type' in element) || typeof element.__type !== 'string') {
                    throwInvalidKey({
                        key,
                        path: path.attribute
                    });
                }
                const type = element.__type;
                const scopes = ACTIONS_TO_VERIFY.map((action)=>`${type}.${action}`);
                const isAllowed = await hasAccessToSomeScopes(scopes, auth);
                if (!isAllowed) {
                    throwInvalidKey({
                        key,
                        path: path.attribute
                    });
                }
            }
        };
        const handleRegularRelation = async ()=>{
            const scopes = ACTIONS_TO_VERIFY.map((action)=>`${attribute.target}.${action}`);
            const isAllowed = await hasAccessToSomeScopes(scopes, auth);
            // If the authenticated user don't have access to any of the scopes
            if (!isAllowed) {
                throwInvalidKey({
                    key,
                    path: path.attribute
                });
            }
        };
        const isCreatorRelation = [
            CREATED_BY_ATTRIBUTE,
            UPDATED_BY_ATTRIBUTE
        ].includes(key);
        // Polymorphic relations
        if (isMorphToRelationalAttribute(attribute)) {
            const value = data[key];
            if (isMorphPopulateAllOrCount(value)) {
                return;
            }
            await handleMorphRelation();
            return;
        }
        // Creator relations
        if (isCreatorRelation && schema.options?.populateCreatorFields) {
            // do nothing
            return;
        }
        // Regular relations
        await handleRegularRelation();
    });
const hasAccessToSomeScopes = async (scopes, auth)=>{
    for (const scope of scopes){
        try {
            await strapi.auth.verify(auth, {
                scope
            });
            return true;
        } catch  {
            continue;
        }
    }
    return false;
};

export { throwRestrictedRelations as default };
//# sourceMappingURL=throw-restricted-relations.mjs.map
