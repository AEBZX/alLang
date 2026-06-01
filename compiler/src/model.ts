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
    number, string, boolean, void_, map, array, type_, any_
}

enum modifier {
    public_, private_, async_, sync_, static_, unstatic_
}

export {pointer_type, math_oper_type, bool_oper_type, basic_type, modifier}