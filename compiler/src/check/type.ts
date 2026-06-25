import {GrammarError} from './'
import {
    AnyTypeTree,
    ArrayTypeTree,
    BlockTree, BooleanTypeTree, ErrorTypeTree, ExprArrayTree,
    ExprBinaryTree, ExprBooleanTree,
    ExprCallTree, ExprComputedTree, ExprIdenTree, ExprLambdaTree, ExprMapTree, ExprMemberTree, ExprNullTree,
    ExprNumberTree, ExprPostDecTree, ExprPostfixTree, ExprPostIncTree,
    ExprPrimaryTree, ExprStringTree,
    ExprTree,
    FileTree,
    FunctionTree, LambdaTypeTree, MapTypeTree,
    ModuleTree, NumberTypeTree, StringTypeTree,
    TypeTree,
    VariableTree, ClassTypeTree, VarIdenTree, ParamIdenTree, ClassTree, ExprPrefixTree, ExprNegTree, ExprNotTree,
    ExprNewTree, ExprContraryTree, ExprPreDecTree, ExprPreIncTree, ExprAddressTree, ExprReferenceTree, ExprTernaryTree,
    CommandTree, OperSetTree, SetTree, AddSetTree, IncrementTree, DecrementTree, VarTree, CallTree, ListTree, IfTree,
    SwitchTree, ForTree, ForeachTree, WhileTree, TryTree
} from '../tree'
export class T_Scope{
    constructor(public data:Map<string,BlockTree>,public parent:T_Scope | null){
    }
    find(name:string): BlockTree | undefined {
        return this.data.get(name)||this.parent?.find(name)
    }
    in(data:Map<string,BlockTree>){
        this.parent=new T_Scope(this.data,this.parent)
        this.data=data
    }
    out(){
        if(this.parent){
            this.data=this.parent.data
            this.parent=this.parent.parent
        }
    }
}
export class Typer{
    error:GrammarError[]
    tree:FileTree[]
    type:Map<ExprTree,TypeTree>
    file:Map<string,BlockTree>
    global:Map<string,BlockTree>
    scope:T_Scope
    typer(expr:ExprTree):TypeTree{
        let _lambda=(b:BlockTree)=>{
            if(b==null)return
            if(b instanceof VariableTree)
                return b.type
            if(b instanceof FunctionTree)
                return new LambdaTypeTree(b.args,b.type)
        }
        let _to_iden=(a:{ name: VarIdenTree, value: ExprTree}[])=>{
            let ret=new ParamIdenTree([])
            let iden=[]
            a.forEach(i=>{
                iden.push(i.name)
            })
            ret.type=iden
            return ret
        }
        if(expr==null)return new AnyTypeTree()
        //直接量/直接变量
        if(expr instanceof ExprPrimaryTree){
            //直接量
            if(expr instanceof ExprNumberTree)return new NumberTypeTree()
            if(expr instanceof ExprStringTree)return new StringTypeTree()
            if(expr instanceof ExprBooleanTree)return new BooleanTypeTree()
            if(expr instanceof ExprNullTree)return new AnyTypeTree()
            if(expr instanceof ExprArrayTree)return new ArrayTypeTree(this.typer(expr.value[0]))
            if(expr instanceof ExprMapTree)return new MapTypeTree(_to_iden(expr.value))
            if(expr instanceof ExprLambdaTree){
                this.commands(expr.body)
                return new LambdaTypeTree(expr.args,expr.ret)
            }
            //直接查表
            if(expr instanceof ExprIdenTree){
                if((this.type.get(expr)||_lambda(this.global.get(expr.name))||_lambda(this.file.get(expr.name))
                        ||_lambda(this.scope.find(expr.name)))
                ==null){
                    this.error.push(new GrammarError('未定义的变量'))
                    return new AnyTypeTree()
                }
                return this.type.get(expr)||_lambda(this.global.get(expr.name))||_lambda(this.file.get(expr.name))
                ||_lambda(this.scope.find(expr.name))
            }
        }
        if(expr instanceof ExprBinaryTree){
            this.type_check(expr.left,'类型错误',NumberTypeTree,StringTypeTree,BooleanTypeTree)
            this.type_check(expr.right,'类型错误',NumberTypeTree,StringTypeTree,BooleanTypeTree)
            return this.typer(expr.left) instanceof NumberTypeTree?new NumberTypeTree():
                this.typer(expr.left) instanceof StringTypeTree?new StringTypeTree():
                new ErrorTypeTree()
        }
        if(expr instanceof ExprPostfixTree){
            if(expr instanceof ExprPostIncTree||expr instanceof ExprPostDecTree){
                this.type_check(expr.object,'类型错误',NumberTypeTree)
                return new NumberTypeTree()
            }
            if(expr instanceof ExprComputedTree){
                this.type_check(expr.object,'类型错误',ArrayTypeTree)
                if(this.typer(expr.object) instanceof ArrayTypeTree){
                    this.type_check(expr.property,'类型错误',NumberTypeTree)
                    return (<ArrayTypeTree>this.typer(expr.object)).type
                }
                return new ErrorTypeTree()
            }
            if(expr instanceof ExprCallTree){
                if(this.typer(expr.object) instanceof LambdaTypeTree){
                    let type=<LambdaTypeTree>this.typer(expr.object)
                    let ok=true
                    expr.args.forEach((i,index)=>{
                        if(type.params.type[index].type!=this.typer(i))ok=false
                    })
                    if(ok)return type.return_type
                    this.error.push(new GrammarError('参数类型错误'))
                    return new ErrorTypeTree()
                }
                this.error.push(new GrammarError('不是函数'))
                return new ErrorTypeTree()
            }
            if(expr instanceof ExprMemberTree){
                let type=this.typer(expr.object)
                if(type instanceof MapTypeTree){
                    let t=new ErrorTypeTree()
                    type.type.type.forEach(i=>{
                        if(i.name==expr.property)t=i.type
                    })
                    if(t instanceof ErrorTypeTree)this.error.push(new GrammarError('未定义的属性'))
                    return t
                }
                if(type instanceof ClassTypeTree){
                    let c:BlockTree=<ClassTree>(this.global.get(type.name)||this.file.get(type.name))
                    ||this.scope.find(type.name)
                    let l=c.child.find(i=>i.name==expr.property&&i instanceof VariableTree)
                    if(l!=null)
                        return (<VariableTree>l).type
                    this.error.push(new GrammarError('未定义的属性'))
                    return new ErrorTypeTree()
                }
            }
        }
        if(expr instanceof ExprPrefixTree){
            if(expr instanceof ExprNegTree){
                this.type_check(expr.object,'类型错误',NumberTypeTree)
                return new NumberTypeTree()
            }
            if(expr instanceof ExprNotTree){
                this.type_check(expr.object,'类型错误',BooleanTypeTree)
                return new BooleanTypeTree()
            }
            if(expr instanceof ExprContraryTree){
                this.type_check(expr.object,'类型错误',NumberTypeTree,BooleanTypeTree)
                return this.typer(expr.object) instanceof BooleanTypeTree?new BooleanTypeTree():
                this.typer(expr.object) instanceof NumberTypeTree?new BooleanTypeTree():new ErrorTypeTree()
            }
            if(expr instanceof ExprPreDecTree||expr instanceof ExprPreIncTree
            ||expr instanceof ExprAddressTree||expr instanceof ExprReferenceTree){
                this.type_check(expr.object,'类型错误',NumberTypeTree)
                return new NumberTypeTree()
            }
            if(expr instanceof ExprNewTree){
                if(!(expr.object instanceof ExprCallTree)){
                    this.error.push(new GrammarError('不是构造函数'))
                    return new ErrorTypeTree()
                }
                if(!(this.typer(expr.object.object) instanceof ClassTypeTree)){
                    this.error.push(new GrammarError('不是类'))
                    return new ErrorTypeTree()
                }
                let name=(<ClassTypeTree>this.typer(expr.object.object)).name
                let c:BlockTree=this.global.get(name)||this.file.get(name)||this.scope.find(name)
                let func:FunctionTree=<FunctionTree>
                    c.child.find(i=>i.name=='constructor'&&i instanceof FunctionTree)
                if(func==null){
                    this.error.push(new GrammarError('未定义构造函数'))
                    return new ErrorTypeTree()
                }
                if(func.args.type.length!=expr.object.args.length){
                    this.error.push(new GrammarError('参数个数错误'))
                    return new ErrorTypeTree()
                }
                func.args.type.forEach((i,index)=>{
                    this.type_check((<ExprCallTree>(expr.object)).args[index],'参数类型错误',i.type)
                })
                return new ClassTypeTree(name)
            }
        }
        if(expr instanceof ExprTernaryTree){
            this.type_check(expr.condition,'类型错误',BooleanTypeTree)
            return this.typer(expr.true_value)==this.typer(expr.false_value)?this.typer(expr.true_value):
                new ErrorTypeTree()
        }
    }
    type_check(expr:ExprTree,error:string,...type:any[]){
        if(type instanceof AnyTypeTree)return
        if(type instanceof ErrorTypeTree)return
        let ok=false
        type.forEach(i=>{
            if(this.typer(expr)instanceof i)ok=true
        })
        if(!ok)this.error.push(new GrammarError(error))
    }
    _check(expr:ExprTree,error:string,type:TypeTree){
        if(type instanceof AnyTypeTree)return
        if(type instanceof ErrorTypeTree)return
        if(expr==null)return
        let t=this.typer(expr)
        if(t instanceof AnyTypeTree)return
        if(t instanceof ErrorTypeTree)return
        if(!(t instanceof type.constructor))this.error.push(new GrammarError(error))
    }
    commands(c:CommandTree[]){
        c.forEach(i=>{
            if(i instanceof OperSetTree){
                if(i instanceof SetTree){
                    this._check(i.value,'类型错误',this.typer(i.name))
                }else if(i instanceof AddSetTree){
                    this.type_check(i.value,'类型错误',NumberTypeTree,BooleanTypeTree)
                    this.type_check(i.name,'类型错误',NumberTypeTree)
                    this._check(i.name,'类型错误',this.typer(i.value))
                }else{
                    this.type_check(i.value,'类型错误',NumberTypeTree,BooleanTypeTree)
                    this.type_check(i.name,'类型错误',NumberTypeTree,BooleanTypeTree)
                    this._check(i.name,'类型错误',this.typer(i.value))
                }
            }
            if(i instanceof IncrementTree||i instanceof DecrementTree){
                this.type_check(i.name,'类型错误',NumberTypeTree)
            }
            if(i instanceof VarTree){
                if(i.value!=null)this._check(i.value,'类型错误',i.name.type)
                else this.type.set(i.value,i.name.type)
            }
            if(i instanceof CallTree){
                if(!(i.name instanceof ExprCallTree)){
                    this.error.push(new GrammarError('不是函数'))
                }
                this.typer(i.name)
            }
            if(i instanceof ListTree){
                this.commands(i.child)
            }
            if(i instanceof IfTree){
                this.type_check(i.condition,'类型错误',BooleanTypeTree)
                this.commands(i.call)
                this.commands(i._else)
            }
            if(i instanceof SwitchTree){
                i.cases.forEach(_i=>{
                    this._check(_i.condition,'类型错误',this.typer(i.value))
                    this.commands(_i.call)
                })
                this.commands(i._default)
            }
            if(i instanceof ForTree){
                this.commands(i.init)
                this.type_check(i.condition,'类型错误',BooleanTypeTree)
                this.commands(i.step)
                this.commands(i.call)
            }
            if(i instanceof ForeachTree){
                this.type_check(i.array,'类型错误',ArrayTypeTree)
                this.type_check(i.name,'类型错误',(<ArrayTypeTree>this.typer(i.array)).type)
                this.commands(i.call)
            }
            if(i instanceof WhileTree){
                this.type_check(i.condition,'类型错误',BooleanTypeTree)
                this.commands(i.value)
            }
            if(i instanceof TryTree){
                this.commands(i._try)
                this._check(i._catch,'类型错误',LambdaTypeTree)
                this.commands(i._finally)
            }
        })
    }
    block(b:BlockTree){
        if(b instanceof FunctionTree||b instanceof VariableTree){
            if(b instanceof VariableTree){
                this._check(b.value,'类型错误',b.type)
            }
            if(b instanceof FunctionTree){
                this.commands(b.command)
            }
            return
        }
        this.scope.in(null)
        this._scope(b)
        if(b.child) b.child.forEach(i=>{
            this.block(i)
        })
        this.scope.out()
    }
    constructor(tree:FileTree[]){
        this.error=[]
        this.tree=tree
        this.type=new Map()
        this.global=new Map()
        this.file=new Map()
        this.scope=new T_Scope(new Map(),null)
    }
    _global(){
        let add=(b:BlockTree,name:string)=>{
            name=name!=''?name+'.'+b.name:b.name
            if(b.modifier&&b.modifier._static)this.global.set(name,b)
            if(b instanceof VariableTree||b instanceof FunctionTree)return
            if(b.child) b.child.forEach(i=>{
                add(i,name)
            })
        }
        this.tree.forEach(i=>{
            add(i,'')
        })
    }
    _file(t:FileTree){
        this.file=new Map()
        t.imports.forEach(i=>{
            if(!this.global.has(i.name))return
            if(!(this.global.get(i.name) instanceof ModuleTree)){
                this.error.push(new GrammarError('引入了非模块'))
                return
            }
            this.file.set(i.as,this.global.get(i.name))
        })
    }
    _scope(t:BlockTree){
        this.scope.data=new Map()
        if(t.child) t.child.forEach(i=>{
            this.scope.data.set(i.name,i)
        })
    }
    check(){
        this._global()
        this.tree.forEach(i=>{
            this._file(i)
            this.block(i)
        })
    }
}