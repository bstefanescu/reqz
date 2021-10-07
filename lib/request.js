const fs = require('fs');
const superagent = require('superagent');
const Parser = require('./parser');

function Request(ctx, file, isDep) {
    this.ctx = ctx;
    this.isDep = isDep;
    this._load(file);
}

Request.prototype = {
    _create() {
        const ctx = this.ctx;
        const data = this.data;
        const req = superagent(data.method, ctx.eval(data.url));
        if (data.headers) {
            for (const [key, value] of data.headers) {
                req.set(key, ctx.eval(value));
            }
        }
        if (data.auth) { // support for basic auth
            req.auth(data.auth[0], data.auth[1]);
        }
        if (data.body) {
            if (data.body.inline) {
                req.send(ctx.eval(data.body.data));
            } else {
                // TODO use pipe?
                req.send(fs.readFileSync(data.body.data));
            }
        }
        return req;
    },
    _load(file) {
        const ctx = this.ctx;
        const data = new Parser().parseFile(file);
        if (!data.method && !data.url) {
            throw new Error(`No request line found in ${file}`);
        }
        this.data = data;
        if (data.before) {
            const tasks = [];
            data.before.forEach(task => {
                if (task) tasks.push(ctx.resolveTask(task));
            });
            this.before = tasks;
        }
        if (data.after) {
            const tasks = [];
            data.after.forEach(task => {
                if (task) tasks.push(ctx.resolveTask(task));
            });
            this.after = tasks;
        }
        if (ctx.before) {
            if (this.before) {
                this.before = ctx.before.concat(this.before);
            } else {
                this.before = ctx.before;
            }
        }
        if (ctx.after) {
            if (this.after) {
                this.after = ctx.after.concat(this.after);
            } else {
                this.after = ctx.after;
            }
        }
    },
    async run() {
        const ctx = this.ctx, isDep = this.isDep;
        let ret;
        if (this.before) {
            for (const task of this.before) {
                ret = await task(ret, ctx, isDep);
            }
        }
        // we create the actual request only aftyer running before tasks
        // to le tthem update the env if needed.
        const req = this._create();
        try {
            ret = await req; // a response nobject *(use ret.body or ret.text to get the content)
        } catch (err) {
            ctx.onError(err);
            throw err;
        }
        if (this.after) {
            for (const task of this.after) {
                ret = await task(ret, ctx, isDep);
            }
        }
        return ret;
    }
};


module.exports = Request;
