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
    import_check(){
        for(let i of this.tree){
            let as_name=[]
            for(let j of i.imports){
                if(as_name.indexOf(j.as)>=0){
                    this.error.push(new GrammarError('重复的导入'))
                }
                as_name.push(j.as)
            }
        }
    }
    have(name:string):boolean{
        return this.scope.n.includes(name)||this.global_scope.n.includes(name)||this.file_scope.n.includes(name)
        ||this.upper_search(name,this.scope)
    }
    upper_search(name:string, scope:Scope):boolean{
        if(name.startsWith('up.')){
            name=name.substring(3)
            if(scope.parent==null){
                this.error.push(new GrammarError('无法向上搜索'))
                return false
            }
            if(scope.parent.n.includes(name))return true
            return this.upper_search(name,scope.parent)
        }
    }
    //将static加入顶级定义域
    global_init(b:BlockTree,name:string){
        name+=name!=''?'.'+b.name:b.name
        for(let i of b.child){
            if(i.modifier._static){
                if(this.have(name))
                    this.error.push(new GrammarError('重复的静态块'))
                else this.global_scope.n.push(name)
            }
            if(i instanceof VariableTree||i instanceof FunctionTree)continue
            this.global_init(i,name)
        }
    }
    //将imports加入文件定义域
    file_init(b:FileTree){
        this.file_scope=new Scope([],null)
        b.imports.forEach(i=>{
            if(!this.global_scope.n.includes(i.name))this.error.push(new GrammarError('未定义的模块'))
            if(this.have(i.as))this.error.push(new GrammarError('重名的别名'))
            else this.file_scope.n.push(i.as)
        })
    }
    in_scope(){
        this.scope=new Scope([],this.scope)
    }
    out_scope(){
        this.scope=this.scope.parent
    }
    value_check(expr:ExprTree){
        if(expr==null)return
        let chain=(d:ExprMemberTree)=>{
            let name=d.property
            let ls=d
            while(true){
                if(ls.object instanceof ExprIdenTree){
                    if(!this.have(ls.object.name))this.error.push(new GrammarError('未定义的变量'))
                    break
                }
                if(ls.object instanceof ExprMemberTree){
                    ls=ls.object
                    name=ls.property+'.'+name
                    continue
                }
                return null
            }
            return name
        }
        //不对字面量检查
        if(expr instanceof ExprStringTree||expr instanceof ExprNumberTree||
        expr instanceof ExprNullTree||expr instanceof ExprBooleanTree)return
        if(expr instanceof ExprIdenTree&&!this.have(expr.name))this.error.push(new GrammarError('未定义的变量'))
        if(expr instanceof ExprBinaryTree){
            this.value_check(expr.left)
            this.value_check(expr.right)
        }
        if(expr instanceof ExprMapTree){
            expr.value.forEach(i=>{
                this.value_check(i.value)
            })
        }
        if(expr instanceof ExprArrayTree){
            expr.value.forEach(i=>{
                this.value_check(i)
            })
        }
        if(expr instanceof ExprLambdaTree){
            this.in_scope()
            expr.args.type.forEach(i=>{
                this.scope.n.push(i.name)
            })
            this.commands_check(expr.body)
            this.out_scope()
        }
        if(expr instanceof ExprPostfixTree){
            if(expr instanceof ExprComputedTree){
                this.value_check(expr.object)
                this.value_check(expr.property)
            }
            if(expr instanceof ExprPostIncTree||expr instanceof ExprPostDecTree)
                this.value_check(expr.object)
            if(expr instanceof ExprCallTree){
                this.value_check(expr.object)
                expr.args.forEach(i=>{
                    this.value_check(i)
                })
            }
            if(expr instanceof ExprNewTree)
                this.value_check(expr.object)
            if(expr instanceof ExprMemberTree){
                if(chain(expr)==null)this.value_check(expr.object)
                else{
                    let name=chain(expr).split('.')
                    //排除变量可能,只能是static调用
                    if(this.upper_search(name[0],this.scope)||this.scope.n.includes(name[0])||
                    this.file_scope.n.includes(name[0]))return
                    if(!this.global_scope.n.includes(chain(expr)))
                        this.error.push(new GrammarError('未定义的模块'))
                }
            }
        }
        if(expr instanceof ExprPrefixTree){
            this.value_check(expr.object)
        }
        if(expr instanceof ExprTernaryTree){
            this.value_check(expr.condition)
            this.value_check(expr.true_value)
            this.value_check(expr.false_value)
        }
    }
    block_check(b:BlockTree){
        if(b instanceof FunctionTree){
            this.in_scope()
            b.args.type.forEach(i=>{
                this.scope.n.push(i.name)
            })
            this.commands_check(b.command)
            this.out_scope()
        }
        else if(b instanceof VariableTree)this.value_check(b.value)
        else{
            if(b instanceof ClassTree){
                if(!this.have(b.implement))this.error.push(new GrammarError('不存在的接口'))
            }
            if(b instanceof InterfaceTree){
                if(!this.have(b.of))this.error.push(new GrammarError('不存在的接口'))
            }
            this.in_scope()
            b.child.forEach(i=>{
                if(this.have(i.name))this.error.push(new GrammarError('重复的变量'))
                else this.scope.n.push(i.name)
                this.block_check(i)
            })
            this.out_scope()
        }
    }
    commands_check(command:CommandTree[]){
        if(command==null||command.length == 0)return
        for(let c of command){
            if(c instanceof ReturnTree)this.value_check(c.value)
            if(c instanceof OperSetTree){
                this.value_check(c.name)
                this.value_check(c.value)
            }
            if(c instanceof CallTree)
                this.value_check(c.name)
            if(c instanceof ThrowTree)
                this.value_check(c.value)
            if(c instanceof IncrementTree||c instanceof DecrementTree)
                this.value_check(c.name)
            if(c instanceof DeleteTree)
                this.value_check(c.name)
            if(c instanceof VarTree){
                if(this.have(c.name.name))this.error.push(new GrammarError('重复的变量'))
                else this.scope.n.push(c.name.name)
                this.value_check(c.value)
            }
            if(c instanceof IfTree){
                this.value_check(c.condition)
                this.commands_check(c.call)
                this.commands_check(c._else)
            }
            if(c instanceof SwitchTree){
                this.value_check(c.value)
                for(let i of c.cases){
                    this.value_check(i.condition)
                    this.commands_check(i.call)
                }
                this.commands_check(c._default)
            }
            if(c instanceof ForeachTree){
                this.value_check(c.array)
                this.in_scope()
                this.scope.n.push(c.name.name)
                this.commands_check(c.call)
                this.out_scope()
            }
            if(c instanceof ForTree){
                this.commands_check(c.init)
                this.in_scope()
                c.init.forEach(i=>{
                    this.scope.n.push(i.name.name)
                })
                this.value_check(c.condition)
                this.commands_check(c.step)
                this.commands_check(c.call)
                this.out_scope()
            }
            if(c instanceof WhileTree){
                this.value_check(c.condition)
                this.commands_check(c.value)
            }
            if(c instanceof TryTree){
                this.commands_check(c._try)
                this.commands_check(c._catch.body)
                this.commands_check(c._finally)
            }
            if(c instanceof ListTree)
                this.commands_check(c.child)
        }
    }
    constructor(tree:FileTree[]) {
        this.scope=new Scope([],null)
        this.global_scope=new Scope([],null)
        this.file_scope=new Scope([],null)
        this.error=[]
        this.tree=tree
    }
    check(){
        this.import_check()
        for(let i of this.tree){
            this.global_init(i,'')
        }
        for(let i of this.tree){
            this.import_check()
            this.file_init(i)
            this.block_check(i)
        }
        return this.error
    }
}
export default function (tree:FileTree[]){
    return new Resolver(tree).check()
}