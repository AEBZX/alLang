import {token_type, TokenStream} from 'allang-compiler-base'
import {
    ExprArrayTree,
    ExprBooleanTree,
    ExprIdenTree,
    ExprNullTree,
    ExprNumberTree,
    ExprStringTree,
    ExprTree
} from '../../tree'
import {expr} from './index'
import allang_log from '../../base/allang_log'

export function string_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    if(tool.now().type==token_type.string)return new ExprStringTree(tool.next().name)
    return null
}
export function number_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    if(tool.now().type==token_type.number)return new ExprNumberTree(parseFloat(tool.next().name))
    return null
}
export function boolean_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    if(tool.now().type==token_type.keyword&&(tool.now().name=='true'||tool.now().name=='false')){
        return new ExprBooleanTree(tool.next().name=='true')
    }
    return null
}
export function null_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    if(tool.now().type==token_type.keyword&&tool.now().name=='null'){
        tool.next()
        return new ExprNullTree()
    }
    return null
}
export function iden_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    if(tool.now().type==token_type.identifier){
        return new ExprIdenTree(tool.next().name)
    }
    return null
}
export function array_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    if(tool.now().name!='[')return null
    tool.next()
    let value:ExprTree[]=[expr(tool)]
    if(value[0]==null){
        if(tool.now().name==']')return new ExprArrayTree([])
        return null
    }
    while(tool.now().name==','){
        tool.next()
        value.push(expr(tool))
        if(value[value.length-1]==null)return null
    }
    if(tool.now().name!=']')return null
    return new ExprArrayTree(value)
}
export function theses_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    if(tool.now().name!='(')return null
    tool.next()
    let ret=expr(tool)
    if(ret==null)allang_log.error('缺少表达式',tool.now().line)
    if(tool.now().name!=')')allang_log.error('括号表达式缺少结束符',tool.now().line)
    return ret
}
//TODO 暂不实现
export function map_expr(tool:TokenStream){
}
//TODO 暂不实现
export function lambda_expr(tool:TokenStream){
}
export default function (tool:TokenStream){
    return string_expr(tool)||number_expr(tool)||boolean_expr(tool)||null_expr(tool)||iden_expr(tool)||array_expr(tool)||
        map_expr(tool)||theses_expr(tool)||lambda_expr(tool)
}