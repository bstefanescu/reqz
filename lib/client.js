const path = require('path');
const fg = require('fast-glob');
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
    }
}

Client.prototype = {
    newContext() {
        return new RequestContext(this.env.clone(), this.scripts, this.before, this.after, this.onError);
    },
    load(reqFile) {
        return new Request(this.newContext(), reqFile);
    },
    _loadEnv(envFile) {
        this.env = new Env();
        if (!envFile) {
            if (fileExists('.env')) {
                envFile = '.env';
            } else if (fileExists('.env.req')) {
                envFile = '.env.req';
            }
        }
        if (envFile) {
            this.env.load(envFile);
        }
    },
    async loadScripts(scriptsFile) {
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
        if (scriptsFile) {
            try {
                this.scripts = require(scriptsFile);
            } catch (e) {
                if (e.code === 'ERR_REQUIRE_ESM') {
                    this.scripts = await import(scriptsFile);
                } else {
                    throw e;
                }
            }
        }
        if (!this.scripts) this.scripts = {};
    }
}

function applyVars(env, vars) {
    if (!vars) return;
    for (let key in vars) {
        let value = vars[key];
        if (typeof value === 'string') {
            const expr = env.expandVars(value);
            if (expr != null) value = expr;
        }
        env.set(key, value);
    }
}

async function runRequest(req) {
    try {
        await req.run();
    } catch (e) {
        if (!e.response) {
            console.error(e);
        }
        process.exit(1);
    }
}

Client.play = async function(opts) {
    // unknown args are collected as an array inside argv._
    const logConfig = opts.quiet ? null : new LogConfig(opts.log, opts.all);
    const file = opts.file;

    const client = new Client({
        log: logConfig
    });

    await client.loadScripts(opts.scripts);

    let play = opts.play;
    if (!play) {
        let req = client.load(file);
        applyVars(req.ctx.env, opts.vars);
        runRequest(req);
    } else { // replay the same request for each vars file
        if (play.length === 1 && play[0].indexOf('*') > -1) {
            play = fg.sync(play);
        }
        for (let envFile of play) {
            let req = client.load(file);
            req.ctx.env.load(envFile);
            applyVars(req.ctx.env, opts.vars);
            runRequest(req);
        }
    }
}


module.exports = Client;
