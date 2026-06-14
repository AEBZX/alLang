import {CommandTree} from './command'
import {ParamIdenTree} from './iden'
import {ExprTree} from './expr'
import {Tree} from 'allang-compiler-base'
import {modifier} from '../base/model'
export class BlockTree extends Tree{
}
export class ModuleTree extends Tree{
    constructor(public name:string,public child:BlockTree[],public modifier:modifier){
        super()
    }
}
export class ClassTree extends Tree{
    constructor(public name:string,public child:BlockTree[],public modifier:modifier,public implement:string){
        super()
    }
}
export class InterfaceTree extends Tree{
    constructor(public name:string,public child:BlockTree[],public modifier:modifier,public of:string){
        super()
    }
}
export class FunctionTree extends Tree{
    constructor(public name:string,public child:CommandTree[],public modifier:modifier,public args:ParamIdenTree){
        super()
    }
}
export class VariableTree extends Tree{
    constructor(public name:string,public value:ExprTree,public modifier:modifier){
        super()
    }
}
export class ImportTree extends Tree{
    constructor(public name:string,public as:string){
        super()
    }
}