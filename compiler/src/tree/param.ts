import {Tree} from 'allang-compiler-base'
import {get_node_tree} from './get'
import {identifier_tree} from './identifier'

//调用树
class param_call_tree extends Tree {
    args: get_node_tree[]

    constructor(args: get_node_tree[]) {
        super()
        this.args = args
    }
}

//声明树
class param_identifier_tree extends Tree {
    param: identifier_tree[]
    other: get_node_tree

    constructor(param: identifier_tree[], other: get_node_tree) {
        super()
        this.param = param
        this.other = other
    }
}

export {
    param_call_tree,
    param_identifier_tree
}