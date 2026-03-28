package cn.ae.ast.model.init.block;

import cn.ae.ast.model.basic.CommandNode;
import cn.ae.ast.model.basic.ListNode;
import cn.ae.ast.model.init.var.VarNode;
import cn.ae.ast.model.magic.DecoratorNode;
import cn.ae.ast.types.Type;

import java.util.List;

public class FuncNode extends ListNode {
    public Type RetType;
    public List<VarNode> params;
    public List<DecoratorNode> decorator;
    public String name;
    public boolean async;

    protected FuncNode(List<CommandNode> commands, Type RetType, List<VarNode> params, List<DecoratorNode> decorator, String name, boolean async) {
        super(commands);
        this.RetType = RetType;
        this.params = params;
        this.name = name;
        this.decorator = decorator;
        this.async = async;
    }

    public static FuncNode create(List<CommandNode> commands, Type RetType, List<VarNode> params, List<DecoratorNode> decorator, String name, boolean async) {
        return new FuncNode(commands, RetType, params,decorator, name, async);
    }
}
