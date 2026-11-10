'use strict';

const isRecord = (value)=>{
    return typeof value === 'object' && value !== null && !Array.isArray(value);
};
const isGroupExpressionValid = (rawGroupExpression)=>{
    if (!isRecord(rawGroupExpression)) return false;
    if (typeof rawGroupExpression.id !== 'string') return false;
    if (rawGroupExpression.id === '') return false;
    if (typeof rawGroupExpression.name !== 'string') return false;
    if (rawGroupExpression.parent !== null && typeof rawGroupExpression.parent !== 'string') {
        return false;
    }
    if (!Array.isArray(rawGroupExpression.children)) return false;
    return true;
};

exports.isGroupExpressionValid = isGroupExpressionValid;
//# sourceMappingURL=isGroupExpressionValid.js.map
