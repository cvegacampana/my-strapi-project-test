'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var _ = require('lodash');
var dates = require('date-fns');

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n.default = e;
  return Object.freeze(n);
}

var dates__namespace = /*#__PURE__*/_interopNamespace(dates);

const timeRegex = /^(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(\.[0-9]{1,3})?$/;
const isDate = (v)=>{
    return dates__namespace.isDate(v);
};
const parseTime = (value)=>{
    if (isDate(value)) {
        return dates__namespace.format(value, 'HH:mm:ss.SSS');
    }
    if (typeof value !== 'string') {
        throw new Error(`Expected a string, got a ${typeof value}`);
    }
    const result = value.match(timeRegex);
    if (result === null) {
        throw new Error('Invalid time format, expected HH:mm:ss.SSS');
    }
    const [, hours, minutes, seconds, fraction = '.000'] = result;
    const fractionPart = _.padEnd(fraction.slice(1), 3, '0');
    return `${hours}:${minutes}:${seconds}.${fractionPart}`;
};
const parseDate = (value)=>{
    if (isDate(value)) {
        return dates__namespace.format(value, 'yyyy-MM-dd');
    }
    if (typeof value !== 'string') {
        throw new Error(`Expected a string, got a ${typeof value}`);
    }
    try {
        const date = dates__namespace.parseISO(value);
        if (dates__namespace.isValid(date)) return dates__namespace.format(date, 'yyyy-MM-dd');
        throw new Error(`Invalid format, expected an ISO compatible date`);
    } catch  {
        throw new Error(`Invalid format, expected an ISO compatible date`);
    }
};
const parseDateTimeOrTimestamp = (value)=>{
    if (isDate(value)) {
        return value;
    }
    if (typeof value !== 'string') {
        throw new Error(`Expected a string, got a ${typeof value}`);
    }
    try {
        const date = dates__namespace.parseISO(value);
        if (dates__namespace.isValid(date)) return date;
        const milliUnixDate = dates__namespace.parse(value, 'T', new Date());
        if (dates__namespace.isValid(milliUnixDate)) return milliUnixDate;
        throw new Error(`Invalid format, expected a timestamp or an ISO date`);
    } catch  {
        throw new Error(`Invalid format, expected a timestamp or an ISO date`);
    }
};
/**
 * Hoisted out of `parseBoolean`, which allocated both of these arrays on every call.
 * Query validation calls it once per node of the populate tree of every request, which
 * made those two throwaway allocations one of the largest single sources of GC pressure
 * in a read: 4.3% of on-CPU time in a profiled LaunchPad run.
 */ const TRUTHY_INPUTS = new Set([
    'true',
    't',
    '1',
    1
]);
const FALSY_INPUTS = new Set([
    'false',
    'f',
    '0',
    0
]);
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
 */ const isBooleanLike = (value)=>{
    if (typeof value === 'boolean') {
        return true;
    }
    if (typeof value === 'string' || typeof value === 'number') {
        return TRUTHY_INPUTS.has(value) || FALSY_INPUTS.has(value);
    }
    return false;
};
const parseBoolean = (value, options)=>{
    const { forceCast = false } = options;
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string' || typeof value === 'number') {
        if (TRUTHY_INPUTS.has(value)) {
            return true;
        }
        if (FALSY_INPUTS.has(value)) {
            return false;
        }
    }
    if (forceCast) {
        return Boolean(value);
    }
    throw new Error('Invalid boolean input. Expected "t","1","true","false","0","f"');
};
/**
 * Cast basic values based on attribute type
 */ const parseType = (options)=>{
    const { type, value, forceCast } = options;
    switch(type){
        case 'boolean':
            return parseBoolean(value, {
                forceCast
            });
        case 'integer':
        case 'biginteger':
        case 'float':
        case 'decimal':
            {
                return _.toNumber(value);
            }
        case 'time':
            {
                return parseTime(value);
            }
        case 'date':
            {
                return parseDate(value);
            }
        case 'timestamp':
        case 'datetime':
            {
                return parseDateTimeOrTimestamp(value);
            }
        default:
            return value;
    }
};

exports.default = parseType;
exports.isBooleanLike = isBooleanLike;
//# sourceMappingURL=parse-type.js.map
