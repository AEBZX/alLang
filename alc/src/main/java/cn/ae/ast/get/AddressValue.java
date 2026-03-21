package cn.ae.ast.get;

import cn.ae.ast.init.var.VarNode;
import cn.ae.base.BasicFunc;
import cn.ae.type.Type;

public class AddressValue extends ValueNode{
    public VarNode var;
    public AddressValue(VarNode var) {
        super(BasicFunc.getAddress(var), Type.LONG);
        this.var = var;
    }
    public static AddressValue create(VarNode var) {
        return new AddressValue(var);
    }
}
