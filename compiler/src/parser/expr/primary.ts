import {token_type, TokenStream} from 'allang-compiler-base'
import {
    ExprArrayTree,
    ExprBooleanTree,
    ExprIdenTree, ExprLambdaTree, ExprMapTree,
    ExprNullTree,
    ExprNumberTree,
    ExprStringTree,
    ExprTree, VarIdenTree
} from '../../tree'
import {expr} from './index'
import allang_log from '../../base/allang_log'
import {param_iden_expr, type_expr, var_expr} from '../iden'
import {commands_expr} from '../command'

export function _name_expr(tool:TokenStream,name:string,_exp:any){
    if(!tool.hasMore())return null
    if(tool.now().name==name){
        tool.next()
        return new _exp()
    }
    return null
}
export function _type_expr(tool:TokenStream,type:token_type,_exp:any){
    if(!tool.hasMore())return null
    if(tool.now().type==type)return new _exp(tool.next().name)
    return null
}
export function _type_filter_expr(tool:TokenStream,type:token_type,_exp:any,param:(a:string)=>any){
    if(!tool.hasMore())return null
    if(tool.now().type==type){
        if(param(tool.now().name)==null)return null
        return new _exp(param(tool.next().name))
    }
    return null
}
export function array_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    if(tool.now().name=='[]'){
        tool.next()
        return new ExprArrayTree([])
    }
    if(tool.now().name!='[')return null
    tool.next()
    let value:ExprTree[]=[expr(tool)]
    if(value[0]==null)return null
    while(tool.now().name==','){
        tool.next()
        value.push(expr(tool))
        if(value[value.length-1]==null)allang_log.error('缺少表达式',tool.now().line)
    }
    if(tool.now().name!=']')return null
    tool.next()
    return new ExprArrayTree(value)
}
export function theses_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    if(tool.now().name!='(')return null
    tool.next()
    let ret=expr(tool)
    if(ret==null)allang_log.error('缺少表达式',tool.now().line)
    if(tool.now().name!=')')allang_log.error('括号表达式缺少结束符',tool.now().line)
    tool.next()
    return ret
}
export function _KV_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    let a=var_expr(tool)
    if(a==null)return null
    if(tool.now().name!='=')allang_log.error('缺少值的定义',tool.now().line)
    tool.next()
    let _expr=expr(tool)
    if(_expr==null)allang_log.error('缺少表达式',tool.now().line)
    return {name:a,value:_expr}
}
export function map_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    if(tool.now().name!='{')return null
    tool.next()
    if(tool.now().name=='}'){
        tool.next()
        return new ExprMapTree([])
    }
    let ret:{name:VarIdenTree,value:ExprTree}[]=[]
    ret.push(_KV_expr(tool))
    if(ret[0]==null)allang_log.error('缺少表达式',tool.now().line)
    while(tool.now().name==','){
        tool.next()
        ret.push(_KV_expr(tool))
        if(ret[ret.length-1]==null)allang_log.error('缺少表达式',tool.now().line)
    }
    if(tool.now().name=='}'){
        tool.next()
        return new ExprMapTree(ret)
    }
    allang_log.error('缺少结束符',tool.now().line)
}
export function lambda_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    let param=param_iden_expr( tool)
    if(param==null)return null
    if(tool.now().name!=':')allang_log.error('缺少返回类型',tool.now().line)
    tool.next()
    let type=type_expr(tool)
    if(type==null)allang_log.error('缺少返回类型',tool.now().line)
    if(tool.now().name!='->')allang_log.error('缺少命令体',tool.now().line)
    tool.next()
    let command=commands_expr(tool)
    if(command==null)allang_log.error('缺少命令体',tool.now().line)
    return new ExprLambdaTree(param,type,command)
}
export default function (tool:TokenStream){
    return _type_expr(tool,token_type.string,ExprStringTree)
        || _type_filter_expr(tool,token_type.number,ExprNumberTree,v=>parseFloat(v))
        || _name_expr(tool,'null',ExprNullTree)
        || _type_expr(tool,token_type.identifier,ExprIdenTree)
        || array_expr(tool)
        || map_expr(tool)
        || theses_expr(tool)
        || lambda_expr(tool)
        || _type_filter_expr(tool,token_type.keyword,ExprBooleanTree,v=>{
            if(v=='true')return true
            if(v=='false')return false
            return null
        })
        || null
}