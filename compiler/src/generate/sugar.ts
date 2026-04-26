//语法糖脱糖以及纠错
import {match} from '../parser'
import {Tree} from 'allang-compiler-base'
import allang_log from '../allang_log'
import allang_tools from '../allang_tools'
import {
    body,
    break_tree,
    class_tree,
    enum_tree,
    func_tree, get_node_tree,
    import_tree,
    interface_tree,
    module_tree, type_tree,
    var_tree
} from '../tree'
import {file_tree, space_tree} from '../tree/block'
function check_import(data:import_tree[],log:allang_log){
    let modules:string[]=[]
    data.forEach((t)=>{
        if(modules.includes(t.module)){
            log.error(`模块${t.module}重复导入`,'')
        }
        modules.push(t.module)
    })
    //as别名冲突
    let name:string[]=[]
    data.forEach((t)=>{
        if(name.includes(t.name)){
            log.error(`模块${t.name}重复定义`,'')
        }
        name.push(t.name)
        if(t.name==t.module){
            log.error(`模块${t.name}与模块名重复`,'')
        }
    })
}
enum space_type{
    class,
    interface,
    module,
    enum,
    var,
    func
}
class scope{
    parent:scope
    imports:import_tree[]
    spaces:{data:space_tree,type:space_type}[]
    others:scope[]
    log:allang_log
    type:space_type
    name:string
    constructor(name:string,parent:scope, type:space_type,spaces:space_tree[],log:allang_log){
        this.name=name
        this.parent=parent
        this.log=log
        this.imports=parent?.imports
        this.others=parent?.others
        this.type=type
        this.spaces=[]
        //将所有spaces注册
        for(let i=0;i<spaces.length;i++) {
            let ls = {data: spaces[i], type: null}
            switch (spaces[i].constructor) {
                case class_tree:
                    ls.type = space_type.class
                    break
                case interface_tree:
                    ls.type = space_type.interface
                    break
                case module_tree:
                    ls.type = space_type.module
                    break
                case enum_tree:
                    ls.type = space_type.enum
                    break
                case var_tree:
                    ls.type = space_type.var
                    break
            }
            if (this.resolve(ls.data.name, ls.type)) log.error(`模块${ls.data.name}重复定义`, '')
            this.spaces.push(ls)
        }
        for(let i=0;i<this.spaces.length;i++){
            let ls=this.spaces[i]
            if(ls.type==space_type.module){
                //只能模块套模块
                if(this.type!=space_type.module)log.error(`${ls.data.name}只能模块套模块`, '')
                new scope(ls.data.name,this,space_type.module, ls.data.children,log)
            }else if(ls.type==space_type.enum) {
                //重名检测即可
                let name: string[] = []
                if (ls.data instanceof enum_tree) {
                    ls.data.values.forEach((t) => {
                        if (name.includes(t)) {
                            log.error(`枚举${ls.data.name}中重复定义${t}`, '')
                        }
                        name.push(t)
                    })
                }
            }else if(ls.type==space_type.interface){
                //检查定义问题
                if(ls.data instanceof interface_tree){
                    let name:string[]=[]
                    ls.data.func.forEach((t)=>{
                        if(name.includes(t.name))log.error(`接口${ls.data.name}中重复定义${t.name}`, '')
                        name.push(t.name)
                    })
                }
            }else if(ls.type==space_type.var){
                //类型检测(如果赋值)
                if(ls.data instanceof var_tree){
                    if(ls.data.value&&ls.data.value instanceof get_node_tree){
                    }
                }
            }else if(ls.type==space_type.class){
                new scope(ls.data.name,this,space_type.class, ls.data.children,log)
            }
        }
    }
    resolve(name:string,type:space_type):space_tree{
        for(let i=0;i<this.spaces.length;i++)
            if(this.spaces[i].data.name==name&&this.spaces[i].type==type)
                return this.spaces[i].data
        if(this.parent){
            return this.parent.resolve(name,type)
        }
        if(this.others)
            for(let i=0;i<this.others.length;i++)
                if(this.others[i].resolve(this.others[i].name+"."+name,type))
                    return this.others[i].resolve(this.others[i].name+"."+name,type)
        return null
    }
}
export function sugar(tool: allang_tools,log: allang_log){
    let tree:file_tree=match(tool, log)
    //imports纠错
    check_import(tree.imports,log)
    //模块纠错
    new scope('',null,space_type.module, tree.spaces,log)
}