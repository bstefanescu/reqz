import { LineDirective } from "../Directive.js";
import RequestModule from "../RequestModule.js";

export default class SetHeaderDirective extends LineDirective {
    build(module: RequestModule, arg: string): void {
        const i = arg.indexOf(':');
        if (i < -1) {
            throw new Error(`Invalid header directive. Expecting a ":" character: ${arg}`);
        }
        module.setHeaderExpr(arg.substring(0, i).trim(), arg.substring(i + 1).trim());
    }
}
