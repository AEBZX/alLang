import {Tree} from 'allang-compiler-base'
import {bool_oper_type, math_oper_type, pointer_type} from '../model'
import {param_call_tree, param_identifier_tree} from './param'
import {command_tree} from './command'
import {identifier_tree, lambda_type_tree, type_tree} from './identifier'
import {block_tree} from './block'

//根树
class get_tree extends Tree {
    constructor() {
        super()
    }
}

//根节点
class get_node_tree extends get_tree {
    tree: chain_get_tree

    constructor(tree: chain_get_tree) {
        super()
        this.tree = tree
    }

    static create(tree: get_tree[]) {
        return new get_node_tree(new chain_get_tree(tree))
    }
}

/*
 * 包含:
 * lambda形式:():type=>{}
 * number,string,boolean
 * null
 * 指针:*&
 * 数组:[index]
 * 链式:a.b.c.d
 * 函数调用:a(b,c,d)
 * 变量:a
 * 运算:a+b-c*d/e%f&g|h^i~j
 * new:new a()
 * map:{a:b,c:d}
 * typeof xxx,返回类名/number/string
 * xxx instanceof xxx,本质是bool
 */
//(参数定义)=>{函数体}

//bool?a:b
class ternary_get_tree extends get_tree {
    condition: get_node_tree
    true_value: get_node_tree
    false_value: get_node_tree

    constructor(condition: get_node_tree, true_value: get_node_tree, false_value: get_node_tree) {
        super()
        this.condition = condition
        this.true_value = true_value
        this.false_value = false_value
    }
}

class lambda_get_tree extends get_tree {
    param: param_identifier_tree
    body: command_tree[]

    constructor(identifier: param_identifier_tree, body: command_tree[]) {
        super()
        this.param = identifier
        this.body = body
    }
}

class lambda_call_get_tree extends get_tree {
    params: param_call_tree
    name:string
    constructor(name:string,params: param_call_tree) {
        super()
        this.name = name
        this.params = params
    }
}

class map_get_tree extends get_tree {
    map: { key: string, get: get_tree }[]

    constructor(map: { key: string, get: get_tree }[]) {
        super()
        this.map = map
    }
}

class call_get_tree extends get_tree {
    params: param_call_tree
    name: string

    constructor(name: string, params: param_call_tree) {
        super()
        this.name = name
        this.params = params
    }
}

class new_get_tree extends call_get_tree {
    constructor(name: string, params: param_call_tree) {
        super(name, params)
    }
}

class chain_get_tree extends get_tree {
    chain: get_tree[]

    constructor(chain: get_tree[]) {
        super()
        this.chain = chain
    }
}

class variable_get_tree extends get_tree {
    name: string

    constructor(name: string) {
        super()
        this.name = name
    }
}

class null_get_tree extends get_tree {
    constructor() {
        super()
    }
}

class number_get_tree extends get_tree {
    value: number

    constructor(value: number) {
        super()
        this.value = value
    }
}

class string_get_tree extends get_tree {
    value: string

    constructor(value: string) {
        super()
        this.value = value
    }
}

class typeof_get_tree extends string_get_tree {
    var: get_tree

    constructor(data: get_tree) {
        super('')
        this.var = data
    }
}

class boolean_get_tree extends get_tree {
    value: boolean

    constructor(value: boolean) {
        super()
        this.value = value
    }
}

class instanceof_get_tree extends boolean_get_tree {
    left: get_tree
    right: get_tree

    constructor(left: get_tree, right: get_tree) {
        super(false)
        this.left = left
        this.right = right
    }
}

class pointer_get_tree extends get_tree {
    oper_type: pointer_type

    constructor(_type: pointer_type) {
        super()
        this.oper_type = _type
    }
}

class array_get_tree extends get_tree {
    index: get_node_tree
    name: string

    constructor(name: string, index: get_node_tree) {
        super()
        this.name = name
        this.index = index
    }
}

class bool_oper_get_tree extends get_tree {
    left: get_node_tree
    right: get_node_tree
    oper_type: bool_oper_type

    constructor(_type: bool_oper_type, left: get_node_tree, right: get_node_tree) {
        super()
        this.left = left
        this.right = right
        this.oper_type = _type
    }
}

class math_oper_get_tree extends get_tree {
    left: get_tree
    right: get_tree
    oper_type: math_oper_type

    constructor(_type: math_oper_type, left: get_tree, right: get_tree) {
        super()
        this.oper_type = _type
        this.left = left
        this.right = right
    }
}

export {
    chain_get_tree,
    variable_get_tree,
    null_get_tree,
    number_get_tree,
    string_get_tree,
    boolean_get_tree,
    pointer_get_tree,
    array_get_tree,
    bool_oper_get_tree,
    math_oper_get_tree,
    get_tree,
    get_node_tree,
    new_get_tree,
    call_get_tree,
    map_get_tree,
    instanceof_get_tree,
    typeof_get_tree,
    lambda_get_tree,
    lambda_call_get_tree,
    ternary_get_tree
}