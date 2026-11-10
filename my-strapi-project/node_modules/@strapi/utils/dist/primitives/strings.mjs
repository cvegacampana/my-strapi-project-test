import _, { kebabCase } from 'lodash';
import slugify from '@sindresorhus/slugify';

const nameToSlug = (name, options = {
    separator: '-'
})=>slugify(name, options);
const nameToCollectionName = (name)=>slugify(name, {
        separator: '_'
    });
const toRegressedEnumValue = (value)=>slugify(value, {
        decamelize: false,
        lowercase: false,
        separator: '_'
    });
const getCommonPath = (...paths)=>{
    const [segments, ...otherSegments] = paths.map((it)=>_.split(it, '/'));
    return _.join(_.takeWhile(segments, (str, index)=>otherSegments.every((it)=>it[index] === str)), '/');
};
const isEqual = (a, b)=>String(a) === String(b);
const isCamelCase = (value)=>/^[a-z][a-zA-Z0-9]+$/.test(value);
const isKebabCase = (value)=>/^([a-z][a-z0-9]*)(-[a-z0-9]+)*$/.test(value);
const startsWithANumber = (value)=>/^[0-9]/.test(value);
const joinBy = (joint, ...args)=>{
    return args.reduce((url, path, index)=>{
        if (args.length === 1) return path;
        if (index === 0) return _.trimEnd(path, joint);
        if (index === args.length - 1) return url + joint + _.trimStart(path, joint);
        return url + joint + _.trim(path, joint);
    }, '');
};
const toKebabCase = (value)=>kebabCase(value);

export { getCommonPath, isCamelCase, isEqual, isKebabCase, joinBy, nameToCollectionName, nameToSlug, startsWithANumber, toKebabCase, toRegressedEnumValue };
//# sourceMappingURL=strings.mjs.map
