import { LineDirective } from "../Directive.js";
import Environment from "../Enviroment.js";
import RequestModule from "../RequestModule.js";

//TODO not yet impplemented
export default class PromptDirective extends LineDirective {
    build(module: RequestModule, arg: string): void {
        if (!arg) throw new Error('Missing argument for @prompt directive');
        module.commands.push({
            async run(env: Environment): Promise<void> {
                if (!(arg in env.vars)) {
                    console.log('@prompt', arg, 'not yet implemented');
                    throw new Error(`Prompt variable not yet implemented`);
                }
            }
        });
    }
}
