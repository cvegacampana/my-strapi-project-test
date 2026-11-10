const getNumberOfConditionalFields = ()=>{
    const contentTypes = strapi.contentTypes;
    const components = strapi.components;
    const countConditionalFieldsInSchema = (schema)=>{
        const attributes = Object.values(schema ?? {}).flatMap((model)=>Object.values(model.attributes ?? {}));
        return attributes.filter((attribute)=>attribute.conditions && typeof attribute.conditions === 'object').length;
    };
    const contentTypeCount = countConditionalFieldsInSchema(contentTypes);
    const componentCount = countConditionalFieldsInSchema(components);
    return contentTypeCount + componentCount;
};

export { getNumberOfConditionalFields as default };
//# sourceMappingURL=conditional-fields.mjs.map
