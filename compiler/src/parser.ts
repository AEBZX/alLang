import {
    annotation_tree, boolean_get_tree, call_get_tree, call_tree, class_tree,
    func_tree, get_node_tree,
    import_tree,
    modifiers,
    module_tree, null_get_tree, number_get_tree,
    param_call_tree, string_get_tree,
    variable_get_tree
} from './tree'
import {token, token_type, Tree} from 'allang-compiler-base'
import allang_tools from './allang_tools'
import allang_log from './allang_log'
//匹配数字,字符串,map,bool,null,new xxx等
function match_get(tool:allang_tools,log:allang_log):get_node_tree {
    return null
}
function match_get_basic() {

}
//格式:new func(get,get,...)
function match_get_call_new(tool:allang_tools,log:allang_log):call_get_tree{
    tool.backup()
    let ret=new call_get_tree(null,null)
    if(!tool.now())return null
    tool.match_word('new',()=>{
        tool.restore()
        ret=null
    })
    if(!ret)return null
    ret=match_get_call_new(tool,log)
    if(!ret)log.error('不合法的new',tool.now().line)
    return ret
}
//格式:func(get,get,...)
function match_get_call_func(tool:allang_tools,log:allang_log):call_get_tree{
    tool.backup()
    if(!tool.now())return null
    let ret=new call_get_tree(null,null)
    ret.name=match_module_use(tool,log,false)
    ret.params=match_call_param(tool,log)
    if(!ret.name||!ret.params)return null
    return ret
}
//(get,get,...)
function match_call_param(tool:allang_tools,log:allang_log):param_call_tree{
    let ret=new param_call_tree([])
    if(!tool.now())return null
    tool.backup()
    tool.match_word('(',()=>{
        tool.restore()
        ret=null
    })
    if(!ret)return null
    ret=new param_call_tree([])
    tool.match_word(')',()=>{
        let split=true
        let bk=false
        while (true){
            //不是结束就是参数
            if(split){
                tool.match_word(',',()=>{
                    log.error('重复分隔符',tool.now().line)
                })
                tool._match_word(')',()=>{
                    bk=true
                },()=>{
                    ret.args.push(match_get(tool,log))
                })
                split=false
            }
            if(bk)break
            if(!split){
                tool.match_word(',',()=>{
                    log.error('缺少分隔符',tool.now().line)
                })
            }
        }
    })
    tool.kill()
    return ret
}
//匹配a.b.c.d形式嵌套模块
function match_module_use(tool:allang_tools,log:allang_log,kill:boolean):string{
    let ret:string=''
    if(!tool.now())return null
    ret+=tool.match_type(token_type.identifier,()=>{
        if(kill)log.error('没模块名',tool.now().line)
        ret=null
    }).name
    if(!ret)return null
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
    tool.kill()
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
    let name=match_module_use(tool,log,true)
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
function match_modifiers(tool:allang_tools,log:allang_log):modifiers{
    let ret=new modifiers(false,false,false,false)
    tool.backup()
    console.log(tool)
    let _modifiers=['public','private','static','async','sync','final']
    let modifier:token[]=[]
    let bk=false
    while(true){
        tool._matches_word(_modifiers,(t:token)=>{
            modifier.push(t)
        }, ()=>bk=true)
        if(bk)break
    }
    let p=false,a=false,s=false,f=false
    for(let i of modifier){
        if(i)
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
                case 'final':
                    if(f)log.error('冲突或重复的修饰符',i.line)
                    f=true
                    ret.final=true
                    break
            }
    }
    tool.kill()
    return ret
}
/*
格式:
@${模块名.函数名}({直接量})
直接量包括true,false,null,数字,字符串,调用常量
 */
function match_annotation(tool:allang_tools,log:allang_log):annotation_tree {
    tool.backup()
    let tree:annotation_tree=null
    if(!tool.now())return null
    if(tool.now()&&tool.now().name!='@'){
        tool.restore()
        return tree
    }
    tool.match_word('@',()=>{})
    //匹配
    let name=match_module_use(tool,log,true)
    tree=new annotation_tree(name,
        new param_call_tree([]))
    //如果有左括号
    if(tool.now()&&tool.now().name!='(')return tree
    //吃掉
    tool.match_word('(',()=>{})
    let param_call=new param_call_tree([])
    let split=true
    let bk=false
    let param_match:()=>token=()=>{
        let ret
        tool._match_type(token_type.number,()=>{
            ret=tool.now()
        },()=>{
            tool._match_type(token_type.string,()=>{
                ret=tool.now()
            },()=>{
                tool._match_word('null',()=>{
                    ret=new token('null',token_type.keyword,null)
                },()=>{
                    tool._match_word('true',()=>{
                        ret=new token('true',token_type.keyword,null)
                    }, ()=>{
                        tool._match_word('false',()=>{
                            ret=new token('false',token_type.keyword,null)
                        }, ()=>{
                            ret=new token(match_module_use(tool,log,false),token_type.identifier,null)
                            if(!ret)log.error('没有匹配到参数',tool.now().line)
                        })
                    })
                })
            })
        })
        return ret
    }
    tool.match_word(')',()=>{
        while (tool.now()){
            //必然是直接量
            if(split){
                tool._match_word(',',()=>{
                    log.error('重复分隔',tool.now().line)
                },()=>{
                    let a=param_match()
                    //识别a是啥
                    switch (a.type){
                        case token_type.number:
                            param_call.args.push(get_node_tree.create([new number_get_tree(parseFloat(a.name))]))
                            break
                        case token_type.string:
                            param_call.args.push(get_node_tree.create([new string_get_tree(a.name)]))
                            break
                        case token_type.identifier:
                            param_call.args.push(get_node_tree.create([new variable_get_tree(a.name)]))
                            break
                        case token_type.keyword:
                            switch (a.name){
                                case 'true':
                                    param_call.args.push(get_node_tree.create([new boolean_get_tree(true)]))
                                    break
                                case 'false':
                                    param_call.args.push(get_node_tree.create([new boolean_get_tree(false)]))
                                    break
                                case 'null':
                                    param_call.args.push(get_node_tree.create([new null_get_tree()]))
                                    break
                            }
                            break
                    }
                    split=false
                })
            }
            tool._match_word(',',()=>{
                split=true
            },()=>{
                //一定就是)了
                tool.match_word(')',()=>{
                    log.error('没有结束符',tool.now().line)
                })
                bk=true
            })
            if(bk)break
        }
        tree.value=param_call
    })
    tool.kill()
    return tree
}
function match_annotations(tool:allang_tools,log:allang_log):annotation_tree[]{
    let ret:annotation_tree[]=[]
    while (tool.now()){
        let a=match_annotation(tool,log)
        if(a)ret.push(a)
        else return ret
    }
    tool.kill()
    return ret
}
/*
@注解
@注解
修饰符 名字:自定义
 */
function match_header(tool:allang_tools,log:allang_log):
    {modifiers:modifiers,annotations:annotation_tree[],name:string} {
    let ret={
        modifiers:new modifiers(false,false,false,false),
        annotations:[],
        name:''
    }
    tool.backup()
    ret.annotations=match_annotations(tool,log)
    ret.modifiers=match_modifiers(tool,log)
    ret.name=tool.match_type(token_type.identifier,()=>{
        tool.restore()
        log.error('没有匹配到名称',tool.now().line)
    }).name
    tool.match_word(':',()=>{
        log.error('缺少类型标识',tool.now().line)
    })
    tool.kill()
    return ret
}
function match(tool:allang_tools,log:allang_log) :Tree[]{
    let ret:Tree[]=[]
    //匹配import
    ret=match_imports(tool,log,ret)
    return ret
}
export {match}