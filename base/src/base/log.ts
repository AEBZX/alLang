interface log{
    error(text:string,line:string):void
    warn(text:string,line:string):void
    info(text:string,line:string):void
}
export {log}