import {GrammarError} from './'
import {
    BlockTree, BreakTree,
    ClassTree,
    CommandTree, ContinueTree, ExprLambdaTree,
    FileTree, ForeachTree, ForTree,
    FunctionTree,
    InterfaceTree,
    ModuleTree,
    VariableTree, VarTree, WhileTree
} from '../tree'

export class Structurer {
    error:GrammarError[]
    tree:FileTree[]
    loop:number
    global_blocked:Map<string,BlockTree>
    linked_blocked:Map<string,BlockTree>
    blocked:Map<string,BlockTree>
    constructor(tree:FileTree[]){
        this.error=[]
        this.global_blocked=new Map()
        this.linked_blocked=new Map()
        this.blocked=new Map()
        this.tree=tree
        this.loop=0
    }
    has_block(name:string){
        return this.blocked.has(name)||this.linked_blocked.has(name)||this.global_blocked.has(name)
    }
    get_block(name:string){
        return this.blocked.get(name)||this.linked_blocked.get(name)||this.global_blocked.get(name)
    }
    import_linked(tree:FileTree){
        this.linked_blocked=new Map()
        tree.imports.forEach(i=>{
            if(this.global_blocked.has(i.name))this.linked_blocked.set(i.as,this.global_blocked.get(i.name))
        })
    }
    global_init(){
        let scan=(tree:BlockTree,name:string)=>{
            tree.child.forEach(i=>{
                name=name!=''?name+'.'+i.name:i.name
                if(i.modifier._static)this.global_blocked.set(name,i)
                if(i instanceof FunctionTree||i instanceof VariableTree)return
                scan(i,name)
            })
        }
        this.tree.forEach(i=>{
            scan(i,'')
        })
    }
    blocked_init(now:BlockTree){
        this.blocked=new Map()
        now.child.forEach(i=>{
            this.blocked.set(i.name,i)
        })
    }
    //module只能在module/file下定义
    module_check(tree:BlockTree){
        if(tree instanceof VariableTree||tree instanceof FunctionTree)return
        tree.child.forEach(i=>{
            if(i instanceof ModuleTree&&!(tree instanceof ModuleTree|| tree instanceof FileTree))
                this.error.push(new GrammarError('模块只能在模块下定义'))
            this.module_check(i)
        })
    }
    class_check(tree:ClassTree){
        if(tree.implement=='')return
        if(!this.has_block(tree.implement))
            this.error.push(new GrammarError('未定义的接口'))
        let func=tree.child.filter(i=>i instanceof FunctionTree)
        let implements_func=this.implements_func_list(<InterfaceTree>this.get_block(tree.implement))
        implements_func.forEach(i=>{
            if(!func.some(j=>j.name==i.name))
                this.error.push(new GrammarError('类缺少接口方法'))
        })
    }
    commands_check(tree:CommandTree[]){
        tree.forEach(i=>{
            if(i instanceof WhileTree){
                this.loop++
                this.commands_check(i.value)
                this.loop--
            }
            if(i instanceof ForeachTree){
                this.loop++
                this.commands_check(i.call)
                this.loop--
            }
            if(i instanceof ForTree){
                this.loop++
                this.commands_check(i.call)
                this.loop--
            }
            if(i instanceof VarTree&&i.value&&i.value instanceof ExprLambdaTree){
                this.commands_check(i.value.body)
            }
            if((i instanceof BreakTree||i instanceof ContinueTree)&&this.loop==0)
                this.error.push(new GrammarError('循环外不能使用break和continue'))
        })
    }
    implements_func_list(i:InterfaceTree){
        let func:FunctionTree[]=[]
        let list=(_i:InterfaceTree)=>{
            _i.child.forEach(__i=>{
                if(__i instanceof FunctionTree)func.push(__i)
            })
            this.interface_check(_i)
            if(_i.of!='')list(<InterfaceTree>this.get_block(_i.of))
        }
        list(i)
        return func
    }
    interface_check(tree:InterfaceTree){
        if(tree.of=='')return
        if(this.has_block(tree.of))this.error.push(new GrammarError('未定义的接口'))
        if(!(this.get_block(tree.of) instanceof InterfaceTree))
            this.error.push(new GrammarError('类只能实现接口'))
    }
    check(){
        this.global_init()
        let _check=(tree:BlockTree)=>{
            this.blocked_init(tree)
            tree.child.forEach(i=>{
                if(i instanceof InterfaceTree)this.interface_check(i)
                if(i instanceof ClassTree)this.class_check(i)
                if(i instanceof FunctionTree)this.commands_check(i.command)
                if(i instanceof VariableTree){
                    if(i.value&&i.value instanceof ExprLambdaTree){
                        this.commands_check(i.value.body)
                    }
                }
                if(i instanceof FunctionTree||i instanceof VariableTree)return
                _check(i)
            })
        }
        this.tree.forEach(i=>{
            this.import_linked(i)
            i.child.forEach(j=>{
                if(!(j instanceof ModuleTree))this.error.push(new GrammarError('文件下只能是模块'))
            })
            i.child.forEach(j=>{
                _check(j)
            })
        })
        return this.error
    }
}
export default function (tree:FileTree[]){
    return new Structurer(tree).check()
}