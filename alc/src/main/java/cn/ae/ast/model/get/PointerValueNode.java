package cn.ae.ast.model.get;

import cn.ae.ast.model.basic.GetNode;
import cn.ae.ast.model.init.var.VarNode;

public class PointerValueNode extends GetNode {
    public VarNode pointer;
    protected PointerValueNode(VarNode pointer) {
        this.pointer = pointer;
    }
    public static PointerValueNode create(VarNode pointer) {
        return new PointerValueNode(pointer);
    }
}
