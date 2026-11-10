type TypeMap = {
    boolean: boolean;
    integer: number;
    biginteger: number;
    float: number;
    decimal: number;
    time: string;
    date: string;
    timestamp: Date;
    datetime: Date;
};
export interface ParseTypeOptions<T extends keyof TypeMap> {
    type: T;
    value: unknown;
    forceCast?: boolean;
}
/**
 * Whether `parseBoolean` would accept this value without `forceCast`.
 *
 * Exists so callers can ask the question without using an exception as control flow.
 * Query validation asked it once per populate key by calling `parseType` inside a
 * `try`/`catch`, so every key that is not a boolean keyword — which is nearly all of
 * them — built an Error and captured a stack trace only to discard it. Stack capture is
 * the expensive part, and it made this the second hottest function in a read.
 *
 * Kept in lockstep with `parseBoolean`'s accept conditions below.
 */
declare const isBooleanLike: (value: unknown) => boolean;
/**
 * Cast basic values based on attribute type
 */
declare const parseType: <Type extends keyof TypeMap>(options: ParseTypeOptions<Type>) => TypeMap[Type];
export { isBooleanLike };
export default parseType;
//# sourceMappingURL=parse-type.d.ts.map