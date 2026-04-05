import {token} from '../pre'
import {log} from '../../base/log'

interface tools{
    peek():token
    now():token
    next():token
    backup():void
    restore():void
    flush():void
    add(token:token):void
    remove():void
    get():token[]
}
function create_match(func:(tool:tools)=>boolean,error:(log:log)=>void):{func:(tool:tools)=>boolean,
    error:(log:log)=>void}{
    return {
        func:func,
        error:error
    }
}
function root_match(tool:tools,log:log,parser:(token:token[][])=>Tree,...match:{func:((tool:tools)=>boolean)
    ,error:(log:log)=>void}[]):Tree{
    let matches:(token[])[]=[]
    for(let i=0;i<match.length;i++){
        if(!match[i].func(tool))match[i].error(log)
        else{
            matches.push(tool.get())
            tool.flush()
        }
    }
    return parser(matches)
}
function list_match(tool:tools,log:log,parser:(token:token[][])=>Tree,v?:(log:log,token:token[])=>void,
                    ...match:{func:((tool:tools)=>boolean),error:(log:log)=>void}[]):Tree{
    let matches:(token[])[]=[]
    for(let i=0;i<match.length;i++){
        if(!match[i].func(tool))match[i].error(log)
        else{
            matches.push(tool.get())
            tool.flush()
        }
    }
    if(v)v(log,tool.get())
    return parser(matches)
}
class Tree{
}
export {tools,Tree,list_match,root_match,create_match}