import {command_expr, commands_expr} from './index'
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
import {lambda_expr, theses_expr} from '../expr/primary'
import allang_log from '../../base/allang_log'
import {var_command_expr} from './oper'
import {var_expr} from '../iden'
import expr from '../expr'
import {ListTree} from "../../tree/command";

export function if_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    //匹配if
    if(tool.now().name!='if')return null
    tool.next()
    //匹配(cond)
    let cond=theses_expr(tool)
    if(cond==null)allang_log.error('缺少条件',tool.now().line)
    let call=commands_expr(tool)
    if(!tool.hasMore()||tool.now().name!='else')return new IfTree(cond,call,[])
    tool.next()
    let else_call=commands_expr(tool)
    return new IfTree(cond,call,else_call)
}
export function while_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    if(tool.now().name!='while')return null
    tool.next()
    let cond=theses_expr(tool)
    if(cond==null)allang_log.error('缺少条件',tool.now().line)
    let call=commands_expr(tool)
    return new WhileTree(cond,call,false)
}
export function do_while_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    if(tool.now().name!='do')return null
    tool.next()
    let call=commands_expr(tool)
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
    let cond:ExprTree
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
    let call=commands_expr(tool)
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
    let call=commands_expr(tool)
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
    let call=commands_expr(tool)
    return {condition:exp,call:call}
}
export function default_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    if(tool.now().name!='default')return null
    tool.next()
    return commands_expr(tool)
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
    let _try=commands_expr(tool)
    if(tool.now().name!='catch')allang_log.error('缺少catch关键字',tool.now().line)
    tool.next()
    let _catch:ExprLambdaTree=lambda_expr(tool)
    if(_catch==null)allang_log.error('缺少异常处理',tool.now().line)
    let _finally:CommandTree[]=[]
    if(tool.hasMore()&&tool.now().name=='finally'){
        tool.next()
        _finally=commands_expr(tool)
    }
    return new TryTree(_try,_catch,_finally)
}
export function list_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    return new ListTree(commands_expr(tool))
}
export default function (tool:TokenStream) {
    return while_expr(tool)
        || do_while_expr(tool)
        || for_expr(tool)
        || foreach_expr(tool)
        || switch_expr(tool)
        || try_expr(tool)
        || if_expr(tool)
        || list_expr(tool)
        || null
}