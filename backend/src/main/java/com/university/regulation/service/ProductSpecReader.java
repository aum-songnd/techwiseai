package com.university.regulation.service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import com.university.regulation.config.AiProperties;

import lombok.RequiredArgsConstructor;

/**
 * Chuẩn hóa product.getSpecifications() (Map, JsonNode hoặc chuỗi JSON) về Map<String,String>
 * và chọn ra vài thông số chính để hiển thị / đưa vào prompt.
 */
@Component
@RequiredArgsConstructor
public class ProductSpecReader {

    private final ObjectMapper objectMapper;
    private final AiProperties props;

    public Map<String, String> flatten(Object specifications) {
        Map<String, String> out = new LinkedHashMap<>();
        if (specifications == null) {
            return out;
        }
        try {
            JsonNode node;
            if (specifications instanceof String text) {
                if (text.isBlank()) {
                    return out;
                }
                node = objectMapper.readTree(text);
            } else {
                node = objectMapper.valueToTree(specifications);
            }
            collect(node, out);
        } catch (Exception e) {
            out.put("Thông số", String.valueOf(specifications));
        }
        return out;
    }

    public Map<String, String> keySpecs(Map<String, String> all) {
        Map<String, String> out = new LinkedHashMap<>();
        for (String label : props.getKeySpecLabels()) {
            String wanted = normalize(label);
            all.entrySet().stream()
                    .filter(e -> normalize(e.getKey()).equals(wanted))
                    .findFirst()
                    .ifPresent(e -> out.put(e.getKey(), e.getValue()));
        }
        if (out.isEmpty()) {
            all.entrySet().stream().limit(5).forEach(e -> out.put(e.getKey(), e.getValue()));
        }
        return out;
    }

    private void collect(JsonNode node, Map<String, String> out) {
        if (node == null || node.isNull()) {
            return;
        }
        if (node.isObject()) {
            node.properties().forEach(entry -> {
                JsonNode value = entry.getValue();
                if (value.isValueNode()) {
                    if (!value.asText().isBlank()) {
                        out.put(entry.getKey(), value.asText());
                    }
                } else if (value.isArray() && allScalar(value)) {
                    List<String> parts = new ArrayList<>();
                    value.forEach(v -> parts.add(v.asText()));
                    out.put(entry.getKey(), String.join(", ", parts));
                } else {
                    collect(value, out);
                }
            });
        } else if (node.isArray()) {
            for (JsonNode element : node) {
                String name = firstText(element, "name", "label", "key");
                JsonNode value = element.get("value");
                if (name != null && value != null && value.isValueNode()) {
                    out.put(name, value.asText());
                } else {
                    collect(element, out);
                }
            }
        }
    }

    private boolean allScalar(JsonNode array) {
        for (JsonNode v : array) {
            if (!v.isValueNode()) {
                return false;
            }
        }
        return true;
    }

    private String firstText(JsonNode node, String... fields) {
        for (String field : fields) {
            JsonNode v = node.get(field);
            if (v != null && v.isTextual() && !v.asText().isBlank()) {
                return v.asText();
            }
        }
        return null;
    }

    private static final java.util.regex.Pattern AMOUNT = java.util.regex.Pattern.compile("(\\d+(?:[.,]\\d+)?)\\s*(tb|gb)", java.util.regex.Pattern.CASE_INSENSITIVE);
    private static final java.util.regex.Pattern NUMBER = java.util.regex.Pattern.compile("(\\d+(?:[.,]\\d+)?)");

    public double evaluateConfigPower(Map<String, String> cur, Map<String, String> cand, double fallback) {
        if (cur == null || cand == null || cur.isEmpty() || cand.isEmpty()) {
            return fallback;
        }

        double total = 0.0;
        double weightSum = 0.0;

        Double cpu = evaluateCpu(find(cur, "cpu", "bo vi xu ly", "chip"), find(cand, "cpu", "bo vi xu ly", "chip"));
        if (cpu != null) {
            total += cpu * 0.35;
            weightSum += 0.35;
        }

        Double ram = evaluateRam(find(cur, "ram", "dung luong ram"), find(cand, "ram", "dung luong ram"));
        if (ram != null) {
            total += ram * 0.30;
            weightSum += 0.30;
        }

        Double gpu = evaluateGpu(find(cur, "vga", "card", "do hoa", "gpu"), find(cand, "vga", "card", "do hoa", "gpu"));
        if (gpu != null) {
            total += gpu * 0.20;
            weightSum += 0.20;
        }

        Double disk = evaluateDisk(find(cur, "o cung", "ssd", "hdd", "bo nho trong", "rom"), find(cand, "o cung", "ssd", "hdd", "bo nho trong", "rom"));
        if (disk != null) {
            total += disk * 0.15;
            weightSum += 0.15;
        }

        return weightSum > 0 ? (total / weightSum) : fallback;
    }

    private Double evaluateCpu(String a, String b) {
        if (a == null || b == null) return null;
        int la = cpuLevel(a);
        int lb = cpuLevel(b);
        if (la <= 0 || lb <= 0) {
            String normA = normalize(a);
            String normB = normalize(b);
            return normA.equals(normB) ? 1.0 : (normA.contains(normB) || normB.contains(normA) ? 0.95 : 0.85);
        }
        if (lb > la) {
            return 1.0 + 0.10 * Math.min(3, lb - la);
        } else if (lb == la) {
            return 1.0;
        } else {
            return Math.max(0.3, 1.0 - 0.15 * (la - lb));
        }
    }

    private int cpuLevel(String text) {
        if (text == null) return -1;
        String t = text.toLowerCase();
        if (t.contains("ultra 9") || t.contains("i9") || t.contains("ryzen 9") || t.contains("ryzen ai 9") || t.contains("m4 max") || t.contains("m3 max")) return 9;
        if (t.contains("ultra 7") || t.contains("i7") || t.contains("ryzen 7") || t.contains("ryzen ai 7") || t.contains("m4 pro") || t.contains("m3 pro") || t.contains("x elite")) return 7;
        if (t.contains("ultra 5") || t.contains("i5") || t.contains("ryzen 5") || t.contains("m4") || t.contains("m3") || t.contains("m2") || t.contains("x plus")) return 5;
        if (t.contains("core 3") || t.contains("i3") || t.contains("ryzen 3") || t.contains("m1")) return 3;
        if (t.contains("celeron") || t.contains("pentium")) return 1;
        return -1;
    }

    private Double evaluateRam(String a, String b) {
        Double ra = amountGb(a);
        Double rb = amountGb(b);
        if (ra == null || rb == null || ra <= 0 || rb <= 0) return null;
        if (rb > ra) {
            return 1.0 + 0.15 * Math.min(2.0, (rb - ra) / ra);
        } else if (Math.abs(rb - ra) < 0.1) {
            return 1.0;
        } else {
            return Math.max(0.4, rb / ra);
        }
    }

    private Double evaluateGpu(String a, String b) {
        if (a == null || b == null) return null;
        int ga = gpuLevel(a);
        int gb = gpuLevel(b);
        if (ga <= 0 || gb <= 0) {
            return null;
        }
        if (gb > ga) {
            return 1.0 + 0.10 * Math.min(3, gb - ga);
        } else if (gb == ga) {
            return 1.0;
        } else {
            return Math.max(0.4, 1.0 - 0.15 * (ga - gb));
        }
    }

    private int gpuLevel(String text) {
        if (text == null) return -1;
        String t = text.toLowerCase();
        if (t.contains("4090") || t.contains("4080")) return 9;
        if (t.contains("4070") || t.contains("3080") || t.contains("rx 7800") || t.contains("rx 7700")) return 8;
        if (t.contains("4060") || t.contains("3070") || t.contains("rx 7600")) return 7;
        if (t.contains("4050") || t.contains("3060") || t.contains("3050") || t.contains("2050") || t.contains("gtx 1650")) return 6;
        if (t.contains("iris") || t.contains("intel graphics") || t.contains("radeon") || t.contains("uhd")) return 3;
        return -1;
    }

    private Double evaluateDisk(String a, String b) {
        Double da = amountGb(a);
        Double db = amountGb(b);
        if (da == null || db == null || da <= 0 || db <= 0) return null;
        if (db > da) {
            return 1.0 + 0.10 * Math.min(1.0, (db - da) / da);
        } else if (Math.abs(db - da) < 0.1) {
            return 1.0;
        } else {
            return Math.max(0.5, db / da);
        }
    }

    public Double amountGb(String value) {
        if (value == null) return null;
        java.util.regex.Matcher m = AMOUNT.matcher(value);
        if (m.find()) {
            double n = parseNumber(m.group(1));
            return m.group(2).equalsIgnoreCase("tb") ? n * 1024 : n;
        }
        return firstNumber(value);
    }

    private Double firstNumber(String value) {
        if (value == null) return null;
        java.util.regex.Matcher m = NUMBER.matcher(value);
        return m.find() ? parseNumber(m.group(1)) : null;
    }

    private double parseNumber(String text) {
        return Double.parseDouble(text.replace(',', '.'));
    }

    public String find(Map<String, String> specs, String... needles) {
        if (specs == null || needles == null) return null;
        for (Map.Entry<String, String> e : specs.entrySet()) {
            String key = ascii(e.getKey());
            for (String needle : needles) {
                if (key.contains(needle)) {
                    return e.getValue();
                }
            }
        }
        return null;
    }

    private String ascii(String value) {
        return java.text.Normalizer.normalize(value == null ? "" : value, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd')
                .replace('Đ', 'd')
                .toLowerCase(java.util.Locale.ROOT);
    }

    private String normalize(String value) {
        String lower = value == null ? "" : value.toLowerCase();
        return java.text.Normalizer.normalize(lower, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd')
                .replaceAll("[^a-z0-9]", "");
    }
}
