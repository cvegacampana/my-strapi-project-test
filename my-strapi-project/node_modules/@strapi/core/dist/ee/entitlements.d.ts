/**
 * Effective entitlement limits registry.
 *
 * Feature modules register a live resolver for each numeric limit they enforce;
 * the license endpoint and the support debug dump read the resolved, normalized
 * values. A numeric string is read as its number. A resolved value that is nullish,
 * non-numeric, or greater than or equal to UNLIMITED_ENTITLEMENT_THRESHOLD is reported
 * as `null`, meaning "Unlimited".
 */
export declare const UNLIMITED_ENTITLEMENT_THRESHOLD = 9999;
/** A feature as a license lists it: a bare name, or `{ name, options }`. */
export type EntitlementFeature = string | {
    name: string;
    options?: Record<string, unknown>;
    [key: string]: unknown;
} | undefined;
export interface EntitlementLimitInput {
    key: string;
    unit?: 'days' | 'count';
    /**
     * Resolves the limit the feature enforces from the feature as a license lists it. The same
     * resolver serves the live license and a lapsed license's retained snapshot, so it must read
     * options from the feature it is handed and apply its own defaults and clamps.
     */
    get: (feature?: EntitlementFeature) => unknown;
}
export interface EntitlementInput {
    feature: string;
    limits: EntitlementLimitInput[];
}
export interface EntitlementLimit {
    key: string;
    unit?: 'days' | 'count';
    value: number | null;
}
export interface Entitlement {
    feature: string;
    limits: EntitlementLimit[];
}
export declare const createEntitlementsRegistry: () => {
    register: (input: EntitlementInput) => void;
    list: (getFeature?: (name: string) => EntitlementFeature) => Entitlement[];
};
//# sourceMappingURL=entitlements.d.ts.map