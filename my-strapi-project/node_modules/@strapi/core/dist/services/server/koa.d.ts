import Koa from 'koa';
declare const createKoaApp: ({ proxy, proxyIpHeader, maxIpsCount, keys, }: {
    proxy: boolean;
    proxyIpHeader: string;
    maxIpsCount: number;
    keys: string[];
}) => Koa<Koa.DefaultState, Koa.DefaultContext>;
export default createKoaApp;
//# sourceMappingURL=koa.d.ts.map