'use strict';

/**
 * Curries `fn` by closing over the arguments supplied so far.
 *
 * Used instead of lodash `curry` for functions that are partially applied on every
 * request, such as the query traversals (`traverseQueryPopulate(visitor, ctx)`). On every
 * partial call lodash builds a new wrapper and derives its `toString` by stringifying the
 * whole source of the curried function and running regexes over it, which showed up as a
 * significant share of request CPU.
 *
 * Behaves like lodash `curry` otherwise: `fn` is called as soon as at least `arity`
 * arguments have been supplied (any extra ones are passed along), and `arity` defaults to
 * `fn.length`. Placeholders are not supported.
 */ const curry = (fn, arity = fn.length)=>{
    const curried = (...args)=>{
        if (args.length >= arity) {
            return fn(...args);
        }
        return (...rest)=>curried(...args, ...rest);
    };
    return curried;
};

exports.curry = curry;
//# sourceMappingURL=curry.js.map
