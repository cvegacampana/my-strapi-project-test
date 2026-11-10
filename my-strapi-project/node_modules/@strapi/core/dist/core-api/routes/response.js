'use strict';

var z = require('zod/v4');

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n.default = e;
  return Object.freeze(n);
}

var z__namespace = /*#__PURE__*/_interopNamespace(z);

/**
 * Pagination object on collection `find` responses.
 *
 * Page-based (`page` / `pageSize`) and offset-based (`start` / `limit`) are
 * alternatives on the same endpoint. `total` and `pageCount` are omitted when
 * `pagination[withCount]` is false.
 */ const pagedPaginationMetaSchema = z__namespace.object({
    page: z__namespace.number().int(),
    pageSize: z__namespace.number().int(),
    pageCount: z__namespace.number().int().optional(),
    total: z__namespace.number().int().optional()
});
const offsetPaginationMetaSchema = z__namespace.object({
    start: z__namespace.number().int(),
    limit: z__namespace.number().int(),
    total: z__namespace.number().int().optional()
});
/**
 * `{ data, meta: { pagination } }` envelope returned by collection `find`.
 */ const collectionResponseSchema = (data)=>z__namespace.object({
        data,
        meta: z__namespace.object({
            pagination: z__namespace.union([
                pagedPaginationMetaSchema,
                offsetPaginationMetaSchema
            ])
        })
    });
/**
 * `{ data, meta: {} }` envelope. findOne, create, update, and single-type
 * find/update return this. Delete routes reuse it for their documented JSON body.
 */ const documentResponseSchema = (data)=>z__namespace.object({
        data,
        meta: z__namespace.object({})
    });

exports.collectionResponseSchema = collectionResponseSchema;
exports.documentResponseSchema = documentResponseSchema;
//# sourceMappingURL=response.js.map
