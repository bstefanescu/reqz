import { BlockDirective } from "../Directive.js";
import Environment from "../Enviroment.js";
import { IEvaluable, parseExpression } from "../Expression.js";
import type { ICommand } from "../RequestModule.js";
import RequestModule from "../RequestModule.js";

export default class SetVarDirective extends BlockDirective {
    build(module: RequestModule, arg: string, lines: string[]): void {
        const content = (arg + '\n' + lines.join('\n')).trim();
        if (!content) throw new Error('Missing argument for @set directive');

        const i = content.indexOf('=');
        if (i < -1) {
            throw new Error(`Invalid header directive. Expecting a "=" character: ${content}`);
        }
        let k: number, Command: typeof SetOptVarCommand | typeof SetVarCommand;
        if (content[i - 1] === '?') {
            k = i - 1;
            Command = SetOptVarCommand;
        } else {
            k = i;
            Command = SetVarCommand;
        }
        const name = content.substring(0, k).trim();
        const value = parseExpression(content.substring(i + 1).trim());
        module.commands.push(new Command(name, value));

        module.declareVar(name, true);
    }
}

class SetVarCommand implements ICommand {
    constructor(private name: string, private value: IEvaluable) {
    }
    run(env: Environment): void {
        env.vars[this.name] = this.value.eval(env);
    }
}

class SetOptVarCommand implements ICommand {
    constructor(private name: string, private value: IEvaluable) {
    }
    run(env: Environment): void {
        if (!(this.name in env.vars)) { // only set if undefined
            env.vars[this.name] = this.value.eval(env);
        }
    }
}
