const Request = require('./request.js');
const { resolveFile, fileExists } = require("./utils.js");


function requestTask(reqFile) {
    return (ret, ctx) => {
        const autoReq = new Request(ctx, reqFile, true);
        return autoReq.run(); // ignore ret
    }
}

function RequestContext(env, scripts, before, after, onError) {
    this.env = env;
    this.scripts = scripts;
    this.after = after || []; // global after tasks added to all requests
    this.before = before || []; // global before tasks added to all requests
    this.onError = onError;
    scripts.setup && scripts.setup(this);
}
RequestContext.prototype = {
    /// set env var
    set(key, value) {
        this.env.set(key, value);
    },
    /// bget env var
    get(key) {
        return this.env.get(key);
    },
    eval(expr) {
        return this.env.eval(expr);
    },
    //TODO move in RequestContext
    resolveTask(task) {
        if (task.endsWith('.req')) { // resolve a request
            const reqFile = resolveFile(task);
            if (!fileExists(reqFile)) throw new Error(`Referenced task ${task} not found in scripts file`);
            return requestTask(reqFile);
        } else {
            const taskFn = this.scripts[task];
            if (!taskFn) throw new Error(`Referenced task ${task} not found in scripts file`);
            return taskFn;
        }
    },
}

module.exports = RequestContext;
