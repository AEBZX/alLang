package cn.ae.ast.command;

import cn.ae.ast.basic.CommandNode;

public class BreakNode extends CommandNode {
    protected BreakNode() {
    }
    public static BreakNode create() {
        return new BreakNode();
    }
}
