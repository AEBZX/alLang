package cn.ae.base;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class BasicFunc {
    public long size = 0;
    public Map<String, Long> map = new HashMap<>();
    public Map<Long, String> remap = new HashMap<>();

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
     * 将类型信息转换为整型编码
     * <p>
     * 该方法将类型及其属性（有符号性、指针性）编码为一个32位整数，结构如下：
     * - 高8位:类类型标志 (1表示CLASS类型)
     * - 次高8位:类型大小（以字节为单位）
     * - 中间8位:有符号标志 (1表示无符号)
     * - 低8位:指针标志 (1表示指针类型)
     * <p>
     * 注意:当类型为CLASS或指针时,其大小固定为LONG类型的大小,且视为无符号,编译器不关注类实现
     *
     * @param type     数据类型枚举值，如INT, CHAR, CLASS等
     * @param unsigned 是否为无符号类型,仅对基本数值类型有效
     * @param pointer  是否为指针类型
     * @return 编码后的整型值，包含类型,大小,有符号性和指针信息
     */
    public static int TypeToInt(Type type, boolean unsigned, boolean pointer) {
        //类型占用大小
        byte _class = type == Type.CLASS ? (byte) 1 : (byte) 0;
        byte _size = TypeSize(type);
        byte _unsigned = unsigned ? (byte) 1 : (byte) 0;
        byte _pointer = pointer ? (byte) 1 : (byte) 0;
        if (_class == 1) {
            pointer = true;
        }
        if (pointer) {
            _size = TypeSize(Type.LONG);
            _unsigned = 1;
        }
        return (_class << 24) | (_size << 16) | (_unsigned << 8) | (_pointer);
    }

    /**
     * 生成函数头部的字节序列编码
     * 该方法将函数的返回类型和参数列表编码为一个字节列表,用于表示函数签名
     * 编码结构如下:<br>
     * 第一个字节:返回值类型<br>
     * 后续每组数据表示一个参数:<br>
     * - 一个字节:参数类型的编号<br>
     * - 八个字节:参数ID<br>
     *
     * @param params 参数映射表,键为参数ID,值为参数类型
     * @param ret    返回值类型
     * @return 编码后的字节列表, 包含返回类型, 各参数类型及其位置信息
     */
    public static List<Byte> FuncHead(Map<Long, Type> params, Type ret) {
        List<Byte> ls = new ArrayList<>();
        ls.add(TypeToNum(ret));
        for (Map.Entry<Long, Type> entry : params.entrySet()) {
            ls.add(TypeToNum(entry.getValue()));
            ls.addAll(BasicFunc.LongToByteArray(entry.getKey()));
        }
        return ls;
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

    public long get(String name) {
        if (map.containsKey(name)) {
            return map.get(name);
        }
        map.put(name, size);
        remap.put(size, name);
        return size++;
    }

    public long _get(String name) {
        if (map.containsKey(name)) {
            return map.get(name);
        }
        size--;
        map.put(name, size);
        remap.put(size, name);
        return size;
    }
}
