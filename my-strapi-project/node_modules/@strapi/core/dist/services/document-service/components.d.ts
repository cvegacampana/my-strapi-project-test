import _ from 'lodash';
import type { UID, Schema, Data, Modules } from '@strapi/types';
type Input<T extends UID.Schema> = Modules.Documents.Params.Data.Input<T>;
type LoadedComponents<TUID extends UID.Schema> = Data.Entity<TUID, Schema.AttributeNamesByType<TUID, 'component' | 'dynamiczone'>>;
type SingleComponentValue = Schema.Attribute.ComponentValue<UID.Component, false>;
type RepeatableComponentValue = Schema.Attribute.ComponentValue<UID.Component, true>;
type ComponentValue = SingleComponentValue | RepeatableComponentValue;
type DynamicZoneValue = Schema.Attribute.DynamicZoneValue<UID.Component[]>;
type ComponentBody = {
    [key: string]: ComponentValue | DynamicZoneValue;
};
declare const omitComponentData: _.CurriedFunction2<import("@strapi/types/dist/struct/schema.js").ComponentSchema | import("@strapi/types/dist/struct/schema.js").ContentTypeSchema, Input<UID.Schema>, Partial<Input<UID.Schema>>>;
declare const createComponents: <TUID extends UID.Schema, TData extends Input<TUID>>(uid: TUID, data: TData) => Promise<ComponentBody>;
declare const getComponents: <TUID extends UID.Schema>(uid: TUID, entity: {
    id: Modules.EntityService.Params.Attribute.ID;
}) => Promise<LoadedComponents<TUID>>;
declare const updateComponents: <TUID extends UID.Schema, TData extends Partial<Input<TUID>>>(uid: TUID, entityToUpdate: {
    id: Modules.EntityService.Params.Attribute.ID;
}, data: TData) => Promise<ComponentBody>;
/**
 * Whether the data sent for a component leaves it as it is stored. Nested components and dynamic
 * zones are not compared here: updateComponents only reports the ones that changed, and the caller
 * checks that it reported none. Anything that cannot be compared with certainty counts as a change.
 */
declare const isComponentUnchanged: (schema: Schema.Schema, stored: Record<string, unknown>, data: Record<string, unknown>) => boolean;
/**
 * Deletes every component under an entry or a component. The whole tree is removed level by level
 * with one statement per component uid and per relation attribute. When a database lifecycle
 * subscriber listens to any delete lifecycle of one of those component uids, the components are
 * deleted one by one instead, so that each of them fires its events and no subscriber receives an
 * event it did not receive before.
 */
declare const deleteComponents: <TUID extends UID.Schema, TEntity extends Data.Entity<TUID>>(uid: TUID, entityToDelete: TEntity, { loadComponents }?: {
    loadComponents?: boolean | undefined;
}) => Promise<void>;
declare const deleteComponent: <TUID extends UID.Component>(uid: TUID, componentToDelete: Data.Component<TUID>) => Promise<void>;
declare const assignComponentData: _.CurriedFunction3<import("@strapi/types/dist/struct/schema.js").ComponentSchema | import("@strapi/types/dist/struct/schema.js").ContentTypeSchema, ComponentBody, Input<UID.Schema>, ComponentBody & Partial<Input<UID.Schema>>>;
/** *************************
    Component relation handling for document operations
************************** */
type ComponentParent = {
    uid: string;
    table: string;
    parentId: number | string;
};
/**
 * Find the parent entry of a component instance.
 *
 * Single-instance form of `findComponentParents`.
 *
 * - Returns the parent uid, parent table name, and parent id if found.
 * - Returns null if no parent relationship exists.
 */
declare const findComponentParent: (componentSchema: Schema.Component, componentId: number | string, parentSchemasForComponent: (Schema.ContentType | Schema.Component)[], opts?: {
    trx?: any;
}) => Promise<ComponentParent | null>;
/**
 * Finds content types that contain the given component and have draft & publish enabled.
 */
declare const getParentSchemasForComponent: (componentSchema: Schema.Component) => Array<Schema.ContentType | Schema.Component>;
/**
 * Creates a filter function for component relations that can be passed to the generic
 * unidirectional relations utility.
 *
 * A relation of a component instance is propagated to the new document version unless the
 * instance belongs to an entry with draft and publish enabled: that entry's new version gets
 * its own copy of the component.
 */
declare const createComponentRelationFilter: () => (relations: Record<string, any>[], model: Schema.Component | Schema.ContentType, trx: any) => Promise<Record<string, any>[]>;
export { omitComponentData, assignComponentData, isComponentUnchanged, getComponents, createComponents, updateComponents, deleteComponents, deleteComponent, createComponentRelationFilter, findComponentParent, getParentSchemasForComponent, };
//# sourceMappingURL=components.d.ts.map