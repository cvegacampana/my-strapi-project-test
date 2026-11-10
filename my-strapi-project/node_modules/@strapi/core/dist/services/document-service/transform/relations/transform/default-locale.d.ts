import type { UID } from '@strapi/types';
declare const setDefaultLocaleToRelation: <T extends Record<string, any>>(relation: T, defaultLocale: string | null) => T & {
    locale: string | null;
};
/**
 * In scenarios like Non i18n CT -> i18n CT
 * relations can be connected to multiple locales,
 * in case user does not provide the locale, this sets it to the default one.
 */
declare const setDefaultLocaleToRelations: (data: Record<string, any>, uid: UID.Schema) => Record<string, any> | Promise<import("@strapi/utils/dist/types").Data>;
export { setDefaultLocaleToRelation, setDefaultLocaleToRelations };
//# sourceMappingURL=default-locale.d.ts.map