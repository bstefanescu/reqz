

import Enquirer from 'enquirer';

export interface IPrompt {
    name: string;
    message: string;
    type: string; // input | password | confirm
}

export interface IPrompter {
    ask(questions: IPrompt[]): Promise<Record<string, string>>;
}

export class EnquirerPrompter implements IPrompter {
    ask(questions: IPrompt[]): Promise<Record<string, string>> {
        return Enquirer.prompt(questions);
    }
}


