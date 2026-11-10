import _ from 'lodash';
declare const keysDeep: (obj: object, path?: string[]) => string[];
/**
 * Sets a property without changing the input. Copies containers on the updated path and
 * preserves references to unrelated values, including the value being assigned.
 */
declare const set: <T extends object>(object: T, path: _.PropertyPath, value: unknown) => T;
export { keysDeep, set };
//# sourceMappingURL=objects.d.ts.map