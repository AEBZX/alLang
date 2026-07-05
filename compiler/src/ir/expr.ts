import {
    AddSetTree,
    ExprAddressTree, ExprAddTree, ExprAndTree,
    ExprArrayTree,
    ExprBooleanTree,
    ExprCallTree,
    ExprComputedTree,
    ExprContraryTree, ExprDivTree, ExprEqualTree,
    ExprIdenTree,
    ExprMapTree,
    ExprMemberTree, ExprModTree, ExprMulTree,
    ExprNegTree, ExprNewTree, ExprNotTree,
    ExprNullTree,
    ExprNumberTree, ExprOrTree,
    ExprPostDecTree,
    ExprPostfixTree,
    ExprPostIncTree,
    ExprPrimaryTree, ExprReferenceTree, ExprShiftLeftTree, ExprShiftRightTree,
    ExprStringTree, ExprSubTree,
    ExprTree, ExprXorTree
} from '../tree'
import {Command, CommandType, IRFactory} from './lib'

export default function expr(id:number,p:boolean,tree:ExprTree,ir:IRFactory){
}
export function primary_expr(id:number,p:boolean,tree:ExprPrimaryTree,ir:IRFactory){
    switch (tree.constructor){
        case ExprNumberTree:
            ir.cache.push(new Command(p?CommandType.MOV_I_V:CommandType.MOV_V_V,id,(tree as ExprNumberTree).value,null))
            break
        case ExprStringTree:
            let vs=JSON.parse((tree as ExprStringTree).value)
            let a=ir.name()
            ir.cache.push(new Command(CommandType.LOAD,a,ir.Pool.get(vs),null))
            ir.cache.push(new Command(p?CommandType.MOV_I_I:CommandType.MOV_V_I,id,a,null))
            break
        case ExprBooleanTree:
            let vb=(tree as ExprBooleanTree).value?1:0
            ir.cache.push(new Command(p?CommandType.MOV_I_V:CommandType.MOV_V_V,id,vb,null))
            break
        case ExprNullTree:
            ir.cache.push(new Command(p?CommandType.MOV_I_V:CommandType.MOV_V_V,id,null,null))
            break
        case ExprIdenTree:
            let vi=ir.Scope.lookup_iden((tree as ExprIdenTree).name)
            ir.cache.push(new Command(p?CommandType.MOV_I_I:CommandType.MOV_V_I,id,vi,null))
            break
        case ExprArrayTree:
            let va=(tree as ExprArrayTree).value
            let ls=ir.name()
            for(let i=0;i<va.length;i++){
                expr(ls,p,va[i],ir)
                ir.cache.push(new Command(p?CommandType.MOVA_I_V_I:CommandType.MOVA_V_V_I,id,i,ls))
            }
            break
        case ExprMapTree:
            let vm=(tree as ExprMapTree).value
            let l=ir.name()
            let l2
            let l_=ir.name()
            for(let i of vm){
                expr(l,p,i.value,ir)
                l2=ir.Pool.get(i.name.name)
                ir.cache.push(new Command(CommandType.LOAD,l_,l2,null))
                ir.cache.push(new Command(p?CommandType.MOVA_I_V_I:CommandType.MOVA_V_V_I,id,l_,l))
            }
            break
        //TODO: lambda暂不实现todo
    }
}
export function postfix_expr(id:number,p:boolean,tree:ExprPostfixTree,ir:IRFactory){
    switch (tree.constructor){
        case ExprMemberTree:
            let v=(tree as ExprMemberTree).object
            let name=ir.name()
            expr(name,false,v,ir)
            let name2=ir.name()
            expr(name2,false,new ExprStringTree((tree as ExprMemberTree).property),ir)
            ir.cache.push(new Command(p?CommandType.MOVC_I_I:CommandType.MOVC_V_I,id,name,name2))
            break
        case ExprComputedTree:
            let _v=(tree as ExprComputedTree).object
            let _name=ir.name()
            expr(_name,false,_v,ir)
            let _name2=ir.name()
            expr(_name2,false,(tree as ExprComputedTree).property,ir)
            ir.cache.push(new Command(p?CommandType.MOVA_I_I_I:CommandType.MOVA_V_I_I,id,_name,_name2))
            break
        case ExprPostIncTree:
            let __v=(tree as ExprPostIncTree).object
            let __name=ir.name()
            expr(__name,false,__v,ir)
            ir.cache.push(new Command(CommandType.ADD_I,__name,1,null))
            ir.cache.push(new Command(p?CommandType.MOV_I_I:CommandType.MOV_V_I,id,__name,null))
            break
        case ExprPostDecTree:
            let ___v=(tree as ExprPostDecTree).object
            let ___name=ir.name()
            expr(___name,false,___v,ir)
            ir.cache.push(new Command(CommandType.SUB_I,___name,1,null))
            ir.cache.push(new Command(p?CommandType.MOV_I_I:CommandType.MOV_V_I,id,___name,null))
            break
        case ExprCallTree:
            let ____v=(tree as ExprCallTree).object
            let ____p=(tree as ExprCallTree).args
            let ____name=ir.name()
            expr(____name,false,____v,ir)
            let params=[]
            for(let i of ____p){
                expr(ir.name(),false,i,ir)
                params.push(ir.name())
            }
            for(let i of params){
                ir.cache.push(new Command(CommandType.PUSH_I,i,null,null))
            }
            ir.cache.push(new Command(CommandType.CALL,____name,null,null))
            ir.cache.push(new Command(p?CommandType.POP_I:CommandType.POP_V,id,null,null))
            break
    }
}
export function prefix_expr(id:number,p:boolean,tree:ExprTree,ir:IRFactory){
    switch (tree.constructor){
        case ExprNegTree:
            let v=(tree as ExprNegTree).object
            let n=ir.name()
            expr(n,p,v,ir)
            ir.cache.push(new Command(p?CommandType.MOV_I_V:CommandType.MOV_V_V,id,0,null))
            ir.cache.push(new Command(p?CommandType.SUB_I:CommandType.SUB_V,id,n,null))
            break
        case ExprContraryTree:
            let _v=(tree as ExprContraryTree).object
            let _n=ir.name()
            expr(_n,p,_v,ir)
            ir.cache.push(new Command(p?CommandType.MOV_I_V:CommandType.MOV_V_V,id,0,null))
            ir.cache.push(new Command(p?CommandType.SUB_I:CommandType.SUB_V,id,_n,null))
            ir.cache.push(new Command(p?CommandType.SUB_I:CommandType.SUB_V,id,1,null))
            break
        case ExprNotTree:
            let __v=(tree as ExprNotTree).object
            let __n=ir.name()
            expr(__n,p,__v,ir)
            ir.cache.push(new Command(p?CommandType.NOT_I:CommandType.NOT_V,id,1,null))
            break
        case ExprNewTree:
            let ___v=((tree as ExprNewTree).object as ExprCallTree).object
            let ___p=((tree as ExprNewTree).object as ExprCallTree).args
            let ___n=ir.name()
            postfix_expr(___n,false,new ExprCallTree(___v,[___n,...___p]),ir)
            ir.cache.push(new Command(CommandType.MOV_I_I,id,___n,null))
            break
        case ExprReferenceTree:
            let ____v=(tree as ExprReferenceTree).object
            let ____n=ir.name()
            expr(____n,false,____v,ir)
            ir.cache.push(new Command(p?CommandType.MOVR_I:CommandType.MOVR_V,id,____n,null))
            break
        case ExprAddressTree:
            let _____v=(tree as ExprAddressTree).object
            let _____n=ir.name()
            expr(_____n,false,_____v,ir)
            ir.cache.push(new Command(p?CommandType.MOV_I_V:CommandType.MOV_V_V,id,_____n,null))
            break
    }
}
export function binary_expr(id:number,p:boolean,tree:ExprTree,ir:IRFactory){
    switch (tree.constructor){
        case ExprAddTree:
        {
            let v=(tree as ExprAddTree).right
            expr(id,false,v,ir)
            let r=ir.name()
            expr(r,false,(tree as ExprAddTree).left,ir)
            ir.cache.push(new Command(p?CommandType.ADD_I:CommandType.ADD_V,id,r,null))
        }
        break
        case ExprSubTree:
        {
            let v=(tree as ExprSubTree).right
            expr(id,false,v,ir)
            let r=ir.name()
            expr(r,false,(tree as ExprSubTree).left,ir)
            ir.cache.push(new Command(p?CommandType.SUB_I:CommandType.SUB_V,id,r,null))
        }
        break
        case ExprMulTree:
        {
            let v=(tree as ExprMulTree).right
            expr(id,false,v,ir)
            let r=ir.name()
            expr(r,false,(tree as ExprMulTree).left,ir)
            ir.cache.push(new Command(p?CommandType.MUL_I:CommandType.MUL_V,id,r,null))
        }
        break
        case ExprDivTree:
        {
            let v=(tree as ExprDivTree).right
            expr(id,false,v,ir)
            let r=ir.name()
            expr(r,false,(tree as ExprDivTree).left,ir)
            ir.cache.push(new Command(p?CommandType.DIV_I:CommandType.DIV_V,id,r,null))
        }
        break
        case ExprModTree:
        {
            let v=(tree as ExprModTree).right
            expr(id,false,v,ir)
            let r=ir.name()
            expr(r,false,(tree as ExprModTree).left,ir)
            ir.cache.push(new Command(p?CommandType.MOD_I:CommandType.MOD_V,id,r,null))
        }
        break
        case ExprAndTree:
        {
            let v=(tree as ExprAndTree).right
            expr(id,false,v,ir)
            let r=ir.name()
            expr(r,false,(tree as ExprAndTree).left,ir)
            ir.cache.push(new Command(p?CommandType.AND_I:CommandType.AND_V,id,r,null))
        }
        break
        case ExprOrTree:
        {
            let v=(tree as ExprOrTree).right
            expr(id,false,v,ir)
            let r=ir.name()
            expr(r,false,(tree as ExprOrTree).left,ir)
            ir.cache.push(new Command(p?CommandType.OR_I:CommandType.OR_V,id,r,null))
        }
        break
        case ExprXorTree:
        {
            let v=(tree as ExprXorTree).right
            expr(id,false,v,ir)
            let r=ir.name()
            expr(r,false,(tree as ExprXorTree).left,ir)
            ir.cache.push(new Command(p?CommandType.XOR_I:CommandType.XOR_V,id,r,null))
        }
        break
        case ExprShiftLeftTree:
        {
            let v=(tree as ExprShiftLeftTree).right
            expr(id,false,v,ir)
            let r=ir.name()
            expr(r,false,(tree as ExprShiftLeftTree).left,ir)
            ir.cache.push(new Command(p?CommandType.SHL_I:CommandType.SHL_V,id,r,null))
        }
        break
        case ExprShiftRightTree:
        {
            let v=(tree as ExprShiftRightTree).right
            expr(id,false,v,ir)
            let r=ir.name()
            expr(r,false,(tree as ExprShiftRightTree).left,ir)
            ir.cache.push(new Command(p?CommandType.SHR_I:CommandType.SHR_V,id,r,null))
        }
        break
    }
}