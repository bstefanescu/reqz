import { BlockDirective } from "../Directive.js";
import Environment from "../Enviroment.js";
import { IEvaluable, Literal, parseObjectExpression, parseStringExpression } from "../Expression.js";
import RequestModule from "../RequestModule.js";
import SetVarDirective from "./SetVar.js";

export default class RunDirective extends BlockDirective {
    build(module: RequestModule, arg: string, lines: string[]): void {
        let using: IEvaluable | null = null;
        const runArgs = parseArgs(arg, lines);
        if (!runArgs.file) throw new Error('Missing file argument for @run directive');
        const fileExpr = parseStringExpression(runArgs.file);
        if (runArgs.using) {
            using = parseObjectExpression(runArgs.using);
        }
        module.commands.push({
            async run(env: Environment): Promise<void> {
                let inheritedVars = env.vars;
                const file = fileExpr.eval(env);
                const child = module.spawn();
                // add the custom variables to the child module as @set commands                
                if (using) {
                    inheritedVars = using.eval(env);
                }
                // now load the module
                await child.loadFile(file);
                const response = await child.exec(inheritedVars);
                env.vars.$response = new Literal(response);
            }
        });
    }
}

const RX_RUN_USING = /\s+using\s*({)?$/;
function parseArgs(arg: string, lines: string[]) {
    let file, using: string | null = null;
    const m = RX_RUN_USING.exec(arg);
    if (m) {
        file = arg.substring(0, m.index).trim();
        using = (arg.endsWith('{') ? '{\n' : '') + lines.join('\n');
    } else {
        file = arg;
    }
    return { file, using };
}