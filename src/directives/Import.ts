import { LineDirective } from "../Directive.js";
import { parseStringLiteral } from "../Expression.js";
import RequestModule from "../RequestModule.js";

export default class ImportDirective extends LineDirective {
    async build(module: RequestModule, arg: string) {
        if (!arg) throw new Error('Missing argument for @import directive');
        await module.importLib(parseStringLiteral(arg));
    }
}
