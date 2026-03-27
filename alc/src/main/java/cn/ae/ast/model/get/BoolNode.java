package cn.ae.ast.model.get;

import cn.ae.ast.model.basic.GetNode;
import cn.ae.ast.types.Bool;

public class BoolNode extends GetNode {
    public GetNode value1;
    public GetNode value2;
    public Bool type;
    protected BoolNode(GetNode value1, GetNode value2, Bool type) {
        this.value1 = value1;
        this.value2 = value2;
    }
    public static BoolNode create(GetNode value1, GetNode value2, Bool type) {
        return new BoolNode(value1, value2,type);
    }
}
