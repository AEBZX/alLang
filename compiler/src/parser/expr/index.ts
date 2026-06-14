import {TokenStream} from 'allang-compiler-base'
import {ExprTernaryTree} from '../../tree'
import allang_log from '../../base/allang_log'
import primary from './primary'
import prefix from './prefix'
import postfix from './postfix'
import binary from './binary'
export function ternary_expr(tool:TokenStream){
    let condition=expr(tool)
    if(condition==null)return null
    if(tool.next().name!='?')return condition
    let true_value=expr(tool)
    if(true_value==null)allang_log.error('缺少表达式',tool.now().line)
    if(tool.next().name!=':')allang_log.error('三元表达式缺少结束符',tool.now().line)
    let false_value=expr(tool)
    if(false_value==null)allang_log.error('缺少表达式',tool.now().line)
    return new ExprTernaryTree(condition,true_value,false_value)
}
export function expr(tool:TokenStream){
    return ternary_expr(tool)||prefix(tool)||postfix(tool)||binary(tool)||primary(tool)
}
export default expr