'use strict';

var _ = require('lodash');
var curry = require('../curry.js');
var contentTypes = require('../content-types.js');
var operators = require('../operators.js');
var factory = require('./factory.js');

const isObj = (value)=>_.isObject(value);
/** True if this object should be walked as a filter subtree (operators / attributes), not an opaque operand. */ const isFilterLikeObject = (value, schema)=>Object.keys(value).some((k)=>operators.isOperator(k) || Boolean(schema?.attributes?.[k]));
const filters = factory().intercept(// Intercept filters arrays and apply the traversal to each one individually
Array.isArray, async (visitor, options, filters, { recurse })=>{
    return Promise.all(filters.map((filter, i)=>{
        // In filters, only operators such as $and, $in, $notIn or $or and implicit operators like [...]
        // can have a value array, thus we can update the raw path but not the attribute one
        const newPath = options.path ? {
            ...options.path,
            raw: `${options.path.raw}[${i}]`
        } : options.path;
        return recurse(visitor, {
            ...options,
            path: newPath
        }, filter);
    })).then((res)=>res.filter((val)=>!(_.isObject(val) && _.isEmpty(val))));
}).intercept(// Ignore non object filters and return the value as-is
(filters)=>!_.isObject(filters), (_, __, filters)=>{
    return filters;
})// Parse object values
.parse(isObj, ()=>({
        transform: _.cloneDeep,
        remove (key, data) {
            return _.omit(data, key);
        },
        set (key, value, data) {
            return {
                ...data,
                [key]: value
            };
        },
        keys (data) {
            return Object.keys(data);
        },
        get (key, data) {
            return data[key];
        }
    }))// Ignore null or undefined values
.ignore(({ value })=>value == null)// Recursion on operators (non attributes)
.on(({ attribute })=>attribute == null, async ({ key, visitor, path, value, schema, getModel, attribute }, { set, recurse })=>{
    const parent = {
        key,
        path,
        schema,
        attribute
    };
    // Operator operands that are plain objects (not arrays) are only traversed when they look like
    // filter subtrees (nested operators or schema attributes). Otherwise treat as opaque operands
    // (e.g. GraphQL DateTime / Date for $gt, $null / $notNull booleans, or { $null: { anything } }).
    // Without this, traversing into e.g. { $null: { anything: 'x' } } makes validate throw on "anything".
    // $not is excluded: its value is always a nested filter map, not an opaque scalar operand.
    if (operators.isOperator(key) && key !== '$not' && isObj(value) && !Array.isArray(value) && !isFilterLikeObject(value, schema)) {
        set(key, value);
        return;
    }
    set(key, await recurse(visitor, {
        schema,
        path,
        getModel,
        parent
    }, value));
})// Handle relation recursion
.onRelation(async ({ key, attribute, visitor, path, value, schema, getModel }, { set, recurse })=>{
    const isMorphRelation = attribute.relation.toLowerCase().startsWith('morph');
    if (isMorphRelation) {
        return;
    }
    const parent = {
        key,
        path,
        schema,
        attribute
    };
    const targetSchemaUID = attribute.target;
    const targetSchema = getModel(targetSchemaUID);
    const newValue = await recurse(visitor, {
        schema: targetSchema,
        path,
        getModel,
        parent
    }, value);
    set(key, newValue);
}).onComponent(async ({ key, attribute, visitor, path, schema, value, getModel }, { set, recurse })=>{
    const parent = {
        key,
        path,
        schema,
        attribute
    };
    const targetSchema = getModel(attribute.component);
    const newValue = await recurse(visitor, {
        schema: targetSchema,
        path,
        getModel,
        parent
    }, value);
    set(key, newValue);
})// Handle media recursion
.onMedia(async ({ key, visitor, path, schema, attribute, value, getModel }, { set, recurse })=>{
    const parent = {
        key,
        path,
        schema,
        attribute
    };
    const targetSchemaUID = 'plugin::upload.file';
    const targetSchema = getModel(targetSchemaUID);
    const newValue = await recurse(visitor, {
        schema: targetSchema,
        path,
        getModel,
        parent
    }, value);
    set(key, newValue);
})// Scalar fields: recurse into operator maps (e.g. { $contains: 'x' }) so visitors see nested keys.
.onAttribute(({ attribute, value })=>Boolean(contentTypes.isScalarAttribute(attribute)) && isObj(value) && !Array.isArray(value), async ({ key, visitor, path, value, schema, getModel, attribute }, { set, recurse })=>{
    const parent = {
        key,
        path,
        schema,
        attribute
    };
    set(key, await recurse(visitor, {
        schema,
        path,
        getModel,
        parent
    }, value));
});
var traverseQueryFilters = curry.curry(filters.traverse);

module.exports = traverseQueryFilters;
//# sourceMappingURL=query-filters.js.map
