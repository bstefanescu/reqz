import { LineDirective } from "../Directive.js";
import Environment from "../Enviroment.js";
import { parseStringExpression } from "../Expression.js";
import RequestModule from "../RequestModule.js";


export default class PromptDirective extends LineDirective {
    build(module: RequestModule, arg: string): void {
        if (!arg) throw new Error('Missing argument for @prompt directive');
        const prompt = parsePrompt(arg);
        module.commands.push({
            async run(env: Environment): Promise<void> {
                if (!(arg in env.vars)) {
                    const answers = await module.prompt([{
                        name: prompt.name,
                        question: prompt.question?.eval(env),
                    }]);
                    for (const key in answers) {
                        env.vars[key] = answers[key]; // TODO detect types
                    }
                }
            }
        });
    }
}

function parsePrompt(arg: string) {
    const [name, question] = arg.split(/\s*:\s*/);
    return {
        name, question: parseStringExpression(question) || `Enter the ${name}: `
    }
}