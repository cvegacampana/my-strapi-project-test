import { isEmpty } from 'lodash';
import { createSession } from 'koa-session';

const defaultConfig = {
    key: 'koa.sess',
    maxAge: 86400000,
    autoCommit: true,
    overwrite: true,
    httpOnly: true,
    signed: true,
    rolling: false,
    renew: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: undefined
};
const session = (userConfig, { strapi })=>{
    const { keys } = strapi.server.app;
    if (!Array.isArray(keys) || keys.length === 0 || keys.some((key)=>isEmpty(key))) {
        throw new Error(`App keys are required. Please set app.keys in config/server.js (ex: keys: ['myKeyA', 'myKeyB'])`);
    }
    const config = {
        ...defaultConfig,
        ...userConfig
    };
    strapi.server.use(createSession(config, strapi.server.app));
};

export { session };
//# sourceMappingURL=session.mjs.map
