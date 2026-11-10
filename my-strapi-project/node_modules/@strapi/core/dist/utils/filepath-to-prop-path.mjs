import path from 'node:path';
import { trimStart } from 'lodash';

/**
 * Returns a path (as an array) from a file path
 */ const filePathToPropPath = (entryPath, useFileNameAsKey = true)=>{
    const cleanPath = removeRelativePrefix(entryPath).replace(/(\.settings|\.json|\.js)/g, '').toLowerCase();
    const parts = cleanPath.split(new RegExp(`[\\${path.win32.sep}|${path.posix.sep}]`, 'g')).map((part)=>trimStart(part, '.'))// Dots can also delimit properties within a path segment.
    .join('.').split('.');
    return useFileNameAsKey ? parts : parts.slice(0, -1);
};
const removeRelativePrefix = (filePath)=>{
    return filePath.startsWith(`.${path.win32.sep}`) || filePath.startsWith(`.${path.posix.sep}`) ? filePath.slice(2) : filePath;
};

export { filePathToPropPath };
//# sourceMappingURL=filepath-to-prop-path.mjs.map
