import {TokenStream} from 'allang-compiler-base'
import {
    ExprAddressTree,
    ExprContraryTree,
    ExprNegTree,
    ExprNewTree,
    ExprNotTree,
    ExprPreDecTree,
    ExprPreIncTree, ExprReferenceTree
} from '../../tree'
import allang_log from '../../base/allang_log'
import {expr} from './index'

export function prefix_expr(tool:TokenStream,token:string,_exp:any){
    if(!tool.hasMore())return null
    if(tool.now().name==token){
        tool.next()
        let exp=expr( tool)
        if(exp==null)allang_log.error('缺少表达式',tool.now().line)
        return new _exp(exp)
    }
    return null
}
export default function (tool:TokenStream){
    return prefix_expr(tool,'-',ExprNegTree)
    || prefix_expr(tool,'!',ExprNotTree)
    || prefix_expr(tool,'~',ExprContraryTree)
    || prefix_expr(tool,'new',ExprNewTree)
    || prefix_expr(tool,'++',ExprPreIncTree)
    || prefix_expr(tool,'--',ExprPreDecTree)
    || prefix_expr(tool,'&',ExprAddressTree)
    || prefix_expr(tool,'*',ExprReferenceTree)
    || null
}