import { BlockDirective } from "../Directive.js";
import { parseObjectExpression } from "../Expression.js";
import RequestModule from "../RequestModule.js";

export default class SetHeadersDirective extends BlockDirective {
    build(module: RequestModule, arg: string, lines: string[]): void {
        const content = (arg + '\n' + lines.join('\n')).trim();
        if (!content) throw new Error('Missing argument for @headers directive');
        const expr = parseObjectExpression(content);
        module.commands.push({
            run: (env) => {
                env.headers = expr.eval(env);
            }
        });
    }
}
