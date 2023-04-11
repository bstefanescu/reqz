import { LineDirective } from "../Directive.js";
import { Environment, IEvaluable, parseAssignableExpression } from "../Expression.js";
import type { IRunnable } from "../RequestModule.js";
import RequestModule from "../RequestModule.js";

export default class SetVarDirective extends LineDirective {
    build(module: RequestModule, arg: string): void {
        const i = arg.indexOf('=');
        if (i < -1) {
            throw new Error(`Invalid header directive. Expecting a "=" character: ${arg}`);
        }
        let k: number, Command: typeof SetOptVarCommand | typeof SetVarCommand;
        if (arg[i - 1] === '?') {
            k = i - 1;
            Command = SetOptVarCommand;
        } else {
            k = i;
            Command = SetVarCommand;
        }
        const name = arg.substring(0, k).trim();
        const value = parseAssignableExpression(arg.substring(i + 1).trim());
        module.commands.push(new Command(name, value));

    }
}

class SetVarCommand implements IRunnable {
    constructor(private name: string, private value: IEvaluable) {
    }
    run(env: Environment): void {
        env.vars[this.name] = this.value.eval(env);
    }
}

class SetOptVarCommand implements IRunnable {
    constructor(private name: string, private value: IEvaluable) {
    }
    run(env: Environment): void {
        env.vars[this.name] = this.value.eval(env);
    }
}
