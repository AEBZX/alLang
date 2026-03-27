package cn.ae.ast.model.basic;

import cn.ae.ast.Node;

public class CommandNode extends Node {
    protected CommandNode() {
        super();
    }

    public static CommandNode create() {
        return new CommandNode();
    }
}
