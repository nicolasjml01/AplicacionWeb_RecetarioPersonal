package backend.recetarioPersonal.recipeimport;

import backend.recetarioPersonal.view.ImportedIngredientLineDto;
import backend.recetarioPersonal.view.ImportedStepLineDto;
import backend.recetarioPersonal.view.RecipeImportPreviewDto;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

/**
 * Extracts Schema.org Recipe data from JSON-LD script tags (primary import strategy).
 */
@Component
public class SchemaOrgRecipeExtractor implements RecipeExtractor {

    /** Cover candidates for import (server stops after the first successful download). */
    private static final int MAX_IMAGE_URLS = 3;

    private final ObjectMapper objectMapper;

    public SchemaOrgRecipeExtractor(@Qualifier("recipeImportObjectMapper") ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public Optional<RecipeImportPreviewDto> extract(String html, String sourceUrl) {
        Document document = Jsoup.parse(html, sourceUrl);
        Elements scripts = document.select("script[type=application/ld+json]");

        List<JsonNode> recipeNodes = new ArrayList<>();
        for (Element script : scripts) {
            String json = script.data();
            if (json == null || json.isBlank()) {
                continue;
            }
            try {
                JsonNode root = objectMapper.readTree(json);
                collectRecipeNodes(root, recipeNodes);
            } catch (Exception ignored) {
                // Skip malformed JSON-LD blocks
            }
        }

        if (recipeNodes.isEmpty()) {
            return Optional.empty();
        }

        JsonNode best = pickBestRecipeNode(recipeNodes, sourceUrl);
        return Optional.of(toPreview(best, sourceUrl, document));
    }

    private JsonNode pickBestRecipeNode(List<JsonNode> candidates, String sourceUrl) {
        if (candidates.size() == 1) {
            return candidates.get(0);
        }

        String slug = slugHint(sourceUrl);
        JsonNode best = candidates.get(0);
        int bestScore = scoreCandidate(best, slug);

        for (int i = 1; i < candidates.size(); i++) {
            JsonNode candidate = candidates.get(i);
            int score = scoreCandidate(candidate, slug);
            if (score > bestScore) {
                best = candidate;
                bestScore = score;
            }
        }
        return best;
    }

    private int scoreCandidate(JsonNode recipe, String slug) {
        int score = 0;
        String name = textOrNull(recipe.get("name"));
        if (name != null && !name.isBlank()) {
            score += 2;
        }
        JsonNode ingredients = recipe.get("recipeIngredient");
        if (ingredients != null && ingredients.isArray() && ingredients.size() > 0) {
            score += ingredients.size();
        }
        if (slug != null && name != null) {
            String nameLower = name.toLowerCase(Locale.ROOT);
            for (String token : slug.split("-")) {
                if (token.length() > 2 && nameLower.contains(token)) {
                    score += 3;
                }
            }
        }
        return score;
    }

    private String slugHint(String sourceUrl) {
        try {
            String path = java.net.URI.create(sourceUrl).getPath();
            if (path == null) {
                return null;
            }
            int lastSlash = path.lastIndexOf('/');
            return lastSlash >= 0 ? path.substring(lastSlash + 1).toLowerCase(Locale.ROOT) : path;
        } catch (Exception ex) {
            return null;
        }
    }

    private void collectRecipeNodes(JsonNode node, List<JsonNode> out) {
        if (node == null || node.isNull()) {
            return;
        }
        if (node.isArray()) {
            for (JsonNode child : node) {
                collectRecipeNodes(child, out);
            }
            return;
        }
        if (!node.isObject()) {
            return;
        }

        if (isRecipeType(node.get("@type"))) {
            out.add(node);
        }

        JsonNode graph = node.get("@graph");
        if (graph != null) {
            collectRecipeNodes(graph, out);
        }
    }

    private boolean isRecipeType(JsonNode typeNode) {
        if (typeNode == null || typeNode.isNull()) {
            return false;
        }
        if (typeNode.isTextual()) {
            return "Recipe".equalsIgnoreCase(typeNode.asText());
        }
        if (typeNode.isArray()) {
            for (JsonNode item : typeNode) {
                if (item.isTextual() && "Recipe".equalsIgnoreCase(item.asText())) {
                    return true;
                }
            }
        }
        return false;
    }

    private RecipeImportPreviewDto toPreview(JsonNode recipe, String sourceUrl, Document document) {
        List<String> warnings = new ArrayList<>();

        String title = textOrNull(recipe.get("name"));
        if (title == null || title.isBlank()) {
            title = "";
            warnings.add("No se encontró el título de la receta.");
        }

        List<ImportedIngredientLineDto> ingredients = parseIngredients(recipe.get("recipeIngredient"));
        if (ingredients.isEmpty()) {
            warnings.add("No se encontraron ingredientes en la página.");
        }

        List<ImportedStepLineDto> steps = parseInstructions(recipe.get("recipeInstructions"));
        if (steps.isEmpty()) {
            warnings.add("No se encontraron pasos de elaboración en la página.");
        }

        List<String> imageUrls = collectImageUrls(recipe.get("image"), document, sourceUrl);
        String imageUrl = imageUrls.isEmpty() ? null : imageUrls.get(0);
        if (imageUrls.isEmpty()) {
            warnings.add("No se encontraron imágenes de la receta en la página.");
        }

        return new RecipeImportPreviewDto(
                title.trim(),
                sourceUrl,
                imageUrl,
                imageUrls,
                ingredients,
                steps,
                warnings);
    }

    private List<String> collectImageUrls(JsonNode imageNode, Document document, String sourceUrl) {
        Set<String> seen = new LinkedHashSet<>();
        List<String> ordered = new ArrayList<>();

        // Open Graph / Twitter usually point at the recipe hero (best cover).
        for (String raw : collectMetaImageUrls(document)) {
            addImageUrl(ordered, seen, resolveUrl(raw, sourceUrl));
            if (ordered.size() >= MAX_IMAGE_URLS) {
                return ordered;
            }
        }
        for (String raw : parseImageUrls(imageNode)) {
            addImageUrl(ordered, seen, resolveUrl(raw, sourceUrl));
            if (ordered.size() >= MAX_IMAGE_URLS) {
                break;
            }
        }
        return ordered;
    }

    private void addImageUrl(List<String> ordered, Set<String> seen, String url) {
        if (url == null || url.isBlank()) {
            return;
        }
        String lower = url.toLowerCase(Locale.ROOT);
        if (!ImportImageFetcher.isLikelyRecipeImageUrl(lower)) {
            return;
        }
        if (seen.add(url)) {
            ordered.add(url);
        }
    }

    private List<String> collectMetaImageUrls(Document document) {
        List<String> urls = new ArrayList<>();
        for (Element meta : document.select("meta[property=og:image], meta[property=og:image:url], meta[name=twitter:image]")) {
            String content = meta.attr("content");
            if (content != null && !content.isBlank()) {
                urls.add(content.trim());
            }
        }
        return urls;
    }

    private String resolveUrl(String url, String baseUrl) {
        if (url == null || url.isBlank()) {
            return null;
        }
        try {
            return URI.create(baseUrl).resolve(url.trim()).toString();
        } catch (Exception ex) {
            return url.trim();
        }
    }

    private List<ImportedIngredientLineDto> parseIngredients(JsonNode node) {
        List<ImportedIngredientLineDto> result = new ArrayList<>();
        if (node == null || node.isNull()) {
            return result;
        }

        if (node.isTextual()) {
            addIngredientLine(result, node.asText());
            return result;
        }

        if (node.isArray()) {
            for (JsonNode item : node) {
                if (item.isTextual()) {
                    addIngredientLine(result, item.asText());
                } else if (item.isObject()) {
                    String line = firstNonBlank(
                            textOrNull(item.get("name")),
                            textOrNull(item.get("description")),
                            textOrNull(item));
                    if (line != null) {
                        addIngredientLine(result, line);
                    }
                }
            }
        }
        return result;
    }

    private void addIngredientLine(List<ImportedIngredientLineDto> result, String raw) {
        if (raw == null) {
            return;
        }
        String trimmed = raw.trim();
        if (trimmed.isEmpty()) {
            return;
        }
        result.add(ImportedIngredientLineParser.parse(trimmed));
    }

    private List<ImportedStepLineDto> parseInstructions(JsonNode node) {
        List<String> texts = new ArrayList<>();
        collectInstructionTexts(node, texts);

        List<ImportedStepLineDto> steps = new ArrayList<>();
        int number = 1;
        for (String text : texts) {
            String trimmed = text.trim();
            if (!trimmed.isEmpty()) {
                steps.add(new ImportedStepLineDto(number++, trimmed));
            }
        }
        return steps;
    }

    private void collectInstructionTexts(JsonNode node, List<String> out) {
        if (node == null || node.isNull()) {
            return;
        }
        if (node.isTextual()) {
            splitLines(node.asText(), out);
            return;
        }
        if (node.isArray()) {
            for (JsonNode child : node) {
                collectInstructionTexts(child, out);
            }
            return;
        }
        if (node.isObject()) {
            String text = firstNonBlank(
                    textOrNull(node.get("text")),
                    textOrNull(node.get("name")),
                    textOrNull(node.get("description")));
            if (text != null && !text.isBlank()) {
                splitLines(text, out);
                return;
            }
            JsonNode itemList = node.get("itemListElement");
            if (itemList != null) {
                collectInstructionTexts(itemList, out);
            }
        }
    }

    private void splitLines(String block, List<String> out) {
        if (block == null || block.isBlank()) {
            return;
        }
        for (String line : block.split("\\r?\\n")) {
            String trimmed = line.trim();
            if (!trimmed.isEmpty()) {
                out.add(trimmed);
            }
        }
    }

    private List<String> parseImageUrls(JsonNode imageNode) {
        List<String> urls = new ArrayList<>();
        if (imageNode == null || imageNode.isNull()) {
            return urls;
        }
        if (imageNode.isTextual()) {
            urls.add(imageNode.asText());
            return urls;
        }
        if (imageNode.isArray()) {
            for (JsonNode item : imageNode) {
                collectImageUrlFromNode(item, urls);
            }
            return urls;
        }
        if (imageNode.isObject()) {
            collectImageUrlFromNode(imageNode, urls);
        }
        return urls;
    }

    private void collectImageUrlFromNode(JsonNode node, List<String> urls) {
        if (node == null || node.isNull()) {
            return;
        }
        if (node.isTextual()) {
            urls.add(node.asText());
            return;
        }
        if (node.isObject()) {
            String url = firstNonBlank(
                    textOrNull(node.get("url")),
                    textOrNull(node.get("contentUrl")),
                    textOrNull(node.get("@id")));
            if (url != null) {
                urls.add(url);
            }
        }
    }

    private String textOrNull(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (node.isTextual()) {
            return node.asText();
        }
        return null;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }
}