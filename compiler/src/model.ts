enum basic_type{
    boolean,number,string
}
enum tree_type{
    basic_get,object_get,array_get,get,var_get,math_oper_get,bool_oper_get,
    pointer_get,get_param,call_get,identifier_param,set_var,identifier,lambda_get
}
enum pointer_type{
    address, value
}
enum math_oper_type{
    add,sub,mul,div,mod,shift,right,
    and,or,xor,not,inc,dec
}
enum bool_oper_type{
    equal,not_equal,less,less_equal,greater,greater_equal,
    logic_and,logic_or,logic_not
}
export {basic_type,tree_type,pointer_type,math_oper_type,bool_oper_type}