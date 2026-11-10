import _ from 'lodash';

const keysDeep = (obj, path = [])=>!_.isObject(obj) ? [
        path.join('.')
    ] : _.reduce(obj, (acc, next, key)=>_.concat(acc, keysDeep(next, [
            ...path,
            key
        ])), []);
/**
 * Sets a property without changing the input. Copies containers on the updated path and
 * preserves references to unrelated values, including the value being assigned.
 */ const set = (object, path, value)=>_.setWith(_.clone(object), path, value, (current)=>_.isObject(current) ? _.clone(current) : undefined);

export { keysDeep, set };
//# sourceMappingURL=objects.mjs.map
