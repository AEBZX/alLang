import $,{Scope} from './lib'
import {Tree} from 'allang-compiler-base'
import {
    ArrayTypeTree,
    ExprArrayTree, ExprBinaryTree,
    ExprIdenTree, ExprLambdaTree,
    ExprMapTree,
    ExprMemberTree, ExprPostfixTree, ExprPrefixTree,
    ExprPrimaryTree,
    ExprStringTree, ExprTernaryTree, ExprTree
} from '../tree'
import iden_visitor from './iden'
import command_visitor from './command'
let expr_visitor=$.v()
let primary_visitor=$.c(
    (error:string[],file_scope:Scope,global_scope:Scope,scope:Scope,tree:ExprPrimaryTree)=>{
        if(tree instanceof ExprIdenTree){
            if($.is(tree.name,expr_visitor)==null){
                error.push(`${tree.name}不是变量`)
            }
        }
        if(tree instanceof ExprArrayTree)
            tree.value.forEach((value)=>expr_visitor.visit(value))
        if(tree instanceof ExprMapTree){
            let name=new Set()
            tree.value.forEach((value)=>{
                if(name.has(value.name.name))error.push(`重复的键名${value.name.name}`)
                name.add(value.name.name)
                expr_visitor.visit(value.value)
            })
        }
        if(tree instanceof ExprLambdaTree){
            iden_visitor.error=error
            iden_visitor.file_scope=file_scope
            iden_visitor.global_scope=global_scope
            iden_visitor.scope=scope
            iden_visitor.visit(tree.args)
            scope=scope.enter()
            tree.args.type.forEach((iden)=>{
                scope.push(iden.name,iden.type)
            })
            command_visitor.error=error
            command_visitor.file_scope=file_scope
            command_visitor.global_scope=global_scope
            command_visitor.scope=scope
            tree.body.forEach((value)=>command_visitor.visit(value))
            scope=scope.leave()
        }
    }
)
let other=$.c(
    (error:string[],file_scope:Scope,global_scope:Scope,scope:Scope,tree:ExprTree)=>{
        $.p(tree,expr_visitor)
    }
)
export default $.t(()=>{
    $.r(ExprPrimaryTree,primary_visitor,expr_visitor)
    $.r(ExprPostfixTree,other,expr_visitor)
    $.r(ExprPrefixTree,other,expr_visitor)
    $.r(ExprBinaryTree,other,expr_visitor)
    $.r(ExprTernaryTree,other,expr_visitor)
    return expr_visitor
})