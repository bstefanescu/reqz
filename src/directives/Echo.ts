import { LineDirective } from "../Directive.js";
import Environment from "../Enviroment.js";
import { parseStringExpression } from "../Expression.js";
import RequestModule from "../RequestModule.js";

export default class EchoDirective extends LineDirective {
    build(module: RequestModule, arg: string): void {
        const textExpr = parseStringExpression(arg);
        module.commands.push({
            async run(env: Environment): Promise<void> {
                const text = String(textExpr.eval(env));
                console.log(String(env.eval(text)));
            }
        });
    }
}
