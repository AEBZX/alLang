package cn.ae.ast.model.magic;

import cn.ae.ast.model.basic.CommandNode;
import cn.ae.ast.model.init.block.FuncNode;
import cn.ae.ast.model.init.var.VarNode;
import cn.ae.ast.types.Type;

import java.util.ArrayList;
import java.util.List;

public class DecoratorNode extends FuncNode {
    protected DecoratorNode(List<CommandNode> commands, Type RetType, List<VarNode> params, String name) {
        super(commands, RetType, params,new ArrayList<>(),name,false);
    }
    public static DecoratorNode create(List<CommandNode> commands, Type RetType, List<VarNode> params, String name) {
        return new DecoratorNode(commands, RetType, params, name);
    }
}
