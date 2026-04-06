import allang_log from '../allang_log'
import allang_tools from '../allang_tools'
import {token, token_type, Tree,create_match} from 'allang-compiler-base'
import {basic_type, bool_oper_type, math_oper_type, pointer_type, tree_type} from '../model'

class get_tree extends Tree{
}
class basic_get_tree extends get_tree{
    _type:basic_type
    value:number|boolean|string|void|{}
    constructor(type:basic_type,value:number|boolean|string|null){
        super()
        this._type=type
        this.value=value
        this.type=tree_type.basic_get
    }
}
class var_get_tree extends get_tree{
    name:string
    constructor(name:string){
        super()
        this.name=name
        this.type=tree_type.var_get
    }
}
class object_get_tree extends get_tree{
    chain:get_node_tree[]
    constructor(chain:get_node_tree[]){
        super()
        this.chain=chain
        this.type=tree_type.object_get
    }
}
class array_get_tree extends get_tree{
    index:get_node_tree
    value:get_node_tree
    constructor(index:get_node_tree,value:get_node_tree){
        super()
        this.index=index
        this.value=value
        this.type=tree_type.array_get
    }
}
class pointer_get_tree extends get_tree{
    _type:pointer_type
    value:get_node_tree
    constructor(type:pointer_type,value:get_node_tree){
        super()
        this._type=type
        this.value=value
        this.type=tree_type.pointer_get
    }
}
class math_oper_get_tree extends get_tree{
    _type:math_oper_type
    left:get_node_tree
    right:get_node_tree
    constructor(type:math_oper_type,left:get_node_tree,right:get_node_tree){
        super()
        this._type=type
        this.left=left
        this.right=right
        this.type=tree_type.math_oper_get
    }
}
class bool_oper_tree extends get_tree{
    _type:bool_oper_type
    left:get_node_tree
    right:get_node_tree
    constructor(type:bool_oper_type,left:get_node_tree,right:get_node_tree){
        super()
        this._type=type
        this.left=left
        this.right=right
        this.type=tree_type.bool_oper_get
    }
}
class get_node_tree extends Tree{
    tree:get_tree
    constructor(tree:get_tree){
        super()
        this.tree=tree
        this.type=tree_type.get
    }
}
//number,string,boolean
//a=0,'1',true/false,null
function basic_get(error:(log:allang_log,tool:allang_tools)=>void){
    let match=(tool:allang_tools):boolean=>{
        tool.backup()
        //boolean
        if(tool.now().type==token_type.keyword){
            if(tool.now().name=='true'||tool.now().name=='false'){
                tool.add(tool.now())
                return true
            }
        }
        //number
        if(tool.now().type==token_type.number){
            tool.add(tool.now())
            return true
        }
        //string
        if(tool.now().type==token_type.string){
            tool.add(tool.now())
            return true
        }
        return false
    }
    let to=(tool:allang_tools):basic_get_tree=>{
        return new basic_get_tree(basic_type.number,tool.getAndNext().name)
    }
    return create_match(match,error,to)
}
function chain_get(error:(log:allang_log,tool:allang_tools)=>void){
    let match=(tool:allang_tools):boolean=>{
        tool.backup()
        return false
    }
    let to=(tool:allang_tools):object_get_tree=>{
        return null
    }
    return create_match(match,error,to)
}
export {basic_get,basic_get_tree,get_node_tree,get_tree,object_get_tree,array_get_tree,pointer_get_tree,
        math_oper_get_tree,bool_oper_tree,var_get_tree,pointer_type,basic_type,tree_type,math_oper_type,chain_get}