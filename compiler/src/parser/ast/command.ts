import {
    AddSetTree, AndSetTree, BreakTree, CallTree, CommandTree, ContinueTree, DecrementTree,
    DivSetTree, ExprLambdaTree, ExprTree, ForeachTree, ForTree, IfTree, IncrementTree, ListTree,
    ModSetTree,
    MulSetTree, OrSetTree, ReturnTree,
    SetTree,
    ShiftLeftSetTree,
    ShiftRightSetTree,
    SubSetTree, SwitchTree, ThrowTree, TryTree, VarTree, VMTree, WhileTree, XorSetTree
} from '../../tree'
import {token, token_type} from 'allang-compiler-base'
import $ from './lib'
import expr from './expr'
import {param,type} from './iden'
export function stmt_body(){
    return $.o(
        //赋值
        $.r(data => {
            switch (data[1].name){
                case '=':
                    return new SetTree(data[0],data[2])
                case '+=':
                    return new AddSetTree(data[0],data[2])
                case '-=':
                    return new SubSetTree(data[0],data[2])
                case '*=':
                    return new MulSetTree(data[0],data[2])
                case '/=':
                    return new DivSetTree(data[0],data[2])
                case '%=':
                    return new ModSetTree(data[0],data[2])
                case '<<=':
                    return new ShiftLeftSetTree(data[0],data[2])
                case '>>=':
                    return new ShiftRightSetTree(data[0],data[2])
                case '&=':
                    return new AndSetTree(data[0],data[2])
                case '^=':
                    return new XorSetTree(data[0],data[2])
                case '|=':
                    return new OrSetTree(data[0],data[2])
            }
        },expr(),$.o(
            $.t('='),
            $.t('+='),
            $.t('-='),
            $.t('*='),
            $.t('/='),
            $.t('%='),
            $.t('<<='),
            $.t('>>='),
            $.t('&='),
            $.t('^='),
            $.t('|=')

        ),expr()),
        $.r(data => new ReturnTree(data[1]||null),'return',$.c(expr())),
        $.r(data => new BreakTree(),'break'),
        $.r(data => new ContinueTree(),'continue'),
        //调用
        $.r(data=>new CallTree(data[1],data[0]!=null),$.c($.t('await')),expr()),
        $.r(data=>new IncrementTree(data[0]),expr(),'++'),
        $.r(data=>new DecrementTree(data[0]),expr(),'--'),
        $.r(data=>new IncrementTree(data[0]),'++',expr()),
        $.r(data=>new DecrementTree(data[0]),'--',expr()),
        $.r(data=>new ThrowTree(data[1]),'throw',expr()),
        $.r(data=>new VMTree(data[1].name),'vm',token_type.string),
        $.r(data=>new VarTree(data[1].name,data[2]),'var',token_type.identifier,
            $.r(data => data[1],'=',expr()))
    )
}
export function basic_command(){
    return $.r(data=>data[0],stmt_body(),';')
}
export function cond(){
    return $.r(data=>data[1],'(',expr(),')')
}
export default function commands(){
    return $.o(
        $.r(data=>new ListTree(data[1]),'{',$.l($.z(()=>commands())),'}'),
        basic_command(),
        $.z(()=>block_command())
    )
}
export function block_command(){
    return $.o(
        $.r(data => new IfTree(data[1],data[2],data[3]),'if',cond(),commands(),
            $.c($.r(data=>data[1],'else',commands()))),
        $.r(data => new WhileTree(data[1],data[2],false),'while',cond(),commands()),
        $.r(data=>new WhileTree(data[3],data[1],true),'do',commands(),'while',cond(),';'),
        $.r(data=>new ForTree(data[2],data[3],data[4],data[6]),
            'for','(',$.l(basic_command()),expr(),$.l(basic_command()),')',commands()),
        $.r(data=>new ForeachTree(data[2].name,data[4],data[6]),
            'foreach','(',token_type.identifier,':',expr(),')',commands()),
        $.r(data=>new SwitchTree(data[1],data[2],data[3]),
            'switch',cond(),$.l($.r(
                data=>{return {condition:data[1],call:data[3]}},
                'case',expr(),'=>',commands()
            )),$.c($.r(data => data[2],'default','=>',commands()))),
        $.r(data=>new TryTree(data[1],data[3],data[4]),
            'try',commands(),'catch',
            $.r(data => new ExprLambdaTree(data[0],data[2],data[4]),param(),':',type(),'=>',commands()),
            $.c($.r(data => data[1],'finally',commands())))
    )
}