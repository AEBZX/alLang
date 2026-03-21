package cn.ae.ast.basic;

import cn.ae.ast.Node;

import java.util.List;

public class ListNode extends Node {
    public List<CommandNode> commands;

    protected ListNode(List<CommandNode> commands) {
        this.commands = commands;
    }
}
