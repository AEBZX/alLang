import {TokenStream} from 'allang-compiler-base'
import {
    ArrayTypeTree,
    BooleanTypeTree,
    LambdaTypeTree, MapTypeTree, NumberTypeTree, ParamIdenTree, StringTypeTree,
    VarIdenTree,
    VoidTypeTree
} from '../tree'
import allang_log from '../base/allang_log'
export function token_expr(tool:TokenStream,token:string,_exp:any){
    if(!tool.hasMore())return null
    if(tool.now().name==token) {
        tool.next()
        return new _exp()
    }
    return null
}
export function type_expr(tool:TokenStream) {
    return token_expr(tool, 'number', NumberTypeTree)
        || token_expr(tool, 'string', StringTypeTree)
        || token_expr(tool, 'boolean', BooleanTypeTree)
        || token_expr(tool, 'map', MapTypeTree)
        || token_expr(tool, 'void', VoidTypeTree)
        || lambda_expr(tool)
        || array_expr(tool)
}
export function array_expr(tool:TokenStream){
    let type=type_expr(tool)
    if(type==null)allang_log.error('缺少类型',tool.now().line)
    if(tool.now().name!='[]')allang_log.error('缺少数组类型',tool.now().line)
    tool.next()
    return new ArrayTypeTree(type)
}
export function lambda_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    let param=param_iden_expr(tool)
    if(param==null)allang_log.error('缺少参数',tool.now().line)
    if(tool.now().name!='=>')allang_log.error('缺少返回类型',tool.now().line)
    tool.next()
    let type=type_expr(tool)
    if(type==null)allang_log.error('缺少返回类型',tool.now().line)
    return new LambdaTypeTree(param,type)
}
export function var_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    let name=tool.now().name
    if(name==null)return null
    tool.next()
    if(tool.now().name!=':')allang_log.error('缺少类型',tool.now().line)
    tool.next()
    let type=type_expr(tool)
    if(type==null)allang_log.error('缺少类型',tool.now().line)
    return new VarIdenTree(name,type)
}
export function param_iden_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    if(tool.now().name!='(')return null
    tool.next()
    if(tool.now().name==')'){
        tool.next()
        return new ParamIdenTree([])
    }
    let param:VarIdenTree[]=[var_expr(tool)]
    if(param[0]==null)allang_log.error('缺少参数',tool.now().line)
    while(tool.now().name==','){
        tool.next()
        param.push(var_expr(tool))
        if(param[param.length-1]==null)allang_log.error('缺少参数',tool.now().line)
    }
    if(tool.now().name!=')')allang_log.error('缺少参数结束符',tool.now().line)
    tool.next()
    return new ParamIdenTree(param)
}