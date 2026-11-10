'use strict';

const getNumberOfDynamicZones = ()=>{
    const contentTypes = strapi.contentTypes;
    const attributes = Object.values(contentTypes ?? {}).flatMap((contentType)=>Object.values(contentType.attributes ?? {}));
    return attributes.filter((attribute)=>attribute.type === 'dynamiczone').length;
};

module.exports = getNumberOfDynamicZones;
//# sourceMappingURL=dynamic-zones.js.map
