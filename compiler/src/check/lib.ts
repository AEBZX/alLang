import {
    AnyTypeTree, ArrayTypeTree, BlockTree,
    BooleanTypeTree, CallTree, ClassTree, ClassTypeTree, EnumTree, ExprAddressTree,
    ExprAddTree, ExprAndTree, ExprArrayTree, ExprBinaryTree,
    ExprBooleanTree, ExprCallTree, ExprComputedTree, ExprContraryTree,
    ExprDivTree, ExprEqualTree, ExprGreaterEqualTree, ExprGreaterTree,
    ExprIdenTree, ExprLambdaTree, ExprLessEqualTree, ExprLessTree,
    ExprLogicAndTree, ExprLogicOrTree, ExprMapTree, ExprMemberTree, ExprModTree,
    ExprMulTree, ExprNegTree, ExprNewTree, ExprNotEqualTree, ExprNotTree, ExprNullTree,
    ExprNumberTree, ExprOrTree, ExprPostDecTree, ExprPostfixTree, ExprPostIncTree,
    ExprPreDecTree, ExprPrefixTree, ExprPreIncTree,
    ExprPrimaryTree, ExprReferenceTree,
    ExprShiftLeftTree, ExprShiftRightTree, ExprStringTree, ExprSubTree, ExprTernaryTree,
    ExprTree, ExprXorTree, FunctionTree, InterfaceTree, LambdaTypeTree, MapTypeTree, ModuleTree,
    NumberTypeTree, ParamIdenTree, PointerTypeTree,
    StringTypeTree,
    TypeTree, VariableTree
} from '../tree'
import {Tree} from 'allang-compiler-base'
/*
类型设置约定:
ClassTree默认是加ClassTypeTree
FunctionTree默认是LambdaTypeTree
EnumTree默认是ClassTypeTree
InterfaceTree默认是ClassTypeTree
 */
// of链辅助:沿着InterfaceTree.of链查找目标接口名
function checkInterfaceChain(
    ifaceName: string, targetName: string,
    error: string[], file_scope: Scope, global_scope: Scope, scope: Scope
): boolean {
    if (ifaceName === targetName) return true
    let iface = block_search(ifaceName, error, file_scope, global_scope, scope)
    if (!iface || !(iface instanceof InterfaceTree) || iface.of === '') return false
    return checkInterfaceChain(iface.of, targetName, error, file_scope, global_scope, scope)
}
// 检查两个ClassTypeTree是否兼容(通过implement和of链)
function checkClassCompat(
    nameA: string, nameB: string,
    error: string[], file_scope: Scope, global_scope: Scope, scope: Scope
): boolean {
    if (nameA === nameB) return true
    let blockA = block_search(nameA, error, file_scope, global_scope, scope)
    // A是ClassTree→检查是否实现了B(或B的父接口)
    if (blockA && blockA instanceof ClassTree && blockA.implement !== '') {
        if (checkInterfaceChain(blockA.implement, nameB, error, file_scope, global_scope, scope))
            return true
    }
    // B是ClassTree→检查是否实现了A(或A的父接口)
    let blockB = block_search(nameB, error, file_scope, global_scope, scope)
    if (blockB && blockB instanceof ClassTree && blockB.implement !== '') {
        if (checkInterfaceChain(blockB.implement, nameA, error, file_scope, global_scope, scope))
            return true
    }
    // A是InterfaceTree→沿of链查找B
    if (blockA && blockA instanceof InterfaceTree) {
        if (checkInterfaceChain(nameA, nameB, error, file_scope, global_scope, scope))
            return true
    }
    // B是InterfaceTree→沿of链查找A
    if (blockB && blockB instanceof InterfaceTree) {
        if (checkInterfaceChain(nameB, nameA, error, file_scope, global_scope, scope))
            return true
    }
    // EnumTree:枚举类型只能与同名校验(已在nameA===nameB处处理)
    return false
}
export function typeEquals(a: TypeTree, b: TypeTree,
    error?: string[], file_scope?: Scope, global_scope?: Scope, scope?: Scope): boolean {
    if (a === null && b === null) return true
    if (a === null || b === null) return false
    // ClassTypeTree:需要名称+of链比较
    if (a instanceof ClassTypeTree || b instanceof ClassTypeTree) {
        if (a instanceof ClassTypeTree && b instanceof ClassTypeTree) {
            if (a.name === b.name) return true
            // 有scope上下文时进行of链检查
            if (error && file_scope && global_scope && scope)
                return checkClassCompat(a.name, b.name, error, file_scope, global_scope, scope)
            // 无scope上下文时严格比较
            return false
        }
        // 一个是ClassTypeTree另一个不是→不同类型
        return false
    }
    return a.constructor === b.constructor
}
export class Scope {
    symbols = new Map<string, TypeTree>()
    blocks = new Map<string, BlockTree>()
    parent: Scope | null
    constructor(parent: Scope | null) {
        this.parent = parent
    }
    set(name: string, type: BlockTree) {
        this.blocks.set(name, type)
    }
    get(name: string): BlockTree | null{
        return this.blocks.get(name) || this.parent?.get(name) || null
    }
    push(name: string, type: TypeTree) {
        this.symbols.set(name, type)
    }
    lookup(name: string): TypeTree | null{
        //up.aaa形式
        if(!name.startsWith('up'))return this.symbols.get(name) || this.parent?.lookup(name) || null
        return this.parent?.lookup(name.substring(3)) || null
    }
    enter() {
        return new Scope(this)
    }
    leave(): Scope | null {
        return this.parent
    }
}
class Visitor{
    t:Map<any,((error:string[],file_scope:Scope,global_scope:Scope,scope:Scope,tree:Tree)=>void)>
    v:Map<any,Visitor>
    b:Map<string,BlockTree>
    constructor(public error:string[],public file_scope:Scope,public global_scope:Scope,public scope:Scope) {
        this.t=new Map()
        this.v=new Map()
        this.b=new Map()
    }
    register(type:any,data:
        ((error:string[],file_scope:Scope,global_scope:Scope,scope:Scope,tree:Tree)=>void)|Visitor){
        if(data instanceof Visitor)
            this.v.set(type,data)
        else
            this.t.set(type,data)
    }
    visit(tree:Tree){
        //优先从Visit获取
        for(let [k,v] of this.v){
            if(tree instanceof k){
                v.error=this.error
                v.file_scope=this.file_scope
                v.global_scope=this.global_scope
                v.scope=this.scope
                v.visit(tree)
                return
            }
        }
        for(let [k,v] of this.t){
            if(tree instanceof k){
                v(this.error,this.file_scope,this.global_scope,this.scope,tree)
                return
            }
        }
    }
}
export function iden_search(name:string,error:string[],file_scope:Scope,global_scope:Scope,scope:Scope){
    let r=scope.lookup(name)||global_scope.lookup(name)||file_scope.lookup(name)
    if(!r)
        error.push('未定义变量: '+name)
    return r
}
export function block_search(name:string,error:string[],file_scope:Scope,global_scope:Scope,scope:Scope){
    let r=scope.get(name)||global_scope.get(name)||file_scope.get(name)
    if(!r)
        error.push('未定义模块: '+name)
    return r
}
export function block_type(blc:BlockTree,error:string[],file_scope:Scope,global_scope:Scope,scope:Scope){
    if(blc instanceof ClassTree)return new ClassTypeTree(blc.name)
    if(blc instanceof FunctionTree)return new LambdaTypeTree(blc.args,blc.type)
    if(blc instanceof InterfaceTree)return new ClassTypeTree(blc.name)
    if(blc instanceof EnumTree)return new ClassTypeTree(blc.name)
    if(blc instanceof VariableTree)return blc.type
}
export function type(exp:ExprTree,error:string[],file_scope:Scope,global_scope:Scope,scope:Scope){
    let t=(e:ExprTree)=>type(e,error,file_scope,global_scope,scope)
    if(exp==null)return null
    if(exp instanceof ExprPrimaryTree){
        if(exp instanceof ExprNumberTree)return new NumberTypeTree()
        if(exp instanceof ExprStringTree)return new StringTypeTree()
        if(exp instanceof ExprBooleanTree)return new BooleanTypeTree()
        if(exp instanceof ExprNullTree)return new AnyTypeTree()
        if(exp instanceof ExprIdenTree)return iden_search(exp.name,error,file_scope,global_scope,scope)
        if(exp instanceof ExprArrayTree)return new ArrayTypeTree(t(exp.value[0]))
        if(exp instanceof ExprMapTree)return new MapTypeTree(t(exp.value[0].value))
        if(exp instanceof ExprLambdaTree)return new LambdaTypeTree(exp.args,exp.ret)
    }
    if(exp instanceof ExprPostfixTree){
        if(exp instanceof ExprComputedTree){
            if(!(t(exp.property) instanceof StringTypeTree)
                &&!(t(exp.property) instanceof NumberTypeTree))
                error.push('类型错误:[]后只能是string/number')
            let typ=t(exp.object)
            if(typ instanceof MapTypeTree|| typ instanceof ArrayTypeTree)
                return typ.type
            error.push('语法错误:下标访问要求对象是array/object')
        }
        if(exp instanceof ExprPostDecTree|| exp instanceof ExprPostIncTree){
            if(!(t(exp.object) instanceof NumberTypeTree))
                error.push('类型错误:++/--只能对number使用')
            return new NumberTypeTree()
        }
        if(exp instanceof ExprCallTree){
            let typ=t(exp.object)
            if(!(typ instanceof LambdaTypeTree)){
                error.push('类型错误:调用对象必须是函数')
                return new AnyTypeTree()
            }
            if(typ.params.type.length!=exp.args.length)
                error.push('参数数量错误')
            for(let i=0;i<exp.args.length;i++){
                let paramTypes=typ.params.type
                if(i<paramTypes.length&&!typeEquals(paramTypes[i].type,
                t(exp.args[i]),error,file_scope,global_scope,scope))
                    error.push('参数类型错误')
            }
            return typ.return_type
        }
        if(exp instanceof ExprMemberTree){
            let _=(e:ExprTree)=>{
                if(e instanceof ExprIdenTree)return true
                if(e instanceof ExprMemberTree)return _(e.object)
                return false
            }
            //情况1:可达a.b.c.d纯形似且已经完成,优先考虑模块和link
            if(_(exp)){
                let name:string[]=[]
                let n=(e:ExprTree)=>{
                    if(e instanceof ExprMemberTree){
                        name.push(e.property)
                        n(e.object)
                    }
                    if(e instanceof ExprIdenTree)
                        name.push(e.name)
                }
                n(exp)
                let _name:string[]=[]
                for(let i=name.length-1;i>=0;i--)
                    _name.push(name[i])
                //预期:匹配最长的模块链
                let named=''
                let obj:BlockTree=null
                let matchLen=0
                for(let i=0;i<_name.length;i++){
                    let testName=named?named+'.'+_name[i]:_name[i]
                    let a=block_search(testName,error,file_scope,global_scope,scope)
                    if(a!=null){obj=a;named=testName;matchLen=i+1}
                    else break
                }
                if(obj!=null){
                    if(matchLen==_name.length)
                        return block_type(obj,error,file_scope,global_scope,scope)
                    // 部分匹配:剩余段解析为成员访问
                    let current=obj
                    for(let i=matchLen;i<_name.length;i++){
                        if(!(current instanceof BlockTree)){
                            error.push('语法错误:无法访问对象')
                            return new AnyTypeTree()
                        }
                        let found=false
                        for(let child of current.child){
                            if(child.name==_name[i]){
                                if(i==_name.length-1)
                                    return block_type(child,error,file_scope,global_scope,scope)
                                current=child
                                found=true
                                break
                            }
                        }
                        if(!found){
                            error.push('语法错误:无法访问对象')
                            return new AnyTypeTree()
                        }
                    }
                }
            }
            //情况2:类型成员访问(var/class/enum/function)
            {
                let _t=t(exp.object)
                if(_t instanceof ClassTypeTree){
                    let c=block_search(_t.name,error,file_scope,global_scope,scope)
                    if(c!=null){
                        if(c instanceof EnumTree){
                            if(c.data.includes(exp.property))
                                return new NumberTypeTree()
                        }else for(let i of c.child){
                            if(i.name==exp.property)
                                return block_type(i,error,file_scope,global_scope,scope)
                        }
                    }
                }
                error.push('语法错误:无法访问对象')
                return new AnyTypeTree()
            }
        }
    }
    if(exp instanceof ExprPrefixTree){
        if(exp instanceof ExprPreIncTree|| exp instanceof ExprPreDecTree){
            if(!(t(exp.object) instanceof NumberTypeTree))
                error.push('类型错误:++/--只能对number使用')
            return new NumberTypeTree()
        }
        if(exp instanceof ExprNegTree||exp instanceof ExprNotTree||exp instanceof ExprContraryTree){
            if(!(t(exp.object) instanceof NumberTypeTree)&&!(t(exp.object) instanceof BooleanTypeTree))
                error.push('类型错误:!/~/+只能对number/boolean使用')
            return t(exp.object)
        }
        if(exp instanceof ExprNewTree){
            if(!(exp.object instanceof ExprCallTree)) {
                error.push('语法错误:new对象必须使用()')
                return new AnyTypeTree()
            }
            let callExpr=<ExprCallTree>exp.object
            // 从ExprCallTree中获取类名(ExprIdenTree)
            let className:string=null
            if(callExpr.object instanceof ExprIdenTree)
                className=callExpr.object.name
            if(className==null){
                error.push('类型错误:new对象必须使用class')
                return new AnyTypeTree()
            }
            let c=block_search(className,error,file_scope,global_scope,scope)
            if(!(c instanceof ClassTree)){
                error.push('类型错误:new对象必须使用class')
                return new AnyTypeTree()
            }
            let con:ParamIdenTree=null
            //寻找constructor
            for(let i of c.child){
                if(i instanceof FunctionTree&&i.name=='constructor'){
                    con=i.args
                    break
                }
            }
            if(con==null)con=new ParamIdenTree([])
            if(con.type.length!=callExpr.args.length)
                error.push('参数数量错误')
            for(let i=0;i<callExpr.args.length;i++){
                if(i<con.type.length&&!typeEquals(con.type[i].type,t(callExpr.args[i]),
                    error,file_scope,global_scope,scope))
                    error.push('参数类型错误')
            }
            return new ClassTypeTree(c.name)
        }
        if(exp instanceof ExprReferenceTree){
            if(!(t(exp.object) instanceof PointerTypeTree))
                error.push('类型错误:*只能对pointer使用')
            return (<PointerTypeTree>t(exp.object)).type
        }
        if(exp instanceof ExprAddressTree)
            return new PointerTypeTree(t(exp.object))
    }
    if(exp instanceof ExprBinaryTree){
        if(exp instanceof ExprAddTree){
            if(t(exp.left) instanceof StringTypeTree||t(exp.right) instanceof StringTypeTree)
                return new StringTypeTree()
            if(t(exp.left) instanceof NumberTypeTree&&t(exp.right) instanceof NumberTypeTree)
                return new NumberTypeTree()
            error.push('类型错误:+只能对number/string使用')
        }else if(exp instanceof ExprEqualTree||exp instanceof ExprNotEqualTree
            ||exp instanceof ExprLessTree||exp instanceof ExprLessEqualTree
            ||exp instanceof ExprGreaterTree||exp instanceof ExprGreaterEqualTree
            ||exp instanceof ExprLogicAndTree||exp instanceof ExprLogicOrTree){
            return new BooleanTypeTree()
        }else{
            if(t(exp.left) instanceof NumberTypeTree&&t(exp.right) instanceof NumberTypeTree)
                return new NumberTypeTree()
            if(t(exp.left) instanceof BooleanTypeTree&&t(exp.right) instanceof BooleanTypeTree)
                return new BooleanTypeTree()
            error.push('类型错误:算术/位运算只能对number/boolean使用')
        }
    }
    if(exp instanceof ExprTernaryTree){
        if(!(t(exp.condition) instanceof BooleanTypeTree))
            error.push('类型错误:?只能对boolean使用')
        if(!typeEquals(t(exp.false_value),t(exp.true_value),error,file_scope,global_scope,scope))
            error.push('类型错误:?只能对相同类型使用')
        return t(exp.true_value)
    }
}
export default {
    c:(data:(error:string[],file_scope:Scope,global_scope:Scope,scope:Scope,tree:Tree)=>void)=>data,
    v:()=>new Visitor(null,null,null,null),
    r:(type:any,data:((error:string[],file_scope:Scope,global_scope:Scope,scope:Scope,tree:Tree)=>void)|Visitor
    ,vis:Visitor)=>vis.register(type,data),
    t:(v:()=>Visitor)=>v(),
    p:(exp:ExprTree,v:Visitor)=>type(exp,v.error,v.file_scope,v.global_scope,v.scope),
    is:(name:string,v:Visitor)=>iden_search(name,v.error,v.file_scope,v.global_scope,v.scope),
    bs:(name:string,v:Visitor)=>block_search(name,v.error,v.file_scope,v.global_scope,v.scope),
}