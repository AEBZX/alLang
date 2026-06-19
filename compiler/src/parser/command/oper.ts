import {token_type, TokenStream} from 'allang-compiler-base'
import {
    AddSetTree,
    AndSetTree, BreakTree, CallTree, ContinueTree, DeleteTree,
    DivSetTree,
    ModSetTree,
    MulSetTree,
    OrSetTree,
    ReturnTree,
    SetTree,
    ShiftLeftSetTree,
    ShiftRightSetTree,
    SubSetTree, ThrowTree,
    VarTree, VMTree,
    XorSetTree
} from '../../tree'
import allang_log from '../../base/allang_log'
import expr from '../expr'
import {var_expr} from '../iden'
import {DecrementTree, IncrementTree} from "../../tree/command";

export function _set_expr(tool:TokenStream,token:string,_exp:any){
    let save=tool.save()
    let expr1=expr(tool)
    if(expr1==null){
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
    let expr2=expr(tool)
    if(expr2==null)allang_log.error('缺少表达式',tool.now().line)
    return new _exp(expr1,expr2)
}
export function _name_expr(tool:TokenStream,token:string,_exp:any){
    if(!tool.hasMore())return null
    if(tool.now().name==token) {
        tool.next()
        return new _exp()
    }
    return null
}
export function set_expr(tool:TokenStream){
    return _set_expr(tool,'=',SetTree)
        || _set_expr(tool,'+=',AddSetTree)
        || _set_expr(tool,'-=',SubSetTree)
        || _set_expr(tool,'*=',MulSetTree)
        || _set_expr(tool,'/=',DivSetTree)
        || _set_expr(tool,'%=',ModSetTree)
        || _set_expr(tool,'&=',AndSetTree)
        || _set_expr(tool,'|=',OrSetTree)
        || _set_expr(tool,'^=',XorSetTree)
        || _set_expr(tool,'<<=',ShiftLeftSetTree)
        || _set_expr(tool,'>>=',ShiftRightSetTree)
        || null
}
export function var_command_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    if(tool.now().name!='var')return null
    tool.next()
    let iden=var_expr(tool)
    if(iden==null)allang_log.error('缺少变量',tool.now().line)
    if(tool.now().name==';'){
        return new VarTree(iden,null)
    }
    if(tool.now().name!='=')allang_log.error('缺少赋值符',tool.now().line)
    tool.next()
    let exp=expr(tool)
    if(exp==null)allang_log.error('缺少表达式',tool.now().line)
    return new VarTree(iden,exp)
}
export function vm_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    if(tool.now().name!='vm')return null
    tool.next()
    if(tool.now().type!=token_type.string)allang_log.error('缺少字符串',tool.now().line)
    let command=tool.next().name
    return new VMTree(command)
}
export function call_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    let _await=false
    if(tool.now().name=='await'){
        _await=true
        tool.next()
    }
    let _expr=expr(tool)
    if(_expr==null){
        if(_await)allang_log.error('缺少表达式',tool.now().line)
        return null
    }
    return new CallTree(_expr,_await)
}
export function _t_expr(tool:TokenStream,token:string,_exp:any){
    if(!tool.hasMore())return null
    if(tool.now().name!=token)return null
    tool.next()
    let _expr=expr(tool)
    if(_expr==null)allang_log.error('缺少表达式',tool.now().line)
    return new _exp(_expr)
}
export function _post_expr(tool:TokenStream,token:string,_exp:any){
    if(!tool.hasMore())return null
    let save=tool.save()
    let a=expr(tool)
    if(a==null){
        tool.restore(save)
        return null
    }
    if(!tool.hasMore()){
        tool.restore(save)
        return null
    }
    if(tool.now().name==token){
        tool.next()
        return new _exp(a)
    }
    tool.restore(save)
    return null
}
export default function (tool:TokenStream){
    return set_expr(tool)
        || var_command_expr(tool)
        || vm_expr(tool)
        || _t_expr(tool,'return',ReturnTree)
        || _t_expr(tool,'delete',DeleteTree)
        || _t_expr(tool,'throw',ThrowTree)
        || _name_expr(tool,'continue',ContinueTree)
        || _name_expr(tool,'break',BreakTree)
        || _post_expr(tool,'++',IncrementTree)
        || _post_expr(tool,'--',DecrementTree)
        || call_expr(tool)
}