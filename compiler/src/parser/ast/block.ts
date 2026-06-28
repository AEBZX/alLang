import {ClassTree, EnumTree, FileTree, FunctionTree, ImportTree, ModuleTree, VariableTree} from '../../tree'
import {token, token_type} from 'allang-compiler-base'
import $, {CstStream} from './lib'
import {param, type} from './iden'
import commands from './command'
import expr from './expr'
import {modifier} from '../../base/model'
export function link(){
    return $.l($.r(data => new ImportTree(data[2],data[1]),'link',
        $.w(data=>data.join('.'),$.t('('),$.t(token_type.identifier),$.t('.'),$.t(')')),
        'as',token_type.identifier
    ))
}
export function mod(){
    return $.r(data=>{
        return new modifier(data.includes('public'),data.includes('async'),data.includes('static'))
    },$.l($.o(
        $.t('static'),
        $.t('async'),
        $.t('public'),
        $.t('private'),
        $.t('unstatic'),
        $.t('sync')
    )))
}
export function block(){
    return $.r(data=> {
    },$.r(data => {return {mod:data[0],name:data[1]}},mod(),token_type.identifier),
        $.o(module_block(),class_block(),enum_block(),interface_block(),var_block(),function_block()))
}
export function module_block(){
    return $.r(data=>new ModuleTree(null,data[1],null),'module',$.l($.z(()=>block())))
}
export function class_block(){
    return $.r(data=>new ClassTree(null,data[2],null,data[1]),
        'class',$.c($.r(data=>data[1],'implements',
            $.w(data=>data.join(','),$.t('('),$.t(token_type.identifier),$.t(','),$.t(')'))
            )),$.l($.z(()=>block())))
}
export function interface_block(){
    return $.r(data=>new ClassTree(null,data[2],null,data[1]),
        'interface',$.c($.r(data=>data[1],'of',
            $.w(data=>data.join(','),$.t('('),$.t(token_type.identifier),$.t(','),$.t(')'))
            )),$.l($.z(()=>block())))
}
export function enum_block(){
    return $.r(data=>new EnumTree(null,data[1],null),
        $.w(data=>data,$.t('{'),$.t(token_type.identifier),$.t(','),$.t('}')))
}
export function var_block(){
    return $.r(data=>new VariableTree(null,data[1],data[2],null),
        $.r(data=>data[1],token_type.identifier),
        $.c($.r(data=>data[1],'='),expr()))
}
export function function_block(){
    return $.r(data =>new FunctionTree(null,data[1],data[3],null,data[2])
        ,'function',type(),param(),$.o(commands(),$.r((data)=>null,';')))
}
export default function entry(c:CstStream){
    let a=$.r(data => new FileTree(data[0],data[1]),link(),block())
    a.stream=c
    return a.exec()
}