import allang_log from '../allang_log'
import allang_tools from '../allang_tools'
import {create_match, token_type, Tree} from 'allang-compiler-base'
import {tree_type} from '../model'

class identifier_tree extends Tree{
    name:string
    _type:string
    constructor(name:string,_type:string){
        super()
        this.name=name
        this.type=tree_type.identifier
        this._type=_type
    }
}
function identifier(error:(log:allang_log,tool:allang_tools)=>void){
    //iden:type
    let match=(tool:allang_tools):boolean=>{
        tool.backup()
        if(tool.now().type!=token_type.identifier)return false
        let name=tool.getAndNext().name
        if(tool.now().name!=':')return false
        tool.next()
        //可能是[]
        let type:string
        if(tool.now().type != token_type.identifier){
            if(!(tool.getAndNext().name=='[' &&  tool.getAndNext().name==']'))return false
            type='[]'
        }else type=tool.getAndNext().name
        tool.add(new identifier_tree(name,type))
        return true
    }
    let to=(tool:allang_tools):identifier_tree=>tool.getAndFlush() as identifier_tree
    return create_match(match,error,to)
}
class identifier_param_tree extends identifier_tree{
    param:identifier_tree[]
    //...xxx形式
    end_more_param:identifier_tree
    constructor(name:string,_type:string,param:identifier_tree[],end_more_param:identifier_tree){
        super(name,_type)
        this.param=param
        this.end_more_param=end_more_param
    }
}
function identifier_param(error:(log:allang_log,tool:allang_tools)=>void){
    //形式:(a,b,c,(可能)...d)
    //如果有...d,a形式就报错
    let match=(tool:allang_tools):boolean=>{
        tool.backup()
        if(tool.now().name!='(')return false
        tool.next()
        let param:identifier_tree[]=[]
        var split
        while(tool.now().name!=')'){
        }
    }
}
export {identifier_tree,identifier}