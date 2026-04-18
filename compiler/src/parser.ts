import {import_tree, modifiers, module_tree} from './tree'
import {token, token_type, Tree} from 'allang-compiler-base'
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
//匹配import集群
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
//匹配修饰符
//格式:public/private,static,async/sync
function match_modifiers(tool:allang_tools,log:allang_log):modifiers{
    let ret=new modifiers(false,false,false)
    tool.backup()
    let _modifiers=['public','private','static','async','sync']
    let modifier:token[]=[]
    let bk=false
    while(true){
        tool._matches_word(_modifiers,(t:token)=>{
            modifier.push(t)
        }, ()=>bk=true)
        if(bk)break
    }
    let p=false,a=false,s=false
    for(let i of modifier){
        switch(i.name){
            case 'public':
                if(p)log.error('冲突或重复的修饰符',i.line)
                p=true
                ret.private=false
                break
            case 'private':
                if(p)log.error('冲突或重复的修饰符',i.line)
                p=true
                ret.private=true
                break
            case 'static':
                if(s)log.error('冲突或重复的修饰符',i.line)
                s=true
                ret.static=true
                break
            case 'async':
                if(a)log.error('冲突或重复的修饰符',i.line)
                a= true
                ret.async=true
                break
            case 'sync':
                if(a)log.error('冲突或重复的修饰符',i.line)
                a= true
                ret.async=false
                break
        }
    }
    tool.kill()
    return ret
}
//匹配模块
function match_module(tool:allang_tools,log:allang_log):module_tree{
    tool.backup()
    //模块默认
    let module=new module_tree(null,null,null)
    module.modifiers=new modifiers(false, false, false)
    tool._match_word('module',()=>{
        //必为模块名
        module.name=tool.match_type(token_type.identifier, () => log.error('模块名被吃掉了', tool.now().line)).name
        //匹配块
    },()=>{
        tool.restore()
        module=null
    })
    return module
}
function match(tool:allang_tools,log:allang_log) :Tree[]{
    let ret:Tree[]=[]
    //匹配import
    ret=match_imports(tool,log,ret)
    return ret
}
export {match}