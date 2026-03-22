package cn.ae.ast.get;

import cn.ae.ast.basic.GetNode;

public class MathNode extends GetNode{
    public GetNode value1;
    public GetNode value2;
    public Math type;
    protected MathNode(GetNode value1, GetNode value2, Math type) {
        this.value1 = value1;
        this.value2 = value2;
        this.type = type;
    }
    public static MathNode create(GetNode value1, GetNode value2, Math type) {
        return new MathNode(value1, value2, type);
    }
}