package cn.ae.ast.command;

import cn.ae.ast.basic.CommandNode;
import cn.ae.ast.basic.GetNode;

public class ReturnNode extends CommandNode {
    public GetNode value;
    protected ReturnNode(GetNode value) {
        this.value = value;
    }
    public static ReturnNode create(GetNode value) {
        return new ReturnNode(value);
    }
}
