'use strict';

var curry = require('../curry.js');
var errors = require('../errors.js');

// Keep asynchronous return values in the types of partially applied functions.
// TODO: Export this from root @strapi/utils so we don't have copies of it between packages
const throwInvalidKey = ({ key, path, reason })=>{
    const location = path && path !== key ? `Invalid key ${key} at ${path}` : `Invalid key ${key}`;
    const msg = reason ? `${location}: ${reason}` : location;
    throw new errors.ValidationError(msg, {
        key,
        path
    });
};
const asyncCurry = (fn)=>curry.curry(fn);

exports.asyncCurry = asyncCurry;
exports.throwInvalidKey = throwInvalidKey;
//# sourceMappingURL=utils.js.map
