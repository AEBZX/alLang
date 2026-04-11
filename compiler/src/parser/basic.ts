import allang_log from '../allang_log'
import allang_tools from '../allang_tools'
import {chain_get, object_get_tree} from './get'
import {create_match, tools, Tree, while_match} from 'allang-compiler-base'
import {tree_type} from '../model'

class param_get_tree extends Tree{
    param:object_get_tree[]
    constructor(param:object_get_tree[]){
        super()
        this.param=param
        this.type=tree_type.get_param
    }
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
}
export {param_get_tree,get_param,token_node,while_match,create_match,match_right_small_bracket,match_left_small_bracket,
match_right_big_bracket,match_left_big_bracket,match_left_bracket,match_right_bracket,match_token}