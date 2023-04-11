import { BlockDirective } from "../Directive.js";
import { Environment, Literal, TemplateString } from "../Expression.js";
import RequestModule from "../RequestModule.js";
import SetVarDirective from "./SetVar.js";

export default class RunDirective extends BlockDirective {
    build(module: RequestModule, arg: string, lines: string[]): void {
        const fileExpr = TemplateString.parse(arg);
        module.commands.push({
            async run(env: Environment): Promise<void> {
                const file = fileExpr.eval(env);
                const child = module.spawn();
                // add the custom variables to the child module as @set commands                
                for (let line of lines) {
                    line = line.trim();
                    if (!line || line.startsWith('#')) continue;
                    new SetVarDirective().build(child, line);
                }
                // now load the module
                await child.loadFile(file);
                const response = await child.exec(env.vars);
                env.vars.$response = new Literal(response);
            }
        });
    }
}
