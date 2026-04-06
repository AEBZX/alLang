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
function root_match(tool:tools,log:log,parser:(child:Tree[])=>Tree,...match:{func:((tool:tools)=>boolean)
    ,error:(log:log,tool:tools)=>void,to:(tool:tools)=>Tree}[]){
    let func=(tool:tools):boolean=>{
        for(let i=0;i<match.length;i++){
            if(!match[i].func(tool)){
                tool.add(new error_tree(i))
                return false
            }else
                tool.add(match[i].to(tool))
        }
        return true
    }
    let to=(tool:tools):Tree=>parser(tool.get().filter((tree)=>tree.type!=-1))
    let error=(log:log,tool:tools):void=>{
        match[(tool.get()[0] as error_tree).id].error(log,tool)
    }
    return create_match(func,error,to)
}
function list_match(parser:(child:Tree[])=>Tree,
                    ...match:{func:((tool:tools)=>boolean),error:(log:log,tool:tools)=>void,
                        to:(tool:tools)=>Tree}[]){
    let func=(tool:tools):boolean=>{
        tool.backup()
        for(let i=0;i<match.length;i++){
            if(!match[i].func(tool)){
                tool.add(new error_tree(i))
                return false
            }else
                tool.add(match[i].to(tool))
        }
        return true
    }
    let to=(tool:tools):Tree=>parser(tool.get().filter((tree)=>tree.type!=-1))
    let error=(log:log,tool:tools):void=>{
        match[(tool.get()[0] as error_tree).id].error(log,tool)
    }
    return create_match(func,error,to)
}
function while_match(parser:(child:Tree[])=>Tree,
                     start:{func:((tool:tools)=>boolean),error:(log:log,tool:tools)=>void,
    to:(tool:tools)=>Tree},end:{func:((tool:tools)=>boolean),error:(log:log,tool:tools)=>void,
    to:(tool:tools)=>Tree},data:{func:((tool:tools)=>boolean),error:(log:log,tool:tools)=>void,
    to:(tool:tools)=>Tree}){
    let func=(tool:tools):boolean=>{
        tool.backup()
        tool.add(new error_tree(0))
        if(!start.func(tool))return false
        tool.add(start.to(tool))
        while(true){
            if(!data.func(tool)){
                tool.add(new error_tree(1))
                if(end.func(tool)){
                    tool.add(end.to(tool))
                    return true
                }
                tool.add(new error_tree(2))
                return false
            }
            tool.add(data.to(tool))
        }
    }
    let to=(tool:tools):Tree=>parser(tool.get().filter((tree)=>tree.type!=-1))
    let error=(log:log,tool:tools):void=>{
        switch ((tool.get()[0] as error_tree).id){
            case 0:
                start.error(log,tool)
                break
            case 1:
                data.error(log,tool)
                break
            case 2:
                end.error(log,tool)
                break
        }
    }
    return create_match(func,error,to)
}
class Tree{
    type:number
}
//标识符树
class error_tree extends Tree{
    id:number
    constructor(id:number){
        super()
        this.id=id
        this.type=-1
    }
}
export {tools,Tree,list_match,root_match,create_match,while_match,error_tree}