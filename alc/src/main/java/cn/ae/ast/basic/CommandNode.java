package cn.ae.ast.basic;

import cn.ae.ast.Node;

public class CommandNode extends Node {
    protected CommandNode() {
        super();
    }

    public static CommandNode create() {
        return new CommandNode();
    }
}
