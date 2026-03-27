package cn.ae.ast.model.command;

import cn.ae.ast.model.basic.CommandNode;

public class BreakNode extends CommandNode {
    protected BreakNode() {
    }
    public static BreakNode create() {
        return new BreakNode();
    }
}
