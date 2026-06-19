import {Tree} from 'allang-compiler-base'
import {ExprLambdaTree, ExprTree} from './expr'
import {VarIdenTree} from './iden'
export class CommandTree extends Tree{
}
export class ReturnTree extends CommandTree{
    constructor(public value:ExprTree){
        super()
    }
}
export class BreakTree extends CommandTree{}
export class ContinueTree extends CommandTree{}
export class VarTree extends CommandTree{
    constructor(public name:VarIdenTree,public value:ExprTree){
        super()
    }
}
export class CallTree extends CommandTree{
    constructor(public name:ExprTree,public await:boolean){
        super()
    }
}
export class DeleteTree extends CommandTree{
    constructor(public name:ExprTree){
        super()
    }
}
export class VMTree extends CommandTree{
    constructor(public command:string){
        super()
    }
}
export class IfTree extends CommandTree{
    constructor(public condition:ExprTree,public call:CommandTree[],public _else:CommandTree[]){
        super()
    }
}
export class WhileTree extends CommandTree{
    constructor(public condition:ExprTree,public value:CommandTree[],public _do:boolean){
        super()
    }
}
export class ForTree extends CommandTree{
    constructor(public init:VarTree[],public condition:ExprTree,public step:CommandTree[],public call:CommandTree[]){
        super()
    }
}
export class ForeachTree extends CommandTree{
    constructor(public name:VarIdenTree,public array:ExprTree,public call:CommandTree[]){
        super()
    }
}
export class SwitchTree extends CommandTree{
    constructor(public value:ExprTree,public cases:{condition:ExprTree,call:CommandTree[]}[],public _default:CommandTree[]){
        super()
    }
}
export class ThrowTree extends CommandTree{
    constructor(public value:ExprTree){
        super()
    }
}
export class TryTree extends CommandTree{
    constructor(public _try:CommandTree[],public _catch:ExprLambdaTree,public _finally:CommandTree[]){
        super()
    }
}
export class OperSetTree extends CommandTree{
    constructor(public name:ExprTree,public value:ExprTree){
        super()
    }
}
export class SetTree extends OperSetTree{
    constructor(name:ExprTree,value:ExprTree){
        super(name,value)
    }
}
export class AddSetTree extends OperSetTree{
    constructor(name:ExprTree,value:ExprTree){
        super(name,value)
    }
}
export class SubSetTree extends OperSetTree{
    constructor(name:ExprTree,value:ExprTree){
        super(name,value)
    }
}
export class MulSetTree extends OperSetTree{
    constructor(name:ExprTree,value:ExprTree){
        super(name,value)
    }
}
export class DivSetTree extends OperSetTree{
    constructor(name:ExprTree,value:ExprTree){
        super(name,value)
    }
}
export class ModSetTree extends OperSetTree{
    constructor(name:ExprTree,value:ExprTree){
        super(name,value)
    }
}
export class AndSetTree extends OperSetTree{
    constructor(name:ExprTree,value:ExprTree){
        super(name,value)
    }
}
export class OrSetTree extends OperSetTree{
    constructor(name:ExprTree,value:ExprTree){
        super(name,value)
    }
}
export class XorSetTree extends OperSetTree{
    constructor(name:ExprTree,value:ExprTree){
        super(name,value)
    }
}
export class ShiftLeftSetTree extends OperSetTree{
    constructor(name:ExprTree,value:ExprTree){
        super(name,value)
    }
}
export class ShiftRightSetTree extends OperSetTree{
    constructor(name:ExprTree,value:ExprTree){
        super(name,value)
    }
}
export class IncrementTree extends CommandTree{
    constructor(public name:ExprTree){
        super()
    }
}
export class DecrementTree extends CommandTree{
    constructor(public name:ExprTree){
        super()
    }
}
export class ListTree extends CommandTree{
    constructor(public child:CommandTree[]){
        super()
    }
}