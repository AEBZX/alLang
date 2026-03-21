package cn.ae.ast.get;

import cn.ae.ast.basic.GetNode;
import cn.ae.ast.init.block.ClassNode;

public class ObjectNode extends GetNode {
    public ClassNode Class;

    protected ObjectNode(ClassNode Class) {
        this.Class = Class;
    }

    public static ObjectNode create(ClassNode Class) {
        return new ObjectNode(Class);
    }
}
