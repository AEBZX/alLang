package cn.ae.ast.model.get;

import cn.ae.ast.model.basic.GetNode;
import cn.ae.ast.model.init.block.ClassNode;

public class ObjectNode extends GetNode {
    public ClassNode Class;

    protected ObjectNode(ClassNode Class) {
        this.Class = Class;
    }

    public static ObjectNode create(ClassNode Class) {
        return new ObjectNode(Class);
    }
}
