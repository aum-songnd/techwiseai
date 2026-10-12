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

    private String normalize(String value) {
        String lower = value == null ? "" : value.toLowerCase();
        return Normalizer.normalize(lower, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd')
                .replaceAll("[^a-z0-9]", "");
    }
}
