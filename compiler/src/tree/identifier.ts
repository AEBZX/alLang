import {Tree} from 'allang-compiler-base'
import {basic_type} from '../model'

//标识符:类型
class identifier_tree extends Tree {
    key: string
    value: type_tree

    constructor(name: string, value: type_tree) {
        super()
        this.key = name
        this.value = value
    }
}

/*
 * 基本类型:map,number,string,boolean,void
 * lambda定义(a:b,a:b)=>a
 * 数组:基本类型[]
 * 类型定义符:type
 */
class type_tree extends Tree {
    constructor() {
        super()
    }
}

class basic_type_tree extends type_tree {
    type_name: basic_type

    constructor(type: basic_type) {
        super()
        this.type_name = type
    }
}

class map_type_tree extends type_tree {
    value: identifier_tree[]

    constructor(value: identifier_tree[]) {
        super()
        this.value = value
    }
}

class array_type_tree extends type_tree {
    type_name: type_tree

    constructor(type: type_tree) {
        super()
        this.type_name = type
    }
}

class lambda_type_tree extends type_tree {
    param: identifier_tree[]
    return_type: type_tree

    constructor(param: identifier_tree[], return_type: type_tree) {
        super()
        this.param = param
        this.return_type = return_type
    }
}

export {
    identifier_tree,
    type_tree,
    basic_type_tree,
    array_type_tree,
    lambda_type_tree,
    map_type_tree
}