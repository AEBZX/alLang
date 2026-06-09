import {log} from 'allang-compiler-base'

export default class allang_log{
    static error(text: string, line: string): void {
        console.error(`${text} at line ${line}`)
        throw new Error(`${text} at line ${line}`)
    }

    static warn(text: string, line: string): void {
        console.warn(`${text} at line ${line}`)
    }

    static info(text: string, line: string): void {
        console.info(`${text} at line ${line}`)
    }
}