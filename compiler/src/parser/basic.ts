import allang_log from '../allang_log'
import allang_tools from '../allang_tools'
import {chain_get, object_get_tree} from './get'
import {token, token_type, Tree, create_match, tools,while_match} from 'allang-compiler-base'
import {basic_type, bool_oper_type, math_oper_type, pointer_type, tree_type} from '../model'
class param_get_tree extends Tree{
    param:object_get_tree[]
    constructor(param:object_get_tree[]){
        super()
        this.param=param
        this.type=tree_type.get_param
    }
}
function match_right_small_bracket(tool:allang_tools){
    return tool.now().name==')'
}
function match_left_small_bracket(tool:allang_tools){
    return tool.now().name=='('
}
function match_right_big_bracket(tool:allang_tools){
    return tool.now().name=='}'
}
function match_left_big_bracket(tool:allang_tools){
    return tool.now().name=='{'
}
function match_left_bracket(tool:allang_tools){
    return tool.now().name=='['
}
function match_right_bracket(tool:allang_tools){
    return tool.now().name==']'
}
function match_token(token:string,tool:allang_tools){
    return tool.now().name==token
}
class token_node extends Tree{
    token:string
    constructor(token:string){
        super()
        this.token=token
    }
}
function get_param(tool:allang_tools,log:allang_log){
    let start=create_match(match_left_small_bracket,(log:allang_log)=>{},
        (tool:tools):token_node=>new token_node('('))
    let end=create_match(match_right_small_bracket,
        (log:allang_log,tool:tools)=>log.error('参数块没有闭合',tool.now().line),
        (tool:tools):token_node=>new token_node(')'))
    let data=chain_get((log:allang_log,tool:tools)=>{
        log.error('参数错误',tool.now().line)
    })
    let parser=(child:Tree[]):param_get_tree=>{
        //get,get,...
        let split=true,param:object_get_tree[]=[]
        child.filter((tree:Tree)=>tree instanceof token_node&&(tree.token=='('||tree.token==')'))
            .forEach((tree:Tree)=>{
            if(tree instanceof token_node){
                if(tree.token!=',')log.error('你这参数块什么鬼',tool.now().line)
                if(split)log.error('参数块有连续分割',tool.now().line)
                split=false
            }
            if(tree instanceof object_get_tree){
                param.push(tree)
                split=true
            }
        })
        return new param_get_tree(param)
    }
    return while_match(parser,start,end, data)
}