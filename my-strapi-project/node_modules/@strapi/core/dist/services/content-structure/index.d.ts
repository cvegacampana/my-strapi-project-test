import type { Core, Modules } from '@strapi/types';
export declare const CONTENT_STRUCTURE_FILE_NAME = "groups.json";
export declare const MAX_FOLDER_DEPTH = 3;
export interface ContentStructureService {
    /**
     * Reads the contents of groups.json directly with minimal sanitization.
     */
    read(): Promise<Modules.ContentStructure.ContentStructureFile | null>;
    /**
     * Yields an extremely tolerant version of the groups configuration file. Invalid references are repaired or ignored. Warnings fire for each repair/omission.
     */
    getCleanedFile(): Promise<Modules.ContentStructure.ContentStructureFile | null>;
    /**
     *  Returns the groups configuration transformed into nested trees.
     */
    resolve(): Promise<Modules.ContentStructure.ResolvedContentStructure>;
    /**
     * Writes a new config and invalidates the cache. Does NOT perform validation - this is
     * left to the caller. The Save that triggers the write restarts the server via the
     * standard update-schema flow, which reloads the file; this method only persists it.
     */
    write(structure: Modules.ContentStructure.ContentStructureFile): Promise<void>;
    /**
     * Strictly validates an unknown value against the canonical groups.json schema; throws if invalid.
     */
    validate(value: unknown): Modules.ContentStructure.ContentStructureFile;
    /**
     * Invalidates the cached parsed groups.json file.
     */
    invalidate(): void;
    /**
     * Total number of groups across both sections of the cleaned file.
     */
    countGroups(): Promise<number>;
}
export declare function createContentStructureService(strapi: Core.Strapi): ContentStructureService;
//# sourceMappingURL=index.d.ts.map