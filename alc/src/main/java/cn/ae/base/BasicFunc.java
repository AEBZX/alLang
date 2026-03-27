package cn.ae.base;

import cn.ae.ast.types.Type;

import java.util.List;

public class BasicFunc {

    public static List<Byte> LongToByteArray(long l) {
        return List.of(
                (byte) (l >> 56),
                (byte) (l >> 48),
                (byte) (l >> 40),
                (byte) (l >> 32),
                (byte) (l >> 24),
                (byte) (l >> 16),
                (byte) (l >> 8),
                (byte) (l)
        );
    }

    public static List<Byte> IntToByteArray(int l) {
        return List.of(
                (byte) (l >> 24),
                (byte) (l >> 16),
                (byte) (l >> 8),
                (byte) (l)
        );
    }
    /**
     * 获取指定数据类型的字节大小
     *
     * @param type 数据类型枚举值，支持基本类型如INT, CHAR, BYTE等
     * @return 对应类型的字节大小:<br>
     * - INT, FLOAT: 4字节<br>
     * - CHAR, SHORT: 2字节<br>
     * - BYTE, BOOL: 1字节<br>
     * - LONG, DOUBLE: 8字节<br>
     * - VOID: 0字节(也就是null)<br>
     * - CLASS: 4字节(本质为指针)
     */
    public static byte TypeSize(Type type) {
        return switch (type) {
            case INT, FLOAT, CLASS -> (byte) 4;
            case CHAR, SHORT -> (byte) 2;
            case BYTE, BOOL -> (byte) 1;
            case LONG, DOUBLE -> (byte) 8;
            case VOID -> (byte) 0;
        };
    }

    public static byte TypeToNum(Type type) {
        return switch (type) {
            case INT -> (byte) 0;
            case CHAR -> (byte) 1;
            case BYTE -> (byte) 2;
            case LONG -> (byte) 3;
            case SHORT -> (byte) 4;
            case FLOAT -> (byte) 5;
            case DOUBLE -> (byte) 6;
            case BOOL -> (byte) 7;
            case VOID -> (byte) 8;
            case CLASS -> (byte) 9;
        };
    }
}
