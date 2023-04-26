
import { program } from "commander";
import { resolve } from "path";
import { Logger, QuietLogger } from "../Logger.js";
import RequestModule from "../RequestModule.js";
import pkg from "../package.js";
import play from "./play.js";
import { EnquirerPrompter } from "../prompt.js";
import { typed } from "../utils.js";

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
                key = arg.substring(2);
            }
        } else if (key) {
            vars[key] = typed(arg);
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
    const config: any = { all: !!all };
    if (log) {
        log.split(',').forEach(flag => config[flag] = true);
    } else {
        config.resb = true;
    }
    return new Logger(config);
}

const verboseHelp = `Verbosity level.
    -v0 - only log the request line.
    -v1 - log the request line and the response body.
    -v2 - log the request line and headers and the response headers and body.
    The default is -v1
`;

const logHelp = `Log configuration. Any combination of reqh,reqb,resh,resb separated by commas.
    - reqh - print the request headers.
    - reqb - print the request body.
    - resh - print the response headers.
    - resb - print the response body.
    If specified will overwrite the verbosity flag.    
`;

program
    .name('reqz')
    .description('run http requests')
    .argument('<file>', 'the request file to run')
    .option('-q | --quiet', 'Run quitely. Do not output anything.')
    .option('-v | --verbose [level]', verboseHelp)
    .option('-a | --all', 'Log all the requests from the request chain not only the main one.')
    .option('-l | --log <string>', logHelp)
    .option('-p | --play <string>', 'Takes a csv file as value. Play the same request for each set of variables created for each line in the csv file. The csv header is expected to specify the variable names.')
    .option('-c | --col-delimiter <string>', 'A column delimiter in case --play was specified. The default is the comma character.')
program.version(pkg.version, '-V, --version', 'output the current version');
program.allowUnknownOption(true).parse();

const [args, vars] = getArgsAndVars(program.args);
const opts = program.opts();

const reqFile = resolve((args as any)[0]);
const csvFile = opts.play && resolve(opts.play);

let log = opts.log;
if (!log && opts.verbose != null) {
    const level = parseInt(opts.verbose);
    if (isNaN(level)) {
        console.error('Invalid verbose level. Must be a number.');
        process.exit(1);
    }
    if (level === 1) {
        log = 'resb';
    } else if (level === 2) {
        log = 'reqh,resh,resb';
    } else if (level >= 3) {
        log = 'reqh,reqb,resh,resb';
    }
}
const logger = getLogger(opts.quiet, opts.all, log);

RequestModule.usePrompter(new EnquirerPrompter());

new RequestModule(logger).loadFile(reqFile).then((module: RequestModule) => {
    if (csvFile) {
        play(module, csvFile, vars, opts.colDelimiter || ',').catch(handleError);
    } else {
        module.exec(vars).catch(handleError)
    }
}).catch(handleError);


function handleError(err: any) {
    console.error(err);
    process.exit(1);
}
