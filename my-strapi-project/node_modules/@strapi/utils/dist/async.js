'use strict';

var pMap = require('p-map');
var curry = require('./curry.js');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var pMap__default = /*#__PURE__*/_interopDefault(pMap);

function pipe(...fns) {
    const [firstFn, ...fnRest] = fns;
    return async (...args)=>{
        let res = await firstFn.apply(firstFn, args);
        for(let i = 0; i < fnRest.length; i += 1){
            res = await fnRest[i](res);
        }
        return res;
    };
}
const map = curry.curry(pMap__default.default);
const reduce = (mixedArray)=>async (iteratee, initialValue)=>{
        let acc = initialValue;
        for(let i = 0; i < mixedArray.length; i += 1){
            acc = await iteratee(acc, await mixedArray[i], i);
        }
        return acc;
    };

exports.map = map;
exports.pipe = pipe;
exports.reduce = reduce;
//# sourceMappingURL=async.js.map
