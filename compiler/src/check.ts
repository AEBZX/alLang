import {break_tree, file_tree, func_tree, module_tree, var_tree} from './tree'
import allang_log from './allang_log'
import {space_tree} from "./tree/block";
export class check{
    log:allang_log
    data:file_tree[]
    named:string[]
    constructor(data:file_tree[], log:allang_log) {
        this.data=data
        this.log=log
        this.named=[]
        //合并同名模块
    }
    each_file(name:string,space:space_tree):string[]{
        let ret=[]
        ret.push(name+'.'+space.name)
        if(space instanceof var_tree || space instanceof func_tree)return
        for(let i=0;i<space.children.length;i++)
            ret.push(...this.each_file(name+'.'+space.name,space.children[i]))
        return ret
    }
}
//合并
function merge_module(data1:module_tree,data2:module_tree,log:allang_log):module_tree{
    let ret=new module_tree(data1.name,data1.modifiers,data1.annotations)
    ret.annotations.push(...data2.annotations)
    ret.children=data1.children.concat(data2.children)
    let children_module=ret.children.filter((i)=>i instanceof module_tree)
    ret.children=ret.children.filter((i)=>!(i instanceof module_tree))
    let children:module_tree[]=[]
    for(let i=0;i<children_module.length;i++){
        let finds:module_tree[]=[]
        for(let j=i+1;j<children_module.length;j++){
            if(i==j)continue
            if(children_module[i].name==children_module[j].name)
                finds.push(children_module[j])
        }
        if(finds.length>0){
            let ls:module_tree=children_module[i]
            for(let j=0;j<finds.length;j++)
                ls=merge_module(ls,finds[j],log)
            children.push(ls)
        }else children.push(children_module[i])
    }
    ret.children.push(...children)
    return ret
}