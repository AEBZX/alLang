package cn.ae.base;

public class Command {
    public static final byte CREATE = 0;
    public static final byte DELETE = 1;
    public static final byte SET = 2;
    public static final byte GET = 3;
    public static final byte FUNC = 4;
    public static final byte CLASS = 5;
    public static final byte FUNC_HEAD_END = 127;
    public static final byte FUNC_BODY_END = 126;
    public static final byte CLASS_VAR_END = 127;
    public static final byte CLASS_FUNC_END = 126;
}
