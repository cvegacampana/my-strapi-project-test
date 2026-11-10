import { resolve, join } from 'path';
import { get } from 'lodash';

const getDirs = ({ appDir, distDir }, config)=>({
        dist: {
            root: distDir,
            src: join(distDir, 'src'),
            api: join(distDir, 'src', 'api'),
            components: join(distDir, 'src', 'components'),
            extensions: join(distDir, 'src', 'extensions'),
            policies: join(distDir, 'src', 'policies'),
            middlewares: join(distDir, 'src', 'middlewares'),
            config: join(distDir, 'config'),
            contentStructure: join(distDir, 'src', 'content-structure')
        },
        app: {
            root: appDir,
            src: join(appDir, 'src'),
            api: join(appDir, 'src', 'api'),
            components: join(appDir, 'src', 'components'),
            extensions: join(appDir, 'src', 'extensions'),
            policies: join(appDir, 'src', 'policies'),
            middlewares: join(appDir, 'src', 'middlewares'),
            config: join(appDir, 'config'),
            contentStructure: join(appDir, 'src', 'content-structure')
        },
        static: {
            public: resolve(appDir, get(config, 'server.dirs.public'))
        }
    });

export { getDirs };
//# sourceMappingURL=get-dirs.mjs.map
