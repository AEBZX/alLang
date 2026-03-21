package cn.ae.ast.get;

import cn.ae.ast.basic.GetNode;
import cn.ae.ast.init.block.ClassNode;
import cn.ae.ast.init.var.VarNode;

public class PointerValueNode extends GetNode {
    public VarNode pointer;
    protected PointerValueNode(VarNode pointer) {
        this.pointer = pointer;
    }
    public static PointerValueNode create(VarNode pointer) {
        return new PointerValueNode(pointer);
    }
}
