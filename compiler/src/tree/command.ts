import {Tree} from 'allang-compiler-base'
import {math_oper_type} from '../model'
import {
    bool_oper_get_tree,
    call_get_tree,
    chain_get_tree,
    get_node_tree, get_tree,
    math_oper_get_tree,
    variable_get_tree
} from './get'
import {identifier_tree, type_tree} from './identifier'
import {block_tree} from './block'
//基本指令
//call操作,return,continue,break,a=b,super,delete,运算,声明变量,throw get_node
class command_tree extends block_tree {
}

//if,while,do-while,for,switch,foreach等
class if_tree extends command_tree {
    condition: bool_oper_get_tree
    else_if: if_tree[]
    else: block_tree

    constructor(condition: bool_oper_get_tree, block: block_tree, else_if: if_tree[], _else: block_tree) {
        super([block])
        this.condition = condition
        this.else_if = else_if
        this.else = _else
    }
}

class while_tree extends command_tree {
    condition: bool_oper_get_tree
    do: boolean

    constructor(condition: bool_oper_get_tree, block: block_tree, _do: boolean) {
        super([block])
        this.condition = condition
        this.do = _do
    }
}

class for_tree extends command_tree {
    init: identifier_var_tree[]
    condition: bool_oper_get_tree
    step: command_tree[]

    constructor(init: identifier_var_tree[], condition: bool_oper_get_tree, block: block_tree, step: command_tree[]) {
        super([block])
        this.init = init
        this.condition = condition
        this.step = step
    }
}

class switch_tree extends command_tree {
    condition: get_node_tree
    cases: { value: get_tree, call: block_tree }[]
    default: block_tree

    constructor(condition: get_node_tree, cases: { value: get_tree, call: block_tree }[], default_block: block_tree) {
        super(null)
        this.condition = condition
        this.cases = cases
        this.default = default_block
    }
}

class foreach_tree extends command_tree {
    identifier: identifier_var_tree
    array: get_node_tree

    constructor(identifier: identifier_var_tree, array: get_node_tree, block: block_tree) {
        super([block])
        this.identifier = identifier
        this.array = array
    }
}

class throw_tree extends command_tree {
    value: get_node_tree
    constructor(value: get_node_tree) {
        super(null)
        this.value = value
    }
}

class identifier_var_tree extends command_tree {
    identifier: identifier_tree
    value: get_node_tree

    constructor(name: string, type: type_tree, value: get_node_tree) {
        super(null)
        this.identifier = new identifier_tree(name, type)
        this.value = value
    }
}

class set_tree extends command_tree {
    name: string
    value: get_node_tree

    constructor(name: string, value: get_node_tree) {
        super(null)
        this.name = name
        this.value = value
    }
}

class delete_tree extends command_tree {
    name: string

    constructor(name: string) {
        super(null)
        this.name = name
    }
}

class math_set_tree extends set_tree {
    constructor(name: string, value: get_node_tree, type: math_oper_type) {
        super(name, new get_node_tree(new chain_get_tree([
            new math_oper_get_tree(type, new variable_get_tree(name), value)
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

class call_tree extends command_tree {
    value: call_get_tree
    _await: boolean

    constructor(value: call_get_tree, _await: boolean) {
        super(null)
        this.value = value
        this._await = _await
    }
}

//super(123456)
class super_tree extends call_tree {
    constructor(value: call_get_tree) {
        super(value, false)
    }
}
class vm_tree extends command_tree{
    value: string
    variable:boolean
    constructor(value: string, variable:boolean) {
        super(null)
        this.value = value
        this.variable = variable
    }
}
export {
    super_tree, call_tree, break_tree, return_tree
    , math_set_tree, delete_tree, set_tree, identifier_var_tree, command_tree, throw_tree, continue_tree, if_tree,
    while_tree,
    for_tree,
    switch_tree,
    foreach_tree,vm_tree
}