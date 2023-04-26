import { LineDirective } from "../Directive.js";
import Environment from "../Enviroment.js";
import { parseVarRef } from "../Expression.js";
import RequestModule from "../RequestModule.js";

import { inspect as utilInspect } from 'util';

function inspect(obj: any) {
    return utilInspect(obj, { showHidden: false, depth: null, colors: true });
}

export default class InspectDirective extends LineDirective {
    build(module: RequestModule, arg: string): void {
        const varExpr = arg && parseVarRef(arg);
        module.commands.push({
            async run(env: Environment): Promise<void> {
                console.log(inspect(varExpr ? varExpr.eval(env) : env));
            }
        });
    }
}
