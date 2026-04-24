import {log} from 'allang-compiler-base'

export default class allang_log implements log {
    error(text: string, line: string): void {
        console.error(`${text} at line ${line}`)
        process.exit(1)
    }

    warn(text: string, line: string): void {
        console.warn(`${text} at line ${line}`)
    }

    info(text: string, line: string): void {
        console.info(`${text} at line ${line}`)
    }
}