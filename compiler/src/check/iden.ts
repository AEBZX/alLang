import $,{Scope} from './lib'
import {Tree} from 'allang-compiler-base'
import {LambdaTypeTree, ParamIdenTree, TypeTree, VarIdenTree} from '../tree'
let iden_visitor=$.v()
let var_iden_visitor=$.c(
    (error:string[],file_scope:Scope,global_scope:Scope,scope:Scope,tree:VarIdenTree)=>{
        if(scope.lookup(tree.name)!=null||scope.get(tree.name)!=null)
            error.push(`变量${tree.name}重复定义`)
    }
)
let param_iden_visitor=$.c(
    (error:string[],file_scope:Scope,global_scope:Scope,scope:Scope,tree:ParamIdenTree)=>{
        tree.type.forEach((iden)=>{
            iden_visitor.visit(iden)
        })
    }
)
export let type=$.c(
    (error:string[],file_scope:Scope,global_scope:Scope,scope:Scope,tree:TypeTree)=>{
        if(tree instanceof LambdaTypeTree){
            param_iden_visitor(error,file_scope,global_scope,scope,tree.params)
        }
    }
)
export default $.t(()=>{
    iden_visitor.register(VarIdenTree,var_iden_visitor)
    iden_visitor.register(ParamIdenTree,param_iden_visitor)
    return iden_visitor
})