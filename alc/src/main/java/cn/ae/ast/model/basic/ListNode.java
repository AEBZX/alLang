package cn.ae.ast.model.basic;

import cn.ae.ast.Node;

import java.util.List;

public class ListNode extends Node {
    public List<CommandNode> commands;
    protected ListNode(List<CommandNode> commands) {
        this.commands = commands;
    }
    public static ListNode create(List<CommandNode> commands) {
        return new ListNode(commands);
    }
}
