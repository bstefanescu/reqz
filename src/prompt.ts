
import readline from 'readline';

export interface IPrompt {
    name: string;
    question?: string;
}

export interface IPrompter {
    ask(questions: IPrompt[]): Promise<Record<string, string>>;
}

export default class TerminalPrompter implements IPrompter {
    ask(prompts: IPrompt[]): Promise<Record<string, string>> {
        return new Promise((resolve, reject) => {
            const answers: Record<string, string> = {};
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            const ask = (i: number) => {
                if (i >= prompts.length) {
                    rl.close();
                    resolve(answers);
                    return;
                }
                const prompt = prompts[i];
                rl.question(prompt.question || `Enter the ${prompt.name}: `, (answer) => {
                    answers[prompt.name] = answer;
                    ask(i + 1);
                });
            }
            ask(0);
        });
    }
}