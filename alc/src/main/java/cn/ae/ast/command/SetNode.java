package cn.ae.ast.command;

import cn.ae.ast.basic.CommandNode;
import cn.ae.ast.basic.GetNode;
import cn.ae.ast.init.VarNode;

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
