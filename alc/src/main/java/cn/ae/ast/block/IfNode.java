package cn.ae.ast.block;

import cn.ae.ast.basic.CommandNode;
import cn.ae.ast.basic.ListNode;

import java.util.List;

public class IfNode extends ListNode {
    protected IfNode(List<CommandNode> commands) {
        super(commands);
    }
}
