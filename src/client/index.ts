
import { program } from "commander";
import { resolve } from "path";
import { Logger, QuietLogger } from "../Logger.js";
import RequestModule from "../RequestModule.js";
import pkg from "../package.js";
import play from "./play.js";
import { EnquirerPrompter } from "../prompt.js";

const NUMBER_RX = /^[+-]?\d+(\.\d+)?$/;

function getArgsAndVars(argsAndVars: string[]) {
    const args: string[] = [];
    const vars: Record<string, string | boolean | number> = {}
    let key: string | null = null;

    for (let i = 0, l = argsAndVars.length; i < l; i++) {
        const arg = argsAndVars[i];
        if (arg.startsWith('--')) {
            if (key) {
                vars[key] = true;
                key = null;
            }
            if (arg.length === 2) {
                args.push(...argsAndVars.slice(i + 1));
                break;
            } else {
                key = arg;
            }
        } else if (key) {
            vars[key] = NUMBER_RX.test(arg) ? parseFloat(arg) : arg;
            key = null;
        } else {
            args.push(arg);
        }
    }
    if (key) {
        vars[key] = true;
    }
    return [args, vars];
}

function getLogger(quiet?: boolean, all?: boolean, log?: string) {
    if (quiet) return new QuietLogger();
    if (log) {
        const config: any = { all: !!all };
        log.split(',').forEach(flag => config[flag] = true);
        return new Logger(config);
    }
    return new Logger();
}

program
    .name('reqz')
    .description('run http requests')
    .argument('<file>', 'the request file to run')
    .option('-q | --quiet', 'Run quitely. Do not output enything.')
    .option('-a | --all', 'Log all the request from the request chain not only the main one.')
    .option('-l | --log <string>', 'Log settings. A list separated by commas. Can be any combination of: "req,reqh,reqb,resh,resb".')
    .option('-p | --play <string>', 'Takes a csv file as value. Play the same request for each set of variables created for each line in the csv file. The csv header is expected to specify the variable names.')
    .option('-c | --col-delimiter <string>', 'A column delimiter in case --play was specified. The default is the comma character.')
program.version(pkg.version, '-v, --version', 'output the current version');
program.allowUnknownOption(true).parse();

const [args, vars] = getArgsAndVars(program.args);
const opts = program.opts();

const reqFile = resolve((args as any)[0]);
const csvFile = opts.play && resolve(opts.play);


const logger = getLogger(opts.quiet, opts.all, opts.log);

RequestModule.usePrompter(new EnquirerPrompter());

new RequestModule(logger).loadFile(reqFile).then((module: RequestModule) => {
    if (csvFile) {
        play(module, csvFile, vars, opts.colDelimiter || ',').catch(handleError);
    } else {
        module.exec(vars).catch(handleError)
    }
}).catch(handleError);


function handleError(err: any) {
    if ('status' in err && 'response' in err) {
        logger.logErrorResponse(err.response);
    } else {
        console.error(err);
    }
    process.exit(1);
}
