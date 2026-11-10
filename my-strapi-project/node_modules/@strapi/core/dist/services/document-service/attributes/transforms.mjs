import { isString, toNumber, get } from 'lodash';
import bcrypt from 'bcryptjs';

const transforms = {
    password (value, context) {
        const { attribute } = context;
        if (attribute.type !== 'password') {
            throw new Error('Invalid attribute type');
        }
        if (!isString(value) && !(value instanceof Buffer)) {
            return value;
        }
        const rounds = toNumber(get(attribute, 'encryption.rounds', 10));
        return bcrypt.hashSync(value.toString(), rounds);
    }
};

export { transforms as default };
//# sourceMappingURL=transforms.mjs.map
