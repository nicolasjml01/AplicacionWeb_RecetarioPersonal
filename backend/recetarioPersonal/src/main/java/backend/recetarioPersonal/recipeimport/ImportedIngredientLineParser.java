package backend.recetarioPersonal.recipeimport;

import backend.recetarioPersonal.view.ImportedIngredientLineDto;

import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Best-effort parser for {@code recipeIngredient} lines from external sites (ES/EN).
 */
public final class ImportedIngredientLineParser {

  private static final String GLUED_UNIT =
      "g|gr|gram|grams|gramo|gramos|kg|kilogramo|kilogramos|ml|mililitro|mililitros|l|litro|litros|"
          + "count|unit|units|ud|uds|unidad|unidades";

  private static final String EXTRA_UNIT =
      "cucharada|cucharadas|cucharadita|cucharaditas|pizca|pizcas|vaso|vasos|taza|tazas|"
          + "bolsa|bolsas|manojo|manojos|diente|dientes|ramita|ramitas|hoja|hojas";

  private static final String NUMBER =
      "(\\d+(?:[.,]\\d+)?|\\d+\\s*/\\s*\\d+|[½¼¾⅓⅔])";

  private static final Pattern RE_QTY_GLUED_UNIT_NAME = Pattern.compile(
      "^" + NUMBER + "\\s*(" + GLUED_UNIT + ")\\s+(.+)$",
      Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

  private static final Pattern RE_QTY_UNIT_NAME = Pattern.compile(
      "^" + NUMBER + "\\s+(" + GLUED_UNIT + "|" + EXTRA_UNIT + ")\\s+(?:de\\s+|del\\s+)?(.+)$",
      Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

  private static final Pattern RE_QTY_NAME = Pattern.compile(
      "^" + NUMBER + "\\s+(.+)$",
      Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

  private static final Pattern RE_UNIT_NAME = Pattern.compile(
      "^(" + GLUED_UNIT + "|" + EXTRA_UNIT + ")\\s+(.+)$",
      Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

  private static final Map<String, String> UNIT_TO_CATALOG = Map.ofEntries(
      Map.entry("g", "Gramo"),
      Map.entry("gr", "Gramo"),
      Map.entry("gram", "Gramo"),
      Map.entry("grams", "Gramo"),
      Map.entry("gramo", "Gramo"),
      Map.entry("gramos", "Gramo"),
      Map.entry("kg", "Kilogramo"),
      Map.entry("kilogramo", "Kilogramo"),
      Map.entry("kilogramos", "Kilogramo"),
      Map.entry("ml", "Mililitro"),
      Map.entry("mililitro", "Mililitro"),
      Map.entry("mililitros", "Mililitro"),
      Map.entry("l", "Litro"),
      Map.entry("litro", "Litro"),
      Map.entry("litros", "Litro"),
      Map.entry("unidad", "Unidad"),
      Map.entry("unidades", "Unidad"),
      Map.entry("ud", "Unidad"),
      Map.entry("uds", "Unidad"),
      Map.entry("count", "Unidad"),
      Map.entry("unit", "Unidad"),
      Map.entry("units", "Unidad"),
      Map.entry("piece", "Unidad"),
      Map.entry("pieces", "Unidad"));

  private ImportedIngredientLineParser() {}

  public static ImportedIngredientLineDto parse(String raw) {
    String trimmed = raw == null ? "" : raw.trim();
    if (trimmed.isEmpty()) {
      return new ImportedIngredientLineDto("", "", null, null);
    }
    if (shouldKeepAsWholeLine(trimmed)) {
      return new ImportedIngredientLineDto(trimmed, trimmed, null, null);
    }

    ImportedIngredientLineDto glued = tryQtyUnitName(trimmed, RE_QTY_GLUED_UNIT_NAME);
    if (glued != null) {
      return glued;
    }

    ImportedIngredientLineDto spaced = tryQtyUnitName(trimmed, RE_QTY_UNIT_NAME);
    if (spaced != null) {
      return spaced;
    }

    Matcher m = RE_QTY_NAME.matcher(trimmed);
    if (m.matches()) {
      Float qty = parseQuantityToken(m.group(1));
      String name = m.group(2).trim();
      if (!name.isEmpty()) {
        return new ImportedIngredientLineDto(trimmed, name, qty, null);
      }
    }

    m = RE_UNIT_NAME.matcher(trimmed);
    if (m.matches()) {
      String unit = normalizeUnit(m.group(1));
      String name = m.group(2).trim();
      if (!name.isEmpty()) {
        return new ImportedIngredientLineDto(trimmed, name, null, unit);
      }
    }

    return new ImportedIngredientLineDto(trimmed, trimmed, null, null);
  }

  private static ImportedIngredientLineDto tryQtyUnitName(String trimmed, Pattern pattern) {
    Matcher m = pattern.matcher(trimmed);
    if (!m.matches()) {
      return null;
    }
    Float qty = parseQuantityToken(m.group(1));
    String unit = normalizeUnit(m.group(2));
    String name = m.group(3).trim();
    if (name.isEmpty()) {
      return null;
    }
    return new ImportedIngredientLineDto(trimmed, name, qty, unit);
  }

  private static boolean shouldKeepAsWholeLine(String line) {
    if (line.length() > 100) {
      return true;
    }
    String[] commaParts = line.split(",");
    int nonEmpty = 0;
    for (String p : commaParts) {
      if (!p.trim().isEmpty()) {
        nonEmpty++;
      }
    }
    if (nonEmpty >= 2) {
      boolean hasLeadingNumber = !line.isEmpty() && Character.isDigit(line.charAt(0));
      if (!hasLeadingNumber || nonEmpty >= 3) {
        return true;
      }
      if (line.toLowerCase(Locale.ROOT).contains(" y ")) {
        return true;
      }
    }
    return line.toLowerCase(Locale.ROOT).contains(" y ") && line.length() > 45;
  }

  private static String normalizeUnit(String token) {
    String key = token.toLowerCase(Locale.ROOT).replace(".", "");
    return UNIT_TO_CATALOG.getOrDefault(
        key,
        token.substring(0, 1).toUpperCase(Locale.ROOT)
            + token.substring(1).toLowerCase(Locale.ROOT));
  }

  private static Float parseQuantityToken(String token) {
    String t = token.trim();
    if ("½".equals(t)) {
      return 0.5f;
    }
    if ("¼".equals(t)) {
      return 0.25f;
    }
    if ("¾".equals(t)) {
      return 0.75f;
    }
    if ("⅓".equals(t)) {
      return 1f / 3f;
    }
    if ("⅔".equals(t)) {
      return 2f / 3f;
    }
    if (t.contains("/")) {
      String[] parts = t.replace(',', '.').split("/");
      if (parts.length == 2) {
        try {
          float num = Float.parseFloat(parts[0].trim());
          float den = Float.parseFloat(parts[1].trim());
          if (den > 0) {
            return num / den;
          }
        } catch (NumberFormatException ignored) {
          return null;
        }
      }
    }
    try {
      float n = Float.parseFloat(t.replace(',', '.'));
      return n > 0 ? n : null;
    } catch (NumberFormatException e) {
      return null;
    }
  }
}
