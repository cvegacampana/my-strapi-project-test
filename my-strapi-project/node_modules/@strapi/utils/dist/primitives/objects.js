'use strict';

var _ = require('lodash');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var ___default = /*#__PURE__*/_interopDefault(_);

const keysDeep = (obj, path = [])=>!___default.default.isObject(obj) ? [
        path.join('.')
    ] : ___default.default.reduce(obj, (acc, next, key)=>___default.default.concat(acc, keysDeep(next, [
            ...path,
            key
        ])), []);
/**
 * Sets a property without changing the input. Copies containers on the updated path and
 * preserves references to unrelated values, including the value being assigned.
 */ const set = (object, path, value)=>___default.default.setWith(___default.default.clone(object), path, value, (current)=>___default.default.isObject(current) ? ___default.default.clone(current) : undefined);

exports.keysDeep = keysDeep;
exports.set = set;
//# sourceMappingURL=objects.js.map
