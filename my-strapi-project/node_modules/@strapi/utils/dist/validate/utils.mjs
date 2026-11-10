import { curry } from '../curry.mjs';
import { ValidationError } from '../errors.mjs';

// Keep asynchronous return values in the types of partially applied functions.
// TODO: Export this from root @strapi/utils so we don't have copies of it between packages
const throwInvalidKey = ({ key, path, reason })=>{
    const location = path && path !== key ? `Invalid key ${key} at ${path}` : `Invalid key ${key}`;
    const msg = reason ? `${location}: ${reason}` : location;
    throw new ValidationError(msg, {
        key,
        path
    });
};
const asyncCurry = (fn)=>curry(fn);

export { asyncCurry, throwInvalidKey };
//# sourceMappingURL=utils.mjs.map
