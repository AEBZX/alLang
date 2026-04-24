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
class modifiers {
    static: boolean
    async: boolean
    private: boolean
    final: boolean

    constructor(_static: boolean, _async: boolean, _private: boolean, _final: boolean) {
        this.static = _static
        this.async = _async
        this.private = _private
        this.final = _final
    }
}

//单纯的block
class block_tree extends Tree {
    commands: block_tree[]

    constructor(commands: block_tree[]) {
        super()
        this.commands = commands
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
class body extends Tree {
    name: string
    commands: block_tree
    modifiers: modifiers
    annotations: annotation_tree[]

    constructor(name: string, commands: block_tree, modifiers: modifiers, annotations: annotation_tree[]) {
        super()
        this.name = name
        this.commands = commands
        this.modifiers = modifiers
        this.annotations = annotations
    }
}

class space_tree extends Tree {
    modifiers: modifiers
    annotations: annotation_tree[]
    name: string
    children: space_tree[]

    constructor(name: string, modifiers: modifiers, annotations: annotation_tree[]) {
        super()
        this.name = name
        this.modifiers = modifiers
        this.annotations = annotations
        this.children = []
    }
}

class func_tree extends space_tree {
    params: param_identifier_tree
    return_type: type_tree
    commands: block_tree

    constructor(name: string, commands: block_tree, modifiers: modifiers, annotations: annotation_tree[],
                params: param_identifier_tree, return_type: type_tree) {
        super(name, modifiers, annotations)
        this.params = params
        this.commands = commands
        this.return_type = return_type
    }
}

class var_tree extends space_tree {
    value: get_tree
    var_type: type_tree

    constructor(name: string, var_type: type_tree, modifiers: modifiers, annotations: annotation_tree[], value: get_tree) {
        super(name, modifiers, annotations)
        this.var_type = var_type
        this.value = value
    }
}

class class_tree extends space_tree {
    implements: string

    constructor(name: string, _extends: string, _implements: string,
                modifiers: modifiers, annotations: annotation_tree[]) {
        super(name, modifiers, annotations)
        this.implements = _implements
    }
}

class enum_tree extends class_tree {
    values: string[]

    constructor(name: string, modifiers: modifiers, annotations: annotation_tree[], values: string[]) {
        super(name, null, null, modifiers, annotations)
        this.values = values
    }
}

class interface_tree extends class_tree {
    func: func_tree[]

    constructor(name: string, func: func_tree[], modifiers: modifiers, annotations: annotation_tree[]) {
        super(name, null, null, modifiers, annotations)
        this.func = func
    }
}

class module_tree extends space_tree {
    constructor(name: string, modifiers: modifiers, annotations: annotation_tree[]) {
        super(name, modifiers, annotations)
    }
}

class import_tree extends Tree {
    name: string
    module: string

    constructor(name: string, module: string) {
        super()
        this.name = name
        this.module = module
    }
}

export {
    annotation_tree,
    modifiers,
    block_tree,
    var_tree,
    body,
    func_tree,
    class_tree,
    module_tree,
    import_tree,
    enum_tree,
    interface_tree,
    space_tree
}