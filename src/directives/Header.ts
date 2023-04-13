import { LineDirective } from "../Directive.js";
import RequestModule from "../RequestModule.js";

export default class SetHeaderDirective extends LineDirective {
    build(module: RequestModule, arg: string): void {
        const i = arg.indexOf(':');
        if (i < -1) {
            throw new Error(`Invalid header directive. Expecting a ":" character: ${arg}`);
        }
        const name = arg.substring(0, i).trim();
        const value = arg.substring(i + 1).trim();
        if (!arg) throw new Error('Missing argument for @header directive');
        module.setHeaderExpr(name, value);
    }
}
