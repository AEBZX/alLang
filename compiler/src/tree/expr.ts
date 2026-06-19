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
    constructor(public args:ParamIdenTree,public ret:TypeTree,public body:CommandTree[]){
        super()
    }
}
export class ExprPostfixTree extends ExprTree{
    constructor(public object:ExprTree) {
        super()
    }
}
export class ExprMemberTree extends ExprPostfixTree{
    constructor(object:ExprTree,public property:string){
        super(object)
    }
}
export class ExprComputedTree extends ExprPostfixTree{
    constructor(object:ExprTree,public property:ExprTree){
        super(object)
    }
}
export class ExprPostIncTree extends ExprPostfixTree{
    constructor(object:ExprTree){
        super(object)
    }
}
export class ExprPostDecTree extends ExprPostfixTree{
    constructor(object:ExprTree){
        super(object)
    }
}
export class ExprCallTree extends ExprPostfixTree{
    constructor(object:ExprTree,public args:ExprTree[]){
        super(object)
    }
}
export class ExprPrefixTree extends ExprTree{
    constructor(public object:ExprTree) {
        super()
    }
}
export class ExprNegTree extends ExprPrefixTree{
    constructor(object:ExprTree){
        super(object)
    }
}
export class ExprNotTree extends ExprPrefixTree{
    constructor(object:ExprTree){
        super(object)
    }
}
export class ExprContraryTree extends ExprPrefixTree{
    constructor(object:ExprTree){
        super(object)
    }
}
export class ExprNewTree extends ExprPrefixTree{
    constructor(object:ExprTree){
        super(object)
    }
}
export class ExprPreIncTree extends ExprPrefixTree{
    constructor(object:ExprTree){
        super(object)
    }
}
export class ExprPreDecTree extends ExprPrefixTree{
    constructor(object:ExprTree){
        super(object)
    }
}
export class ExprAddressTree extends ExprPrefixTree{
    constructor(object:ExprTree){
        super(object)
    }
}
export class ExprReferenceTree extends ExprPrefixTree{
    constructor(object:ExprTree){
        super(object)
    }
}
export class ExprBinaryTree extends ExprTree{
    constructor(public left:ExprTree,public right:ExprTree) {
        super()
    }
}
export class ExprAddTree extends ExprBinaryTree{
    constructor(left:ExprTree,right:ExprTree){
        super(left, right)
    }
}
export class ExprSubTree extends ExprBinaryTree{
    constructor(left:ExprTree,right:ExprTree){
        super(left, right)
    }
}
export class ExprMulTree extends ExprBinaryTree{
    constructor(left:ExprTree,right:ExprTree){
        super(left, right)
    }
}
export class ExprDivTree extends ExprBinaryTree{
    constructor(left:ExprTree,right:ExprTree){
        super(left, right)
    }
}
export class ExprModTree extends ExprBinaryTree{
    constructor(left:ExprTree,right:ExprTree){
        super(left, right)
    }
}
export class ExprAndTree extends ExprBinaryTree{
    constructor(left:ExprTree,right:ExprTree){
        super(left, right)
    }
}
export class ExprOrTree extends ExprBinaryTree{
    constructor(left:ExprTree,right:ExprTree){
        super(left, right)
    }
}
export class ExprXorTree extends ExprBinaryTree{
    constructor(left:ExprTree,right:ExprTree){
        super(left, right)
    }
}
export class ExprShiftLeftTree extends ExprBinaryTree{
    constructor(left:ExprTree,right:ExprTree){
        super(left, right)
    }
}
export class ExprShiftRightTree extends ExprBinaryTree{
    constructor(left:ExprTree,right:ExprTree){
        super(left, right)
    }
}
export class ExprEqualTree extends ExprBinaryTree{
    constructor(left:ExprTree,right:ExprTree){
        super(left, right)
    }
}
export class ExprNotEqualTree extends ExprBinaryTree{
    constructor(left:ExprTree,right:ExprTree){
        super(left, right)
    }
}
export class ExprLessTree extends ExprBinaryTree{
    constructor(left:ExprTree,right:ExprTree){
        super(left, right)
    }
}
export class ExprLessEqualTree extends ExprBinaryTree{
    constructor(left:ExprTree,right:ExprTree){
        super(left, right)
    }
}
export class ExprGreaterTree extends ExprBinaryTree{
    constructor(left:ExprTree,right:ExprTree){
        super(left, right)
    }
}
export class ExprGreaterEqualTree extends ExprBinaryTree{
    constructor(left:ExprTree,right:ExprTree){
        super(left, right)
    }
}
export class ExprLogicAndTree extends ExprBinaryTree{
    constructor(left:ExprTree,right:ExprTree){
        super(left, right)
    }
}
export class ExprLogicOrTree extends ExprBinaryTree{
    constructor(left:ExprTree,right:ExprTree){
        super(left, right)
    }
}
export class ExprTernaryTree extends ExprTree{
    constructor(public condition:ExprTree,public true_value:ExprTree,public false_value:ExprTree){
        super()
    }
}