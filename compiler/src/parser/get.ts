import {
    bool_oper_get_tree,
    call_get_tree,
    chain_get_tree,
    get_node_tree,
    get_tree,
    math_oper_get_tree,
    number_get_tree,
    param_call_tree, pointer_get_tree
} from '../tree'
import {
    Match,
    orMatch,
    sequenceMatch,
    token,
    token_type,
    tokenNameMatch,
    tokenTypeMatch,
    Tree,
    whileMatch
} from 'allang-compiler-base'
import {array_data_get_tree} from '../tree/get'
import {bool_oper_type, math_oper_type, pointer_type} from '../model'
//三元运算符
class TernaryMatch extends sequenceMatch {
    constructor(tokens:token[]) {
        super((t:(token|Tree)[])=>{
                return new get_node_tree(
                    new bool_oper_get_tree(bool_oper_type.logic_or,<get_node_tree>t[0],<get_node_tree>t[1]))
            },new BinaryMatch(tokens),
            new tokenNameMatch(tokens,'?'),
            new BinaryMatch(tokens),new tokenNameMatch(tokens,':'),new BinaryMatch(tokens))
    }
}
//因为有循环引用,空实现
class GetMatch extends TernaryMatch {
    constructor(tokens:token[]) {
        super(tokens)
    }
}
class PrimaryMatch extends orMatch{
    constructor(tokens:token[]) {
        super(new ValueMatch( tokens),
            new ParenthesesMatch( tokens),
            new ArrayMatch( tokens),
            new VariableMatch( tokens))
    }
}
//字面量
class ValueMatch extends orMatch{
    constructor(tokens:token[]) {
        super(new tokenTypeMatch(tokens,token_type.number),
            new tokenTypeMatch(tokens,token_type.string),
            new tokenNameMatch(tokens,'null'),
            new tokenNameMatch(tokens,'true'),
            new tokenNameMatch(tokens,'false'))
    }
}
//括号表达式
class ParenthesesMatch extends sequenceMatch {
    constructor(tokens:token[]) {
        super((t:(token|Tree)[])=>{
            return t[1]
        },new tokenNameMatch(tokens,'('),new GetMatch(tokens),new tokenNameMatch(tokens,')'))
    }
}
//数组字面量
class ArrayMatch extends sequenceMatch {
    constructor(tokens:token[]) {
        super((t:(token|Tree)[])=>{
            t=t.filter((t:token|Tree)=>!(t instanceof token))
            return t[0]
        },new tokenNameMatch(tokens,'['),
            new whileMatch((t:(token|Tree)[])=>{
                t=t.filter((t:token|Tree)=>!(t instanceof token))
                return new array_data_get_tree(t as get_node_tree[])
            },new GetMatch(tokens),new tokenNameMatch(tokens,','))
            ,new tokenNameMatch(tokens,']'))
    }
}
//变量
class VariableMatch extends tokenTypeMatch{
    constructor(tokens:token[]) {
        super(tokens,token_type.identifier)
    }
}
//后缀操作
class PostfixMatch extends orMatch{
    constructor(tokens:token[]) {
        super(new IncMatch( tokens),
            new DecMatch( tokens),
            new FuncCallMatch( tokens),
            new ChildrenMatch( tokens))
    }
}
class ChildrenMatch extends whileMatch{
    constructor(tokens:token[]) {
        super((t:(token|Tree)[])=>{
            t=t.filter((t:token|Tree)=>!(t instanceof token))
            return new chain_get_tree(<get_node_tree[]>t)
        },new orMatch(new PostfixMatch( tokens),new PrimaryMatch( tokens)),new tokenNameMatch(tokens,'.'))
    }
}
class IncMatch extends sequenceMatch {
    constructor(tokens:token[]) {
        super((t:(token|Tree)[])=>{
            return new math_oper_get_tree(math_oper_type.add,t[0],new number_get_tree(1))
        },new PrimaryMatch(tokens),new tokenNameMatch(tokens,'++'))
    }
}
class DecMatch extends sequenceMatch {
    constructor(tokens:token[]) {
        super((t:(token|Tree)[])=>{
            return new math_oper_get_tree(math_oper_type.sub,t[0],new number_get_tree(1))
        },new PrimaryMatch(tokens),new tokenNameMatch(tokens,'--'))
    }
}
class FuncCallMatch extends sequenceMatch {
    constructor(tokens:token[]) {
        super((t:(token|Tree)[])=>{
            return null
        },new PostfixMatch(tokens),new tokenNameMatch(tokens,'('),
            new whileMatch((t:(token|Tree)[])=>{
                t=t.filter((t:token|Tree)=>!(t instanceof token))
                return new call_get_tree(<get_node_tree>t[0],
                    new param_call_tree(<get_node_tree[]>t))
            },new GetMatch(tokens),new tokenNameMatch(tokens,','))
            ,new tokenNameMatch(tokens,')'))
    }
}
class UnaryMatch extends orMatch{
    constructor(tokens:token[]) {
        super(new PointerAddressMatch( tokens),
            new NegativeMatch( tokens),
            new LogicNotMatch( tokens),
            new BitNotMatch( tokens),
            new PointerValueMatch( tokens))
    }

}
class PointerAddressMatch extends sequenceMatch {
    constructor(tokens:token[]) {
        super((t:(token|Tree)[])=>{
            return new pointer_get_tree(pointer_type.address,t[0])
        },new tokenNameMatch(tokens,'&'),new UnaryMatch(tokens))
    }
}
class PointerValueMatch extends sequenceMatch {
    constructor(tokens:token[]) {
        super((t:(token|Tree)[])=>{
            return new pointer_get_tree(pointer_type.value,t[0])
        },new tokenNameMatch(tokens,'*'),new UnaryMatch(tokens))
    }
}
//负数
class NegativeMatch extends sequenceMatch {
    constructor(tokens:token[]) {
        super((t:(token|Tree)[])=>{
            return new math_oper_get_tree(math_oper_type.sub,new number_get_tree(0),t[0])
        },new tokenNameMatch(tokens,'-'),new UnaryMatch(tokens))
    }
}
//逻辑非
class LogicNotMatch extends sequenceMatch {
    constructor(tokens:token[]) {
        super((t:(token|Tree)[])=>{
            return new math_oper_get_tree(math_oper_type.not,t[0],null)
        },new tokenNameMatch(tokens,'!'),new UnaryMatch(tokens))
    }
}
//按位取反
class BitNotMatch extends sequenceMatch {
    constructor(tokens:token[]) {
        super((t:(token|Tree)[])=>{
            return new math_oper_get_tree(math_oper_type.xor,t[0],null)
        },new tokenNameMatch(tokens,'~'),new UnaryMatch(tokens))
    }
}
class BinaryMatch extends orMatch{
    constructor(tokens:token[]) {
        super(new AddMatch( tokens),
            new SubMatch( tokens),
            new MulMatch( tokens),
            new DivMatch( tokens),
            new ModMatch( tokens),
            new ShiftLeftMatch( tokens),
            new ShiftRightMatch( tokens),
            new LogicAndMatch( tokens),
            new LogicOrMatch( tokens),
            new LogicXorMatch( tokens),
            new EqualMatch( tokens),
            new GreaterMatch( tokens),
            new LessMatch( tokens),
            new GreaterEqualMatch( tokens),
            new LessEqualMatch( tokens),
            new LogicAndShortMatch( tokens),
            new LogicOrShortMatch( tokens),
            new NotEqualMatch( tokens))
    }
}
class AddMatch extends sequenceMatch {
    constructor(tokens:token[]) {
        super((t:(token|Tree)[])=>{
            return new math_oper_get_tree(math_oper_type.add,t[0],t[1])
        },new UnaryMatch(tokens),new tokenNameMatch(tokens,'+'),new UnaryMatch(tokens))
    }
}
class SubMatch extends sequenceMatch {
    constructor(tokens:token[]) {
        super((t:(token|Tree)[])=>{
            return new math_oper_get_tree(math_oper_type.sub,t[0],t[1])
        },new UnaryMatch(tokens),new tokenNameMatch(tokens,'-'),new UnaryMatch(tokens))
    }
}
class MulMatch extends sequenceMatch {
    constructor(tokens:token[]) {
        super((t:(token|Tree)[])=>{
            return new math_oper_get_tree(math_oper_type.mul,t[0],t[1])
        },new BinaryMatch(tokens),new tokenNameMatch(tokens,'*'),new BinaryMatch(tokens))
    }
}
class DivMatch extends sequenceMatch {
    constructor(tokens:token[]) {
        super((t:(token|Tree)[])=>{
            return new math_oper_get_tree(math_oper_type.div,t[0],t[1])
        },new BinaryMatch(tokens),new tokenNameMatch(tokens,'/'),new BinaryMatch(tokens))
    }
}
class ModMatch extends sequenceMatch {
    constructor(tokens:token[]) {
        super((t:(token|Tree)[])=>{
            return new math_oper_get_tree(math_oper_type.mod,t[0],t[1])
        },new BinaryMatch(tokens),new tokenNameMatch(tokens,'%'),new BinaryMatch(tokens))
    }
}
class ShiftLeftMatch extends sequenceMatch {
    constructor(tokens:token[]) {
        super((t:(token|Tree)[])=>{
            return new math_oper_get_tree(math_oper_type.shift,t[0],t[1])
        },new BinaryMatch(tokens),new tokenNameMatch(tokens,'<<'),new BinaryMatch(tokens))
    }
}
class ShiftRightMatch extends sequenceMatch {
    constructor(tokens:token[]) {
        super((t:(token|Tree)[])=>{
            return new math_oper_get_tree(math_oper_type.right,t[0],t[1])
        },new BinaryMatch(tokens),new tokenNameMatch(tokens,'>>'),new BinaryMatch(tokens))
    }
}
class LogicAndMatch extends sequenceMatch {
    constructor(tokens:token[]) {
        super((t:(token|Tree)[])=>{
            return new math_oper_get_tree(math_oper_type.and,t[0],t[1])
        },new BinaryMatch(tokens),new tokenNameMatch(tokens,'&'),new BinaryMatch(tokens))
    }
}
class LogicOrMatch extends sequenceMatch {
    constructor(tokens:token[]) {
        super((t:(token|Tree)[])=>{
            return new math_oper_get_tree(math_oper_type.or,t[0],t[1])
        },new BinaryMatch(tokens),new tokenNameMatch(tokens,'|'),new BinaryMatch(tokens))
    }
}
class LogicXorMatch extends sequenceMatch {
    constructor(tokens:token[]) {
        super((t:(token|Tree)[])=>{
            return new math_oper_get_tree(math_oper_type.xor,t[0],t[1])
        },new BinaryMatch(tokens),new tokenNameMatch(tokens,'^'),new BinaryMatch(tokens))
    }
}
class EqualMatch extends sequenceMatch {
    constructor(tokens:token[]) {
        super((t:(token|Tree)[])=>{
            return new bool_oper_get_tree(bool_oper_type.equal,<get_node_tree>t[0],<get_node_tree>t[1])
        },new BinaryMatch(tokens),new tokenNameMatch(tokens,'=='),new BinaryMatch(tokens))
    }
}
class NotEqualMatch extends sequenceMatch {
    constructor(tokens:token[]) {
        super((t:(token|Tree)[])=>{
            return new bool_oper_get_tree(bool_oper_type.not_equal,<get_node_tree>t[0],<get_node_tree>t[1])
        },new BinaryMatch(tokens),new tokenNameMatch(tokens,'!='),new BinaryMatch(tokens))
    }
}
class GreaterMatch extends sequenceMatch {
    constructor(tokens:token[]) {
        super((t:(token|Tree)[])=>{
            return new bool_oper_get_tree(bool_oper_type.greater,<get_node_tree>t[0],<get_node_tree>t[1])
        },new BinaryMatch(tokens),new tokenNameMatch(tokens,'>'),new BinaryMatch(tokens))
    }
}
class GreaterEqualMatch extends sequenceMatch {
    constructor(tokens:token[]) {
        super((t:(token|Tree)[])=>{
            return new bool_oper_get_tree(bool_oper_type.greater_equal,<get_node_tree>t[0],<get_node_tree>t[1])
        },new BinaryMatch(tokens),new tokenNameMatch(tokens,'>='),new BinaryMatch(tokens))
    }
}
class LessMatch extends sequenceMatch {
    constructor(tokens:token[]) {
        super((t:(token|Tree)[])=>{
            return new bool_oper_get_tree(bool_oper_type.less,<get_node_tree>t[0],<get_node_tree>t[1])
        },new BinaryMatch(tokens),new tokenNameMatch(tokens,'<'),new BinaryMatch(tokens))
    }
}
class LessEqualMatch extends sequenceMatch {
    constructor(tokens:token[]) {
        super((t:(token|Tree)[])=>{
            return new bool_oper_get_tree(bool_oper_type.less_equal,<get_node_tree>t[0],<get_node_tree>t[1])
        },new BinaryMatch(tokens),new tokenNameMatch(tokens,'<='),new BinaryMatch(tokens))
    }
}
//短路
class LogicAndShortMatch extends sequenceMatch {
    constructor(tokens:token[]) {
        super((t:(token|Tree)[])=>{
            return new bool_oper_get_tree(bool_oper_type.logic_and,<get_node_tree>t[0],<get_node_tree>t[1])
        },new BinaryMatch(tokens),new tokenNameMatch(tokens,'&&'),new BinaryMatch(tokens))
    }
}
class LogicOrShortMatch extends sequenceMatch {
    constructor(tokens:token[]) {
        super((t:(token|Tree)[])=>{
            return new bool_oper_get_tree(bool_oper_type.logic_or,<get_node_tree>t[0],<get_node_tree>t[1])
        },new BinaryMatch(tokens),new tokenNameMatch(tokens,'||'),new BinaryMatch(tokens))
    }
}