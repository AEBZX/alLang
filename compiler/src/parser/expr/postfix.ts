import {TokenStream} from 'allang-compiler-base'
import {ExprCallTree, ExprComputedTree, ExprMemberTree, ExprPostDecTree, ExprPostIncTree, ExprTree} from '../../tree'
import allang_log from '../../base/allang_log'
import {expr} from './index'
import primary_expr from './primary'
export function args_expr(tool:TokenStream){
    if(!tool.hasMore())return null
    if(tool.now().name!='(')return null
    tool.next()
    if(tool.now().name==')'){
        tool.next()
        return []
    }
    let ret:ExprTree[]=[expr(tool)]
    if(ret[0]==null)return null
    while(tool.now().name==','){
        tool.next()
        ret.push(expr(tool))
        if(ret[ret.length-1]==null)allang_log.error('缺少表达式',tool.now().line)
    }
    if(tool.now().name==')'){
        tool.next()
        return ret
    }
    allang_log.error('缺少结束符',tool.now().line)
}
export default function (tool:TokenStream){
    let ret=primary_expr(tool)
    if(ret==null)return null
    while(true){
        if(!tool.hasMore())return ret
        if(tool.now().name=='.'){
            tool.next()
            ret=new ExprMemberTree(ret,tool.next().name)
        }else if(tool.now().name=='['){
            tool.next()
            let exp=expr(tool)
            if(exp==null)allang_log.error('缺少表达式',tool.now().line)
            ret=new ExprComputedTree(ret,exp)
            if(!tool.hasMore())return null
            if(tool.now().name!=']')allang_log.error('缺少]',tool.now().line)
            tool.next()
        }else if(tool.now().name=='('){
            ret=new ExprCallTree(ret,args_expr(tool))
        }else if(tool.now().name=='++') {
            tool.next()
            ret = new ExprPostIncTree(ret)
        }else if(tool.now().name=='--') {
            tool.next()
            ret = new ExprPostDecTree(ret)
        }else break
    }
    return ret
}