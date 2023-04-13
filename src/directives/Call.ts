import { LineDirective } from "../Directive.js";
import Environment from "../Enviroment.js";
import { parseStringExpression } from "../Expression.js";
import RequestModule from "../RequestModule.js";

export default class CallDirective extends LineDirective {
    build(module: RequestModule, arg: string): void {
        if (!arg) throw new Error('Missing argument for @call directive');
        const nameExpr = parseStringExpression(arg);
        module.commands.push({
            async run(env: Environment): Promise<void> {
                const name = nameExpr.eval(env);
                const fn = env.getFunction(name);
                await fn.call(module, env);
            }
        });
    }
}
