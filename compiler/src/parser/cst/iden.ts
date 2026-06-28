import $ from './lib'
import {token_type} from 'allang-compiler-base'

export function basic_type(){
    return $.o(
        $.v('number'),
        $.v('string'),
        $.v('boolean'),
        $.v('void'),
        $.w($.v('('),$.t(token_type.identifier),$.v('.'),$.v(')'))
    )
}
export function pack_type(){
    return $.s(
        basic_type(),
        $.c(
            $.l($.o(
                $.v('[]'),
                $.s($.v('{'),$.v('}')),
                $.v('*')
            ))
        )
    )
}
export function lambda_type(){
    return $.s(
        param(),
        $.v('=>'),
        type()
    )
}
export function type(){
    return $.o(
        $.z(()=>$.s(
            $.v('('),
            type(),
            $.v(')')
        )),
        $.z(()=>lambda_type()),
        pack_type()
    )
}
export function param(){
    return $.w(
        $.v('('),
        $.s(
            $.t(token_type.identifier),
            $.v(':'),
            type()
        ),
        $.v(','),
        $.v(')')
    )
}