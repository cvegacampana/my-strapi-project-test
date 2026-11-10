import type { Core } from '@strapi/types';
interface LicenseInfo {
    type: 'bronze' | 'silver' | 'gold';
    isTrial: boolean;
    expireAt?: string;
    seats?: number;
    features?: Array<{
        name: string;
        options?: Record<string, unknown>;
    }>;
    subscriptionId?: string;
    planPriceId?: string;
    /** End of the subscription term, epoch milliseconds. */
    renewalDate?: string | number;
    licenseKey?: string;
    customerId?: string;
}
/**
 * Features that can appear on a plan, in the order the admin panel lists them.
 * Used to render entitlement rows for features a plan supports but this license
 * does not include. `cms-ai` is deliberately absent: AI usage has its own panel.
 */
export declare const PLAN_FEATURE_CATALOG: Record<'bronze' | 'silver' | 'gold', string[]>;
declare const LICENSE_REGISTRY_URI = "https://license.strapi.io";
declare class LicenseCheckError extends Error {
    shouldFallback: boolean;
    constructor(message: string, shouldFallback?: boolean);
}
declare const readLicense: (directory: string) => string | undefined;
declare const verifyLicense: (license: string) => LicenseInfo;
declare const fetchLicense: ({ strapi }: {
    strapi: Core.Strapi;
}, key: string, projectId: string) => Promise<string>;
export { readLicense, verifyLicense, fetchLicense, LicenseCheckError, LICENSE_REGISTRY_URI };
//# sourceMappingURL=license.d.ts.map