package cn.ae.ast.block;

import cn.ae.ast.basic.CommandNode;
import cn.ae.ast.basic.ListNode;
import cn.ae.base.Type;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class FuncNode extends ListNode {
    public Type RetType;
    public Map<String, Type> params;
    public String name;

    protected FuncNode(List<CommandNode> commands, Type RetType, Map<String, Type> params, String id) {
        super(commands);
        this.RetType = RetType;
        this.params = params;
    }

    public static FuncNode create(List<CommandNode> commands, Type RetType, Map<String, Type> params, String name) {
        return new FuncNode(commands, RetType, params, name);
    }

    public static FuncNode create(List<CommandNode> commands, Type RetType, String name) {
        return new FuncNode(commands, RetType, new HashMap<>(), name);
    }

    public static FuncNode create(List<CommandNode> commands, String name) {
        return new FuncNode(commands, Type.VOID, new HashMap<>(), name);
    }

    public static FuncNode create(List<CommandNode> commands, Map<String, Type> params, String name) {
        return new FuncNode(commands, Type.VOID, params, name);
    }
}
