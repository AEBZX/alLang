import {import_tree, modifiers} from './tree'
import {token_type, Tree} from 'allang-compiler-base'
import allang_tools from './allang_tools'
import allang_log from './allang_log'

/**
 * 规范:
 * 匹配后自动下跳
 * 调用前不跳
 * 先backup
 * 失败restore或者报错
 */
//匹配a.b.c.d形式嵌套模块
function match_module_use(tool:allang_tools,log:allang_log):string{
    let ret:string=''
    ret+=tool.match_type(token_type.identifier,()=>{
        log.error('没模块名',tool.now().line)
    }).name
    let split=false
    let bk=false
    if(tool.now()&&tool.now().name=='.')
        while(true){
            tool.match_word('.',()=>{
                bk=true
            })
            if(bk)break
            split=true
            ret+='.'
            ret+=tool.match_type(token_type.identifier,()=>{
                if(split)log.error('没模块名或者分隔符重复',tool.now().line)
            }).name
            split=false
            if(!tool.now()||tool.now().name!='.')break
        }
    return ret
}
//import a as b或者import a
function match_import(tool:allang_tools,log:allang_log,tree:Tree[]):Tree[] {
    tool.backup()
    if(tool.now().name!='import'){
        tool.restore()
        return tree
    }
    //吃掉
    let line=tool.now().line
    tool.match_word('import',()=>tool.restore())
    //必须是标识符
    let name=match_module_use(tool,log)
    let t=new import_tree(name,name)
    //可能是as
    tree.push(t)
    let r=false
    tool.match_word('as',()=>{
        r=true
    })
    if(r){
        tool.kill()
        return tree
    }
    t.name=tool.match_type(token_type.identifier, () => {
        log.error('非法的import', line)
    }).name
    tree.pop()
    tree.push(t)
    //最后确保分号
    tool.match_word(';',()=>{
        log.error('缺少分号', line)
    })
    tool.kill()
    return tree
}
//import集群
function match_imports(tool:allang_tools,log:allang_log,tree:Tree[]):Tree[] {
    tool.backup()
    let ret:Tree[]=[]
    let len:number
    while(tool.now()){
        len=ret.length
        ret=match_import(tool,log,ret)
        if(len==ret.length)break
    }
    return ret
}
function match(tool:allang_tools,log:allang_log) :Tree[]{
    let ret:Tree[]=[]
    //匹配import
    ret=match_imports(tool,log,ret)
    return ret
}
export {match}