'use strict';

var _ = require('lodash');
var curry = require('../curry.js');
var factory = require('./factory.js');

const isStringArray = (value)=>{
    return Array.isArray(value) && value.every(_.isString);
};
const fields = factory()// Intercept array of strings
// e.g. fields=['title', 'description']
.intercept(isStringArray, async (visitor, options, fields, { recurse })=>{
    return Promise.all(fields.map((field)=>recurse(visitor, options, field)));
})// Intercept comma separated fields (as string)
// e.g. fields='title,description'
.intercept((value)=>_.isString(value) && value.includes(','), (visitor, options, fields, { recurse })=>{
    return Promise.all(fields.split(',').map((field)=>recurse(visitor, options, field)));
})// Return wildcards as is
.intercept((value)=>_.eq('*', value), _.constant('*'))// Parse string values
// Since we're parsing strings only, each value should be an attribute name (and it's value, undefined),
// thus it shouldn't be possible to set a new value, and get should return the whole data if key === data
.parse(_.isString, ()=>({
        transform: (value)=>value.trim(),
        remove (key, data) {
            return data === key ? undefined : data;
        },
        set (_key, _value, data) {
            return data;
        },
        keys (data) {
            return [
                data
            ];
        },
        get (key, data) {
            return key === data ? data : undefined;
        }
    }));
var traverseQueryFields = curry.curry(fields.traverse);

module.exports = traverseQueryFields;
//# sourceMappingURL=query-fields.js.map
