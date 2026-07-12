import {Command, CommandType, IRFactory} from './lib'
import {
    ExprArrayTree,
    ExprBooleanTree,
    ExprCallTree,
    ExprComputedTree,
    ExprContraryTree,
    ExprIdenTree,
    ExprLambdaTree,
    ExprMapTree,
    ExprMemberTree,
    ExprNegTree, ExprNewTree,
    ExprNotTree,
    ExprNullTree,
    ExprNumberTree,
    ExprPostDecTree,
    ExprPostfixTree,
    ExprPostIncTree,
    ExprPrefixTree,
    ExprPrimaryTree,
    ExprStringTree,
    ExprTree
} from '../tree'

export function value(id:number,data:ExprStringTree|ExprBooleanTree|ExprNumberTree|ExprNullTree,ir:IRFactory){
    let _data
    if(data instanceof ExprStringTree)_data=data.value
    else if(data instanceof ExprBooleanTree)_data=data.value==true?1:0
    else if(data instanceof ExprNumberTree)_data=data.value
    else if(data instanceof ExprNullTree)_data=0
    _data=ir.Pool.get(_data)
    ir.cache.push(new Command(CommandType.LOAD_POOL,id,_data,0))
}
export function primary(id:number,data:ExprPrimaryTree,ir:IRFactory){
    if(data instanceof ExprStringTree||
       data instanceof ExprBooleanTree||
       data instanceof ExprNumberTree||
       data instanceof ExprNullTree)
        value(id,data,ir)
    if(data instanceof ExprIdenTree)
        ir.cache.push(new Command(CommandType.MOV,id,ir.Scope.lookup_iden(data.name),0))
    if(data instanceof ExprArrayTree){
        let ls1=ir.create(),ls2=ir.create()
        data.value.forEach((value, index) => {
            primary(ls1,value,ir)
            primary(ls2,new ExprNumberTree(index),ir)
            ir.cache.push(new Command(CommandType.MOVM,id,ls2,ls1))
        })
    }
    if(data instanceof ExprMapTree){
        let ls1=ir.create(),ls2=ir.create()
        data.value.forEach((value, index) => {
            primary(ls1,value.value,ir)
            primary(ls2,value.name.name,ir)
            ir.cache.push(new Command(CommandType.MOVM,id,ls2,ls1))
        })
    }
    //TODO
    if(data instanceof ExprLambdaTree){
    }
}
export function postfix(id:number,data:ExprPostfixTree,ir:IRFactory){
    if(data instanceof ExprMemberTree)member(id,data,ir)
    if(data instanceof ExprComputedTree)computed(id,data,ir)
    if(data instanceof ExprCallTree)call(id,data,ir)
    if(data instanceof ExprPostIncTree||data instanceof ExprPostDecTree){
        expr(id,data.object,ir)
        let name=ir.create()
        ir.cache.push(new Command(CommandType.LOAD_POOL,name,ir.Pool.get(0),0))
        if(data instanceof ExprPostIncTree)
            ir.cache.push(new Command(CommandType.ADD,id,name,id))
        else
            ir.cache.push(new Command(CommandType.SUB,id,name,id))
    }
}
export function prefix(id:number,data:ExprPrefixTree,ir:IRFactory){
    if(data instanceof ExprNotTree) {
        primary(id, data.object, ir)
        ir.cache.push(new Command(CommandType.NOT,id,0,0))
    }
    if(data instanceof ExprNegTree){
        primary(id,data.object,ir)
        let name=ir.create()
        ir.cache.push(new Command(CommandType.LOAD_POOL,name,ir.Pool.get(0),0))
        ir.cache.push(new Command(CommandType.SUB,name,id,0))
        ir.cache.push(new Command(CommandType.MOV,id,name,0))
    }
    if(data instanceof ExprContraryTree){
        prefix(id,new ExprNotTree(data.object),ir)
        let name=ir.create()
        ir.cache.push(new Command(CommandType.LOAD_POOL,name,ir.Pool.get(1),0))
        ir.cache.push(new Command(CommandType.SUB, id,name,0))
    }
    if(data instanceof ExprNewTree){
    }
}

/*
事实上,可以给每个模块都认为是一个map,这样就可以通过movm来进行下标访问,自然也可以对var/func进行处理
判定:如果name不在block中就是变量,在就是函数
static会被提前提取所以可以忽略
 */
export function member(id:number,data:ExprMemberTree,ir:IRFactory){
    expr(id,data.object,ir)
    let name=ir.create()
    primary(name,new ExprStringTree(data.property),ir)
    ir.cache.push(new Command(CommandType.MOVM,id,name,id))
}
export function computed(id:number,data:ExprComputedTree,ir:IRFactory){
    expr(id,data.object,ir)
    let name=ir.create()
    expr(name,data.property,ir)
    ir.cache.push(new Command(CommandType.MOVM,id,name,id))
}
export function call(id:number,data:ExprCallTree,ir:IRFactory){
    //块ID
    expr(id,data.object,ir)
    let args=[]
    data.args.forEach(value=>{
        let name=ir.create()
        expr(name,value,ir)
        args.push(name)
    })
    args.forEach(value=>{
        ir.cache.push(new Command(CommandType.PUSH,value,0,0))
    })
    ir.cache.push(new Command(CommandType.CALL_R,id,0,0))
    ir.cache.push(new Command(CommandType.POP,id,0,0))
}
export function expr(id:number,data:ExprTree,ir:IRFactory){
}