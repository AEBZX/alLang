import {TokenStream} from 'allang-compiler-base'
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

// 使用数字常量代替 token_type 枚举以避免循环依赖时的模块加载问题
const T_identifier = 0
const T_keyword = 1
const T_number = 3
const T_string = 4

// 延迟引用 commands_expr 以打破循环依赖
let _commands_expr: ((tool: TokenStream) => any) | null = null
export function _set_commands_expr(fn: (tool: TokenStream) => any) {
    _commands_expr = fn
}

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
    let save=tool.save()
    try{
        let param=param_iden_expr( tool)
        if(param==null){
            tool.restore(save)
            return null
        }
        if(tool.now().name!=':'){
            tool.restore(save)
            return null
        }
        tool.next()
        let type=type_expr(tool)
        if(type==null)allang_log.error('缺少返回类型',tool.now().line)
        if(tool.now().name!='->')allang_log.error('缺少命令体',tool.now().line)
        tool.next()
        // 延迟加载 commands_expr 以避免循环依赖
        if(!_commands_expr){
            tool.restore(save)
            return null
        }
        let command=_commands_expr(tool)
        if(command==null)allang_log.error('缺少命令体',tool.now().line)
        return new ExprLambdaTree(param,type,command)
    }catch(e){
        tool.restore(save)
        return null
    }
}
export default function (tool:TokenStream){
    return _type_expr(tool,T_string,ExprStringTree)
        || _type_filter_expr(tool,T_number,ExprNumberTree,v=>{
            if(typeof v !== 'string') return parseFloat(v)
            if(v.startsWith('0x')||v.startsWith('0X')) return parseInt(v, 16)
            if(v.startsWith('0b')||v.startsWith('0B')) return parseInt(v.substring(2), 2)
            if(v.startsWith('0o')||v.startsWith('0O')) return parseInt(v.substring(2), 8)
            return parseFloat(v)
        })
        || _name_expr(tool,'null',ExprNullTree)
        || _type_expr(tool,T_identifier,ExprIdenTree)
        || array_expr(tool)
        || map_expr(tool)
        || lambda_expr(tool)
        || theses_expr(tool)
        || _type_filter_expr(tool,T_keyword,ExprBooleanTree,v=>{
            if(v=='true')return true
            if(v=='false')return false
            return null
        })
        || null
}