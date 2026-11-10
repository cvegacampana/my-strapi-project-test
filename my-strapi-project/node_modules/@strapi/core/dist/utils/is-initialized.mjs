import { isEmpty } from 'lodash';

/**
 * Test if the strapi application is considered as initialized (1st user has been created)
 */ const isInitialized = async (strapi)=>{
    try {
        if (isEmpty(strapi.admin)) {
            return true;
        }
        // test if there is at least one admin
        const anyAdministrator = await strapi.db.query('admin::user').findOne({
            select: [
                'id'
            ]
        });
        return anyAdministrator != null;
    } catch (err) {
        strapi.stopWithError(err);
    }
};

export { isInitialized };
//# sourceMappingURL=is-initialized.mjs.map
