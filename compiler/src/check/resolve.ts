import {GrammarError, Scope} from './'
import {BlockTree, ExprTree, FileTree, FunctionTree, ModuleTree, VariableTree} from '../tree'
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
    upper_search(name:string, scope:Scope){
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
                if(this.have(name))this.error.push(new GrammarError('重复的静态块'))
                else this.global_scope.n.push(name)
            }
            if(i instanceof VariableTree||i instanceof FunctionTree)continue
            this.global_init(i,name)
        }
    }
    //将imports加入文件定义域
    file_init(b:FileTree){
        b.imports.forEach(i=>{
            if(!this.global_scope.n.includes(i.name))this.error.push(new GrammarError('未定义的模块'))
            if(this.have(i.as))this.error.push(new GrammarError('重名的别名'))
            else this.file_scope.n.push(i.as)
        })
    }
    in_scope(b:BlockTree){
        this.scope=new Scope([],this.scope)
        for(let i of b.child){
            if(this.have(i.name))this.error.push(new GrammarError('重名'))
            else this.scope.n.push(i.name)
        }
    }
    out_scope(){
        this.scope=this.scope.parent
    }
    value_check(expr:ExprTree){
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
        return this.error
    }
}