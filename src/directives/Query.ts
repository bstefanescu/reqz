import { BlockDirective } from "../Directive.js";
import RequestModule from "../RequestModule.js";

export default class SetQueryDirective extends BlockDirective {
    build(module: RequestModule, arg: string, lines: string[]): void {
        const content = (arg + '\n' + lines.join('\n')).trim();
        if (!content) throw new Error('Missing argument for @query directive');
        module.setQueryExpr(content);
    }
}
