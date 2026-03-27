package cn.ae.ast.model.init.var;

import cn.ae.ast.model.basic.CommandNode;
import cn.ae.ast.types.Type;

public class VarNode extends CommandNode {
    public String name;
    public Type type;
    public String other;
    public boolean unsigned;
    public boolean pointer;

    protected VarNode(String name, Type type, String other, boolean unsigned, boolean pointer) {
        this.name = name;
        this.type = type;
        this.other = other;
        this.unsigned = unsigned;
        this.pointer = pointer;
    }

    protected VarNode(String name, Type type, String other) {
        this(name, type, other, false, false);
    }

    public static VarNode create(String name, Type type, String other) {
        return new VarNode(name, type, other);
    }

    public static VarNode create(String name, Type type, String other, boolean unsigned, boolean pointer) {
        return new VarNode(name, type, other, unsigned, pointer);
    }
}
