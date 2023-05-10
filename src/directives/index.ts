import EchoDirective from "./Echo.js";
import SetHeaderDirective from "./Header.js";
import SetHeadersDirective from "./Headers.js";
import IncludeDirective from "./Include.js";
import ImportDirective from "./Import.js";
import { RequestDirective } from "./Request.js";
import RunDirective from "./Run.js";
import SetVarDirective from "./SetVar.js";
import { IDirective } from "../Directive.js";
import InspectDirective from "./Inspect.js";
import SetQueryDirective from "./Query.js";
import VarDirective from "./Var.js";
import PromptDirective from "./Prompt.js";
import SetBodyDirective from "./Body.js";

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

    "@var": new VarDirective(),
    "@prompt": new PromptDirective(),
    "@set": new SetVarDirective(),
    "@query": new SetQueryDirective(),
    "@body": new SetBodyDirective(),
    "@header": new SetHeaderDirective(),
    "@headers": new SetHeadersDirective(),
    "@include": new IncludeDirective(),
    "@run": new RunDirective(),
    "@echo": new EchoDirective(),
    "@inspect": new InspectDirective(),
    "@import": new ImportDirective(),
}

export default directives;