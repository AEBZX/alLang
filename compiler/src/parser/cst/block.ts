import $ from './lib'
import {token_type, TokenStream} from 'allang-compiler-base'
import expr from './expr'
import command from './command'
import {param, type} from './iden'

export function link(){
    return $.c($.l(
        $.s(
            $.v('link'),
            $.c($.w($.v('('),$.t(token_type.identifier),$.v('.'),$.v(')'))),
            $.v('as'),
            $.t(token_type.identifier),
            $.v(';')
        )
    ))
}
//辅助函数
export function modifier(){
    return $.c($.l(
        $.o(
            $.v('public'),
            $.v('private'),
            $.v('static'),
            $.v('unstatic'),
            $.v('async'),
            $.v('sync')
        )
    ))
}
export function block(){
    return $.s(
        $.v('{'),
        $.l(
            $.s(
                modifier(),
                $.t(token_type.identifier),
                $.v(':'),
                $.o(
                    $.z(()=>function_block()),
                    $.z(()=>var_block()),
                    $.z(()=>class_block()),
                    $.z(()=>enum_block()),
                    $.z(()=>interface_block()),
                    $.z(()=>module_block())
                )
            )
        ),
        $.v('}')
    )
}
export function function_block(){
    return $.s(
        $.v('function'),
        type(),
        param(),
        command()
    )
}
export function var_block(){
    return $.s(
        $.v('var'),
        type(),
        $.c(
            $.s(
                $.v('='),
                expr()
            )
        ),
        $.v(';')
    )
}
export function class_block(){
    return $.s(
        $.v('class'),
        $.c(
            $.s(
                $.v('implements'),
                $.w($.v('('),$.t(token_type.identifier),$.v(','),$.v(')'))
            )
        ),
        block()
    )
}
export function enum_block(){
    return $.s(
        $.v('enum'),
        $.w($.v('{'),$.t(token_type.identifier),$.v(','),$.v('}'))
    )
}
export function interface_block(){
    return $.s(
        $.v('interface'),
        $.c(
            $.s(
                $.v('of'),
                $.w($.v('('),$.t(token_type.identifier),$.v(','),$.v(')'))
            )
        ),
        block()
    )
}
export function module_block(){
    return $.s(
        $.v('module'),
        block()
    )
}
export default function(tool:TokenStream){
    return $.seq(
        tool,
        link(),
        $.s(
            modifier(),
            $.t(token_type.identifier),
            $.v(':'),
            module_block()
        )
    )
}