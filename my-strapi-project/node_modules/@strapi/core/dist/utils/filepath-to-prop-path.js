'use strict';

var path = require('node:path');
var _ = require('lodash');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var path__default = /*#__PURE__*/_interopDefault(path);

/**
 * Returns a path (as an array) from a file path
 */ const filePathToPropPath = (entryPath, useFileNameAsKey = true)=>{
    const cleanPath = removeRelativePrefix(entryPath).replace(/(\.settings|\.json|\.js)/g, '').toLowerCase();
    const parts = cleanPath.split(new RegExp(`[\\${path__default.default.win32.sep}|${path__default.default.posix.sep}]`, 'g')).map((part)=>_.trimStart(part, '.'))// Dots can also delimit properties within a path segment.
    .join('.').split('.');
    return useFileNameAsKey ? parts : parts.slice(0, -1);
};
const removeRelativePrefix = (filePath)=>{
    return filePath.startsWith(`.${path__default.default.win32.sep}`) || filePath.startsWith(`.${path__default.default.posix.sep}`) ? filePath.slice(2) : filePath;
};

exports.filePathToPropPath = filePathToPropPath;
//# sourceMappingURL=filepath-to-prop-path.js.map
