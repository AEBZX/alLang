import {GrammarError, Scope} from './'
import {
    BlockTree, CallTree, ClassTree, CommandTree, DeleteTree,
    ExprArrayTree,
    ExprBinaryTree,
    ExprBooleanTree, ExprCallTree,
    ExprComputedTree,
    ExprIdenTree, ExprLambdaTree,
    ExprMapTree, ExprMemberTree, ExprNewTree,
    ExprNullTree,
    ExprNumberTree, ExprPostDecTree,
    ExprPostfixTree, ExprPostIncTree,
    ExprPrefixTree,
    ExprStringTree,
    ExprTernaryTree,
    ExprTree,
    FileTree, ForeachTree, ForTree,
    FunctionTree, IfTree, InterfaceTree,
    ModuleTree, ReturnTree, SwitchTree, ThrowTree, TryTree,
    VariableTree, VarTree, WhileTree, DecrementTree, IncrementTree, OperSetTree, ListTree
} from '../tree'
export class Resolver{
    error:GrammarError[]
    scope:Scope
    global_scope:Scope
    file_scope:Scope
    tree:FileTree[]
    constructor(tree:FileTree[]) {
        this.scope=new Scope([],null)
        this.global_scope=new Scope([],null)
        this.file_scope=new Scope([],null)
        this.error=[]
        this.tree=tree
    }
}
export default function (tree:FileTree[]){
    return new Resolver(tree)
}