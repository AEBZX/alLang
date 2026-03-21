package cn.ae.ast.init;

import cn.ae.base.Type;

public class ClassVarNode extends VarNode {
    public boolean _public;
    public boolean _static;
    public String class_name;

    protected ClassVarNode(String name, Type type, String other, boolean unsigned, boolean pointer,
                           boolean _public, boolean _static, String class_name) {
        super(name, type, other, unsigned, pointer);
        this._public = _public;
        this._static = _static;
        this.class_name = class_name;
    }

    protected ClassVarNode(String name, Type type, String other, boolean _public, boolean _static, String class_name) {
        super(name, type, other);
        this._public = _public;
        this._static = _static;
        this.class_name = class_name;
    }

    public static ClassVarNode create(String name, Type type, String other, boolean _public, boolean _static, String class_name) {
        return new ClassVarNode(name, type, other, _public, _static, class_name);
    }

    public static ClassVarNode create(String name, Type type, String other, boolean unsigned, boolean pointer,
                                      boolean _public, boolean _static, String class_name) {
        return new ClassVarNode(name, type, other, unsigned, pointer, _public, _static, class_name);
    }
}
