import {Tree} from 'allang-compiler-base'
import {basic_type} from '../model'

class identifier_tree extends Tree {
    key: string
    value: type_tree

    constructor(name: string, value: type_tree) {
        super()
        this.key = name
        this.value = value
    }
}

class type_tree extends Tree {
    constructor() {
        super()
    }
}

class class_type_tree extends type_tree {
    type_name: string
    constructor(type_name: string) {
        super()
        this.type_name = type_name
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
    map_type_tree,
    class_type_tree
}