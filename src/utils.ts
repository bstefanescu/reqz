
const NUMBER_RX = /^[+-]?\d+(\.\d+)?$/;

/**
 * Return back the string or a number if the string is a valid number or a boolean 
 * if the string is 'true' or 'false'
 * @param {*} text 
 */
export function typed(text: string) {
    const lwText = text.toLowerCase();
    if (lwText === 'true') {
        return true;
    } else if (lwText === 'false') {
        return false;
    } else {
        return NUMBER_RX.test(text) ? parseFloat(text) : text;
    }
}