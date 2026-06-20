import {CommandTree} from './command'
import {ParamIdenTree, TypeTree} from './iden'
import {ExprTree} from './expr'
import {Tree} from 'allang-compiler-base'
import {modifier} from '../base/model'
export class BlockTree extends Tree{
    constructor(public name:string,public child:BlockTree[],public modifier:modifier) {
        super()
    }
}
export class ModuleTree extends BlockTree{
    constructor(public name:string,child:BlockTree[],modifier:modifier){
        super(name,child, modifier)
    }
}
export class ClassTree extends BlockTree{
    constructor(public name:string,child:BlockTree[],modifier:modifier,public implement:string){
        super(name,child, modifier)
    }
}
export class InterfaceTree extends BlockTree{
    constructor(public name:string,child:BlockTree[],modifier:modifier,public of:string){
        super(name,child,modifier)
    }
}
export class FunctionTree extends BlockTree{
    constructor(public name:string,public type:TypeTree,public command:CommandTree[],modifier:modifier,public args:ParamIdenTree){
        super(name,null, modifier)
    }
}
export class VariableTree extends BlockTree{
    constructor(public name:string,public type:TypeTree,public value:ExprTree,modifier:modifier){
        super(name,null,modifier)
    }
}
export class ImportTree extends Tree{
    constructor(public name:string,public as:string){
        super()
    }
}
export class FileTree extends BlockTree{
    constructor(public imports:ImportTree[],public block:BlockTree[]){
        super('',block,null)
    }
}