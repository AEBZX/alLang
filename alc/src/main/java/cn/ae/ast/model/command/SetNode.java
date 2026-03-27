package cn.ae.ast.model.command;

import cn.ae.ast.model.basic.CommandNode;
import cn.ae.ast.model.basic.GetNode;
import cn.ae.ast.model.init.var.VarNode;

public class SetNode extends CommandNode {
    public GetNode value;
    public VarNode var;

    protected SetNode(GetNode value, VarNode var) {
        this.value = value;
        this.var = var;
    }

    public static SetNode create(GetNode value, VarNode var) {
        return new SetNode(value, var);
    }
}
