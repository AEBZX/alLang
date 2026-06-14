import {commands_expr,command_expr} from './index'
import {
    CommandTree,
    ExprLambdaTree,
    ExprTree,
    ForeachTree,
    ForTree,
    IfTree,
    SwitchTree,
    TryTree,
    WhileTree
} from '../../tree'
import {TokenStream} from 'allang-compiler-base'
import {theses_expr} from '../expr/primary'
import allang_log from '../../base/allang_log'
import {var_command_expr} from './oper'
import {var_expr} from '../iden'
import expr from '../expr'
import {lambda_expr} from '../expr/primary'
export function if_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    if(tool.now().name!='if')return null
    tool.next()
    let cond=theses_expr(tool)
    if(cond==null)allang_log.error('缺少条件',tool.now().line)
    let call:CommandTree[]=[]
    if(tool.now().name!='{'){
        call[0]=command_expr(tool)
        if(call[0]==null)allang_log.error('缺少命令',tool.now().line)
    }else call=commands_expr(tool)
    let else_call:CommandTree[]=[]
    if(tool.hasMore()&&tool.now().name==';')tool.next()
    if(!tool.hasMore()||tool.now().name!='else')return new IfTree(cond,call,else_call)
    tool.next()
    if(tool.now().name!='{'){
        else_call[0]=command_expr(tool)
        if(else_call[0]==null)allang_log.error('缺少命令',tool.now().line)
    }else else_call=commands_expr(tool)
    return new IfTree(cond,call,else_call)
}
export function while_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    if(tool.now().name!='while')return null
    tool.next()
    let cond=theses_expr(tool)
    if(cond==null)allang_log.error('缺少条件',tool.now().line)
    let call:CommandTree[]=[]
    if(tool.now().name!='{'){
        call[0]=command_expr(tool)
        if(call[0]==null)allang_log.error('缺少命令',tool.now().line)
    }else call=commands_expr(tool)
    return new WhileTree(cond,call,false)
}
export function do_while_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    if(tool.now().name!='do')return null
    tool.next()
    let call:CommandTree[]=[]
    if(tool.now().name!='{'){
        call[0]=command_expr(tool)
        if(call[0]==null)allang_log.error('缺少命令',tool.now().line)
    }else call=commands_expr(tool)
    if(tool.now().name!='while')allang_log.error('缺少while',tool.now().line)
    tool.next()
    let cond=theses_expr(tool)
    if(cond==null)allang_log.error('缺少条件',tool.now().line)
    return new WhileTree(cond,call,true)
}
export function for_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    if(tool.now().name!='for')return null
    tool.next()
    let init:CommandTree[]=[]
    let cond:ExprTree=null
    let step:CommandTree[]=[]
    if(tool.now().name!='(')allang_log.error('缺少条件起始',tool.now().line)
    tool.next()
    while(true){
        init.push(var_command_expr(tool))
        if(init[init.length-1]==null){
            init.pop()
            break
        }
    }
    if(tool.now().name!=';')allang_log.error('缺少分号',tool.now().line)
    tool.next()
    cond=expr(tool)
    if(cond==null)allang_log.error('缺少条件',tool.now().line)
    if(tool.now().name!=';')allang_log.error('缺少分号',tool.now().line)
    tool.next()
    while(true){
        step.push(command_expr(tool))
        if(step[step.length-1]==null){
            step.pop()
            break
        }
    }
    if(tool.now().name!=')')allang_log.error('缺少条件结束',tool.now().line)
    tool.next()
    let call:CommandTree[]=[]
    if(tool.now().name!='{'){
        call[0]=command_expr(tool)
        if(call[0]==null)allang_log.error('缺少命令',tool.now().line)
    }else call=commands_expr(tool)
    return new ForTree(init,cond,step,call)
}
export function foreach_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    if(tool.now().name!='foreach')return null
    tool.next()
    if(tool.now().name!='(')allang_log.error('缺少迭代起始',tool.now().line)
    tool.next()
    let iden=var_expr(tool)
    if(iden==null)allang_log.error('缺少迭代变量',tool.now().line)
    if(tool.now().name!=':')allang_log.error('缺少被迭代对象',tool.now().line)
    tool.next()
    let exp=expr(tool)
    if(exp==null)allang_log.error('缺少被迭代对象',tool.now().line)
    if(tool.now().name!=')')allang_log.error('缺少迭代结束',tool.now().line)
    tool.next()
    let call:CommandTree[]=[]
    if(tool.now().name!='{'){
        call[0]=command_expr(tool)
        if(call[0]==null)allang_log.error('缺少命令',tool.now().line)
    }else call=commands_expr(tool)
    return new ForeachTree(iden,exp,call)
}
export function case_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    if(tool.now().name!='case')return null
    tool.next()
    let exp=expr(tool)
    if(exp==null)allang_log.error('缺少表达式',tool.now().line)
    if(tool.now().name!='->')allang_log.error('缺少箭头',tool.now().line)
    tool.next()
    let call:CommandTree[]=[]
    if(tool.now().name!='{'){
        call[0]=command_expr(tool)
        if(call[0]==null)allang_log.error('缺少命令',tool.now().line)
    }else call=commands_expr(tool)
    return {condition:exp,call:call}
}
export function default_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    if(tool.now().name!='default')return null
    tool.next()
    let call:CommandTree[]=[]
    if(tool.now().name!='{'){
        call[0]=command_expr(tool)
        if(call[0]==null)allang_log.error('缺少命令',tool.now().line)
    }else call=commands_expr(tool)
    return call
}
export function switch_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    if(tool.now().name!='switch')return null
    tool.next()
    let exp=theses_expr(tool)
    if(exp==null)allang_log.error('缺少表达式',tool.now().line)
    if(tool.now().name!='{')allang_log.error('缺少开始',tool.now().line)
    tool.next()
    let _case=[]
    let default_call:CommandTree[]=[]
    while(true){
        _case.push(case_expr(tool))
        if(_case[_case.length-1]==null){
            _case.pop()
            default_call=default_expr(tool)
            break
        }
    }
    if(tool.now().name!='}')allang_log.error('缺少结束符',tool.now().line)
    tool.next()
    return new SwitchTree(exp,_case,default_call)
}
export function try_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    if(tool.now().name!='try')return null
    tool.next()
    let _try:CommandTree[]=[]
    if(tool.now().name!='{'){
        _try[0]=command_expr(tool)
        if(_try[0]==null)allang_log.error('缺少命令',tool.now().line)
    }else _try=commands_expr(tool)
    if(tool.now().name!='catch')allang_log.error('缺少catch关键字',tool.now().line)
    tool.next()
    let _catch:ExprLambdaTree=lambda_expr(tool)
    if(_catch==null)allang_log.error('缺少异常处理',tool.now().line)
    let _finally:CommandTree[]=[]
    if(tool.hasMore()&&tool.now().name=='finally'){
        tool.next()
        if(tool.now().name!='{'){
            _finally[0]=command_expr(tool)
            if(_finally[0]==null)allang_log.error('缺少命令',tool.now().line)
        }else _finally=commands_expr(tool)
    }
    return new TryTree(_try,_catch,_finally)
}
export default function (tool:TokenStream){
    return while_expr(tool)
        || do_while_expr(tool)
        || for_expr(tool)
        || foreach_expr(tool)
        || switch_expr(tool)
        || try_expr(tool)
        || if_expr(tool)
        || null
}