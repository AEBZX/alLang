package cn.ae.ast.get;

import cn.ae.ast.basic.GetNode;
import cn.ae.type.Type;

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
