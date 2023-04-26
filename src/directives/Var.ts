import { LineDirective } from "../Directive.js";
import Environment from "../Enviroment.js";
import RequestModule from "../RequestModule.js";

export default class VarDirective extends LineDirective {
    build(module: RequestModule, arg: string): void {
        if (!arg) throw new Error('Missing argument for @var directive');
        arg.split(/\s*,\s*/).forEach(name => {
            let required: boolean;
            if (name.endsWith('?')) {
                name = name.slice(0, -1);
                required = false;
            } else {
                required = true;
            }
            module.declareVar(name, required);
        });
    }
}
