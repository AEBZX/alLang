import {get_tree, get_node_tree, lambda_get_tree} from './get'
import {param_call_tree, param_identifier_tree} from './param'
import {command_tree} from './command'
import {type_tree} from './identifier'
import {Tree} from 'allang-compiler-base'

// 注解 @name(params)
class annotation_tree extends Tree {
    name: string
    value: param_call_tree

    constructor(name: string, value: param_call_tree) {
        super()
        this.name = name
        this.value = value
    }
}

// 修饰符
class modifiers {
    public: boolean
    private: boolean
    async: boolean
    sync: boolean
    static: boolean
    unstatic: boolean
    final: boolean

    constructor() {
        this.public = true       // 默认 public
        this.private = false
        this.async = false
        this.sync = true         // 默认 sync
        this.static = false
        this.unstatic = true     // 默认 unstatic (非函数忽略)
        this.final = false
    }
}

// 代码块 — { commands }
class block_tree extends Tree {
    commands: command_tree[]

    constructor(commands: command_tree[]) {
        super()
        this.commands = commands
    }
}

// try-catch-finally
class try_tree extends block_tree {
    catch: lambda_get_tree
    finally: command_tree[]

    constructor(block: command_tree[], catch_block: lambda_get_tree, finally_block: command_tree[]) {
        super(block)
        this.catch = catch_block
        this.finally = finally_block
    }
}

// body 类 — 兼容旧代码
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

// 命名空间块 — 格式: modifier name:block_def
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

// 函数 — function returnType params { commands }
class func_tree extends space_tree {
    params: param_identifier_tree
    return_type: type_tree
    commands: command_tree[]
    is_definition_only: boolean  // 仅声明，无函数体

    constructor(name: string, commands: command_tree[], modifiers: modifiers, annotations: annotation_tree[],
                params: param_identifier_tree, return_type: type_tree) {
        super(name, modifiers, annotations)
        this.params = params
        this.commands = commands
        this.return_type = return_type
        this.is_definition_only = false
    }
}

// 变量 — var of type = value;
class var_tree extends space_tree {
    value: get_tree
    var_type: type_tree

    constructor(name: string, var_type: type_tree, modifiers: modifiers, annotations: annotation_tree[], value: get_tree) {
        super(name, modifiers, annotations)
        this.var_type = var_type
        this.value = value
    }
}

// 常量 — const of type = value;
class const_tree extends space_tree {
    value: get_tree
    const_type: type_tree

    constructor(name: string, const_type: type_tree, modifiers: modifiers, annotations: annotation_tree[], value: get_tree) {
        super(name, modifiers, annotations)
        this.const_type = const_type
        this.value = value
    }
}

// 类 — class implements interfaceName { blocks }
class class_tree extends space_tree {
    implements: string

    constructor(name: string, implements_name: string,
                modifiers: modifiers, annotations: annotation_tree[]) {
        super(name, modifiers, annotations)
        this.implements = implements_name || 'Lang.ObjectInterface'
        if(name=='ObjectInterface'||name=='Lang.ObjectInterface')this.implements=''
    }
}

// 枚举 — enum { name1, name2, ... }
class enum_tree extends space_tree {
    values: string[]

    constructor(name: string, modifiers: modifiers, annotations: annotation_tree[], values: string[]) {
        super(name, modifiers, annotations)
        this.values = values
    }
}

// 接口 — interface of interfaceName { func_decls }
class interface_tree extends space_tree {
    of: string
    func: func_tree[]

    constructor(name: string, of_name: string, func: func_tree[], modifiers: modifiers, annotations: annotation_tree[]) {
        super(name, modifiers, annotations)
        this.of = of_name || 'Lang.ObjectInterface'
        if(name=='ObjectInterface'||name=='Lang.ObjectInterface')this.of=''
        this.func = func
    }
}

// 模块 — module { blocks }
class module_tree extends space_tree {
    constructor(name: string, modifiers: modifiers, annotations: annotation_tree[]) {
        super(name, modifiers, annotations)
    }
}

// import
class import_tree extends Tree {
    name: string
    module: string

    constructor(name: string, module: string) {
        super()
        this.name = name
        this.module = module
    }
}

// 文件根
class file_tree extends space_tree {
    imports: import_tree[]
    spaces: space_tree[]

    constructor(imports: import_tree[], spaces: space_tree[]) {
        super(null, null, null)
        this.imports = imports
        this.spaces = spaces
    }
}

export {
    annotation_tree,
    modifiers,
    block_tree,
    var_tree,
    const_tree,
    body,
    func_tree,
    class_tree,
    module_tree,
    import_tree,
    enum_tree,
    interface_tree,
    space_tree,
    try_tree,
    file_tree
}