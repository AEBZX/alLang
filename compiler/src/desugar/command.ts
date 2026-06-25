import {
    AddSetTree, AndSetTree,
    CommandTree, DecrementTree, DivSetTree,
    ExprAddTree, ExprAndTree, ExprDivTree, ExprModTree, ExprMulTree, ExprNumberTree, ExprOrTree, ExprShiftLeftTree,
    ExprSubTree, ExprXorTree, ForeachTree, ForTree, IncrementTree, ListTree,
    ModSetTree,
    MulSetTree,
    OperSetTree, OrSetTree,
    SetTree, ShiftLeftSetTree, ShiftRightSetTree,
    SubSetTree, SwitchTree, VarTree, WhileTree, XorSetTree
} from '../tree'
/*
 */
export function command(c:CommandTree){
    if(c instanceof OperSetTree){
        if(c instanceof SetTree)return
        if(c instanceof AddSetTree)return new SetTree(c.name,new ExprAddTree(c.name,c.value))
        if(c instanceof SubSetTree)return new SetTree(c.name,new ExprSubTree(c.name,c.value))
        if(c instanceof MulSetTree)return new SetTree(c.name,new ExprMulTree(c.name,c.value))
        if(c instanceof ModSetTree)return new SetTree(c.name,new ExprModTree(c.name,c.value))
        if(c instanceof DivSetTree)return new SetTree(c.name,new ExprDivTree(c.name,c.value))
        if(c instanceof AndSetTree)return new SetTree(c.name,new ExprAndTree(c.name,c.value))
        if(c instanceof OrSetTree)return new SetTree(c.name,new ExprOrTree(c.name,c.value))
        if(c instanceof XorSetTree)return new SetTree(c.name,new ExprXorTree(c.name,c.value))
        if(c instanceof ShiftLeftSetTree)return new SetTree(c.name,new ExprShiftLeftTree(c.name,c.value))
        if(c instanceof ShiftRightSetTree)return new SetTree(c.name,new ExprShiftLeftTree(c.name,c.value))
    }
    if(c instanceof IncrementTree)return new SetTree(c.name,new ExprAddTree(c.name,new ExprNumberTree(1)))
    if(c instanceof DecrementTree)return new SetTree(c.name,new ExprSubTree(c.name,new ExprNumberTree(1)))
    if(c instanceof WhileTree&&c._do)
        return new ListTree([
            new ListTree(c.value),
            new WhileTree(c.condition,c.value,false)
        ])
    if(c instanceof ForTree)
        return new ListTree([
            ...c.init,
            new WhileTree(c.condition,[...c.call,...c.step],false)
        ])
    if(c instanceof ForeachTree)
        return
}