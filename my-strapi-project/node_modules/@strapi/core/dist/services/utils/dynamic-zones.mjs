const getNumberOfDynamicZones = ()=>{
    const contentTypes = strapi.contentTypes;
    const attributes = Object.values(contentTypes ?? {}).flatMap((contentType)=>Object.values(contentType.attributes ?? {}));
    return attributes.filter((attribute)=>attribute.type === 'dynamiczone').length;
};

export { getNumberOfDynamicZones as default };
//# sourceMappingURL=dynamic-zones.mjs.map
