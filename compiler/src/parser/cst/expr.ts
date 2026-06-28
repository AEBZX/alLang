import $ from './lib'
import {token_type} from 'allang-compiler-base'
import {param} from './iden'
import command from './command'
export function primary(){
    return $.o(
        //直接量
        $.v('null'),
        $.v('true'),
        $.v('false'),
        $.t(token_type.number),
        $.t(token_type.string),
        //标识符
        $.t(token_type.identifier),
        //括号表达式
        $.z(()=>$.s($.v('('),expr(),$.v(')'))),
        //数组
        $.z(()=>$.w($.v('['),expr(),$.v(','),$.v(']'))),
        //Map
        $.z(()=>$.w($.v('['),
            $.s($.t(token_type.identifier),$.v(':'),expr()),
            $.v(','),$.v(']'))),
        //lambda
        $.z(()=>$.s(param(),$.v('=>'),$.o(command(),expr())))
    )
}
export function postfix(){
    return $.s(
        primary(),
        $.c(
            $.l($.o(
                //自增自减
                $.v('++'),
                $.v('--'),
                //属性访问
                $.s($.v('.'),$.t(token_type.identifier)),
                $.z(()=>$.s($.v('['),expr(),$.v(']'))),
                //调用
                $.z(()=>$.w($.v('('),expr(),$.v(','),$.v(')')))
            ))
        )
    )
}
export function prefix(){
    return $.s(
        $.c(
            $.o(
                //运算
                $.v('-'),
                $.v('!'),
                $.v('~'),
                //自增自减
                $.v('++'),
                $.v('--'),
                //指针操作
                $.v('&'),
                $.v('*'),
                //new
                $.v('new')
            )
        ),
        postfix()
    )
}
// binary链: base + loop(同层运算符 + base) 确保base匹配失败时O(1)退出,避免组合爆炸
function multi(){
    return $.s(
        prefix(),
        $.l($.s(
            $.o($.v('*'),$.v('/'),$.v('%')),
            prefix()
        ))
    )
}
function add(){
    return $.s(
        multi(),
        $.l($.s(
            $.o($.v('+'),$.v('-')),
            multi()
        ))
    )
}
function shift(){
    return $.s(
        add(),
        $.l($.s(
            $.o($.v('<<'),$.v('>>')),
            add()
        ))
    )
}
function rel(){
    return $.s(
        shift(),
        $.l($.s(
            $.o($.v('<'),$.v('>'),$.v('<='),$.v('>=')),
            shift()
        ))
    )
}
function eq(){
    return $.s(
        rel(),
        $.l($.s(
            $.o($.v('=='),$.v('!=')),
            rel()
        ))
    )
}
function bit(){
    return $.s(
        eq(),
        $.l($.s(
            $.o($.v('&'),$.v('^'),$.v('|')),
            eq()
        ))
    )
}
function lgc(){
    let b=bit()
    return $.o(
        $.z(()=>$.s(b,$.v('&&'),b)),
        $.z(()=>$.s(b,$.v('||'),b)),
        b
    )
}
export function binary(){
    return lgc()
}
export function ternary(){
    return $.z(()=>$.s(binary(),$.v('?'),expr(),$.v(':'),expr()))
}
export default function expr(){
    return $.o(ternary(),binary())
}