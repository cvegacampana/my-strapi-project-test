'use strict';

var _ = require('lodash');
var koaSession = require('koa-session');

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
    if (!Array.isArray(keys) || keys.length === 0 || keys.some((key)=>_.isEmpty(key))) {
        throw new Error(`App keys are required. Please set app.keys in config/server.js (ex: keys: ['myKeyA', 'myKeyB'])`);
    }
    const config = {
        ...defaultConfig,
        ...userConfig
    };
    strapi.server.use(koaSession.createSession(config, strapi.server.app));
};

exports.session = session;
//# sourceMappingURL=session.js.map
