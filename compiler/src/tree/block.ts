import {bool_oper_get_tree, boolean_get_tree, get_node_tree, get_tree, lambda_get_tree, variable_get_tree} from './get'
import {param_call_tree, param_identifier_tree} from './param'
import {command_tree, identifier_var_tree} from './command'
import {type_tree} from './identifier'
import {Tree} from 'allang-compiler-base'
import {bool_oper_type} from '../model'
//注解
class annotation_tree extends Tree {
    name: string
    value: param_call_tree
    constructor(name: string, value: param_call_tree) {
        super()
        this.name = name
        this.value = value
    }
}
//不是树,修饰符类
class modifiers{
    static:boolean
    async:boolean
    private:boolean
    constructor(_static:boolean, _async:boolean, _private:boolean) {
        this.static = _static
        this.async = _async
        this.private = _private
    }
}
//单纯的block
class block_tree extends Tree {
    commands:block_tree[]
    constructor(commands:block_tree[]) {
        super()
        this.commands = commands
    }
}
//if,while,do-while,for,switch,foreach等
class if_tree extends command_tree {
    condition: bool_oper_get_tree
    else_if: if_tree[]
    else: block_tree
    constructor(condition:bool_oper_get_tree, block: block_tree, else_if: if_tree[], _else: block_tree) {
        super([block])
        this.condition = condition
        this.else_if = else_if
        this.else = _else
    }
}
class while_tree extends command_tree {
    condition: bool_oper_get_tree
    do:boolean
    constructor(condition:bool_oper_get_tree, block: block_tree, _do:boolean) {
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
    cases: {value:get_tree,call:block_tree }[]
    default: block_tree
    constructor(condition: get_node_tree, cases: {value:get_tree,call:block_tree}[], default_block: block_tree) {
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

/*
 * try{
 *  ...
 * }catch(get_node){
 *  ...
 * }finally{
 *  ...
 * }
 */
class try_tree extends block_tree {
    catch: lambda_get_tree
    finally: block_tree
    constructor(block: block_tree, catch_block: lambda_get_tree, finally_block: block_tree) {
        super([block])
        this.catch = catch_block
        this.finally = finally_block
    }
}
//声明区,包含func,class,变量等
class var_tree extends Tree {
    modifiers:modifiers
    annotations:annotation_tree[]
    value:get_tree
    constructor(modifiers:modifiers, annotations:annotation_tree[], value:get_tree) {
        super()
        this.modifiers = modifiers
        this.annotations = annotations
        this.value = value
    }
}
class body extends Tree{
    name:string
    commands:block_tree
    modifiers:modifiers
    annotations:annotation_tree[]
    constructor(name:string,commands:block_tree, modifiers:modifiers, annotations:annotation_tree[]) {
        super()
        this.name = name
        this.commands = commands
        this.modifiers = modifiers
        this.annotations = annotations
    }
}
class func_tree extends body {
    params: param_identifier_tree
    return_type: type_tree
    constructor(name:string,commands:block_tree, modifiers:modifiers, annotations:annotation_tree[],
                params: param_identifier_tree, return_type: type_tree) {
        super(name,commands, modifiers, annotations)
        this.params = params
        this.return_type = return_type
    }
}
class class_tree extends Tree{
    extends: string
    implements: string[]
    variable:var_tree[]
    func:func_tree[]
    modifiers:modifiers
    annotations:annotation_tree[]
    name:string
    constructor(name:string, _extends: string, _implements: string[], variable:var_tree[], func:func_tree[],
                modifiers:modifiers, annotations:annotation_tree[]) {
        super()
        this.name = name
        this.modifiers = modifiers
        this.annotations = annotations
        this.extends = _extends
        this.implements = _implements
        this.variable = variable
        this.func = func
    }
}
class enum_tree extends class_tree{
    values: string[]
    constructor(name:string,modifiers:modifiers, annotations:annotation_tree[], values: string[]) {
        super(name,null,null,null,null,modifiers, annotations)
        this.values = values
    }
}
class interface_tree extends class_tree{
    constructor(name:string,modifiers:modifiers, annotations:annotation_tree[],variable:var_tree[],
                values: func_tree[]) {
        super(name,null,null,variable,values,modifiers, annotations)
    }
}
class module_tree extends Tree {
    name:string
    variable:var_tree[]
    func:func_tree[]
    class:class_tree[]
    children:module_tree[]
    constructor(name:string,variable:var_tree[], func:func_tree[], _class:class_tree[], children:module_tree[]) {
        super()
        this.name = name
        this.variable = variable
        this.func = func
        this.class = _class
        this.children = children
    }
}
class import_tree extends Tree{
    name:string
    module:string
    constructor(name:string,module:string) {
        super()
        this.name = name
        this.module = module
    }
}
export {
    annotation_tree,
    modifiers,
    block_tree,
    if_tree,
    while_tree,
    for_tree,
    switch_tree,
    foreach_tree,
    var_tree,
    body,
    func_tree,
    class_tree,
    module_tree,
    import_tree,
    enum_tree,
    interface_tree
}