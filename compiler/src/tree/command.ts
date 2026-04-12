import {Tree} from 'allang-compiler-base'
import {math_oper_type} from '../model'
import {
    call_get_tree,
    chain_get_tree,
    get_node_tree,
    math_oper_get_tree,
    variable_get_tree
} from './get'
import {identifier_tree, type_tree} from './identifier'
import {block_tree} from './block'
//基本指令
//call操作,return,continue,break,a=b,super,delete,运算,声明变量,throw get_node
class command_tree extends block_tree {
}
class throw_tree extends command_tree{
    value: get_node_tree[]
    constructor(value: get_node_tree[]) {
        super(null)
        this.value = value
    }
}
class identifier_var_tree extends command_tree{
    identifier: identifier_tree
    value: get_node_tree
    constructor(name: string,type:type_tree,value:get_node_tree) {
        super(null)
        this.identifier=new identifier_tree(name,type)
        this.value=value
    }
}
class set_tree extends command_tree{
    name: string
    value: get_node_tree
    constructor(name: string, value: get_node_tree) {
        super(null)
        this.name = name
        this.value = value
    }
}
class delete_tree extends command_tree{
    name: string
    constructor(name: string) {
        super(null)
        this.name = name
    }
}
class math_set_tree extends set_tree{
    constructor(name:string,value:get_node_tree,type:math_oper_type) {
        super(name,new get_node_tree(new chain_get_tree([
            new math_oper_get_tree(type, new variable_get_tree(name),value)
        ])))
    }
}
class return_tree extends command_tree {
    value: get_node_tree
    constructor(value: get_node_tree) {
        super(null)
        this.value = value
    }
}
class break_tree extends command_tree {
    constructor() {
        super(null)
    }
}
class continue_tree extends command_tree {
    constructor() {
        super(null)
    }
}
class call_tree extends command_tree{
    value: call_get_tree
    name: string
    await:boolean
    constructor(name: string, value: call_get_tree,await:boolean) {
        super(null)
        this.name = name
        this.value = value
        this.await = await
    }
}
//super(123456)
class super_tree extends call_tree {
    constructor(value: call_get_tree) {
        super('super',value,false)
    }
}
export {super_tree,call_tree,break_tree,return_tree
    ,math_set_tree,delete_tree,set_tree,identifier_var_tree,command_tree,throw_tree,continue_tree}