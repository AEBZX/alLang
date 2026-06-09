import {Tree} from 'allang-compiler-base'
import {ParamIdenTree, TypeTree, VarIdenTree} from './iden'
import {CommandTree} from './command'
export class ExprTree extends Tree{}
export class ExprPrimaryTree extends ExprTree{}
export class ExprStringTree extends ExprPrimaryTree{
    constructor(public value:string){
        super()
    }
}
export class ExprNumberTree extends ExprPrimaryTree{
    constructor(public value:number){
        super()
    }
}
export class ExprBooleanTree extends ExprPrimaryTree{
    constructor(public value:boolean){
        super()
    }
}
export class ExprNullTree extends ExprPrimaryTree{
    constructor(){
        super()
    }
}
export class ExprIdenTree extends ExprPrimaryTree{
    constructor(public name:string){
        super()
    }
}
export class ExprArrayTree extends ExprPrimaryTree{
    constructor(public value:ExprTree[]){
        super()
    }
}
export class ExprMapTree extends ExprPrimaryTree{
    constructor(public value:{name:VarIdenTree,value:ExprTree}[]){
        super()
    }
}
export class ExprLambdaTree extends ExprPrimaryTree{
    constructor(public args:ParamIdenTree,public ret:TypeTree,public body:CommandTree){
        super()
    }
}
export class ExprPostfixTree extends ExprTree{}
export class ExprMemberTree extends ExprPostfixTree{
    constructor(public object:ExprTree,public property:string){
        super()
    }
}
export class ExprComputedTree extends ExprPostfixTree{
    constructor(public object:ExprTree,public property:ExprTree){
        super()
    }
}
export class ExprPostIncTree extends ExprPostfixTree{
    constructor(public object:ExprTree){
        super()
    }
}
export class ExprPostDecTree extends ExprPostfixTree{
    constructor(public object:ExprTree){
        super()
    }
}
export class ExprCallTree extends ExprPostfixTree{
    constructor(public object:ExprTree,public args:ExprTree[]){
        super()
    }
}
export class ExprPrefixTree extends ExprPostfixTree{}
export class ExprNegTree extends ExprPrefixTree{
    constructor(public object:ExprTree){
        super()
    }
}
export class ExprNotTree extends ExprPrefixTree{
    constructor(public object:ExprTree){
        super()
    }
}
export class ExprContraryTree extends ExprPrefixTree{
    constructor(public object:ExprTree){
        super()
    }
}
export class ExprNewTree extends ExprPrefixTree{
    constructor(public object:ExprTree){
        super()
    }
}
export class ExprPreIncTree extends ExprPrefixTree{
    constructor(public object:ExprTree){
        super()
    }
}
export class ExprPreDecTree extends ExprPrefixTree{
    constructor(public object:ExprTree){
        super()
    }
}
export class ExprAddressTree extends ExprPrefixTree{
    constructor(public object:ExprTree){
        super()
    }
}
export class ExprReferenceTree extends ExprPrefixTree{
    constructor(public object:ExprTree){
        super()
    }
}
export class ExprBinaryTree extends ExprTree{}
export class ExprAddTree extends ExprBinaryTree{
    constructor(public left:ExprTree,public right:ExprTree){
        super()
    }
}
export class ExprSubTree extends ExprBinaryTree{
    constructor(public left:ExprTree,public right:ExprTree){
        super()
    }
}
export class ExprMulTree extends ExprBinaryTree{
    constructor(public left:ExprTree,public right:ExprTree){
        super()
    }
}
export class ExprDivTree extends ExprBinaryTree{
    constructor(public left:ExprTree,public right:ExprTree){
        super()
    }
}
export class ExprModTree extends ExprBinaryTree{
    constructor(public left:ExprTree,public right:ExprTree){
        super()
    }
}
export class ExprAndTree extends ExprBinaryTree{
    constructor(public left:ExprTree,public right:ExprTree){
        super()
    }
}
export class ExprOrTree extends ExprBinaryTree{
    constructor(public left:ExprTree,public right:ExprTree){
        super()
    }
}
export class ExprXorTree extends ExprBinaryTree{
    constructor(public left:ExprTree,public right:ExprTree){
        super()
    }
}
export class ExprShiftLeftTree extends ExprBinaryTree{
    constructor(public left:ExprTree,public right:ExprTree){
        super()
    }
}
export class ExprShiftRightTree extends ExprBinaryTree{
    constructor(public left:ExprTree,public right:ExprTree){
        super()
    }
}
export class ExprEqualTree extends ExprBinaryTree{
    constructor(public left:ExprTree,public right:ExprTree){
        super()
    }
}
export class ExprNotEqualTree extends ExprBinaryTree{
    constructor(public left:ExprTree,public right:ExprTree){
        super()
    }
}
export class ExprLessTree extends ExprBinaryTree{
    constructor(public left:ExprTree,public right:ExprTree){
        super()
    }
}
export class ExprLessEqualTree extends ExprBinaryTree{
    constructor(public left:ExprTree,public right:ExprTree){
        super()
    }
}
export class ExprGreaterTree extends ExprBinaryTree{
    constructor(public left:ExprTree,public right:ExprTree){
        super()
    }
}
export class ExprGreaterEqualTree extends ExprBinaryTree{
    constructor(public left:ExprTree,public right:ExprTree){
        super()
    }
}
export class ExprLogicAndTree extends ExprBinaryTree{
    constructor(public left:ExprTree,public right:ExprTree){
        super()
    }
}
export class ExprLogicOrTree extends ExprBinaryTree{
    constructor(public left:ExprTree,public right:ExprTree){
        super()
    }
}
export class ExprTernaryTree extends ExprTree{
    constructor(public condition:ExprTree,public true_value:ExprTree,public false_value:ExprTree){
        super()
    }
}