package cn.ae;

import cn.ae.base.IO;

import java.util.HashMap;
import java.util.Map;

public class Main {
    public static void main(String[] args) {
        Map<String,String> map = new HashMap<>();
        for(String i: args){
            String[] split = i.split("=");
            map.put(split[0],split[1]);
        }
    }
}