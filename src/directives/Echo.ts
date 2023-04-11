import { LineDirective } from "../Directive.js";
import { Environment, TemplateString } from "../Expression.js";
import RequestModule from "../RequestModule.js";

export default class EchoDirective extends LineDirective {
    build(module: RequestModule, arg: string): void {
        const textExpr = TemplateString.parse(arg);
        module.commands.push({
            async run(env: Environment): Promise<void> {
                const text = String(textExpr.eval(env));
                console.log(text);
            }
        });
    }
}
