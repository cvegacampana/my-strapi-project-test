import { join } from 'path';
import fse from 'fs-extra';
import { isGroupExpressionValid } from './utils/isGroupExpressionValid.mjs';
import { contentStructureFileSchema } from './validation.mjs';

const CONTENT_STRUCTURE_FILE_NAME = 'groups.json';
const MAX_FOLDER_DEPTH = 3;
const isRecord = (value)=>{
    return typeof value === 'object' && value !== null && !Array.isArray(value);
};
function createContentStructureService(strapi) {
    /**
   * This cache exists to ensure all consumers receive the same cleaned+resolved data, regardless of call order / invocation relative to the strapi reload.
   */ let cache;
    const warn = (message)=>{
        strapi.log.warn(`[content-structure] ${message}`);
    };
    const cleanSection = (rawSection, sectionKey)=>{
        const rawGroups = (()=>{
            if (rawSection === undefined || rawSection === null) {
                return [];
            }
            if (!isRecord(rawSection) || !Array.isArray(rawSection.groups)) {
                warn(`Section "${sectionKey}" is malformed; ignoring it`);
                return [];
            }
            return rawSection.groups;
        })();
        const seenGroupIds = new Map();
        const groups = [];
        for (const raw of rawGroups){
            if (!isGroupExpressionValid(raw)) {
                warn(`Dropping a malformed group entry in section "${sectionKey}"`);
                continue;
            }
            if (raw.name.trim() === '') {
                warn(`Dropping group "${raw.id}" in section "${sectionKey}": empty name`);
                continue;
            }
            if (seenGroupIds.has(raw.id)) {
                warn(`Dropping duplicate group id "${raw.id}" in section "${sectionKey}"`);
                continue;
            }
            const group = {
                children: raw.children,
                parent: raw.parent,
                name: raw.name,
                id: raw.id
            };
            seenGroupIds.set(group.id, group);
            groups.push(group);
        }
        const reparentToRoot = (group, reason)=>{
            group.parent = null;
            groups.splice(groups.indexOf(group), 1);
            groups.push(group);
            warn(`Reparenting group "${group.id}" in section "${sectionKey}" to root: ${reason}`);
        };
        // oxlint-disable-next-line - Duplicating is necessary because the original array is mutated inside the iterator.
        for (const group of [
            ...groups
        ]){
            if (group.parent !== null && !seenGroupIds.has(group.parent)) {
                reparentToRoot(group, `parent "${group.parent}" does not exist`);
            }
        }
        // oxlint-disable-next-line - Duplicating is necessary because the original array is mutated inside the iterator.
        for (const group of [
            ...groups
        ]){
            const chain = new Set([
                group.id
            ]);
            let current = group;
            while(current.parent !== null){
                if (chain.has(current.parent)) {
                    reparentToRoot(group, 'its parent chain contains a cycle');
                    break;
                }
                chain.add(current.parent);
                current = seenGroupIds.get(current.parent);
            }
        }
        // oxlint-disable-next-line - Duplicating is necessary because the original array is mutated inside the iterator.
        for (const group of [
            ...groups
        ]){
            let current = group;
            let depth = 1;
            while(current.parent !== null){
                current = seenGroupIds.get(current.parent);
                depth += 1;
            }
            if (depth > MAX_FOLDER_DEPTH) {
                reparentToRoot(group, `it exceeds the maximum nesting depth of ${MAX_FOLDER_DEPTH}`);
            }
        }
        const expectedKind = sectionKey === 'collectionTypes' ? 'collectionType' : 'singleType';
        const seenGroupChildren = new Set();
        const seenUids = new Set();
        for (const group of groups){
            const cleanedChildren = [];
            for (const entry of group.children){
                if (!isRecord(entry)) {
                    warn(`Dropping a malformed child entry of group "${group.id}"`);
                    continue;
                }
                if (entry.type === 'contentType') {
                    const { uid } = entry;
                    if (typeof uid !== 'string') {
                        warn(`Dropping a contentType child of group "${group.id}": invalid uid`);
                        continue;
                    }
                    const schema = strapi.contentTypes[uid];
                    if (!schema) {
                        warn(`Dropping unknown content type "${uid}" from group "${group.id}"`);
                        continue;
                    }
                    // kind is optional on schemas; absent means collectionType.
                    const kind = schema.kind ?? 'collectionType';
                    if (kind !== expectedKind) {
                        warn(`Dropping content type "${uid}" from group "${group.id}": its kind "${kind}" does not belong in section "${sectionKey}"`);
                        continue;
                    }
                    if (seenUids.has(uid)) {
                        warn(`Dropping duplicate reference to content type "${uid}" from group "${group.id}"`);
                        continue;
                    }
                    cleanedChildren.push({
                        type: 'contentType',
                        uid: uid
                    });
                    seenUids.add(uid);
                    continue;
                }
                if (entry.type === 'group') {
                    const { id } = entry;
                    if (typeof id !== 'string') {
                        warn(`Dropping a group child of group "${group.id}": invalid id`);
                        continue;
                    }
                    const target = seenGroupIds.get(id);
                    if (!target || target.parent !== group.id) {
                        warn(`Dropping group child "${id}" from group "${group.id}": inconsistent reference`);
                        continue;
                    }
                    if (seenGroupChildren.has(id)) {
                        warn(`Dropping duplicate group child "${id}" from group "${group.id}"`);
                        continue;
                    }
                    cleanedChildren.push({
                        type: 'group',
                        id
                    });
                    seenGroupChildren.add(id);
                    continue;
                }
                warn(`Dropping a child entry of group "${group.id}" with an unknown type`);
            }
            group.children = cleanedChildren;
        }
        for (const group of groups){
            if (group.parent !== null && !seenGroupChildren.has(group.id)) {
                const parent = seenGroupIds.get(group.parent);
                parent.children.push({
                    type: 'group',
                    id: group.id
                });
                seenGroupChildren.add(group.id);
                warn(`Group "${group.id}" was missing from the children of its parent "${parent.id}"; appended it`);
            }
        }
        return {
            groups
        };
    };
    const resolveSection = (section)=>{
        const byId = new Map(section.groups.map((group)=>[
                group.id,
                group
            ]));
        const toNode = (group)=>{
            const cleanedChildren = group.children.map((entry)=>{
                if (entry.type === 'contentType') {
                    return {
                        type: 'contentType',
                        uid: entry.uid
                    };
                }
                return toNode(byId.get(entry.id));
            });
            return {
                children: cleanedChildren,
                name: group.name,
                type: 'group',
                id: group.id
            };
        };
        return section.groups.filter((group)=>group.parent === null).map(toNode);
    };
    async function read() {
        const filePath = join(strapi.dirs.dist.contentStructure, CONTENT_STRUCTURE_FILE_NAME);
        if (!await fse.pathExists(filePath)) {
            return null;
        }
        let parsed;
        try {
            parsed = await fse.readJSON(filePath);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            strapi.log.error(`[content-structure] Could not parse ${filePath} (${message}); continuing without content-type folders`);
            return null;
        }
        if (!isRecord(parsed) || !isRecord(parsed.sections)) {
            strapi.log.error(`[content-structure] ${filePath} is not an object with a "sections" property; continuing without content-type folders`);
            return null;
        }
        if (parsed.version !== 1) {
            strapi.log.error(`[content-structure] Unknown version "${parsed.version}" in ${filePath} (expected 1); continuing without content-type folders`);
            return null;
        }
        return parsed;
    }
    const load = ()=>{
        if (!cache) {
            cache = (async ()=>{
                const file = await read();
                if (!file) {
                    return {
                        cleaned: null,
                        resolved: {
                            collectionTypes: [],
                            singleTypes: []
                        }
                    };
                }
                const cleaned = {
                    version: 1,
                    sections: {
                        collectionTypes: cleanSection(file.sections.collectionTypes, 'collectionTypes'),
                        singleTypes: cleanSection(file.sections.singleTypes, 'singleTypes')
                    }
                };
                return {
                    cleaned,
                    resolved: {
                        collectionTypes: resolveSection(cleaned.sections.collectionTypes),
                        singleTypes: resolveSection(cleaned.sections.singleTypes)
                    }
                };
            })();
        }
        return cache;
    };
    function invalidate() {
        cache = undefined;
    }
    async function getCleanedFile() {
        return (await load()).cleaned;
    }
    async function resolve() {
        return (await load()).resolved;
    }
    async function write(structure) {
        const dir = strapi.dirs.app.contentStructure;
        await fse.ensureDir(dir);
        await fse.writeJSON(join(dir, CONTENT_STRUCTURE_FILE_NAME), structure, {
            spaces: 2
        });
        invalidate();
    }
    function validate(value) {
        return contentStructureFileSchema.parse(value);
    }
    async function countGroups() {
        const { cleaned } = await load();
        if (!cleaned) {
            return 0;
        }
        const collectionTypesCount = cleaned.sections.collectionTypes.groups.length;
        const singleTypesCount = cleaned.sections.singleTypes.groups.length;
        return collectionTypesCount + singleTypesCount;
    }
    return {
        getCleanedFile,
        countGroups,
        invalidate,
        validate,
        resolve,
        write,
        read
    };
}

export { CONTENT_STRUCTURE_FILE_NAME, MAX_FOLDER_DEPTH, createContentStructureService };
//# sourceMappingURL=index.mjs.map
