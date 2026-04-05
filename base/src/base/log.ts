interface log{
    error(text:string,line:number):void
    warn(text:string,line:number):void
    info(text:string,line:number):void
}
export {log}