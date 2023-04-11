import { BlockDirective } from "../Directive.js";
import RequestModule from "../RequestModule.js";

export default class SetHeadersDirective extends BlockDirective {
    build(module: RequestModule, arg: string, lines: string[]): void {
        if (arg) {
            throw new Error('Invalid content after @headers directive: ' + arg);
        }
        for (const line of lines) {
            const i = line.indexOf(':');
            if (i < -1) {
                throw new Error(`Invalid header line. Expecting a ":" character: ${line}`);
            }
            module.setHeaderExpr(line.substring(0, i).trim(), line.substring(i + 1).trim());
        }
    }
}
