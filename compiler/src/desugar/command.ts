import {
    AddSetTree,
    AndSetTree, CommandTree, DecrementTree,
    DivSetTree,
    ExprAddTree, ExprAndTree, ExprComputedTree, ExprDivTree, ExprEqualTree, ExprIdenTree, ExprModTree, ExprMulTree,
    ExprNotEqualTree, ExprNullTree, ExprNumberTree, ExprOrTree,
    ExprShiftLeftTree, ExprShiftRightTree, ExprSubTree, ExprTree, ExprXorTree, ForeachTree,
    ForTree, IfTree, IncrementTree, ListTree, ModSetTree,
    MulSetTree,
    OperSetTree, OrSetTree,
    SetTree, ShiftLeftSetTree, ShiftRightSetTree,
    SubSetTree, SwitchTree,
    VarTree, WhileTree, XorSetTree
} from '../tree'
export function variable(data:VarTree){
    return new SetTree(data.name,data.value)
}
export function list(data:ListTree){
    return new ListTree(commands(data.child))
}
export function set(data:OperSetTree){
    switch (data.constructor){
        case SetTree:
            return data
        case AddSetTree:
            return new SetTree(data.name,new ExprAddTree(data.name,data.value))
        case SubSetTree:
            return new SetTree(data.name,new ExprSubTree(data.name,data.value))
        case MulSetTree:
            return new SetTree(data.name,new ExprMulTree(data.name,data.value))
        case DivSetTree:
            return new SetTree(data.name,new ExprDivTree(data.name,data.value))
        case ModSetTree:
            return new SetTree(data.name,new ExprModTree(data.name,data.value))
        case AndSetTree:
            return new SetTree(data.name,new ExprAndTree(data.name,data.value))
        case OrSetTree:
            return new SetTree(data.name,new ExprOrTree(data.name,data.value))
        case XorSetTree:
            return new SetTree(data.name,new ExprXorTree(data.name,data.value))
        case ShiftLeftSetTree:
            return new SetTree(data.name,new ExprShiftLeftTree(data.name,data.value))
        case ShiftRightSetTree:
            return new SetTree(data.name,new ExprShiftRightTree(data.name,data.value))
    }
}
export function increment(data:IncrementTree){
    return new SetTree(data.name,new ExprAddTree(data.name,new ExprNumberTree(1)))
}
export function decrement(data:DecrementTree){
    return new SetTree(data.name,new ExprSubTree(data.name,new ExprNumberTree(1)))
}
export function switch_call(data:SwitchTree){
    //更改为if-else链
    if(data.cases.length===0)
        return new IfTree(new ExprNullTree(),new ListTree([]),data._default)
    let tree:IfTree=new IfTree(new ExprEqualTree(data.value,data.cases[0].condition),data.cases[0].call,null)
    let prev:IfTree=tree
    for(let i=1;i<data.cases.length;i++){
        let next=new IfTree(new ExprEqualTree(data.value,data.cases[i].condition),data.cases[i].call,null)
        prev._else=next
        prev=next
    }
    prev._else=data._default
    return tree
}
export function for_call(data:ForTree){
    return list(new ListTree([
        ...commands(data.init),
        new WhileTree(data.condition,new ListTree([...data.call,...data.step]),false)
    ]))
}
export function while_call(data:WhileTree){
    if(data._do==false)return data
    return list(new ListTree([
        data.value,
        new WhileTree(data.condition,data.value,false)
    ]))
}
export function foreach_call(data:ForeachTree){
    return for_call(
        new ForTree(
            [new SetTree(new ExprIdenTree('for'),new ExprNumberTree(0))],
            new ExprNotEqualTree(new ExprComputedTree(data.array,new ExprIdenTree('for')),new ExprNullTree()),
            [new SetTree(new ExprIdenTree('for'),new ExprAddTree(new ExprIdenTree('for'),new ExprNumberTree(1)))],
            [new SetTree(new ExprIdenTree(data.name.name),new ExprComputedTree(data.array,new ExprIdenTree('for'))),data.call]
        )
    )
}
export default function commands(data:CommandTree[]):CommandTree[]{
    for(let i=0;i<data.length;i++){
        switch (data[i].constructor){
            case VarTree:
                data[i]=variable(<VarTree>data[i])
                break
            case SetTree:
            case AddSetTree:
            case SubSetTree:
            case MulSetTree:
            case DivSetTree:
            case ModSetTree:
            case AndSetTree:
            case OrSetTree:
            case XorSetTree:
            case ShiftLeftSetTree:
            case ShiftRightSetTree:
                data[i]=set(<OperSetTree>data[i])
                break
            case IncrementTree:
                data[i]=increment(<IncrementTree>data[i])
                break
            case DecrementTree:
                data[i]=decrement(<DecrementTree>data[i])
                break
            case SwitchTree:
                data[i]=switch_call(<SwitchTree>data[i])
                break
            case ForTree:
                data[i]=for_call(<ForTree>data[i])
                break
            case WhileTree:
                data[i]=while_call(<WhileTree>data[i])
                break
            case ForeachTree:
                data[i]=foreach_call(<ForeachTree>data[i])
                break
            case ListTree:
                data[i]=list(<ListTree>data[i])
                break
        }
    }
    return data
}