import $ from './lib'
import {token_type} from 'allang-compiler-base'

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
            $.v(','),$.v(']')))
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
function multi(){
    let p=prefix()
    return $.o(
        $.z(()=>$.s(p,$.l($.s($.v('*'),p)))),
        $.z(()=>$.s(p,$.l($.s($.v('/'),p)))),
        $.z(()=>$.s(p,$.l($.s($.v('%'),p)))),
        p
    )
}
function add(){
    let m=multi()
    return $.o(
        $.z(()=>$.s(m,$.l($.s($.v('+'),m)))),
        $.z(()=>$.s(m,$.l($.s($.v('-'),m)))),
        m
    )
}
function shift(){
    let a=add()
    return $.o(
        $.z(()=>$.s(a,$.l($.s($.v('<<'),a)))),
        $.z(()=>$.s(a,$.l($.s($.v('>>'),a)))),
        a
    )
}
function rel(){
    let s=shift()
    return $.o(
        $.z(()=>$.s(s,$.l($.s($.v('<'),s)))),
        $.z(()=>$.s(s,$.l($.s($.v('>'),s)))),
        $.z(()=>$.s(s,$.l($.s($.v('<='),s)))),
        $.z(()=>$.s(s,$.l($.s($.v('>='),s)))),
        s
    )
}
function eq(){
    let r=rel()
    return $.o(
        $.z(()=>$.s(r,$.l($.s($.v('=='),r)))),
        $.z(()=>$.s(r,$.l($.s($.v('!='),r)))),
        r
    )
}
function bit(){
    let e=eq()
    return $.o(
        $.z(()=>$.s(e,$.l($.s($.v('&'),e)))),
        $.z(()=>$.s(e,$.l($.s($.v('^'),e)))),
        $.z(()=>$.s(e,$.l($.s($.v('|'),e)))),
        e
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