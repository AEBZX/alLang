import $ from './lib'
import {token_type} from 'allang-compiler-base'
import expr from './expr'

//辅助函数
function assign(list:string[]){
    let e=expr()
    let l=[]
    for(let i of list)
        l.push($.z(()=>$.s(e,$.v(i),e)))
    return $.o(...l)
}
export function basic_command(){
    return $.s(stmt_body(),$.v(';'))
}
function stmt_body(){
    return $.o(
        //赋值
        assign([
            '=',
            '+=',
            '-=',
            '*=',
            '/=',
            '%=',
            '<<=',
            '>>=',
            '&=',
            '^=',
            '|='
        ]),
        $.s($.v('return'),$.c(expr())),
        $.v('continue'),
        $.v('break'),
        //调用
        $.s($.c($.v('await')),expr()),
        //自增自减
        $.s($.v('++'),expr()),
        $.s($.v('--'),expr()),
        $.s(expr(),$.v('++')),
        $.s(expr(),$.v('--')),
        //throw
        $.s($.v('throw'),expr()),
        //vm嵌入
        $.s($.v('vm'),$.t(token_type.string)),
        //变量定义
        $.s($.v('var'),$.t(token_type.identifier),$.c($.s($.v('='),expr())))
    )
}
//辅助函数
function cond(){
    return $.s($.v('('),expr(),$.v(')'))
}
export function block_command(){
    return $.o(
        //if(可选的else)
        $.s($.v('if'),cond(),command(),$.c($.s($.v('else'),command()))),
        //while
        $.s($.v('while'),cond(),command()),
        //do-while
        $.s($.v('do'),command(),$.v('while'),cond()),
        //for
        $.s($.v('for'),$.s($.v('('),stmt_body(),$.v(';'),$.c(expr()),$.v(';'),stmt_body(),$.v(')'),command())),
        //switch
        $.s($.v('switch'),cond(),$.s(
            $.v('{'),
            $.c($.l(
                $.s($.v('case'),expr(),$.v('=>'),$.l(command()))
            )),
            $.c($.s($.v('default'),$.v('=>'),$.l(command()))),
            $.v('}')
        )),
        //foreach
        $.s($.v('foreach'),$.s($.v('('),$.t(token_type.identifier),$.v('in'),expr(),$.v(')')
            ,command())),
        //try-catch-finally(catch和finally至少一个)
        $.s($.v('try'),command(),
            $.o(
                $.s($.v('catch'),$.s($.v('('),$.t(token_type.identifier),$.v(')'),command()),
                    $.c($.s($.v('finally'),command()))),
                $.s($.v('finally'),command())
            ))
    )
}
export function command(){
    return $.o(
        $.z(()=>$.s($.v('{'),$.l(command()),$.v('}'))),
        basic_command(),
        $.z(()=>block_command())
    )
}
export default command