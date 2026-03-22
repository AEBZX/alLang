package cn.ae.ast.get;

import cn.ae.ast.basic.GetNode;
import cn.ae.ast.init.block.FuncNode;

import java.util.List;

public class CallNode extends GetNode {
    public FuncNode func;
    public List<GetNode> params;
    public boolean await;
    protected CallNode(FuncNode func, List<GetNode> params, boolean await) {
        this.func = func;
        this.params = params;
    }
    public static CallNode create(FuncNode func, List<GetNode> params, boolean await) {
        return new CallNode(func,params,await);
    }
}
