'use strict';

let lazyCroner;
const getCroner = ()=>{
    if (!lazyCroner) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        lazyCroner = require('croner');
    }
    return lazyCroner;
};
const RECURRENCE_KEYS = [
    'date',
    'dayOfWeek',
    'hour',
    'minute',
    'month',
    'second',
    'year',
    'recurs'
];
const isPlainObject = (value)=>typeof value === 'object' && value !== null && !(value instanceof Date);
const isRuleOptions = (value)=>isPlainObject(value) && 'rule' in value;
const isRecurrenceSpec = (value)=>isPlainObject(value) && !('rule' in value) && RECURRENCE_KEYS.some((key)=>key in value);
const toDate = (value)=>value instanceof Date ? value : new Date(value);
const toSegmentPart = (value, offset = 0)=>{
    if (typeof value === 'number') {
        return String(value + offset);
    }
    return typeof value === 'string' ? value : null;
};
const segmentToField = (segment, fallback = '*', offset = 0)=>{
    if (segment == null) {
        return fallback;
    }
    const part = toSegmentPart(segment, offset);
    if (part !== null) {
        return part;
    }
    if (Array.isArray(segment)) {
        return segment.map((item)=>segmentToField(item, fallback, offset)).join(',');
    }
    if (isPlainObject(segment)) {
        const start = toSegmentPart(segment.start ?? segment.from, offset);
        const end = toSegmentPart(segment.end ?? segment.to, offset);
        if (start !== null && end !== null) {
            const range = `${start}-${end}`;
            const step = toSegmentPart(segment.step);
            return step === null ? range : `${range}/${step}`;
        }
    }
    return fallback;
};
const recurrenceToCron = (spec)=>{
    const second = segmentToField(spec.second, '0');
    const minute = segmentToField(spec.minute);
    const hour = segmentToField(spec.hour);
    const date = segmentToField(spec.date);
    const month = segmentToField(spec.month, '*', 1);
    const dayOfWeek = segmentToField(spec.dayOfWeek);
    const fields = `${second} ${minute} ${hour} ${date} ${month} ${dayOfWeek}`;
    return spec.year == null ? fields : `${fields} ${segmentToField(spec.year)}`;
};
const toCronerOptions = ({ tz, start, end })=>{
    const cronerOptions = {};
    if (tz) {
        cronerOptions.timezone = tz;
    }
    if (start != null) {
        cronerOptions.startAt = toDate(start);
    }
    if (end != null) {
        cronerOptions.stopAt = toDate(end);
    }
    return cronerOptions;
};
const ruleToPattern = (rule)=>{
    if (typeof rule === 'number') {
        return {
            pattern: new Date(rule),
            oneShot: true
        };
    }
    if (rule instanceof Date) {
        return {
            pattern: rule,
            oneShot: true
        };
    }
    if (typeof rule === 'string') {
        return {
            pattern: rule,
            oneShot: false
        };
    }
    if (isRecurrenceSpec(rule)) {
        return {
            pattern: recurrenceToCron(rule),
            oneShot: false
        };
    }
    throw new Error('Unsupported cron rule');
};
const toCronerArgs = (options)=>{
    if (typeof options === 'number') {
        return {
            pattern: new Date(options),
            cronerOptions: {
                maxRuns: 1
            }
        };
    }
    if (options instanceof Date) {
        return {
            pattern: options,
            cronerOptions: {
                maxRuns: 1
            }
        };
    }
    if (typeof options === 'string') {
        return {
            pattern: options,
            cronerOptions: {}
        };
    }
    if (isRecurrenceSpec(options)) {
        return {
            pattern: recurrenceToCron(options),
            cronerOptions: toCronerOptions(options)
        };
    }
    if (isRuleOptions(options)) {
        const cronerOptions = toCronerOptions(options);
        const { pattern, oneShot } = ruleToPattern(options.rule);
        if (oneShot) {
            cronerOptions.maxRuns = 1;
        }
        return {
            pattern,
            cronerOptions
        };
    }
    throw new Error('Unsupported cron schedule');
};
const createCronService = ()=>{
    let jobsSpecs = [];
    let running = false;
    const createRunner = (fn)=>{
        let nextFireDate = null;
        return {
            async run (self) {
                const fireDate = nextFireDate ?? self?.currentRun() ?? new Date();
                nextFireDate = self?.nextRun(fireDate) ?? null;
                await fn({
                    strapi
                }, fireDate);
            },
            setNextRun (date) {
                nextFireDate = date;
            }
        };
    };
    const createCronJob = (pattern, cronerOptions, fn, jobLabel)=>{
        const { Cron: CronCtor } = getCroner();
        const runner = createRunner(fn);
        const job = new CronCtor(pattern, {
            paused: !running,
            // cron-parser (via node-schedule) accepted numeric-prefix stepping
            // like `5/15` as `5-59/15`. Croner 10 rejects it unless this is set.
            sloppyRanges: true,
            ...cronerOptions,
            catch (error) {
                strapi.log.error(`Cron job "${jobLabel}" failed`, error);
            }
        }, runner.run);
        runner.setNextRun(job.nextRun());
        return job;
    };
    const attachHandle = (job, fn, jobLabel)=>{
        let current = job;
        let handle;
        const invoke = async ()=>{
            const fireDate = current.currentRun() ?? new Date();
            return fn({
                strapi
            }, fireDate);
        };
        const cancel = ()=>{
            current.stop();
            return true;
        };
        const nextInvocation = ()=>current.nextRun();
        const reschedule = (spec)=>{
            try {
                const idx = jobsSpecs.findIndex((jobSpec)=>jobSpec.job === handle);
                if (idx === -1) {
                    return false;
                }
                const { pattern, cronerOptions } = toCronerArgs(spec);
                const next = createCronJob(pattern, cronerOptions, fn, jobLabel);
                current.stop();
                current = next;
                jobsSpecs[idx] = {
                    ...jobsSpecs[idx],
                    options: spec
                };
                return true;
            } catch (error) {
                strapi.log.error(`Could not reschedule cron job "${jobLabel}"`, error);
                return false;
            }
        };
        handle = new Proxy(job, {
            get (_target, property) {
                if (property === 'invoke') return invoke;
                if (property === 'cancel') return cancel;
                if (property === 'nextInvocation') return nextInvocation;
                if (property === 'reschedule') return reschedule;
                const value = Reflect.get(current, property, current);
                return typeof value === 'function' ? value.bind(current) : value;
            }
        });
        return handle;
    };
    return {
        add (tasks = {}) {
            for (const taskExpression of Object.keys(tasks)){
                const taskValue = tasks[taskExpression];
                let fn;
                let options;
                let taskName;
                if (typeof taskValue === 'function') {
                    taskName = null;
                    fn = taskValue.bind(tasks);
                    options = taskExpression;
                } else if (typeof taskValue.task === 'function') {
                    taskName = taskExpression;
                    fn = taskValue.task.bind(taskValue);
                    options = taskValue.options;
                } else {
                    throw new Error(`Could not schedule a cron job for "${taskExpression}": no function found.`);
                }
                const jobLabel = taskName ?? taskExpression;
                try {
                    const { pattern, cronerOptions } = toCronerArgs(options);
                    const job = createCronJob(pattern, cronerOptions, fn, jobLabel);
                    jobsSpecs.push({
                        job: attachHandle(job, fn, jobLabel),
                        options,
                        name: taskName
                    });
                } catch (error) {
                    strapi.log.error(`Could not schedule cron job "${jobLabel}": invalid schedule`, error);
                }
            }
            return this;
        },
        remove (name) {
            if (!name) throw new Error('You must provide a name to remove a cron job.');
            const remaining = [];
            for (const jobSpec of jobsSpecs){
                if (jobSpec.name === name) {
                    jobSpec.job.stop();
                } else {
                    remaining.push(jobSpec);
                }
            }
            jobsSpecs = remaining;
            return this;
        },
        start () {
            jobsSpecs.forEach(({ job })=>job.resume());
            running = true;
            return this;
        },
        stop () {
            jobsSpecs.forEach(({ job })=>job.pause());
            running = false;
            return this;
        },
        destroy () {
            this.stop();
            jobsSpecs.forEach(({ job })=>job.stop());
            jobsSpecs = [];
            return this;
        },
        get jobs () {
            return jobsSpecs;
        }
    };
};

module.exports = createCronService;
//# sourceMappingURL=cron.js.map
