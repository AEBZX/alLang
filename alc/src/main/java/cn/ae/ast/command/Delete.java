package cn.ae.ast.command;

import cn.ae.ast.init.var.VarNode;

public class Delete {
    public VarNode var;
    protected Delete(VarNode var) {
        this.var = var;
    }
    public static Delete create(VarNode var) {
        return new Delete(var);
    }
}
