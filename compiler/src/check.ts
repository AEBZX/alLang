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
    return ret
}