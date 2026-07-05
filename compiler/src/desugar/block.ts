import {
    BlockTree,
    ClassTree,
    EnumTree,
    ExprNumberTree,
    FunctionTree,
    NumberTypeTree,
    VariableTree,
    VarIdenTree
} from '../tree'
import command from './command'
import {modifier} from "../base/model";
export function enum_block(data:EnumTree){
    let ret=new ClassTree(data.name,[],null,null)
    let index=0
    for(let i of data.data){
        ret.child.push(new VariableTree(i,new NumberTypeTree(),new ExprNumberTree(index),
            new modifier(true,false,true)))
        index++
    }
    return ret
}
export function func_block(data:FunctionTree){
    return new FunctionTree(data.name,data.type,command(data.command),data.modifier,data.args)
}
export default function block(data:BlockTree){
    if(data instanceof EnumTree)return enum_block(data)
    if(data instanceof FunctionTree)return func_block(data)
    if(data.child==null)return data
    for(let j=0;j<data.child.length;j++)
        data.child[j]=block(data.child[j])
    return data
}