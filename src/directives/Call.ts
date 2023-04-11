import { LineDirective } from "../Directive.js";
import { Environment, TemplateString } from "../Expression.js";
import RequestModule from "../RequestModule.js";

export default class CallDirective extends LineDirective {
    build(module: RequestModule, arg: string): void {
        const nameExpr = TemplateString.parse(arg);
        module.commands.push({
            async run(env: Environment): Promise<void> {
                const name = nameExpr.eval(env);
                const fn = env.functions[name];
                if (!fn) {
                    throw new Error(`Unknown function ${name}`);
                }
                await fn.call(module, env);
            }
        });
    }
}
