import { LineDirective } from "../Directive.js";
import { Environment, TemplateString } from "../Expression.js";
import RequestModule from "../RequestModule.js";

export default class IncludeDirective extends LineDirective {
    build(module: RequestModule, arg: string): void {
        const fileExpr = TemplateString.parse(arg);
        module.commands.push({
            async run(env: Environment): Promise<void> {
                const file = fileExpr.eval(env);
                const child = module.spawn();
                await child.loadFile(file);
                await child.execWithEnv(env);
            }
        });
    }
}
