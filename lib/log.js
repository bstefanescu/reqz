const utilInspect = require('util').inspect;
const chalk = require('chalk');

const print = console.log;

function inspect(obj) {
    return utilInspect(obj, { showHidden: false, depth: null, colors: true });
}

/// the defsault logger
function Logger(config) {
    this.config = config;
}
Logger.prototype = {
    log(res) {
        const config = this.config;
        const req = res.request;
        if (config.req) {
            print(chalk.bold.green((req.method + ' ' + req.url)));
        }
        if (config.reqh) {
            print(req.header);
            print();
        }
        if (config.reqb) {
            print(req.body ? inspect(req.body) : req.text);
        }
        if (config.reqh || config.reqb) {
            print(chalk.gray('---------------------------------------------------'));
        }
        if (config.req || config.reqh || config.reqb) {
            print();
            print(chalk.green.bold("Response"));
        }
        if (config.resh) {
            print(res.headers);
            print();
        }
        if (config.resb) {
            print(res.body ? inspect(res.body) : res.text);
        }
        print(chalk.gray('---------------------------------------------------'));
    },
}
function createLogger(config) {
    const logAll = config.all;
    const logger = new Logger(config);
    return (res, ctx, isDep) => {
        if (!isDep || logAll) {
            logger.log(res);
        }
        return res;
    }
}

module.exports = createLogger;
