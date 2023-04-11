import { LineDirective } from "../Directive.js";
import { Environment, VarExpr } from "../Expression.js";
import RequestModule from "../RequestModule.js";

import { inspect as utilInspect } from 'util';

function inspect(obj: any) {
    return utilInspect(obj, { showHidden: false, depth: null, colors: true });
}

export default class InspectDirective extends LineDirective {
    build(module: RequestModule, arg: string): void {
        const varExpr = VarExpr.parse(arg);
        module.commands.push({
            async run(env: Environment): Promise<void> {
                console.log(inspect(varExpr.eval(env)));
            }
        });
    }
}
