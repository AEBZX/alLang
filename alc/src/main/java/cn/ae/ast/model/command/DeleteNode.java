package cn.ae.ast.model.command;

import cn.ae.ast.model.basic.CommandNode;
import cn.ae.ast.model.init.var.VarNode;

public class DeleteNode extends CommandNode {
    public VarNode var;
    protected DeleteNode(VarNode var) {
        this.var = var;
    }
    public static DeleteNode create(VarNode var) {
        return new DeleteNode(var);
    }
}
