import {TokenStream} from 'allang-compiler-base'
import {
    ExprAddTree,
    ExprAndTree,
    ExprDivTree, ExprEqualTree, ExprGreaterEqualTree, ExprGreaterTree, ExprLessEqualTree, ExprLessTree,
    ExprLogicAndTree, ExprLogicOrTree,
    ExprModTree,
    ExprMulTree, ExprNotEqualTree,
    ExprOrTree, ExprShiftLeftTree, ExprShiftRightTree,
    ExprSubTree,
    ExprXorTree
} from '../../tree'
import allang_log from '../../base/allang_log'
import {expr,ternary_expr} from './index'
import primary from './primary'
import prefix from './prefix'
import postfix from './postfix'
export function binary_expr(tool:TokenStream,token: string,_exp:any){
    let save=tool.save()
    let a=base_expr(tool)
    if(a==null){
        tool.restore(save)
        return null
    }
    if(!tool.hasMore()){
        tool.restore(save)
        return null
    }
    if(tool.now().name!=token){
        tool.restore(save)
        return null
    }
    tool.next()
    let b=expr(tool)
    if(b==null)allang_log.error('缺少表达式',tool.now().line)
    return new _exp(a,b)
}
export function base_expr(tool:TokenStream){
    return prefix(tool)
    || postfix(tool)
    || primary(tool)
}
export default function (tool:TokenStream){
    return binary_expr(tool,'+',ExprAddTree)
    || binary_expr(tool,'-',ExprSubTree)
    || binary_expr(tool,'*',ExprMulTree)
    || binary_expr(tool,'/',ExprDivTree)
    || binary_expr(tool,'%',ExprModTree)
    || binary_expr(tool,'&',ExprAndTree)
    || binary_expr(tool,'|',ExprOrTree)
    || binary_expr(tool,'^',ExprXorTree)
    || binary_expr(tool,'<<',ExprShiftLeftTree)
    || binary_expr(tool,'>>',ExprShiftRightTree)
    || binary_expr(tool,'==',ExprEqualTree)
    || binary_expr(tool,'!=',ExprNotEqualTree)
    || binary_expr(tool,'<',ExprLessTree)
    || binary_expr(tool,'<=',ExprLessEqualTree)
    || binary_expr(tool,'>',ExprGreaterTree)
    || binary_expr(tool,'>=',ExprGreaterEqualTree)
    || binary_expr(tool,'&&',ExprLogicAndTree)
    || binary_expr(tool,'||',ExprLogicOrTree)
    || null
}