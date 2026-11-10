import { curry } from 'lodash';
import { contentTypes } from '@strapi/utils';

/**
 * DP enabled -> set status to draft
 * DP disabled -> Used mostly for parsing relations, so there is not a need for a default.
 */ const setStatusToDraft = (contentType, params)=>{
    if (!contentTypes.hasDraftAndPublish(contentType)) {
        return params;
    }
    return {
        ...params,
        status: 'draft'
    };
};
/**
 * Adds a default status of `draft` to the params
 */ const defaultToDraft = (params)=>{
    // Default to draft if no status is provided or it's invalid
    if (!params.status || params.status !== 'published') {
        return {
            ...params,
            status: 'draft'
        };
    }
    return params;
};
/**
 * DP disabled -> ignore status
 * DP enabled -> set status to draft if no status is provided or it's invalid
 */ const defaultStatus = (contentType, params)=>{
    if (!contentTypes.hasDraftAndPublish(contentType)) {
        return params;
    }
    // Default to draft if no status is provided or it's invalid
    if (!params.status || params.status !== 'published') {
        return defaultToDraft(params);
    }
    return params;
};
/**
 * In mutating actions we don't want user to set the publishedAt attribute.
 */ const filterDataPublishedAt = (params)=>{
    if (params?.data?.publishedAt) {
        return {
            ...params,
            data: {
                ...params.data,
                publishedAt: null
            }
        };
    }
    return params;
};
/**
 * Add status lookup query to the params
 */ const statusToLookup = (contentType, params)=>{
    if (!contentTypes.hasDraftAndPublish(contentType)) {
        return params;
    }
    const lookup = params.lookup || {};
    switch(params?.status){
        case 'published':
            return {
                ...params,
                lookup: {
                    ...params.lookup,
                    publishedAt: {
                        $notNull: true
                    }
                }
            };
        case 'draft':
            return {
                ...params,
                lookup: {
                    ...params.lookup,
                    publishedAt: {
                        $null: true
                    }
                }
            };
    }
    return {
        ...params,
        lookup
    };
};
/**
 * Translate publication status parameter into the data that will be saved
 */ const statusToData = (contentType, params)=>{
    if (!contentTypes.hasDraftAndPublish(contentType)) {
        return {
            ...params,
            data: {
                ...params.data,
                publishedAt: new Date()
            }
        };
    }
    switch(params?.status){
        case 'published':
            return {
                ...params,
                data: {
                    ...params.data,
                    publishedAt: new Date()
                }
            };
        case 'draft':
            return {
                ...params,
                data: {
                    ...params.data,
                    publishedAt: null
                }
            };
    }
    return params;
};
const setStatusToDraftCurry = curry(setStatusToDraft);
const defaultToDraftCurry = curry(defaultToDraft);
const defaultStatusCurry = curry(defaultStatus);
const filterDataPublishedAtCurry = curry(filterDataPublishedAt);
const statusToLookupCurry = curry(statusToLookup);
const statusToDataCurry = curry(statusToData);

export { defaultStatusCurry as defaultStatus, defaultToDraftCurry as defaultToDraft, filterDataPublishedAtCurry as filterDataPublishedAt, setStatusToDraftCurry as setStatusToDraft, statusToDataCurry as statusToData, statusToLookupCurry as statusToLookup };
//# sourceMappingURL=draft-and-publish.mjs.map
