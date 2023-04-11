import CallDirective from "./Call.js";
import EchoDirective from "./Echo.js";
import SetHeaderDirective from "./Header.js";
import SetHeadersDirective from "./Headers.js";
import IncludeDirective from "./Include.js";
import LibDirective from "./Lib.js";
import { RequestDirective } from "./Request.js";
import RunDirective from "./Run.js";
import SetVarDirective from "./SetVar.js";
import { IDirective } from "../Directive.js";
import InspectDirective from "./Inspect.js";

const requestDirective = new RequestDirective();
const directives: Record<string, IDirective> = {
    "GET": requestDirective,
    "POST": requestDirective,
    "PUT": requestDirective,
    "DELETE": requestDirective,
    "PATCH": requestDirective,
    "OPTIONS": requestDirective,
    "HEAD": requestDirective,
    "CONNECT": requestDirective,
    "TRACE": requestDirective,

    "@set": new SetVarDirective(),
    "@header": new SetHeaderDirective(),
    "@headers": new SetHeadersDirective(),
    "@include": new IncludeDirective(),
    "@run": new RunDirective(),
    "@call": new CallDirective(),
    "@echo": new EchoDirective(),
    "@inspect": new InspectDirective(),
    "@lib": new LibDirective(),
}

export default directives;