enum pointer_type {
    address, value
}

enum math_oper_type {
    add, sub, mul, div, mod, shift, right,
    and, or, xor, not, inc, dec
}

enum bool_oper_type {
    equal, not_equal, less, less_equal, greater, greater_equal,
    logic_and, logic_or, logic_not, and, or, not
}

enum basic_type {
    number, string, boolean, void, map
}

//修饰符
enum modifier {
    async, sync, static, public, private
}

export {pointer_type, math_oper_type, bool_oper_type, basic_type}