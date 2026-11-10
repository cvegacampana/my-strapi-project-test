import type { Logger } from '@strapi/logger';
import type { Core } from '@strapi/types';
interface LicenseInfoState {
    licenseKey?: string;
    features?: Array<{
        name: string;
        [key: string]: any;
    } | string>;
    expireAt?: string;
    seats?: number;
    type?: string;
    isTrial: boolean;
    subscriptionId?: string;
    planPriceId?: string;
    /** End of the subscription term, epoch milliseconds. */
    renewalDate?: string | number;
}
type LicenseStatus = 'none' | 'active' | 'expired' | 'unknown';
declare const _default: Readonly<{
    init: (licenseDir: string, logger?: Logger) => void;
    checkLicense: ({ strapi }: {
        strapi: Core.Strapi;
    }) => Promise<void>;
    getTrialEndDate: ({ strapi, }: {
        strapi: Core.Strapi;
    }) => Promise<{
        trialEndsAt: string;
    } | null>;
    readonly isEE: boolean;
    readonly licenseStatus: LicenseStatus;
    /** Display-only; see EE.retainedLicense. Never use for feature gating. */
    readonly retainedLicense: Omit<LicenseInfoState, "licenseKey"> | null;
    readonly seats: number | undefined;
    readonly type: string | undefined;
    readonly expireAt: string | undefined;
    /** Null when the registry does not provide it yet; survives expiry via the retained snapshot. */
    readonly renewalDate: string | number | null;
    /**
     * Every feature the current plan supports, in display order, regardless of whether this
     * license includes it. Falls back to the retained license's type so an expired license
     * still lists rows. See `PLAN_FEATURE_CATALOG` in `./license`.
     */
    readonly planFeatureCatalog: string[];
    readonly isTrial: boolean;
    readonly planPriceId: string | undefined;
    readonly subscriptionId: string | undefined;
    features: Readonly<{
        list: () => {
            [key: string]: any;
            name: string;
        }[];
        get: (featureName: string) => {
            [key: string]: any;
            name: string;
        } | undefined;
        isEnabled: (featureName: string) => boolean;
    }>;
    entitlements: Readonly<{
        register: (input: import("./entitlements").EntitlementInput) => void;
        list: () => import("./entitlements").Entitlement[];
        listRetained(): import("./entitlements").Entitlement[];
    }>;
}>;
export default _default;
//# sourceMappingURL=index.d.ts.map