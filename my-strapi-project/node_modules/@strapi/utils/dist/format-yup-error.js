'use strict';

var _ = require('lodash');

const formatYupInnerError = (yupError)=>({
        path: _.toPath(yupError.path),
        message: yupError.message,
        name: yupError.name,
        value: yupError.value
    });
const formatYupErrors = (yupError)=>({
        errors: _.isEmpty(yupError.inner) ? [
            formatYupInnerError(yupError)
        ] : yupError.inner.map(formatYupInnerError),
        message: yupError.message
    });

exports.formatYupErrors = formatYupErrors;
//# sourceMappingURL=format-yup-error.js.map
