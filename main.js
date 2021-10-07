#!/bin/node

const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');

const {parseValue} = require('./utils.js');
const Client = require('./client.js');

const argv = yargs(hideBin(process.argv))
    .parserConfiguration({'unknown-options-as-args': true})
    .usage('Usage: $0 [options] <file>')
    .command('* <file>')
    .option('quiet', {
        alias: 'q',
        type: 'boolean',
        description: 'Run quitely. Do not output enything.'
    })
    .option('all', {
        alias: 'a',
        type: 'boolean',
        description: 'Log all the request from the request chain not only the main one.'
    })
    .option('log', {
        alias: 'l',
        type: 'string',
        description: 'Log settings. A list separated by commas. Can be any combination of: "req,reqh,reqb,resh,resb,chain".'
    })
    .option('play', {
        type: 'array',
        description: 'Play the same request for each given variables file. Be warned that if the file glob is not quoted the shell file expansion will take over.'
    })
    .argv;


function processVars(vars) {
    if (!vars || !vars.length) return {};
    const result = {};
    for (let i=0,l=vars.length; i<l; i++) {
        let key = vars[i];
        if (!key.startsWith('--')) throw new Error('Unknown option: "'+key+'"');
        key = key.substring(2);
        if (i+1>=l) { // last var
            result[key] = true;
            break;
        }
        let val = vars[i+1];
        if (typeof val === 'string') {
            if (val.startsWith('--')) {
                result[key] = true;
                continue;
            } else {
                result[key] = parseValue(val);
            }
        } else {
            result[key] = val; // boolean?
        }
        i++;
    }
    return result;
}

function processPlay(play, vars) {
    if (!play || !play.length) return play;
    let i = 0, l = play.length;
    for (;i<l;i++) {
        if (play[i].startsWith('-')) break;
    }
    if (i < l) {
        // found options inside play?
        Object.assign(vars, processVars(play.slice(i)));
        return play.slice(0,i);
    }
    return play;
}

// only --opt unknown options are accepted and are assumed to be vars defined on command line
// if no vars are defiend {} is returned
const vars = processVars(argv._);

// array  opts are collecting everything so we need to extract the unknown keys starting with --
// and move them inside _. Because, the user may define a variable after the '--play files' option
const play = processPlay(argv.play, vars);

Client.play({
    file: argv.file,
    log: argv.log,
    quiet: argv.quiet,
    all: argv.all,
    vars: vars,
    play: play
});
