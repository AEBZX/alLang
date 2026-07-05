import $,{Scope, typeEquals} from './lib'
import {Tree} from 'allang-compiler-base'
import {
    BlockTree,
    ClassTree,
    ClassTypeTree,
    EnumTree,
    FileTree,
    FunctionTree,
    InterfaceTree,
    LambdaTypeTree,
    ModuleTree,
    NumberTypeTree,
    VariableTree
} from '../tree'
import command_visitor from './command'
import expr_visitor from './expr'
import iden_visitor from './iden'
let block_visitor=$.v()
let function_visitor=$.c(
    (error:string[],file_scope:Scope,global_scope:Scope,scope:Scope,tree:FunctionTree)=>{
        if(scope.get(tree.name)!=null)
            error.push(`函数${tree.name}重复定义`)
        scope.push(tree.name,new LambdaTypeTree(tree.args,tree.type))
        scope.set(tree.name,tree)
        iden_visitor.error=error
        iden_visitor.file_scope=file_scope
        iden_visitor.global_scope=global_scope
        iden_visitor.scope=scope
        iden_visitor.visit(tree.args)
        scope=scope.enter()
        command_visitor.scope=scope
        command_visitor.error=error
        command_visitor.file_scope=file_scope
        command_visitor.global_scope=global_scope
        for(let i of tree.args.type)
            scope.push(i.name,i.type)
        command_visitor.visit(tree.command)
        scope=scope.leave()
        command_visitor.scope=scope
    }
)
let class_visitor=$.c(
    (error:string[],file_scope:Scope,global_scope:Scope,scope:Scope,tree:ClassTree)=>{
        let _implement=(i)=>{
            if(!(i instanceof InterfaceTree))
                error.push(`类${tree.name}实现的接口${tree.implement}不是接口`)
            for(let j of i.child){
                if(j instanceof FunctionTree){
                    let ls=tree.child.filter((k)=>k.name==j.name)[0]
                    if(ls==null)
                        error.push(`类${tree.name}缺少接口${tree.implement}的函数${j.name}`)
                    if(!(ls instanceof FunctionTree))
                        error.push(`类${tree.name}的函数${j.name}不是函数`)
                    if((<FunctionTree>ls).args!=j.args)
                        error.push(`类${tree.name}的函数${j.name}的参数类型与接口${tree.implement}的函数${j.name}的参数类型不一致`)
                    if((<FunctionTree>ls).type!=j.type)
                        error.push(`类${tree.name}的函数${j.name}的返回类型与接口${tree.implement}的函数${j.name}的返回类型不一致`)
                }
            }
        }
        if(scope.get(tree.name)!=null)
            error.push(`类${tree.name}重复定义`)
        scope.set(tree.name,tree)
        scope.push(tree.name,new ClassTypeTree(tree.name))
        if(tree.implement!=''){
            if($.bs(tree.implement,block_visitor)==null)
                error.push(`类${tree.name}实现的接口${tree.implement}不存在`)
            let i=$.bs(tree.implement,block_visitor)
            let list=[i]
            while(true){
                if((<InterfaceTree>i).of=='')break
                let ls=$.bs((<InterfaceTree>i).of,block_visitor)
                if(ls==null)
                    error.push(`类${tree.name}实现的接口${tree.implement}的父接口${(<InterfaceTree>i).of}不存在`)
                list.push(ls)
                i=ls
            }
            for(let i of list)
                _implement(i)
        }
        scope=scope.enter()
        block_visitor.scope=scope
        for(let i of tree.child)
            block_visitor.visit(i)
        scope=scope.leave()
        block_visitor.scope=scope
    }
)
let interface_visitor=$.c(
    (error:string[],file_scope:Scope,global_scope:Scope,scope:Scope,tree:InterfaceTree)=>{
        if(scope.get(tree.name)!=null)
            error.push(`接口${tree.name}重复定义`)
        scope.set(tree.name,tree)
        scope.push(tree.name,new ClassTypeTree(tree.name))
        if(tree.of!=''&&$.bs(tree.of,block_visitor)==null)
            error.push(`接口${tree.name}的父接口${tree.of}不存在`)
        scope=scope.enter()
        block_visitor.scope=scope
        for(let i of tree.child)
            block_visitor.visit(i)
        scope=scope.leave()
        block_visitor.scope=scope
    }
)
let module_visitor=$.c(
    (error:string[],file_scope:Scope,global_scope:Scope,scope:Scope,tree:ModuleTree)=>{
        //合并module
        if(scope.get(tree.name)!=null)
            scope.set(tree.name,new ModuleTree(tree.name,tree.child.concat(scope.get(tree.name).child),tree.modifier))
        tree=<ModuleTree>scope.get(tree.name)
        for(let i of tree.child)
            block_visitor.visit(i)
    }
)
let file_visitor=$.c(
    (error:string[],file_scope:Scope,global_scope:Scope,scope:Scope,tree:FileTree)=>{
        let add=(name:string,block:BlockTree)=>{
            name=name+'.'+block.name
            if(block.child==null||block.child.length===0){
                if(block instanceof FunctionTree){
                    global_scope.push(name,new LambdaTypeTree(block.args,block.type))
                }else if(block instanceof VariableTree){
                    global_scope.push(name,block.type)
                }else if(!(block instanceof ModuleTree)){
                    global_scope.push(name,new ClassTypeTree(name))
                }
                return
            }
            for(let j of block.child){
                global_scope.set(name+j.name,block)
                if(j instanceof FunctionTree){
                    global_scope.push(name+j.name,new LambdaTypeTree(j.args,j.type))
                }else if(j instanceof VariableTree){
                    global_scope.push(name+j.name,j.type)
                }else{
                    if(!(j instanceof ModuleTree))
                        global_scope.push(name+j.name,new ClassTypeTree(name+j.name))
                    add(name+j.name,j)
                }
            }
        }
        file_scope=new Scope(null)
        block_visitor.file_scope=file_scope
        for(let i of tree.imports){
            if($.bs(i.name,block_visitor)==null)
                error.push(`文件${tree.name}导入的模块${i.name}不存在`)
            else{
                let ls=$.bs(i.name,block_visitor)
                if(i.as=='')
                    file_scope.set(ls.name,ls)
                else
                    file_scope.set(i.as,ls)
            }
        }
        for(let i of tree.block)
            add(i.name,i)
        scope=scope.enter()
        block_visitor.scope=scope
        for(let i of tree.block)
            block_visitor.visit(i)
        scope=scope.leave()
        block_visitor.scope=scope
    }
)
let var_visitor=$.c(
    (error:string[],file_scope:Scope,global_scope:Scope,scope:Scope,tree:VariableTree)=>{
        if(scope.get(tree.name)!=null)
            error.push(`变量${tree.name}重复定义`)
        scope.push(tree.name,tree.type)
        scope.set(tree.name,tree)
        expr_visitor.error=error
        expr_visitor.file_scope=file_scope
        expr_visitor.global_scope=global_scope
        expr_visitor.scope=scope
        expr_visitor.visit(tree.value)
        if(tree.value!=null)
            if(!typeEquals(tree.type, $.p(tree.value,block_visitor),
                error,file_scope,global_scope,scope))
                error.push(`变量${tree.name}的初始值类型与声明的类型不一致`)
    }
)
let enum_visitor=$.c(
    (error:string[],file_scope:Scope,global_scope:Scope,scope:Scope,tree:EnumTree)=>{
        if(scope.get(tree.name)!=null)
            error.push(`枚举${tree.name}重复定义`)
        scope.set(tree.name,tree)
        scope.push(tree.name,new ClassTypeTree(tree.name))
        // 注册枚举值(枚举成员访问返回NumberTypeTree)
        for(let value of tree.data)
            scope.push(tree.name+'.'+value,new NumberTypeTree())
    }
)
export default $.t(()=>{
    $.r(FileTree,file_visitor,block_visitor)
    $.r(ModuleTree,module_visitor,block_visitor)
    $.r(ClassTree,class_visitor,block_visitor)
    $.r(InterfaceTree,interface_visitor,block_visitor)
    $.r(FunctionTree,function_visitor,block_visitor)
    $.r(VariableTree,var_visitor,block_visitor)
    $.r(EnumTree,enum_visitor,block_visitor)
    return block_visitor
})