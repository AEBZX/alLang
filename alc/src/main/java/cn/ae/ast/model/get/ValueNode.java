package cn.ae.ast.model.get;

import cn.ae.ast.model.basic.GetNode;
import cn.ae.ast.types.Type;

public class ValueNode extends GetNode {
    public long value;
    public Type type;
    public ValueNode(long value, Type type) {
        this.value = value;
        this.type = type;
    }
    public static ValueNode create(long value, Type type) {
        return new ValueNode(value,type);
    }
}
