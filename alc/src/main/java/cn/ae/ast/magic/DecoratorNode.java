package cn.ae.ast.magic;

import cn.ae.ast.basic.CommandNode;
import cn.ae.ast.init.block.FuncNode;
import cn.ae.ast.init.var.VarNode;
import cn.ae.type.Type;

import java.util.ArrayList;
import java.util.List;

public class DecoratorNode extends FuncNode {
    protected DecoratorNode(List<CommandNode> commands, Type RetType, List<VarNode> params, String name) {
        super(commands, RetType, params,new ArrayList<>(), name);
    }
    public static DecoratorNode create(List<CommandNode> commands, Type RetType, List<VarNode> params, String name) {
        return new DecoratorNode(commands, RetType, params, name);
    }
}
