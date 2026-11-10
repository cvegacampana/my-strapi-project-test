import { traverseEntity } from '@strapi/utils';
import { Relation } from './types';
type TraverseEntity = Parameters<typeof traverseEntity>;
type TraverseEntityRelationsOptions = TraverseEntity[1] & {
    includeMedia?: boolean;
};
declare const mapRelationCurried: import("lodash").CurriedFunction2<(relation: any) => any, Relation, Promise<Relation>>;
declare const traverseEntityRelationsCurried: import("lodash").CurriedFunction3<import("@strapi/utils/dist/traverse-entity").Visitor, TraverseEntityRelationsOptions, import("@strapi/utils/dist/types").Data, Promise<import("@strapi/utils/dist/types").Data>>;
export { mapRelationCurried as mapRelation, traverseEntityRelationsCurried as traverseEntityRelations, };
//# sourceMappingURL=map-relation.d.ts.map