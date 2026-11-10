import type { Modules } from '@strapi/types';
type Tasks = Modules.Cron.CronTasks;
declare const createCronService: () => {
    add(tasks?: Tasks): /*elided*/ any;
    remove(name: string): /*elided*/ any;
    start(): /*elided*/ any;
    stop(): /*elided*/ any;
    destroy(): /*elided*/ any;
    readonly jobs: Modules.Cron.JobSpec[];
};
export default createCronService;
//# sourceMappingURL=cron.d.ts.map