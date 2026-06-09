import {Tree} from 'allang-compiler-base'
import {ExprLambdaTree, ExprTree} from './expr'
import {VarIdenTree} from './iden'
export class CommandTree extends Tree{}
export class ReturnTree extends CommandTree{
    constructor(public value:Tree){
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
export class SetTree extends CommandTree{
    constructor(public name:ExprTree,public value:ExprTree){
        super()
    }
}
export class CallTree extends CommandTree{
    constructor(public name:ExprTree,public args:ExprTree[],public await:boolean){
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
    constructor(public init:CommandTree[],public condition:ExprTree,public step:CommandTree[],public call:CommandTree[]){
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
export class AddSetTree extends CommandTree{
    constructor(public name:ExprTree,public value:ExprTree){
        super()
    }
}
export class SubSetTree extends CommandTree{
    constructor(public name:ExprTree,public value:ExprTree){
        super()
    }
}
export class MulSetTree extends CommandTree{
    constructor(public name:ExprTree,public value:ExprTree){
        super()
    }
}
export class DivSetTree extends CommandTree{
    constructor(public name:ExprTree,public value:ExprTree){
        super()
    }
}
export class ModSetTree extends CommandTree{
    constructor(public name:ExprTree,public value:ExprTree){
        super()
    }
}
export class AndSetTree extends CommandTree{
    constructor(public name:ExprTree,public value:ExprTree){
        super()
    }
}
export class OrSetTree extends CommandTree{
    constructor(public name:ExprTree,public value:ExprTree){
        super()
    }
}
export class XorSetTree extends CommandTree{
    constructor(public name:ExprTree,public value:ExprTree){
        super()
    }
}
export class ShiftLeftSetTree extends CommandTree{
    constructor(public name:ExprTree,public value:ExprTree){
        super()
    }
}
export class ShiftRightSetTree extends CommandTree{
    constructor(public name:ExprTree,public value:ExprTree){
        super()
    }
}