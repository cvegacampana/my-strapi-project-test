'use strict';

var _ = require('lodash');
var bcrypt = require('bcryptjs');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var bcrypt__default = /*#__PURE__*/_interopDefault(bcrypt);

const transforms = {
    password (value, context) {
        const { attribute } = context;
        if (attribute.type !== 'password') {
            throw new Error('Invalid attribute type');
        }
        if (!_.isString(value) && !(value instanceof Buffer)) {
            return value;
        }
        const rounds = _.toNumber(_.get(attribute, 'encryption.rounds', 10));
        return bcrypt__default.default.hashSync(value.toString(), rounds);
    }
};

module.exports = transforms;
//# sourceMappingURL=transforms.js.map
