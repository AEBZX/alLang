import {Tree} from 'allang-compiler-base'
import {math_oper_type} from '../model'
import {get_node_tree, get_tree, lambda_get_tree} from './get'
import {identifier_tree, type_tree} from './identifier'
import {param_call_tree} from './param'

// 基础指令
class command_tree extends Tree {
    commands: command_tree[]

    constructor(commands: command_tree[]) {
        super()
        this.commands = commands || []
    }
}

// if-else 链
class if_tree extends command_tree {
    condition: get_node_tree
    else_if: if_tree[]
    else: command_tree[]

    constructor(condition: get_node_tree, body: command_tree[], else_if: if_tree[], _else: command_tree[]) {
        super(body)
        this.condition = condition
        this.else_if = else_if
        this.else = _else
    }
}

// while / do-while
class while_tree extends command_tree {
    condition: get_node_tree
    do: boolean

    constructor(condition: get_node_tree, body: command_tree[], _do: boolean) {
        super(body)
        this.condition = condition
        this.do = _do
    }
}

// for
class for_tree extends command_tree {
    init: lambda_get_tree
    condition: lambda_get_tree
    step: lambda_get_tree
    body: command_tree[]

    constructor(init: lambda_get_tree, condition: lambda_get_tree, step: lambda_get_tree, body: command_tree[]) {
        super(body)
        this.init = init
        this.condition = condition
        this.step = step
        this.body = body
    }
}

// switch
class switch_tree extends command_tree {
    condition: get_node_tree
    cases: { value: get_tree, call: command_tree[] }[]
    default: command_tree[]

    constructor(condition: get_node_tree, cases: { value: get_tree, call: command_tree[] }[], default_block: command_tree[]) {
        super(null)
        this.condition = condition
        this.cases = cases
        this.default = default_block
    }
}

// foreach
class foreach_tree extends command_tree {
    identifier: identifier_var_tree
    array: get_node_tree

    constructor(identifier: identifier_var_tree, array: get_node_tree, body: command_tree[]) {
        super(body)
        this.identifier = identifier
        this.array = array
    }
}

// throw
class throw_tree extends command_tree {
    value: get_node_tree

    constructor(value: get_node_tree) {
        super(null)
        this.value = value
    }
}

// var 声明 — var name:type = value;
class identifier_var_tree extends command_tree {
    identifier: identifier_tree
    value: get_node_tree

    constructor(name: string, type: type_tree, value: get_node_tree) {
        super(null)
        this.identifier = new identifier_tree(name, type)
        this.value = value
    }
}

// 赋值 — name = value
class set_tree extends command_tree {
    name: string
    value: get_node_tree

    constructor(name: string, value: get_node_tree) {
        super(null)
        this.name = name
        this.value = value
    }
}

// 复合赋值 — name += value 等
class math_set_tree extends set_tree {
    oper_type: math_oper_type

    constructor(name: string, value: get_node_tree, type: math_oper_type) {
        super(name, value)
        this.oper_type = type
    }
}

// return
class return_tree extends command_tree {
    value: get_node_tree

    constructor(value: get_node_tree) {
        super(null)
        this.value = value
    }
}

// break
class break_tree extends command_tree {
    constructor() {
        super(null)
    }
}

// continue
class continue_tree extends command_tree {
    constructor() {
        super(null)
    }
}

// delete
class delete_tree extends command_tree {
    name: string

    constructor(name: string) {
        super(null)
        this.name = name
    }
}

// 函数调用 — await? name(params)
class call_tree extends command_tree {
    param: param_call_tree
    name: string
    _await: boolean

    constructor(name: string, param: param_call_tree, _await: boolean) {
        super(null)
        this.name = name
        this.param = param
        this._await = _await
    }
}

// super 调用
class super_tree extends call_tree {
    constructor(value: call_tree) {
        super(null, null, false)
    }
}

// vm 指令 — allang 上层通过 vm 'xxx' 内联调用 IO
class vm_tree extends command_tree {
    value: string
    variable: boolean

    constructor(value: string, variable: boolean) {
        super(null)
        this.value = value
        this.variable = variable
    }
}

export {
    super_tree, call_tree, break_tree, return_tree,
    math_set_tree, delete_tree, set_tree, identifier_var_tree,
    command_tree, throw_tree, continue_tree, if_tree,
    while_tree, for_tree, switch_tree, foreach_tree, vm_tree
}