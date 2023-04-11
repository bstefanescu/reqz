import { LineDirective } from "../Directive.js";
import RequestModule from "../RequestModule.js";

export default class LibDirective extends LineDirective {
    async build(module: RequestModule, arg: string) {
        await module.importLib(arg);
    }
}
