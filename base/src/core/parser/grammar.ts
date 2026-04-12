import {token} from '../pre'
import {log} from '../../base/log'

interface tools{
    peek():token
    now():token
    next():token
    backup():void
    restore():void
    flush():void
    add(tree:Tree):void
    remove():void
    get():Tree[]
}
function create_match(func:(tool:tools)=>boolean,error:(log:log,tool:tools)=>void
                      ,to:(tool:tools)=>Tree):{func:(tool:tools)=>boolean,
    error:(log:log,tool:tools)=>void,to:(tool:tools)=>Tree}{
    return {
        func:func,
        to:to,
        error:error
    }
}
function root_match(tool:tools,parser:(child:Tree[])=>Tree,...match:{func:((tool:tools)=>boolean)
    ,error:(log:log,tool:tools)=>void,to:(tool:tools)=>Tree}[]):Tree{
    let func=(tool:tools):boolean=> {
        for (let i = 0; i < match.length; i++) {
            if (!match[i].func(tool)) {
                return false
            } else
                tool.add(match[i].to(tool))
        }
        return true
    }
    return func(tool)?parser(tool.get().filter((tree)=>tree.type!=-1)):null
}
function list_match(parser:(child:Tree[])=>Tree,error:(log:log,tool:tools)=>void,
                    ...match:{func:((tool:tools)=>boolean),error:(log:log,tool:tools)=>void,
                        to:(tool:tools)=>Tree}[]){
    let func=(tool:tools):boolean=>{
        for(let i=0;i<match.length;i++){
            if(!match[i].func(tool)){
                return false
            }else
                tool.add(match[i].to(tool))
        }
        return true
    }
    let to=(tool:tools):Tree=>parser(tool.get().filter((tree)=>tree.type!=-1))
    return create_match(func,error,to)
}
function while_match(parser:(child:Tree[])=>Tree,
                     start:{func:((tool:tools)=>boolean),error:(log:log,tool:tools)=>void,
    to:(tool:tools)=>Tree},end:{func:((tool:tools)=>boolean),error:(log:log,tool:tools)=>void,
    to:(tool:tools)=>Tree},data:{func:((tool:tools)=>boolean),error:(log:log,tool:tools)=>void,
    to:(tool:tools)=>Tree},split:{func:((tool:tools)=>boolean),error:(log:log,tool:tools)=>void,
        to:(tool:tools)=>Tree},error:(log:log,tool:tools)=>void){
    let func=(tool:tools):boolean=>{
        if(!start.func(tool))return false
        tool.add(start.to(tool))
        let _split=false
        while(true){
            if(!data.func(tool)){
                if(end.func(tool)){
                    tool.add(end.to(tool))
                    return true
                }
                if(split.func(tool)){
                    if(_split)return false
                    _split=true
                    tool.add(split.to(tool))
                    continue
                }
                return false
            }
            _split=false
            tool.add(data.to(tool))
        }
    }
    let to=(tool:tools):Tree=>parser(tool.get().filter((tree)=>tree.type!=-1))
    return create_match(func,error,to)
}
function or_match(parser:(child:Tree[])=>Tree,error:(log:log,tool:tools)=>void,
                  ...match:{func:((tool:tools)=>boolean),error:(log:log,tool:tools)=>void,
                      to:(tool:tools)=>Tree}[]){
    let func=(tool:tools):boolean=>{
        for(let i=0;i<match.length;i++){
            if(match[i].func(tool)){
                tool.add(match[i].to(tool))
                return true
            }
        }
        return false
    }
    let to=(tool:tools):Tree=>parser(tool.get().filter((tree)=>tree.type!=-1))
    return create_match(func,error,to)
}
class Tree{
    type:number
}
export {tools,Tree,list_match,root_match,create_match,while_match,or_match}