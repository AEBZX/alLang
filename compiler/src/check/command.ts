import $, {block_search, Scope, typeEquals} from './lib'
import {Tree} from 'allang-compiler-base'
import expr_visitor from './expr'
import iden_visitor from './iden'
import {
    ArrayTypeTree,
    BooleanTypeTree,
    BreakTree, CallTree,
    ContinueTree,
    DecrementTree, ExprCallTree, ExprLambdaTree, ForeachTree, ForTree, IfTree,
    IncrementTree,
    ListTree, MapTypeTree,
    NumberTypeTree,
    OperSetTree,
    ReturnTree, SwitchTree, TryTree, VarTree, WhileTree
} from '../tree'
let command_visitor=$.v()
let return_visitor=$.c(
    (error:string[],file_scope:Scope,global_scope:Scope,scope:Scope,tree:ReturnTree)=>{
        //根本不可能有return这个变量,所以用来搞返回值
        if(!typeEquals($.p(tree.value,command_visitor),scope.lookup('return'),
            error,file_scope,global_scope,scope))
            error.push('返回值类型错误')
    }
)
let continue_visitor=$.c(
    (error:string[],file_scope:Scope,global_scope:Scope,scope:Scope,tree:ContinueTree)=>{
        //同理
        if(!scope.lookup('while'))
            error.push('continue只能用于循环中')
    }
)
let break_visitor=$.c(
    (error:string[],file_scope:Scope,global_scope:Scope,scope:Scope,tree:BreakTree)=>{
        //同理
        if(!scope.lookup('while'))
            error.push('break只能用于循环中')
    }
)
let increment_visitor=$.c(
    (error:string[],file_scope:Scope,global_scope:Scope,scope:Scope,tree:IncrementTree)=>{
        if(!($.p(tree.name,command_visitor) instanceof NumberTypeTree))
            error.push('++只能用于变量中')
    }
)
let decrement_visitor=$.c(
    (error:string[],file_scope:Scope,global_scope:Scope,scope:Scope,tree:DecrementTree)=>{
        if(!($.p(tree.name,command_visitor) instanceof NumberTypeTree))
            error.push('--只能用于变量中')
    }
)
let oper_set_visitor=$.c(
    (error:string[],file_scope:Scope,global_scope:Scope,scope:Scope,tree:OperSetTree)=>{
        if(!typeEquals($.p(tree.name,command_visitor),$.p(tree.value,command_visitor),
            error,file_scope,global_scope,scope))
            error.push('操作符只能用于同等类型中')
    }
)
let list_visitor=$.c(
    (error:string[],file_scope:Scope,global_scope:Scope,scope:Scope,tree:ListTree)=>{
        scope=scope.enter()
        command_visitor.scope=scope
        for(let i of tree.child)
            command_visitor.visit(i)
        scope=scope.leave()
        command_visitor.scope=scope
    }
)
let if_visitor=$.c(
    (error:string[],file_scope:Scope,global_scope:Scope,scope:Scope,tree:IfTree)=>{
        if(!($.p(tree.condition,command_visitor) instanceof BooleanTypeTree))
            error.push('条件类型错误')
        scope=scope.enter()
        command_visitor.scope=scope
        command_visitor.visit(tree.call)
        scope=scope.leave()
        command_visitor.scope=scope
        if(tree._else!=null){
            scope=scope.enter()
            command_visitor.scope=scope
            command_visitor.visit(tree._else)
            scope=scope.leave()
            command_visitor.scope=scope
        }
    }
)
let while_visitor=$.c(
    (error:string[],file_scope:Scope,global_scope:Scope,scope:Scope,tree:WhileTree)=>{
        if(!($.p(tree.condition,command_visitor) instanceof BooleanTypeTree))
            error.push('条件类型错误')
        scope=scope.enter()
        command_visitor.scope=scope
        scope.push('while',new BooleanTypeTree())
        command_visitor.visit(tree.value)
        scope=scope.leave()
        command_visitor.scope=scope
    }
)
let switch_visitor=$.c(
    (error:string[],file_scope:Scope,global_scope:Scope,scope:Scope,tree:SwitchTree)=>{
        for(let i of tree.cases) {
            scope=scope.enter()
            command_visitor.scope=scope
            if(!typeEquals($.p(i.condition, command_visitor), $.p(tree.value, command_visitor),
                error,file_scope,global_scope,scope))
                error.push('条件类型错误')
            command_visitor.visit(i.call)
            scope=scope.leave()
            command_visitor.scope=scope
        }
        if(tree._default!=null){
            scope=scope.enter()
            command_visitor.scope=scope
            command_visitor.visit(tree._default)
            scope=scope.leave()
            command_visitor.scope=scope
        }
    }
)
let try_visitor=$.c(
    (error:string[],file_scope:Scope,global_scope:Scope,scope:Scope,tree:TryTree)=>{
        scope=scope.enter()
        command_visitor.scope=scope
        command_visitor.visit(tree._try)
        scope=scope.leave()
        command_visitor.scope=scope
        scope=scope.enter()
        expr_visitor.scope=scope
        expr_visitor.visit(tree._catch)
        scope=scope.leave()
        expr_visitor.scope=scope
        scope=scope.enter()
        command_visitor.scope=scope
        command_visitor.visit(tree._finally)
        scope=scope.leave()
        command_visitor.scope=scope
    }
)
let var_visitor=$.c(
    (error:string[],file_scope:Scope,global_scope:Scope,scope:Scope,tree:VarTree)=>{
        if(scope.lookup(tree.name.name)!=null)
            error.push('变量重复定义')
        else scope.push(tree.name.name,tree.name.type)
        if(!typeEquals($.p(tree.value,command_visitor),tree.name.type,
            error,file_scope,global_scope,scope))
            error.push('变量类型错误')
    }
)
let call_visitor=$.c(
    (error:string[],file_scope:Scope,global_scope:Scope,scope:Scope,tree:CallTree)=>{
        if(tree instanceof ExprCallTree){
            if(tree.name instanceof ExprLambdaTree){
                iden_visitor.visit(tree.name.args)
                //检查参数
                for(let i=0;i<tree.name.args.type.length;i++){
                    if(!typeEquals(tree.name.args.type[i].type, $.p(tree.args[i],command_visitor),
                        error,file_scope,global_scope,scope))
                        error.push('参数类型错误')
                    expr_visitor.visit(tree.args[i])
                }
                return
            }
            error.push('调用错误')
            return
        }
        error.push('调用错误')
    }
)
let for_visitor=$.c(
    (error:string[],file_scope:Scope,global_scope:Scope,scope:Scope,tree:ForTree)=>{
        scope=scope.enter()
        command_visitor.scope=scope
        scope.push('while',new BooleanTypeTree())
        for(let i of tree.init)
            command_visitor.visit(i)
        expr_visitor.visit(tree.condition)
        if(!($.p(tree.condition,command_visitor) instanceof BooleanTypeTree))
            error.push('条件类型错误')
        for(let i of tree.call)
            command_visitor.visit(i)
        for(let i of tree.step)
            command_visitor.visit(i)
        scope=scope.leave()
        command_visitor.scope=scope
    }
)
let foreach_visitor=$.c(
    (error:string[],file_scope:Scope,global_scope:Scope,scope:Scope,tree:ForeachTree)=>{
        expr_visitor.visit(tree.array)
        if(!typeEquals((<ArrayTypeTree|MapTypeTree>$.p(tree.array,command_visitor)).type,tree.name.type,
            error,file_scope,global_scope,scope))
            error.push('变量类型错误')
        scope=scope.enter()
        command_visitor.scope=scope
        scope.push('while',new BooleanTypeTree())
        scope.push(tree.name.name,tree.name.type)
        command_visitor.visit(tree.call)
        scope=scope.leave()
        command_visitor.scope=scope
    }
)
export default $.t(()=>{
    $.r(ReturnTree,return_visitor,command_visitor)
    $.r(ContinueTree,continue_visitor,command_visitor)
    $.r(BreakTree,break_visitor,command_visitor)
    $.r(IncrementTree,increment_visitor,command_visitor)
    $.r(DecrementTree,decrement_visitor,command_visitor)
    $.r(OperSetTree,oper_set_visitor,command_visitor)
    $.r(ListTree,list_visitor,command_visitor)
    $.r(IfTree,if_visitor,command_visitor)
    $.r(WhileTree,while_visitor,command_visitor)
    $.r(SwitchTree,switch_visitor,command_visitor)
    $.r(TryTree,try_visitor,command_visitor)
    $.r(VarTree,var_visitor,command_visitor)
    $.r(CallTree,call_visitor,command_visitor)
    $.r(ForTree,for_visitor,command_visitor)
    $.r(ForeachTree,foreach_visitor,command_visitor)
    return command_visitor
})