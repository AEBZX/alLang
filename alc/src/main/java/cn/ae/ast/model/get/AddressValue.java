package cn.ae.ast.model.get;

import cn.ae.ast.model.init.var.VarNode;
import cn.ae.base.BasicFunc;
import cn.ae.ast.types.Type;

public class AddressValue extends ValueNode{
    public VarNode var;
    public AddressValue(VarNode var, long address) {
        super(address, Type.LONG);
        this.var = var;
    }
    public static AddressValue create(VarNode var, long address) {
        return new AddressValue(var,address);
    }
}
