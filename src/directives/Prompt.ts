import { BlockDirective } from "../Directive.js";
import Environment from "../Enviroment.js";
import { parseObjectExpression } from "../Expression.js";
import RequestModule from "../RequestModule.js";


export default class PromptDirective extends BlockDirective {
    build(module: RequestModule, arg: string, lines: string[]): void {
        const content = (arg + '\n' + lines.join('\n')).trim();
        if (!content) throw new Error('Missing argument for @prompt directive');
        const promptsExpr = parseObjectExpression(content);
        module.commands.push({
            async run(env: Environment): Promise<void> {
                const promptDefs = promptsExpr.eval(env);
                let prompts = [];
                for (const name in promptDefs) {
                    const pdef = promptDefs[name];
                    let message: string;
                    let type: boolean | string | undefined = undefined;
                    if (typeof pdef === 'string') {
                        message = pdef;
                        prompts.push({ name, message: pdef, type: 'text' });
                    } else {
                        if (!pdef.message) {
                            throw new Error(`Invalid prompt value. Expecting a string or an object: {name, message, type?}`);
                        }
                        prompts.push({ name, ...pdef });
                    }
                }
                prompts = prompts.filter(prompt => env.vars[prompt.name] === undefined);
                if (prompts.length > 0) {
                    const answers = await module.prompt(prompts);
                    for (const key in answers) {
                        env.vars[key] = answers[key]; // TODO detect types
                    }
                }
            }
        });
    }
}
