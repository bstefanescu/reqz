import { LineDirective } from "../Directive.js";
import Environment from "../Enviroment.js";
import RequestModule from "../RequestModule.js";

export default class OptionalDirective extends LineDirective {
    build(module: RequestModule, arg: string): void {
        if (!arg) throw new Error('Missing argument for @optional directive');
        const names = arg.split(/\s*,\s*/);
        module.commands.push({
            async run(env: Environment): Promise<void> {
                for (const name of names) {
                    if (!(name in env.vars)) {
                        env.vars[name] = undefined;
                    }
                }
            }
        });
    }
}
