import {log} from 'allang-compiler-base'
export default class allang_log implements log{
    error(text:string,line:number):void{
        console.error(`${text}`)
    }
    warn(text:string,line:number):void{
        console.warn(`${text}`)
    }
    info(text:string,line:number):void{
        console.info(`${text}`)
    }
}