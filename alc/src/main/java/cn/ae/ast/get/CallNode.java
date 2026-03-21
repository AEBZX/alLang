package cn.ae.ast.get;

import cn.ae.ast.basic.GetNode;
import cn.ae.ast.init.block.FuncNode;

import java.util.List;

public class CallNode extends GetNode {
    public FuncNode func;
    public List<GetNode> params;
    protected CallNode(FuncNode func, List<GetNode> params) {
        this.func = func;
        this.params = params;
    }
    public static CallNode create(FuncNode func, List<GetNode> params) {
        return new CallNode(func,params);
    }
}
