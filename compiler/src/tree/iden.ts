import {Tree} from 'allang-compiler-base'
export class TypeTree extends Tree{}
export class NumberTypeTree extends TypeTree{}
export class StringTypeTree extends TypeTree{}
export class BooleanTypeTree extends TypeTree{}
export class MapTypeTree extends TypeTree{}
export class VoidTypeTree extends TypeTree{}
export class ArrayTypeTree extends TypeTree{
    constructor(public type:TypeTree){
        super()
    }
}
export class LambdaTypeTree extends TypeTree{
    constructor(public params:ParamIdenTree,public return_type:TypeTree){
        super()
    }
}
export class VarIdenTree extends Tree{
    constructor(public name:string,public type:TypeTree){
        super()
    }
}
export class ParamIdenTree extends Tree{
    constructor(public type:VarIdenTree[]){
        super()
    }
}