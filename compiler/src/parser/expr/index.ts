import {TokenStream} from 'allang-compiler-base'
import {ExprTernaryTree} from '../../tree'
import allang_log from '../../base/allang_log'
import primary from './primary'
import prefix from './prefix'
import postfix from './postfix'
import binary from './binary'
export function ternary_expr(tool:TokenStream){
    let condition=_expr(tool)
    if(condition==null)return null
    if(!tool.hasMore())return condition
    if(tool.now().name!='?')return condition
    tool.next()
    let true_value=expr(tool)
    if(true_value==null)allang_log.error('缺少表达式',tool.now().line)
    if(!tool.hasMore())allang_log.error('三元表达式缺少结束符',tool.now().line)
    if(tool.now().name!=':')allang_log.error('三元表达式缺少结束符',tool.now().line)
    tool.next()
    let false_value=expr(tool)
    if(false_value==null)allang_log.error('缺少表达式',tool.now().line)
    return new ExprTernaryTree(condition,true_value,false_value)
}
export function _expr(tool:TokenStream){
    if(!tool.hasMore())return null
    return binary(tool)||prefix(tool)||postfix(tool)||primary(tool)||null
}
export function expr(tool:TokenStream){
    return ternary_expr(tool)||binary(tool)||prefix(tool)||postfix(tool)||primary(tool)||null
}
export default expr