import { errors } from '@strapi/utils';
import { curry, assign } from 'lodash';

const getDefaultLocale = async ()=>{
    return strapi.localization.getDefaultLocale();
};
const defaultLocale = async (contentType, params)=>{
    if (!strapi.localization.isLocalizedContentType(contentType)) {
        return params;
    }
    if (!params.locale) {
        return assign({}, params, {
            locale: await getDefaultLocale()
        });
    }
    return params;
};
/**
 * Add locale lookup query to the params
 */ const localeToLookup = (contentType, params)=>{
    if (!params.locale || !strapi.localization.isLocalizedContentType(contentType)) {
        return params;
    }
    if (typeof params.locale !== 'string') {
        // localeToLookup accepts locales of '*'. This is because the document
        // service functions that use this transform work with the '*' locale
        // to return all locales.
        throw new errors.ValidationError(`Invalid locale param ${String(params.locale)} provided. Document locales must be strings.`);
    }
    return {
        ...params,
        lookup: {
            ...params.lookup,
            locale: params.locale
        }
    };
};
/**
 * Add locale lookup query to the params
 */ const multiLocaleToLookup = (contentType, params)=>{
    if (!strapi.localization.isLocalizedContentType(contentType)) {
        return params;
    }
    if (params.locale) {
        if (params.locale === '*') {
            return params;
        }
        return {
            ...params,
            lookup: {
                ...params.lookup,
                locale: params.locale
            }
        };
    }
    return params;
};
/**
 * Translate locale status parameter into the data that will be saved
 */ const localeToData = (contentType, params)=>{
    if (!strapi.localization.isLocalizedContentType(contentType)) {
        return params;
    }
    if (params.locale) {
        const isValidLocale = typeof params.locale === 'string' && params.locale !== '*';
        if (isValidLocale) {
            return {
                ...params,
                data: {
                    ...params.data,
                    locale: params.locale
                }
            };
        }
        throw new errors.ValidationError(`Invalid locale param ${params.locale} provided. Document locales must be strings.`);
    }
    return params;
};
/**
 * Mutates the provided data object in place and returns the same reference
 * with populated media values replaced by their upload file IDs.
 */ const normalizeMediaIds = (schema, data)=>{
    if (!schema?.attributes || !data || typeof data !== 'object') {
        return data;
    }
    Object.entries(schema.attributes).forEach(([attributeName, attribute])=>{
        const value = data[attributeName];
        if (value == null) {
            return;
        }
        if (attribute.type === 'media') {
            if (attribute.multiple) {
                data[attributeName] = Array.isArray(value) ? value.map((file)=>file && typeof file === 'object' && 'id' in file ? file.id : file) : value;
            } else {
                data[attributeName] = value && typeof value === 'object' && 'id' in value ? value.id : value;
            }
            return;
        }
        if (attribute.type === 'component') {
            const componentSchema = strapi.getModel(attribute.component);
            if (attribute.repeatable && Array.isArray(value)) {
                value.forEach((componentValue)=>normalizeMediaIds(componentSchema, componentValue));
            } else {
                normalizeMediaIds(componentSchema, value);
            }
            return;
        }
        if (attribute.type === 'dynamiczone' && Array.isArray(value)) {
            value.forEach((componentValue)=>{
                if (componentValue?.__component) {
                    normalizeMediaIds(strapi.getModel(componentValue.__component), componentValue);
                }
            });
        }
    });
    return data;
};
/**
 * Copy non-localized fields from an existing entry to a new entry being created
 * for a different locale of the same document. Returns a new object with the merged data.
 */ const copyNonLocalizedFields = async (contentType, documentId, dataToCreate)=>{
    if (!strapi.localization.isLocalizedContentType(contentType)) {
        return dataToCreate;
    }
    // Find an existing entry for the same document to copy unlocalized fields from
    const attributesToPopulate = strapi.localization.getNestedPopulateOfNonLocalizedAttributes(contentType.uid);
    const existingEntry = await strapi.db.query(contentType.uid).findOne({
        where: {
            documentId
        },
        // Prefer published entry, but fall back to any entry
        orderBy: {
            publishedAt: 'desc'
        },
        populate: attributesToPopulate
    });
    // If an entry exists in another locale, copy its non-localized fields
    if (existingEntry) {
        const mergedData = {
            ...dataToCreate
        };
        strapi.localization.fillNonLocalizedAttributes(mergedData, existingEntry, {
            model: contentType.uid
        });
        return normalizeMediaIds(contentType, mergedData);
    }
    return dataToCreate;
};
const defaultLocaleCurry = curry(defaultLocale);
const localeToLookupCurry = curry(localeToLookup);
const multiLocaleToLookupCurry = curry(multiLocaleToLookup);
const localeToDataCurry = curry(localeToData);

export { copyNonLocalizedFields, defaultLocaleCurry as defaultLocale, localeToDataCurry as localeToData, localeToLookupCurry as localeToLookup, multiLocaleToLookupCurry as multiLocaleToLookup };
//# sourceMappingURL=internationalization.mjs.map
