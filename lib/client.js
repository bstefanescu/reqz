const path = require('path');
const fs = require('fs');
const parseCsv = require('csv-parse');
const Request = require('./request.js');
const Env = require('./env.js');
const {fileExists} = require('./utils.js');
const RequestContext = require('./context.js');
const createLogger = require('./log.js');
const LogConfig = require('./log-config.js');


function Client(opts = {}) {
    this._loadEnv(opts.env);
    this.after = opts.after;
    this.before = opts.before;
    if (opts.log) {
        const log = (opts.createLogger || createLogger)(opts.log);
        if (this.after) {
            this.after.unshift(log);
        } else {
            this.after = [ log ];
        }
        this.onError = (err) => {
            const r = err.response;
            if (r && err.status != null) { // a server error
                log(r);
            }
            err.stack && console.error(err.stack);
        }
    } else {
        this.onError = (err) => {};
    }
}

Client.prototype = {
    newContext() {
        return new RequestContext(this.env.clone(), this.before, this.after, this.onError);
    },
    load(reqFile, vars) {
        const ctx = this.newContext();
        if (vars) {
            ctx.env.addVars(vars);
        }
        return new Request(ctx, reqFile);
    },
    async run(reqFile, vars) {
        try {
            const req = this.load(reqFile, vars);
            return await req.run();
        } catch (e) {
            if (!e.response) {
                console.error(e);
            }
            process.exit(1);
        }
    },
    _loadEnv(envFile) {
        this.env = new Env();
        if (fileExists('.env')) {
            this.env.load('.env');
        }
        if (envFile) {
            this.env.load(envFile);
        }
    },
}

function getScriptsFile(scriptsFile) {
    if (!scriptsFile) {
        if (fileExists('scripts.js')) {
            scriptsFile = path.resolve('scripts.js');
        } else if (fileExists('scripts.mjs')) {
            scriptsFile = path.resolve('scripts.mjs');
        } else if (fileExists('scripts.cjs')) {
            scriptsFile = path.resolve('scripts.cjs');
        }
    } else {
        scriptsFile = path.resolve(scriptsFile);
    }
    return scriptsFile;
}


Client.play = async function(opts) {
    // unknown args are collected as an array inside argv._
    const logConfig = opts.quiet ? null : new LogConfig(opts.log, opts.all);
    const file = opts.file;

    const client = new Client({
        log: logConfig,
        env: opts.env
    });

    await client.env.loadScripts(getScriptsFile(opts.scripts));

    let play = opts.play;
    if (!play) {
        await client.run(file, opts.vars);
    } else { // replay the same request for each vars file
        const vars = opts.vars || {};
        const parser = fs.createReadStream(play).pipe(parseCsv({
            bom:true,
            delimiter: ';', //TODO paramterize
            comment: '#',
            columns: true,
            trim: true,
            skip_empty_lines: true
        }));
        let transform = r => r;
        if (opts.with) { // use a transformer on csv records
            transform = client.env.scripts[opts.with];
        }
        for await (const record of parser) {
            await client.run(file, Object.assign(transform(record, client), vars));
        }
    }
}

module.exports = Client;
