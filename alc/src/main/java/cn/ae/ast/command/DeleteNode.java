package cn.ae.ast.command;

import cn.ae.ast.basic.CommandNode;
import cn.ae.ast.init.var.VarNode;

public class DeleteNode extends CommandNode {
    public VarNode var;
    protected DeleteNode(VarNode var) {
        this.var = var;
    }
    public static DeleteNode create(VarNode var) {
        return new DeleteNode(var);
    }
}
