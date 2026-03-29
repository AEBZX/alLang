package cn.ae.ast.model.get;

import cn.ae.ast.model.basic.GetNode;
import cn.ae.ast.model.init.block.FuncNode;

import java.util.List;

public class CallNode extends GetNode {
    public FuncNode func;
    public List<GetNode> params;
    public boolean await;
    protected CallNode(FuncNode func, List<GetNode> params, boolean await) {
        this.func = func;
        this.params = params;
        this.await = await;
    }
    public static CallNode create(FuncNode func, List<GetNode> params, boolean await) {
        return new CallNode(func,params,await);
    }
}
