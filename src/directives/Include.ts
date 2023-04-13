import { LineDirective } from "../Directive.js";
import Environment from "../Enviroment.js";
import { parseStringExpression } from "../Expression.js";
import RequestModule from "../RequestModule.js";

export default class IncludeDirective extends LineDirective {
    build(module: RequestModule, arg: string): void {
        if (!arg) throw new Error('Missing argument for @include directive');
        const fileExpr = parseStringExpression(arg);
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
