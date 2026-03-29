package cn.ae.ast.build;

import cn.ae.Main;
import cn.ae.ast.build.parser.Out;
import cn.ae.ast.types.Word;

import java.util.*;
import java.util.stream.Collectors;

public class Segment {
    private final List<String> tokens;
    private int index = 0;
    private int line = 1;
    private List<Word<String>> result;
    private char[] code;
    private int length;

    private List<String> sortTokens(List<String> tokenList) {
        return tokenList.stream()
                .distinct()
                .sorted(Comparator.comparingInt(String::length).reversed())
                .collect(Collectors.toList());
    }

    public Segment(List<String> tokens) {
        this.tokens = sortTokens(tokens);
    }

    private void skipComments() {
        if (!has(index)) return;

        if (matches("//")) {
            while (has(index) && code[index] != '\n') {
                index++;
            }
            if (has(index)) {
                index++;
                line++;
            }
            return;
        }

        if (matches("/*")) {
            while (has(index)) {
                if (code[index] == '\n') line++;
                index++;
                if (matches("*/")) return;
            }
        }
    }

    private boolean tryParseString() {
        if (!has(index)) return false;

        char quote = code[index];
        if (quote != '"' && quote != '`') return false;

        StringBuilder sb = new StringBuilder();
        sb.append(quote);
        index++;

        while (has(index) && code[index] != '\n') {
            if (code[index] == quote && code[index - 1] != '\\') {
                sb.append(quote);
                index++;
                break;
            }
            sb.append(code[index]);
            index++;
        }

        result.add(Word.create(sb.toString(), Word.token_type.STRING, line));
        return true;
    }

    private boolean isHexDigit(char c) {
        return (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');
    }

    private boolean isOctalDigit(char c) {
        return c >= '0' && c <= '7';
    }

    private boolean isBinaryDigit(char c) {
        return c == '0' || c == '1';
    }

    private boolean isDecimalDigit(char c) {
        return c >= '0' && c <= '9';
    }

    private int detectRadix(int startPos) {
        if (!has(startPos + 1)) return 10;

        char next = Character.toLowerCase(code[startPos + 1]);
        if (next == 'x') return 16;
        if (next == 'o') return 8;
        if (next == 'b') return 2;
        return 10;
    }

    private boolean isValidDigit(char c, int radix) {
        return switch (radix) {
            case 16 -> isHexDigit(c);
            case 8 -> isOctalDigit(c);
            case 2 -> isBinaryDigit(c);
            default -> isDecimalDigit(c) || c == '.';
        };
    }

    private boolean tryParseNumber() {
        if (!has(index) || !isDecimalDigit(code[index]) || code[index] == '.') return false;

        int radix = detectRadix(index);
        StringBuilder sb = new StringBuilder();

        if (radix != 10) {
            sb.append(code[index]).append(code[index + 1]);
            index += 2;
        }

        while (has(index) && isValidDigit(code[index], radix)) {
            sb.append(code[index]);
            index++;
        }

        if (sb.length() > 0) {
            try{
                Long.decode(sb.toString());
            }catch (Exception e){
                Main.log.error("你这数字有点问题啊:"+sb.toString()+" at:"+line);
                System.exit(0);
            }
            result.add(Word.create(sb.toString(), Word.token_type.NUMBER, line));
            return true;
        }
        return false;
    }

    private void skipWhitespace() {
        while (has(index) && Character.isWhitespace(code[index])) {
            if (code[index] == '\n') {
                line++;
            }
            index++;
        }
    }

    private boolean matches(String expected) {
        if (index + expected.length() > length) return false;

        for (int i = 0; i < expected.length(); i++) {
            if (code[index + i] != expected.charAt(i)) {
                return false;
            }
        }

        index += expected.length();
        return true;
    }

    private boolean tryParseToken() {
        for (String token : tokens) {
            if (matches(token)) {
                result.add(Word.create(token, Word.token_type.KEYWORD, line));
                return true;
            }
        }
        return false;
    }

    private boolean parseIdentifier() {
        if (!has(index) || !(Character.isLetter(code[index]) || code[index] == '_')) {
            return false;
        }

        StringBuilder sb = new StringBuilder();
        while (has(index) && (Character.isLetterOrDigit(code[index]) || code[index] == '_')) {
            sb.append(code[index]);
            index++;
        }

        if (sb.length() > 0) {
            result.add(Word.create(sb.toString(), Word.token_type.OTHER, line));
            return true;
        }
        return false;
    }

    private void parseUnknown() {
        StringBuilder sb = new StringBuilder();

        while (has(index)) {
            int savedIndex = index;

            skipComments();
            if (index != savedIndex) continue;

            if (tryParseString()) continue;
            if (tryParseNumber()) continue;

            if (Character.isWhitespace(code[index])) {
                skipWhitespace();
                result.add(Word.create(" ", Word.token_type.OTHER, line));
                continue;
            }

            if (tryParseToken()) continue;
            if (parseIdentifier()) continue;

            sb.append(code[index]);
            index++;

            if (!has(index) || !(Character.isWhitespace(code[index]) ||
                    Character.isLetterOrDigit(code[index]))) {
                if (sb.length() > 0) {
                    result.add(Word.create(sb.toString(), Word.token_type.OTHER, line));
                    sb.setLength(0);
                }
                break;
            }
        }
    }

    public List<Word<String>> segment(String code) {
        result = new ArrayList<>();
        String normalizedCode = code.replace(System.lineSeparator(), "\n");
        this.code = normalizedCode.toCharArray();
        this.length = this.code.length;
        this.index = 0;
        this.line = 1;

        parse();
        return result;
    }

    private void parse() {
        while (has(index)) {
            int savedLine = line;
            int savedIndex = index;

            skipComments();
            if (index != savedIndex) continue;

            if (tryParseString()) continue;
            if (tryParseNumber()) continue;

            if (Character.isWhitespace(code[index])) {
                skipWhitespace();
                result.add(Word.create(" ", Word.token_type.OTHER, savedLine));
                continue;
            }

            if (tryParseToken()) continue;
            if (parseIdentifier()) continue;

            parseUnknown();
        }
    }

    private boolean has(int position) {
        return position >= 0 && position < length;
    }
}
